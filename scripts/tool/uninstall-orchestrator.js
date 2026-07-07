const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const { collectUninstallTargets } = require('./uninstall-targets.js');
const { clearLanguagePackCache } = require('./language-pack-cache.js');
const {
  PACKAGE_BACKUP_RELATIVE,
  NLS_BACKUP_RELATIVE,
  validateBackupForUninstall,
} = require('../lib/install/validate-backup.js');
const { resolveBackupDir } = require('../lib/install/resolve-backup-dir.js');
const {
  getManagedExternalFiles,
  unionExternalFileEntries,
} = require('../lib/install/managed-external-files.js');
const {
  buildUninstallPreflightLines,
  buildUninstallPhaseLine,
  buildUninstallSuccessLines,
  printUninstallGuidance,
} = require('./uninstall-guidance.js');

const WRAPPER_CMD_NAMES = [
  'apply-cursor-zh.cmd',
  'ensure-cursor-zh.cmd',
  'verify-cursor-zh.cmd',
  'start-cursor-zh.cmd',
  'uninstall-cursor-zh.cmd',
];

function normalizePackageJsonForUninstall(packageJsonPath, { readJson, writeJson, fs: fsRef = fs }) {
  if (!fsRef.existsSync(packageJsonPath)) {
    return null;
  }

  const packageJson = readJson(packageJsonPath);
  let changed = false;

  if (packageJson.main === './out/cursorTranslatorMain.js') {
    if (!packageJson.main_original) {
      throw new Error('Cannot safely uninstall without a recoverable package.json main entry.');
    }
    packageJson.main = packageJson.main_original;
    changed = true;
  }

  if (Object.prototype.hasOwnProperty.call(packageJson, 'main_original')) {
    delete packageJson.main_original;
    changed = true;
  }

  if (changed) {
    writeJson(packageJsonPath, packageJson);
  }

  return packageJson;
}

function restoreFromBackup({ backupDir, relativePath, targetPath, strict = false, fs: fsRef = fs }) {
  if (!backupDir) {
    if (strict) {
      throw new Error(`Backup directory not found for ${relativePath}`);
    }
    return false;
  }
  const sourcePath = path.join(backupDir, relativePath);
  if (!fsRef.existsSync(sourcePath)) {
    if (strict) {
      throw new Error(`Backup file missing: ${relativePath} (expected at ${sourcePath})`);
    }
    return false;
  }
  fsRef.mkdirSync(path.dirname(targetPath), { recursive: true });
  fsRef.copyFileSync(sourcePath, targetPath);
  return true;
}

function restoreOrRemoveManagedFile({ entry, backupDir, fs: fsRef = fs }) {
  if (!entry?.targetPath) {
    return;
  }

  if (entry.existed) {
    const sourcePath = path.join(backupDir, entry.backupRelativePath);
    if (!fsRef.existsSync(sourcePath)) {
      throw new Error(`Missing backup for managed file: ${entry.targetPath}`);
    }
    fsRef.mkdirSync(path.dirname(entry.targetPath), { recursive: true });
    fsRef.copyFileSync(sourcePath, entry.targetPath);
    return;
  }

  if (fsRef.existsSync(entry.targetPath)) {
    fsRef.unlinkSync(entry.targetPath);
  }
}

function clearClpZhCnCache(env = process.env, fsRef = fs) {
  if (!env.APPDATA) {
    return [];
  }
  const clpRoot = path.join(env.APPDATA, 'Cursor', 'clp');
  if (!fsRef.existsSync(clpRoot)) {
    return [];
  }

  const removed = [];
  for (const entry of fsRef.readdirSync(clpRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.endsWith('.zh-cn')) {
      continue;
    }
    const localeDir = path.join(clpRoot, entry.name);
    fsRef.rmSync(localeDir, { recursive: true, force: true });
    removed.push(localeDir);
  }
  return removed;
}

function clearCursorExtensionCacheDirs(env = process.env, fsRef = fs) {
  if (!env.APPDATA) {
    return [];
  }
  const removed = [];
  const cursorAppDataDir = path.join(env.APPDATA, 'Cursor');
  for (const cacheName of ['CachedProfilesData', 'CachedExtensionVSIXs']) {
    const cachePath = path.join(cursorAppDataDir, cacheName);
    if (!fsRef.existsSync(cachePath)) {
      continue;
    }
    fsRef.rmSync(cachePath, { recursive: true, force: true });
    removed.push(cachePath);
  }
  return removed;
}

function listDesktopShortcutPaths(shortcutName, env = process.env) {
  const desktopRoots = new Set();
  const home = env.USERPROFILE || env.HOME || os.homedir();

  for (const candidate of [
    path.join(home, 'Desktop'),
    path.join(env.APPDATA || '', 'Microsoft', 'Windows', 'Desktop'),
  ]) {
    if (candidate && !candidate.includes('undefined')) {
      desktopRoots.add(candidate);
    }
  }

  return [...desktopRoots].map((root) => path.join(root, shortcutName));
}

const RETRYABLE_UNLINK_CODES = new Set(['EBUSY', 'EPERM']);

function safeUnlinkSync(filePath, { maxRetries = 3, delayMs = 100, delayFn, fs: fsRef = fs } = {}) {
  if (!fsRef.existsSync(filePath)) {
    return;
  }
  const effectiveDelayFn = delayFn || ((ms) => {
    // 同步等待：使用 Atomics.wait（Node.js 18+）
    const buf = new Int32Array(new SharedArrayBuffer(4));
    Atomics.wait(buf, 0, 0, ms);
  });

  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      fsRef.unlinkSync(filePath);
      return;
    } catch (err) {
      if (err.code === 'ENOENT') {
        return; // 文件已不存在，静默跳过
      }
      if (!RETRYABLE_UNLINK_CODES.has(err.code)) {
        throw err; // 非锁定类错误，不重试
      }
      lastError = err;
      if (attempt < maxRetries - 1) {
        effectiveDelayFn(delayMs);
      }
    }
  }
  throw lastError;
}

function checkCursorRunning({ execSync: execSyncRef = execSync } = {}) {
  try {
    const output = execSyncRef('tasklist /FI "IMAGENAME eq Cursor.exe" /NH', { encoding: 'utf8' });
    const running = /Cursor\.exe/i.test(output);
    return { running };
  } catch (err) {
    return { running: false, warning: `无法执行 tasklist 命令，跳过进程检测：${err.message}` };
  }
}

function createUninstallOrchestratorModule(deps) {
  const {
    toolPaths,
    fs: fsRef = fs,
    env = process.env,
    readJson,
    readJsonIfExists,
    writeJson,
    loadInstallMetadata,
    loadMergedMappings,
    verifyCleanState,
    printReport,
    extensionOverlayPath = toolPaths.extensionOverlayPath,
    checkCursorRunning: checkCursorRunningRef = checkCursorRunning,
  } = deps;

  function runUninstall(context) {
    // 预检查：Cursor 是否在运行
    const cursorProcess = checkCursorRunningRef();
    if (cursorProcess.running) {
      console.log('[卸载中止]');
      console.log('  检测到 Cursor 正在运行，请先完全退出 Cursor 后再执行卸载。');
      console.log('  退出方式：关闭所有 Cursor 窗口，或在任务管理器中结束 Cursor.exe 进程。');
      process.exitCode = 1;
      return { aborted: true, reason: 'Cursor 进程正在运行' };
    }
    if (cursorProcess.warning) {
      console.warn(`[警告] ${cursorProcess.warning}`);
    }

    const warnings = [];
    printUninstallGuidance(
      buildUninstallPreflightLines({ installDir: context.paths.installDir })
    );

    console.log(buildUninstallPhaseLine(1, '解析安装目录与备份'));
    const installMetadata = loadInstallMetadata(context);
    const manifest = readJsonIfExists(toolPaths.buildManifestPath, null);
    const { backupDir, warnings: backupWarnings } = resolveBackupDir({
      backupRoot: toolPaths.backupRoot,
      installDir: context.paths.installDir,
      manifest,
      userBackupDir: context.options.backupDir,
      fs: fsRef,
    });
    warnings.push(...backupWarnings);

    console.log(buildUninstallPhaseLine(2, '校验备份完整性'));
    const targets = collectUninstallTargets({
      installDir: context.paths.installDir,
      toolPaths,
      fs: fsRef,
      readJsonIfExists,
      loadInstallMetadata,
      context,
    });
    warnings.push(...targets.warnings);

    const validation = validateBackupForUninstall({
      backupDir,
      installDir: context.paths.installDir,
      installMetadata,
      deletePaths: targets.deletePaths,
      fs: fsRef,
    });
    warnings.push(...validation.warnings);

    for (const warning of warnings) {
      console.warn(warning);
    }

    console.log(buildUninstallPhaseLine(3, '恢复 package.json 与 nls.messages.json'));
    const restoredPackage = restoreFromBackup({
      backupDir,
      relativePath: PACKAGE_BACKUP_RELATIVE,
      targetPath: context.paths.packageJsonPath,
      strict: true,
      fs: fsRef,
    });
    const restoredNls = restoreFromBackup({
      backupDir,
      relativePath: NLS_BACKUP_RELATIVE,
      targetPath: context.paths.nlsMessagesPath,
      strict: true,
      fs: fsRef,
    });

    console.log(buildUninstallPhaseLine(4, '恢复 package.json 入口为 ./out/main.js'));
    const packageJson = normalizePackageJsonForUninstall(context.paths.packageJsonPath, {
      readJson,
      writeJson,
      fs: fsRef,
    });
    if (!packageJson?.main || packageJson.main === './out/cursorTranslatorMain.js') {
      throw new Error('Cannot safely uninstall without a package.json backup.');
    }

    console.log(buildUninstallPhaseLine(5, '恢复或移除 argv / locale / extension nls'));
    const registryExternalFiles = getManagedExternalFiles(context, {
      extensionOverlayPath,
      fs: fsRef,
    }).map((entry) => ({
      ...entry,
      existed: fsRef.existsSync(entry.targetPath),
    }));
    const unionExternalFiles = unionExternalFileEntries(
      validation.metadata?.externalFiles || [],
      registryExternalFiles
    );
    for (const entry of unionExternalFiles) {
      restoreOrRemoveManagedFile({ entry, backupDir, fs: fsRef });
    }

    console.log(buildUninstallPhaseLine(6, '删除汉化注入文件'));
    for (const filePath of targets.deletePaths) {
      safeUnlinkSync(filePath, { fs: fsRef });
    }

    console.log(buildUninstallPhaseLine(7, '清理 profile 缓存（clp / 扩展缓存）'));
    const removedClpDirs = clearClpZhCnCache(env, fsRef);
    const clearedExtensionCache = clearCursorExtensionCacheDirs(env, fsRef);
    clearLanguagePackCache({ env, fs: fsRef });

    console.log(buildUninstallPhaseLine(8, '卸后验收（结构 + nls 哈希）'));
    const verifyResult = verifyCleanState(
      context,
      { pkg: readJson(context.paths.packageJsonPath) },
      {
        backupDir,
        backupMetadata: validation.metadata,
      }
    );
    printReport('Cursor 卸后状态', verifyResult);
    if (verifyResult.issues.length > 0) {
      const error = new Error(
        `Uninstall completed install/profile cleanup but post-uninstall verification failed: ${verifyResult.issues.join(
          '; '
        )}`
      );
      error.verifyResult = verifyResult;
      throw error;
    }

    console.log(buildUninstallPhaseLine(9, '清理 workspace 状态'));
    if (fsRef.existsSync(toolPaths.buildManifestPath)) {
      fsRef.unlinkSync(toolPaths.buildManifestPath);
    }
    if (fsRef.existsSync(toolPaths.generatedDir)) {
      fsRef.rmSync(toolPaths.generatedDir, { recursive: true, force: true });
    }
    if (fsRef.existsSync(toolPaths.startCursorPathFile)) {
      fsRef.unlinkSync(toolPaths.startCursorPathFile);
    }
    if (fsRef.existsSync(toolPaths.toggleSignalPath)) {
      fsRef.unlinkSync(toolPaths.toggleSignalPath);
    }

    for (const name of WRAPPER_CMD_NAMES) {
      const wrapperPath = path.join(toolPaths.workspaceRoot, name);
      if (fsRef.existsSync(wrapperPath)) {
        try {
          fsRef.unlinkSync(wrapperPath);
        } catch {
          // uninstall wrapper may be held by the running process
        }
      }
    }

    for (const desktopShortcutPath of listDesktopShortcutPaths(
      toolPaths.desktopShortcutName,
      env
    )) {
      if (fsRef.existsSync(desktopShortcutPath)) {
        fsRef.unlinkSync(desktopShortcutPath);
      }
    }

    printUninstallGuidance(
      buildUninstallSuccessLines({
        installDir: context.paths.installDir,
        backupDir,
      })
    );

    return {
      installDir: context.paths.installDir,
      backupDir,
      restoredPackage,
      restoredNls,
      removedClpDirs,
      clearedExtensionCache,
      warnings,
    };
  }

  return {
    runUninstall,
    normalizePackageJsonForUninstall,
    restoreFromBackup,
    restoreOrRemoveManagedFile,
    clearClpZhCnCache,
    clearCursorExtensionCacheDirs,
    listDesktopShortcutPaths,
    WRAPPER_CMD_NAMES,
  };
}

module.exports = {
  createUninstallOrchestratorModule,
  checkCursorRunning,
  safeUnlinkSync,
  WRAPPER_CMD_NAMES,
};
