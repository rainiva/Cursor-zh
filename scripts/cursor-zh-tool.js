#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const childProcess = require('child_process');

const {
  buildShortcutCommand,
  resolveWorkspaceRoot,
} = require('./cursor-zh-config.js');

const {
  applyStaticSourceTranslations,
  applyStaticSourceTranslationsDetailed,
  analyzeCursorWinCoverage,
  analyzeDynamicRuleCoverage,
  analyzeProductTipsCoverage,
  buildTranslatedWorkbenchBundle,
  compareLanguagePackVersion,
  cursorWinCoverageTargets,
  defaultCursorWinCommonMappings,
  defaultCursorWinDynamicMappings,
  defaultOverlayMappings,
  evaluatePatchContracts,
  mergeMappings,
  normalizeTextForComparison,
  parseJsonc,
  parseLegacyWorktreeMappings,
  productTipsCoverageTargets,
  selectRuntimeMappings,
  summarizeStaticPatchContractsFromTranslatedSource,
  summarizeRuntimeFootprint,
  translateTextWithMappings,
  withLocaleSetting,
} = require('./cursor-zh-lib.js');

const WORKSPACE_ROOT = resolveWorkspaceRoot({
  scriptDir: __dirname,
  env: process.env,
});
const DEFAULT_INSTALL_DIR = path.join(WORKSPACE_ROOT, 'cursor');
const STATE_DIR = path.join(WORKSPACE_ROOT, 'state');
const BACKUP_ROOT = path.join(STATE_DIR, 'backups');
const GENERATED_DIR = path.join(STATE_DIR, 'generated');
const START_CURSOR_PATH_FILE = path.join(STATE_DIR, 'start-cursor-path.txt');
const TRANSLATION_BASE_DIR = path.join(WORKSPACE_ROOT, 'translations', 'base');
const TRANSLATION_OVERLAY_DIR = path.join(WORKSPACE_ROOT, 'translations', 'overlay');
const BUILD_MANIFEST_PATH = path.join(STATE_DIR, 'build-manifest.json');
const BASE_MAPPING_PATH = path.join(TRANSLATION_BASE_DIR, 'workbench.mappings.json');
const OVERLAY_MAPPING_PATH = path.join(TRANSLATION_OVERLAY_DIR, 'workbench.overlay.json');
const CURSOR_WIN_COMMON_PATH = path.join(
  TRANSLATION_OVERLAY_DIR,
  'cursor-win.common.json'
);
const EXTENSION_OVERLAY_PATH = path.join(
  TRANSLATION_OVERLAY_DIR,
  'extensions.package.nls.zh-cn.json'
);
const GENERATED_WORKBENCH_PATH = path.join(
  GENERATED_DIR,
  'workbench.desktop.main_translated.generated.js'
);
const GENERATED_MAIN_PATH = path.join(
  GENERATED_DIR,
  'main_translated.generated.js'
);
const GENERATED_NLS_MESSAGES_PATH = path.join(
  GENERATED_DIR,
  'nls.messages.generated.json'
);
const DESKTOP_SHORTCUT_NAME = 'Cursor 中文版.lnk';
const TOGGLE_SIGNAL_PATH = path.join(STATE_DIR, 'runtime-toggle.json');
const EXPERIMENTAL_RUNTIME_TOGGLE_BUILD_ENV =
  'CURSOR_ZH_INCLUDE_EXPERIMENTAL_RUNTIME_TOGGLE';
const EXPERIMENTAL_RUNTIME_TOGGLE_ENV =
  'CURSOR_ZH_ENABLE_EXPERIMENTAL_RUNTIME_TOGGLE';
const OFFICIAL_COMMANDS = new Set(['apply', 'ensure', 'verify', 'start']);
const EXPERIMENTAL_COMMANDS = new Set(['toggle', 'disable', 'enable', 'status']);
const SAFE_MAIN_TRANSLATION_TEXTS = new Set([
  'Recent Agents',
  'No recent agents',
  'Clear All Notifications',
  'New Agent',
  'Open Cursor',
  'Settings',
  'Quit',
]);

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function assertCommandAllowed(command, env = process.env) {
  if (OFFICIAL_COMMANDS.has(command)) {
    return;
  }

  if (EXPERIMENTAL_COMMANDS.has(command)) {
    if (env[EXPERIMENTAL_RUNTIME_TOGGLE_ENV] === '1') {
      return;
    }

    throw new Error(
      `Command "${command}" is experimental and not part of the supported install or uninstall workflow. ` +
        `Set ${EXPERIMENTAL_RUNTIME_TOGGLE_ENV}=1 only when you intentionally need the legacy runtime toggle path.`
    );
  }
}

function shouldIncludeExperimentalRuntimeToggle(env = process.env) {
  return env[EXPERIMENTAL_RUNTIME_TOGGLE_BUILD_ENV] === '1';
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeText(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function readJsonIfExists(filePath, fallbackValue) {
  if (!fs.existsSync(filePath)) {
    return fallbackValue;
  }

  return readJson(filePath);
}

function writeJson(filePath, value) {
  writeText(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeStartLauncherPath(context) {
  writeText(START_CURSOR_PATH_FILE, `${context.paths.cursorExePath}\n`);
}

function sha256OfFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function timestampLabel() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function isTranslatorBootstrapSource(text) {
  return typeof text === 'string' && text.includes('TARGET_FILENAME');
}

function createBootstrapSource() {
  return [
    "import { app, session } from 'electron';",
    "import { basename, dirname, join } from 'node:path';",
    "import { existsSync } from 'node:fs';",
    "import { fileURLToPath } from 'node:url';",
    '',
    "const TARGET_FILENAME = 'workbench.desktop.main.js';",
    "const TRANSLATED_FILENAME = 'workbench.desktop.main_translated.js';",
    "const MAIN_TRANSLATED_FILENAME = 'main_translated.js';",
    "const TARGET_SCHEME = 'vscode-file';",
    'const BOOTSTRAP_DIR = dirname(fileURLToPath(import.meta.url));',
    'const MAIN_ENTRY = existsSync(join(BOOTSTRAP_DIR, MAIN_TRANSLATED_FILENAME))',
    "  ? './main_translated.js'",
    "  : './main.js';",
    '',
    'function toVscodePath(url) {',
    '  try {',
    '    if (typeof url !== "string") return null;',
    '    const parsed = new URL(url);',
    '    if (parsed.protocol !== `${TARGET_SCHEME}:`) return null;',
    '    let pathname = decodeURIComponent(parsed.pathname);',
    "    if (process.platform === 'win32' && pathname.startsWith('/') && pathname[2] === ':') {",
    '      pathname = pathname.slice(1);',
    '    }',
    '    return pathname;',
    '  } catch {',
    '    return null;',
    '  }',
    '}',
    '',
    'function translatedUrl(url) {',
    '  try {',
    '    const parsed = new URL(url);',
    '    const nextPath = join(dirname(parsed.pathname), TRANSLATED_FILENAME).replace(/\\\\/g, "/");',
    '    parsed.pathname = nextPath;',
    '    return parsed.toString();',
    '  } catch {',
    '    return url;',
    '  }',
    '}',
    '',
    'function shouldRedirect(filePath) {',
    '  if (!filePath) return false;',
    '  if (basename(filePath) !== TARGET_FILENAME) return false;',
    '  return existsSync(join(dirname(filePath), TRANSLATED_FILENAME));',
    '}',
    '',
    'function installRedirect() {',
    '  const original = session.defaultSession.protocol.registerFileProtocol;',
    '  session.defaultSession.protocol.registerFileProtocol = function patchedRegister(scheme, handler) {',
    '    if (scheme !== TARGET_SCHEME) {',
    '      return original.call(this, scheme, handler);',
    '    }',
    '',
    '    return original.call(this, scheme, (request, callback) => {',
    '      const filePath = toVscodePath(request.url);',
    '      if (!shouldRedirect(filePath)) {',
    '        return handler(request, callback);',
    '      }',
    '',
    '      return handler({ ...request, url: translatedUrl(request.url) }, callback);',
    '    });',
    '  };',
    '}',
    '',
    'function installRuntimeHandlers() {',
    '  installRedirect();',
    '}',
    '',
    'if (app.isReady()) installRuntimeHandlers();',
    'else app.whenReady().then(installRuntimeHandlers);',
    '',
    'await import(MAIN_ENTRY);',
    '',
  ].join('\n');
}

function detectCursorInstallDir() {
  const candidates = [];

  const addIfValid = (dir) => {
    if (!dir) return;
    const pkg = path.join(dir, 'resources', 'app', 'package.json');
    if (fs.existsSync(pkg)) candidates.push(dir);
  };

  // 1. 环境变量
  if (process.env.CURSOR_INSTALL_DIR) {
    addIfValid(process.env.CURSOR_INSTALL_DIR);
  }

  // 2. 注册表探测
  const registryPaths = [
    'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  ];
  for (const regPath of registryPaths) {
    try {
      const result = childProcess.execSync(
        `reg query "${regPath}" /s /f "Cursor" /d 2>nul`,
        { encoding: 'utf8', timeout: 5000 }
      );
      const lines = result.split(/\r?\n/);
      for (const line of lines) {
        const m = line.match(/InstallLocation\s+REG_SZ\s+(.+)/i) ||
                  line.match(/DisplayIcon\s+REG_SZ\s+(.+)/i);
        if (m) {
          const dir = path.dirname(m[1].trim());
          addIfValid(dir);
        }
      }
    } catch {}
  }

  // 3. 开始菜单快捷方式
  try {
    const startMenu = path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs');
    const lnkResult = childProcess.execSync(
      `powershell -NoProfile -Command "Get-ChildItem -Path '${startMenu}' -Filter '*Cursor*.lnk' -Recurse -ErrorAction SilentlyContinue | ForEach-Object { \$s = (New-Object -ComObject WScript.Shell).CreateShortcut(\$_.FullName); Write-Output \$s.TargetPath }"`,
      { encoding: 'utf8', timeout: 5000 }
    );
    const lnkLines = lnkResult.split(/\r?\n/).filter(Boolean);
    for (const line of lnkLines) {
      addIfValid(path.dirname(line.trim()));
    }
  } catch {}

  // 4. 常见路径
  const commonPaths = [
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Cursor'),
    path.join(process.env.LOCALAPPDATA || '', 'cursor'),
    path.join(process.env.USERPROFILE || '', 'AppData', 'Local', 'Programs', 'Cursor'),
    path.join(process.env.USERPROFILE || '', 'cursor'),
    path.join(process.env.ProgramFiles || '', 'Cursor'),
    path.join(process.env['ProgramFiles(x86)'] || '', 'Cursor'),
    path.join(WORKSPACE_ROOT, 'cursor'),
  ];
  for (const p of commonPaths) {
    addIfValid(p);
  }

  return candidates[0] || DEFAULT_INSTALL_DIR;
}

function normalizeRuntimeMode(value) {
  if (value === 'performance' || value === 'compatibility') {
    return value;
  }

  throw new Error(`Unsupported runtime mode: ${value}`);
}

function createContext(rawArgs) {
  const detected = detectCursorInstallDir();
  const options = {
    installDir: detected,
    force: false,
    noShortcut: false,
    runtimeMode: 'performance',
  };

  const args = [...rawArgs];
  const command = args.shift() || 'verify';

  while (args.length > 0) {
    const current = args.shift();
    if (current === '--force') {
      options.force = true;
    } else if (current === '--no-shortcut') {
      options.noShortcut = true;
    } else if (current === '--install-dir') {
      options.installDir = path.resolve(args.shift());
    } else if (current === '--runtime-mode') {
      if (command !== 'apply') {
        throw new Error('--runtime-mode is only supported for the apply command');
      }
      options.runtimeMode = normalizeRuntimeMode(args.shift());
    } else {
      throw new Error(`Unknown argument: ${current}`);
    }
  }

  const installDir = options.installDir;
  const resourcesAppDir = path.join(installDir, 'resources', 'app');
  const productJsonPath = path.join(resourcesAppDir, 'product.json');
  const packageJsonPath = path.join(resourcesAppDir, 'package.json');
  const translatorBootstrapPath = path.join(resourcesAppDir, 'out', 'cursorTranslatorMain.js');
  const mainOriginalPath = path.join(resourcesAppDir, 'out', 'main.js');
  const mainTranslatedPath = path.join(resourcesAppDir, 'out', 'main_translated.js');
  const nlsKeysPath = path.join(resourcesAppDir, 'out', 'nls.keys.json');
  const nlsMessagesPath = path.join(resourcesAppDir, 'out', 'nls.messages.json');
  const workbenchOriginalPath = path.join(
    resourcesAppDir,
    'out',
    'vs',
    'workbench',
    'workbench.desktop.main.js'
  );
  const workbenchTranslatedPath = path.join(
    resourcesAppDir,
    'out',
    'vs',
    'workbench',
    'workbench.desktop.main_translated.js'
  );
  const cursorExePath = path.join(installDir, 'Cursor.exe');
  const argvPath = path.join(os.homedir(), '.cursor', 'argv.json');
  const userLocaleMirrorPath = process.env.APPDATA
    ? path.join(process.env.APPDATA, 'Cursor', 'User', 'locale.json')
    : null;
  const userExtensionRoot = path.join(os.homedir(), '.cursor', 'extensions');

  return {
    command,
    options,
    paths: {
      argvPath,
      cursorExePath,
      installDir,
      mainOriginalPath,
      mainTranslatedPath,
      nlsKeysPath,
      nlsMessagesPath,
      packageJsonPath,
      productJsonPath,
      resourcesAppDir,
      translatorBootstrapPath,
      userExtensionRoot,
      userLocaleMirrorPath,
      workbenchOriginalPath,
      workbenchTranslatedPath,
    },
  };
}

function assertPathExists(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} not found: ${filePath}`);
  }
}

function loadInstallMetadata(context) {
  assertPathExists(context.paths.packageJsonPath, 'Cursor package.json');
  assertPathExists(context.paths.mainOriginalPath, 'Cursor main bundle');
  assertPathExists(context.paths.nlsKeysPath, 'Cursor nls keys');
  assertPathExists(context.paths.nlsMessagesPath, 'Cursor nls messages');
  assertPathExists(context.paths.productJsonPath, 'Cursor product.json');
  assertPathExists(context.paths.workbenchOriginalPath, 'Cursor workbench bundle');

  const pkg = readJson(context.paths.packageJsonPath);
  const product = readJson(context.paths.productJsonPath);

  return { pkg, product };
}

function findLanguagePack(extensionRoot) {
  if (!fs.existsSync(extensionRoot)) {
    return null;
  }

  const candidates = fs
    .readdirSync(extensionRoot, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        entry.name.startsWith('ms-ceintl.vscode-language-pack-zh-hans-')
    )
    .map((entry) => {
      const fullPath = path.join(extensionRoot, entry.name);
      const packageJsonPath = path.join(fullPath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        return null;
      }
      const packageJson = readJson(packageJsonPath);
      return {
        path: fullPath,
        version: packageJson.version,
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.version.localeCompare(left.version, undefined, { numeric: true }));

  return candidates[0] || null;
}

function readLegacyBaseMappings(context, options = {}) {
  if (fs.existsSync(BASE_MAPPING_PATH)) {
    return readJson(BASE_MAPPING_PATH);
  }

  if (!fs.existsSync(context.paths.workbenchTranslatedPath)) {
    return [];
  }

  const extracted = parseLegacyWorktreeMappings(readText(context.paths.workbenchTranslatedPath));
  if (options.persist !== false && extracted.length > 0) {
    writeJson(BASE_MAPPING_PATH, extracted);
  }
  return extracted;
}

function readArgvConfig(argvPath) {
  if (!fs.existsSync(argvPath)) {
    return {};
  }
  return parseJsonc(readText(argvPath));
}

function writeLocaleFiles(context) {
  const argvConfig = readArgvConfig(context.paths.argvPath);
  const nextArgv = withLocaleSetting(argvConfig, 'zh-cn');
  writeJson(context.paths.argvPath, nextArgv);

  if (context.paths.userLocaleMirrorPath) {
    writeJson(context.paths.userLocaleMirrorPath, {
      locale: 'zh-cn',
      source: 'cursor-zh-tool',
    });
  }

  return nextArgv;
}

function getManagedExtensionTranslationFiles(context) {
  if (!fs.existsSync(EXTENSION_OVERLAY_PATH)) {
    return [];
  }

  const overlay = readJson(EXTENSION_OVERLAY_PATH);
  return Object.keys(overlay)
    .map((extensionDirName) => {
      const extensionDir = path.join(
        context.paths.resourcesAppDir,
        'extensions',
        extensionDirName
      );
      if (!fs.existsSync(extensionDir)) {
        return null;
      }

      return {
        kind: 'extensionTranslation',
        targetPath: path.join(extensionDir, 'package.nls.zh-cn.json'),
        backupRelativePath: path.join(
          'external',
          'extensions',
          extensionDirName,
          'package.nls.zh-cn.json'
        ),
      };
    })
    .filter(Boolean);
}

function getManagedExternalFiles(context) {
  const files = [
    {
      kind: 'argv',
      targetPath: context.paths.argvPath,
      backupRelativePath: path.join('external', 'argv.json'),
    },
  ];

  if (context.paths.userLocaleMirrorPath) {
    files.push({
      kind: 'localeMirror',
      targetPath: context.paths.userLocaleMirrorPath,
      backupRelativePath: path.join('external', 'locale.json'),
    });
  }

  return files.concat(getManagedExtensionTranslationFiles(context));
}

function ensureBackup(context) {
  const backupDir = path.join(BACKUP_ROOT, timestampLabel());
  ensureDir(backupDir);
  seedOverlayFiles();

  const filesToBackup = [
    context.paths.mainTranslatedPath,
    context.paths.nlsMessagesPath,
    context.paths.packageJsonPath,
    context.paths.translatorBootstrapPath,
    context.paths.workbenchTranslatedPath,
  ].filter((filePath) => fs.existsSync(filePath));

  for (const filePath of filesToBackup) {
    const relativePath = path.relative(context.paths.installDir, filePath);
    const targetPath = path.join(backupDir, relativePath);
    ensureDir(path.dirname(targetPath));
    fs.copyFileSync(filePath, targetPath);
  }

  const externalFiles = getManagedExternalFiles(context).map((entry) => {
    const nextEntry = {
      kind: entry.kind,
      targetPath: entry.targetPath,
      backupRelativePath: entry.backupRelativePath,
      existed: fs.existsSync(entry.targetPath),
    };

    if (nextEntry.existed) {
      const backupTargetPath = path.join(backupDir, entry.backupRelativePath);
      ensureDir(path.dirname(backupTargetPath));
      fs.copyFileSync(entry.targetPath, backupTargetPath);
    }

    return nextEntry;
  });

  writeJson(path.join(backupDir, 'backup-metadata.json'), {
    externalFiles,
  });

  return backupDir;
}

function writeTranslatorBootstrap(context) {
  writeText(context.paths.translatorBootstrapPath, createBootstrapSource());
}

function patchPackageJsonMain(context, pkg) {
  const nextPackage = { ...pkg };

  if (!nextPackage.main_original) {
    nextPackage.main_original = nextPackage.main || './out/main.js';
  }

  nextPackage.main = './out/cursorTranslatorMain.js';
  writeJson(context.paths.packageJsonPath, nextPackage);

  return nextPackage;
}

function buildTranslatedMainText(mainSource, mergedMappings) {
  // Safety: main.js contains logic-critical literals such as the profile
  // storage folder name "User". Broad UI string replacement here can switch
  // Cursor into a different profile directory and make settings/history look
  // "reset", so we only translate an explicit allowlist of tray menu labels.
  const safeMainMappings = mergedMappings.filter(
    (mapping) =>
      mapping &&
      mapping.searchType === 'exact' &&
      SAFE_MAIN_TRANSLATION_TEXTS.has(mapping.originalText)
  );
  return safeMainMappings.length > 0
    ? applyStaticSourceTranslations(mainSource, safeMainMappings)
    : mainSource;
}

function generateTranslatedMain(context, mergedMappings, precomputedMainText) {
  const generatedMain =
    typeof precomputedMainText === 'string'
      ? precomputedMainText
      : buildTranslatedMainText(readText(context.paths.mainOriginalPath), mergedMappings);

  writeText(GENERATED_MAIN_PATH, generatedMain);
  writeText(context.paths.mainTranslatedPath, generatedMain);
}

function buildTranslatedNlsMessagesPayload(context, languagePack, mergedMappings) {
  const mainI18nPath = path.join(languagePack.path, 'translations', 'main.i18n.json');
  assertPathExists(mainI18nPath, '官方语言包 main.i18n.json');

  const nlsKeys = readJson(context.paths.nlsKeysPath);
  const nlsMessages = readJson(context.paths.nlsMessagesPath);
  const translationContents = readJson(mainI18nPath).contents || {};
  const translatedMessages = [...nlsMessages];
  let messageIndex = 0;

  for (const entry of nlsKeys) {
    const moduleId = Array.isArray(entry) ? entry[0] : null;
    const messageKeys = Array.isArray(entry) ? entry[1] : null;
    const moduleTranslations =
      moduleId && translationContents[moduleId] && typeof translationContents[moduleId] === 'object'
        ? translationContents[moduleId]
        : {};

    if (!Array.isArray(messageKeys)) {
      continue;
    }

    for (const messageKey of messageKeys) {
      const originalText = translatedMessages[messageIndex];
      const officialTranslation =
        typeof moduleTranslations[messageKey] === 'string'
          ? moduleTranslations[messageKey]
          : originalText;

      translatedMessages[messageIndex] = translateTextWithMappings(
        officialTranslation,
        mergedMappings
      );
      messageIndex += 1;
    }
  }

  return translatedMessages;
}

function generateTranslatedNlsMessages(
  context,
  languagePack,
  mergedMappings,
  precomputedMessages
) {
  const translatedMessages = Array.isArray(precomputedMessages)
    ? precomputedMessages
    : buildTranslatedNlsMessagesPayload(context, languagePack, mergedMappings);

  writeJson(GENERATED_NLS_MESSAGES_PATH, translatedMessages);
  writeJson(context.paths.nlsMessagesPath, translatedMessages);
}

function writeExtensionTranslationFiles(context) {
  const overlay = readJson(EXTENSION_OVERLAY_PATH);
  const writtenFiles = [];

  for (const [extensionDirName, translations] of Object.entries(overlay)) {
    const extensionDir = path.join(
      context.paths.resourcesAppDir,
      'extensions',
      extensionDirName
    );

    if (!fs.existsSync(extensionDir)) {
      continue;
    }

    const targetFile = path.join(extensionDir, 'package.nls.zh-cn.json');
    writeJson(targetFile, translations);
    writtenFiles.push(targetFile);
  }

  return writtenFiles;
}

function buildCursorWinCoverage(context, mappings) {
  if (!fs.existsSync(context.paths.workbenchOriginalPath)) {
    return {
      totalTargetCount: cursorWinCoverageTargets().length,
      bundleTargetCount: 0,
      mappedTargetCount: 0,
      missingTargets: [],
      sourceAvailable: false,
    };
  }

  return {
    ...analyzeCursorWinCoverage({
      workbenchSource: readText(context.paths.workbenchOriginalPath),
      mappings,
      targets: cursorWinCoverageTargets(),
    }),
    sourceAvailable: true,
  };
}

function writeManifest(manifest) {
  writeJson(BUILD_MANIFEST_PATH, manifest);
}

function createDesktopShortcut(context) {
  if (process.platform !== 'win32') {
    return null;
  }

  const desktopPath = path.join(os.homedir(), 'Desktop', DESKTOP_SHORTCUT_NAME);
  const launcherPath = path.join(WORKSPACE_ROOT, 'scripts', 'start-cursor-zh.vbs');
  const command = buildShortcutCommand({
    desktopPath,
    launcherPath,
    workspaceRoot: WORKSPACE_ROOT,
    iconPath: context.paths.cursorExePath,
  });

  childProcess.spawnSync('powershell.exe', ['-NoProfile', '-Command', command], {
    stdio: 'inherit',
  });

  return desktopPath;
}

function printReport(title, result) {
  console.log(`\n[${title}]`);
  for (const line of result.info) {
    console.log(`  - ${line}`);
  }
  if (result.warnings?.length > 0) {
    console.log('  Warnings:');
    for (const warning of result.warnings) {
      console.log(`    * ${warning}`);
    }
  }
  if (result.issues.length > 0) {
    console.log('  Issues:');
    for (const issue of result.issues) {
      console.log(`    * ${issue}`);
    }
  } else {
    console.log('  - 未发现阻塞问题。');
  }
}

function printCursorWinCoverage(coverage) {
  console.log('\n[Cursor Win 覆盖]');
  console.log(`  - 目标关键词: ${coverage.totalTargetCount}`);
  console.log(`  - 命中当前 bundle: ${coverage.bundleTargetCount}`);
  console.log(`  - 已覆盖关键词: ${coverage.mappedTargetCount}`);
  console.log(`  - 缺失关键词: ${coverage.missingTargets.length}`);

  if (coverage.missingTargets.length > 0) {
    console.log('  Missing:');
    for (const target of coverage.missingTargets) {
      console.log(`    * ${target}`);
    }
  }
}

function runStart(context) {
  if (!fs.existsSync(context.paths.cursorExePath)) {
    throw new Error(`找不到 Cursor.exe: ${context.paths.cursorExePath}`);
  }

  const child = childProcess.spawn(context.paths.cursorExePath, [], {
    cwd: context.paths.installDir,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  console.log(`已启动 Cursor: ${context.paths.cursorExePath}`);
}

function main() {
  ensureDir(TRANSLATION_BASE_DIR);
  ensureDir(TRANSLATION_OVERLAY_DIR);
  ensureDir(STATE_DIR);
  ensureDir(BACKUP_ROOT);
  ensureDir(GENERATED_DIR);

  const context = createContext(process.argv.slice(2));
  assertCommandAllowed(context.command);

  switch (context.command) {
    case 'apply':
      runApply(context);
      break;
    case 'ensure':
      runEnsure(context);
      break;
    case 'verify':
      runVerify(context);
      break;
    case 'start':
      runStart(context);
      break;
    case 'toggle':
      runToggle(context);
      break;
    case 'disable':
      runDisable(context);
      break;
    case 'enable':
      runEnable(context);
      break;
    case 'status':
      runStatus(context);
      break;
    default:
      throw new Error(`Unknown command: ${context.command}`);
  }
}

const DYNAMIC_MAPPING_PATH = path.join(
  TRANSLATION_OVERLAY_DIR,
  'cursor-win.dynamic.json'
);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function syncJsonArrayFileWithDefaults(filePath, defaults) {
  const existing = asArray(readJsonIfExists(filePath, []));
  const merged = mergeMappings(defaults, existing);
  writeJson(filePath, merged);
  return merged;
}

function seedOverlayFiles() {
  ensureDir(TRANSLATION_OVERLAY_DIR);

  syncJsonArrayFileWithDefaults(OVERLAY_MAPPING_PATH, defaultOverlayMappings());
  syncJsonArrayFileWithDefaults(
    CURSOR_WIN_COMMON_PATH,
    defaultCursorWinCommonMappings()
  );
  syncJsonArrayFileWithDefaults(
    DYNAMIC_MAPPING_PATH,
    defaultCursorWinDynamicMappings()
  );

  if (!fs.existsSync(EXTENSION_OVERLAY_PATH)) {
    writeJson(EXTENSION_OVERLAY_PATH, {
      'cursor-always-local': {
        displayName: 'Cursor 本地优先',
        description: 'Cursor 的实验功能',
      },
      'cursor-retrieval': {
        displayName: 'AI 补全',
        description: '从代码语言模型获取补全。',
      },
      'cursor-shadow-workspace': {
        displayName: 'Cursor 隐藏工作区',
        description:
          '管理一个隐藏的本地窗口，供 AI 智能体在把代码展示给你之前先在本地整理和完善。',
      },
    });
  }

}

function loadMergedMappings(context, options = {}) {
  if (options.seed !== false) {
    seedOverlayFiles();
  }
  const baseMappings = readLegacyBaseMappings(context, {
    persist: options.persistBaseMappings,
  });
  const overlayMappings = asArray(readJsonIfExists(OVERLAY_MAPPING_PATH, []));
  const cursorWinCommonMappings = asArray(readJsonIfExists(CURSOR_WIN_COMMON_PATH, []));
  const dynamicMappings = asArray(readJsonIfExists(DYNAMIC_MAPPING_PATH, []));
  return {
    baseMappings,
    overlayMappings,
    cursorWinCommonMappings,
    dynamicMappings,
    mergedMappings: mergeMappings(
      mergeMappings(
        mergeMappings(baseMappings, overlayMappings),
        cursorWinCommonMappings
      ),
      dynamicMappings
    ),
  };
}

function buildRuntimeConfig(runtimeMode = 'performance') {
  const normalizedRuntimeMode = normalizeRuntimeMode(runtimeMode);
  const commonConfig = {
    stageDocumentRoot: false,
    shortExactTextFallback: false,
    observeScopeSelectors: [
      '[class*="settings"]',
      '[class*="marketplace"]',
      '[class*="plugin"]',
      '[class*="skill"]',
      '[class*="subagent"]',
      '[class*="mcp"]',
      '[class*="onboarding"]',
      '[role="dialog"]',
      '[role="menu"]',
    ],
    observeAttributesOnly: true,
    observeDiscoveryAttributes: false,
    skipSubtreeOnBusy: true,
    marketplaceRemoteTranslationEnabled: false,
  };

  if (normalizedRuntimeMode === 'compatibility') {
    return {
      mode: 'compatibility',
      ...commonConfig,
      rescanDelaysMs: [300, 1500],
    };
  }

  return {
    mode: 'performance',
    ...commonConfig,
    rescanDelaysMs: [],
  };
}

function selectRuntimeMappingsForMode(workbenchSource, mergedMappings, runtimeMode) {
  const selectedRuntimeMappings = selectRuntimeMappings(workbenchSource, mergedMappings);
  return selectedRuntimeMappings;
}

function buildRuntimeMappingsInfo(context, mappingInfo, runtimeMode) {
  const workbenchSource = fs.existsSync(context.paths.workbenchOriginalPath)
    ? readText(context.paths.workbenchOriginalPath)
    : '';
  return {
    workbenchSource,
    runtimeMappings: selectRuntimeMappingsForMode(
      workbenchSource,
      mappingInfo.mergedMappings,
      runtimeMode
    ),
  };
}

function summarizeInstalledRuntimeFootprint(
  generatedBundle,
  translatedSourceText,
  runtimeMappings
) {
  return summarizeRuntimeFootprint(generatedBundle, translatedSourceText, runtimeMappings);
}

function parseInstalledRuntimeArtifact(bundleText) {
  const text = String(bundleText || '');
  if (!text.includes('Cursor ZH generated runtime')) {
    return null;
  }

  const metadataMatch = text.match(/const translationMetadata = (.+);\n/);
  const runtimeMappingsMatch = text.match(
    /const translationMappings = (\[[\s\S]*?\]);\n  const productTipMappings = /
  );
  const headerMatch = text.match(
    /^\/\* Cursor ZH generated runtime: do not edit generated file directly\. \*\/[\s\S]*?\n\}\)\(\);\n?/
  );

  if (!metadataMatch || !runtimeMappingsMatch || !headerMatch) {
    return null;
  }

  const metadata = JSON.parse(metadataMatch[1]);
  const runtimeMappings = JSON.parse(runtimeMappingsMatch[1]);
  const runtimeHeaderChars = headerMatch[0].length;

  return {
    metadata,
    runtimeMappings,
    translatedSourceText: text.slice(runtimeHeaderChars),
    runtimeStrategy: {
      mode: metadata?.runtimeConfig?.mode || 'performance',
      runtimeMappingCount: runtimeMappings.length,
      runtimeHeaderChars,
      runtimeHeaderKB: +(runtimeHeaderChars / 1024).toFixed(1),
    },
  };
}

function generateTranslatedWorkbench(
  context,
  metadata,
  mergedMappings,
  runtimeMappings,
  workbenchSource,
  staticTranslationResult,
  contractEvaluation
) {
  const effectiveWorkbenchSource =
    typeof workbenchSource === 'string'
      ? workbenchSource
      : readText(context.paths.workbenchOriginalPath);
  const resolvedStaticTranslationResult =
    staticTranslationResult ||
    applyStaticSourceTranslationsDetailed(effectiveWorkbenchSource, mergedMappings);
  const resolvedContractEvaluation =
    contractEvaluation ||
    evaluatePatchContracts({
      runtimeMode: metadata?.runtimeConfig?.mode || 'performance',
      contracts: resolvedStaticTranslationResult.contracts,
    });

  if (resolvedContractEvaluation.issues.length > 0) {
    throw new Error(resolvedContractEvaluation.issues.join('\n'));
  }

  const generatedBundle = buildTranslatedWorkbenchBundle({
    workbenchSource: effectiveWorkbenchSource,
    mappings: mergedMappings,
    runtimeMappings,
    metadata,
  });
  const runtimeFootprint = summarizeInstalledRuntimeFootprint(
    generatedBundle,
    resolvedStaticTranslationResult.translatedSource,
    runtimeMappings
  );

  writeText(GENERATED_WORKBENCH_PATH, generatedBundle);
  writeText(context.paths.workbenchTranslatedPath, generatedBundle);

  return {
    contractEvaluation: resolvedContractEvaluation,
    generatedBundle,
    runtimeFootprint,
    staticTranslationResult: resolvedStaticTranslationResult,
  };
}

function buildDynamicCoverage(context, mappings, targets) {
  if (!fs.existsSync(context.paths.workbenchOriginalPath)) {
    return {
      totalRuleCount: targets.length,
      bundleRuleCount: 0,
      mappedRuleCount: 0,
      missingRules: [],
      sourceAvailable: false,
    };
  }

  return {
    ...analyzeDynamicRuleCoverage({
      workbenchSource: readText(context.paths.workbenchOriginalPath),
      mappings,
      targets,
    }),
    sourceAvailable: true,
  };
}

function buildProductTipsCoverage(mappings) {
  return analyzeProductTipsCoverage({
    mappings,
    targets: productTipsCoverageTargets(),
  });
}

function buildRuntimeStrategyReport(
  mappingInfo,
  runtimeMappings,
  runtimeFootprint,
  runtimeMode
) {
  const fullRuntimeConfig = buildRuntimeConfig(runtimeMode);
  const actualRuntimeMappingCount = runtimeFootprint?.runtimeMappingCount ?? 0;
  const actualInjectedMappingCount = Array.isArray(runtimeMappings)
    ? runtimeMappings.length
    : actualRuntimeMappingCount;
  return {
    mode: fullRuntimeConfig.mode,
    rescanDelaysMs: fullRuntimeConfig.rescanDelaysMs,
    scopeSelectorCount: fullRuntimeConfig.observeScopeSelectors.length,
    marketplaceRemoteTranslationEnabled:
      Boolean(fullRuntimeConfig.marketplaceRemoteTranslationEnabled),
    runtimeMappingCount: actualRuntimeMappingCount,
    runtimeHeaderChars: runtimeFootprint?.runtimeHeaderChars ?? 0,
    runtimeHeaderKB: runtimeFootprint?.runtimeHeaderKB ?? 0,
    prunedMappingCount: Math.max(
      mappingInfo.mergedMappings.length - actualInjectedMappingCount,
      0
    ),
  };
}

function detectAppliedRuntimeMode(context) {
  if (fs.existsSync(context.paths.workbenchTranslatedPath)) {
    const translatedWorkbenchArtifact = parseInstalledRuntimeArtifact(
      readText(context.paths.workbenchTranslatedPath)
    );
    if (translatedWorkbenchArtifact?.runtimeStrategy?.mode) {
      return translatedWorkbenchArtifact.runtimeStrategy.mode;
    }
  }

  if (fs.existsSync(BUILD_MANIFEST_PATH)) {
    const manifestRuntimeMode = readJsonIfExists(BUILD_MANIFEST_PATH, null)?.runtimeStrategy?.mode;
    if (manifestRuntimeMode === 'performance' || manifestRuntimeMode === 'compatibility') {
      return manifestRuntimeMode;
    }
  }

  return 'performance';
}

function buildManifest(
  context,
  installMetadata,
  languagePack,
  mappingInfo,
  backupDir,
  cursorWinCoverage,
  dynamicCoverage,
  productTipsCoverage,
  runtimeStrategy,
  staticPatchContracts,
  staticPatchContractEvaluation
) {
  return {
    generatedAt: new Date().toISOString(),
    workspaceRoot: WORKSPACE_ROOT,
    installDir: context.paths.installDir,
    backupDir,
    cursorVersion: installMetadata.pkg.version,
    cursorDistro: installMetadata.pkg.distro,
    vscodeVersion: installMetadata.product.vscodeVersion,
    languagePack: languagePack
      ? {
          path: languagePack.path,
          version: languagePack.version,
          compatibility: compareLanguagePackVersion(
            languagePack.version,
            installMetadata.product.vscodeVersion
          ),
        }
      : null,
    mappingCounts: {
      base: mappingInfo.baseMappings.length,
      overlay: mappingInfo.overlayMappings.length,
      cursorWinCommon: mappingInfo.cursorWinCommonMappings.length,
      dynamic: mappingInfo.dynamicMappings.length,
      merged: mappingInfo.mergedMappings.length,
      runtime: runtimeStrategy.runtimeMappingCount,
      prunedForRuntime: runtimeStrategy.prunedMappingCount,
      scopeSelectors: runtimeStrategy.scopeSelectorCount,
    },
    cursorWinCoverage,
    dynamicCoverage,
    productTipsCoverage,
    runtimeStrategy,
    staticPatchContracts,
    staticPatchContractEvaluation,
    files: {
      packageJsonPath: context.paths.packageJsonPath,
      translatorBootstrapPath: context.paths.translatorBootstrapPath,
      mainOriginalPath: context.paths.mainOriginalPath,
      mainTranslatedPath: context.paths.mainTranslatedPath,
      nlsKeysPath: context.paths.nlsKeysPath,
      nlsMessagesPath: context.paths.nlsMessagesPath,
      workbenchOriginalPath: context.paths.workbenchOriginalPath,
      workbenchTranslatedPath: context.paths.workbenchTranslatedPath,
      argvPath: context.paths.argvPath,
      localeMirrorPath: context.paths.userLocaleMirrorPath,
      cursorWinCommonPath: CURSOR_WIN_COMMON_PATH,
      dynamicMappingPath: DYNAMIC_MAPPING_PATH,
    },
    hashes: {
      packageJson: sha256OfFile(context.paths.packageJsonPath),
      translatorBootstrap: sha256OfFile(context.paths.translatorBootstrapPath),
      mainOriginal: sha256OfFile(context.paths.mainOriginalPath),
      mainTranslated: sha256OfFile(context.paths.mainTranslatedPath),
      generatedMain: sha256OfFile(GENERATED_MAIN_PATH),
      nlsMessages: sha256OfFile(context.paths.nlsMessagesPath),
      generatedNlsMessages: sha256OfFile(GENERATED_NLS_MESSAGES_PATH),
      workbenchOriginal: sha256OfFile(context.paths.workbenchOriginalPath),
      workbenchTranslated: sha256OfFile(context.paths.workbenchTranslatedPath),
      generatedWorkbench: sha256OfFile(GENERATED_WORKBENCH_PATH),
    },
  };
}

function verifyState(context, installMetadata, languagePack) {
  const packageJson = installMetadata.pkg;
  const issues = [];
  const info = [];
  const warnings = [];

  if (!languagePack) {
    issues.push('未找到官方简体中文语言包扩展。');
  } else {
    const compatibility = compareLanguagePackVersion(
      languagePack.version,
      installMetadata.product.vscodeVersion
    );
    if (!compatibility.compatible) {
      issues.push(
        `语言包版本 ${languagePack.version} 与 Cursor 内置 VS Code ${installMetadata.product.vscodeVersion} 不兼容。`
      );
    } else {
      info.push(
        `语言包 ${languagePack.version} 与 Cursor 内置 VS Code ${installMetadata.product.vscodeVersion} 兼容。`
      );
    }
  }

  const argvConfig = readArgvConfig(context.paths.argvPath);
  if (argvConfig.locale !== 'zh-cn') {
    issues.push('argv.json 中的 locale 不是 zh-cn。');
  } else {
    info.push('argv.json 已设置为 zh-cn。');
  }

  if (packageJson.main !== './out/cursorTranslatorMain.js') {
    issues.push('resources/app/package.json 入口未指向汉化 bootstrap。');
  } else {
    info.push('package.json 已指向 cursorTranslatorMain.js。');
  }

  if (!fs.existsSync(context.paths.translatorBootstrapPath)) {
    issues.push('缺少 cursorTranslatorMain.js。');
  } else if (!isTranslatorBootstrapSource(readText(context.paths.translatorBootstrapPath))) {
    issues.push('cursorTranslatorMain.js 存在，但不是当前生成器写入的 bootstrap。');
  } else {
    info.push('cursorTranslatorMain.js 存在且为当前 bootstrap。');
  }

  if (!fs.existsSync(context.paths.mainTranslatedPath)) {
    issues.push('缺少 main_translated.js。');
  } else {
    info.push('translated main 文件已生成。');
    if (
      fs.existsSync(GENERATED_MAIN_PATH) &&
      sha256OfFile(context.paths.mainTranslatedPath) !== sha256OfFile(GENERATED_MAIN_PATH)
    ) {
      issues.push('已安装的 main_translated.js 与当前生成产物不一致。');
    }
  }

  if (!fs.existsSync(GENERATED_NLS_MESSAGES_PATH)) {
    issues.push('缺少生成的 nls.messages 文件。');
  } else if (sha256OfFile(context.paths.nlsMessagesPath) !== sha256OfFile(GENERATED_NLS_MESSAGES_PATH)) {
    issues.push('nls.messages.json 未同步到当前生成产物。');
  } else {
    info.push('translated nls 消息文件已生成。');
  }

  if (!fs.existsSync(context.paths.workbenchTranslatedPath)) {
    issues.push('缺少 workbench.desktop.main_translated.js。');
  } else {
    const translatedText = readText(context.paths.workbenchTranslatedPath);
    if (!translatedText.includes('Cursor ZH generated runtime')) {
      issues.push('translated workbench 文件存在，但不是当前生成器写入的产物。');
    } else {
      info.push('translated workbench 文件已生成。');
    }
    if (
      fs.existsSync(GENERATED_WORKBENCH_PATH) &&
      sha256OfFile(context.paths.workbenchTranslatedPath) !== sha256OfFile(GENERATED_WORKBENCH_PATH)
    ) {
      issues.push('已安装的 workbench.desktop.main_translated.js 与当前生成产物不一致。');
    }
  }

  if (!fs.existsSync(BASE_MAPPING_PATH)) {
    issues.push('基础翻译源不存在。');
  } else {
    info.push('基础翻译源存在。');
  }

  const mappingInfo = loadMergedMappings(context, {
    seed: false,
    persistBaseMappings: false,
  });
  if (!fs.existsSync(OVERLAY_MAPPING_PATH)) {
    issues.push('覆盖翻译源不存在。');
  } else {
    info.push('覆盖翻译源存在。');
  }
  if (!fs.existsSync(CURSOR_WIN_COMMON_PATH)) {
    issues.push('Cursor Win 常用页面覆盖源不存在。');
  } else {
    info.push('Cursor Win 常用页面覆盖源存在。');
  }
  if (!fs.existsSync(DYNAMIC_MAPPING_PATH)) {
    issues.push('Cursor Win 动态规则覆盖源不存在。');
  } else {
    info.push('Cursor Win 动态规则覆盖源存在。');
  }

  const runtimeMode = detectAppliedRuntimeMode(context);
  const runtimeMappingsInfo = buildRuntimeMappingsInfo(context, mappingInfo, runtimeMode);
  const cursorWinCoverage = buildCursorWinCoverage(context, mappingInfo.mergedMappings);
  const dynamicCoverage = buildDynamicCoverage(
    context,
    mappingInfo.dynamicMappings,
    defaultCursorWinDynamicMappings()
  );
  const productTipsCoverage = buildProductTipsCoverage(mappingInfo.mergedMappings);
  const installedRuntimeArtifact = fs.existsSync(context.paths.workbenchTranslatedPath)
    ? parseInstalledRuntimeArtifact(readText(context.paths.workbenchTranslatedPath))
    : null;
  const runtimeFootprint = installedRuntimeArtifact
    ? {
        runtimeMappingCount:
          installedRuntimeArtifact.runtimeStrategy.runtimeMappingCount,
        runtimeHeaderChars:
          installedRuntimeArtifact.runtimeStrategy.runtimeHeaderChars,
        runtimeHeaderKB: installedRuntimeArtifact.runtimeStrategy.runtimeHeaderKB,
      }
    : summarizeRuntimeFootprint('', '', runtimeMappingsInfo.runtimeMappings);
  const runtimeStrategy = buildRuntimeStrategyReport(
    mappingInfo,
    installedRuntimeArtifact?.runtimeMappings ?? runtimeMappingsInfo.runtimeMappings,
    runtimeFootprint,
    installedRuntimeArtifact?.runtimeStrategy?.mode ?? runtimeMode
  );
  const staticPatchContracts = installedRuntimeArtifact
    ? summarizeStaticPatchContractsFromTranslatedSource(
        installedRuntimeArtifact.translatedSourceText
      )
    : {};
  const staticPatchContractEvaluation = evaluatePatchContracts({
    runtimeMode: installedRuntimeArtifact?.runtimeStrategy?.mode ?? runtimeMode,
    contracts: staticPatchContracts,
  });

  if (productTipsCoverage.missingTips.length > 0) {
    warnings.push('Product tips coverage is missing maintained targets.');
  }

  if (!cursorWinCoverage.sourceAvailable) {
    warnings.push('无法读取 workbench 原始 bundle，未执行 Cursor Win 覆盖检查。');
  } else if (cursorWinCoverage.missingTargets.length > 0) {
    warnings.push('Cursor Win 常用页面仍有未覆盖关键词。');
  }

  if (!dynamicCoverage.sourceAvailable) {
    warnings.push('无法读取 workbench 原始 bundle，未执行动态规则覆盖检查。');
  } else if (dynamicCoverage.missingRules.length > 0) {
    warnings.push('仍有动态规则未命中当前 bundle。');
  }

  warnings.push(...staticPatchContractEvaluation.warnings);
  issues.push(...staticPatchContractEvaluation.issues);

  return {
    issues,
    info,
    warnings,
    cursorWinCoverage,
    dynamicCoverage,
    productTipsCoverage,
    staticPatchContracts,
    staticPatchContractEvaluation,
    runtimeStrategy,
    mappingInfo,
  };
}

function printDynamicCoverage(coverage) {
  console.log('\n[动态规则覆盖]');
  console.log(`  - 目标规则: ${coverage.totalRuleCount}`);
  console.log(`  - 命中当前 bundle: ${coverage.bundleRuleCount}`);
  console.log(`  - 已覆盖规则: ${coverage.mappedRuleCount}`);
  console.log(`  - 缺失规则: ${coverage.missingRules.length}`);

  if (coverage.missingRules.length > 0) {
    for (const rule of coverage.missingRules) {
      console.log(`    * ${rule}`);
    }
  }
}

function printProductTipsCoverage(coverage) {
  console.log('\n[Product Tips Coverage]');
  console.log(`  - Total tips: ${coverage.totalTipCount}`);
  console.log(`  - Mapped tips: ${coverage.mappedTipCount}`);
  console.log(`  - Missing tips: ${coverage.missingTips.length}`);

  if (coverage.missingTips.length > 0) {
    for (const tip of coverage.missingTips) {
      console.log(`    * ${tip}`);
    }
  }
}

function printStaticPatchContracts(contracts = {}) {
  console.log('\n[Static Patch Contracts]');

  for (const [contractId, contract] of Object.entries(contracts)) {
    console.log(
      `  - ${contractId}: matches=${contract.matchCount}, fallback=${contract.fallbackMode}, severity=${contract.severityOnMiss}, surface=${contract.surface}`
    );
  }
}

function printRuntimeStrategy(report) {
  console.log('\n[运行时策略]');
  console.log(`  - 运行模式: ${report.mode}`);
  console.log(`  - 补扫延迟: ${Array.isArray(report.rescanDelaysMs) ? report.rescanDelaysMs.join(', ') : 'none'}`);
  console.log(`  - 观察范围选择器: ${report.scopeSelectorCount}`);
  console.log(
    `  - Marketplace 远端描述翻译: ${
      report.marketplaceRemoteTranslationEnabled ? '开启' : '关闭'
    }`
  );
}

function runApply(context) {
  const installMetadata = loadInstallMetadata(context);
  const languagePack = findLanguagePack(context.paths.userExtensionRoot);

  if (!languagePack) {
    throw new Error(
      '未找到官方简体中文语言包。请先在 Cursor 扩展市场安装 Chinese (Simplified) Language Pack。'
    );
  }

  const compatibility = compareLanguagePackVersion(
    languagePack.version,
    installMetadata.product.vscodeVersion
  );
  if (!compatibility.compatible) {
    throw new Error(
      `语言包 ${languagePack.version} 与 Cursor 内置 VS Code ${installMetadata.product.vscodeVersion} 不兼容，请先升级语言包。`
    );
  }

  const backupDir = ensureBackup(context);
  const mappingInfo = loadMergedMappings(context);
  const runtimeMode = context.options.runtimeMode;
  const runtimeMappingsInfo = buildRuntimeMappingsInfo(context, mappingInfo, runtimeMode);
  const runtimeConfig = buildRuntimeConfig(runtimeMode);
  const includeExperimentalRuntimeToggle = shouldIncludeExperimentalRuntimeToggle();
  const staticTranslationResult = applyStaticSourceTranslationsDetailed(
    runtimeMappingsInfo.workbenchSource,
    mappingInfo.mergedMappings
  );
  const staticPatchContractEvaluation = evaluatePatchContracts({
    runtimeMode,
    contracts: staticTranslationResult.contracts,
  });

  if (staticPatchContractEvaluation.issues.length > 0) {
    throw new Error(staticPatchContractEvaluation.issues.join('\n'));
  }

  // Preflight: compute all translated payloads before writing any install files.
  // This prevents partial apply if a later step fails.
  const preflightMainText = buildTranslatedMainText(
    readText(context.paths.mainOriginalPath),
    mappingInfo.mergedMappings
  );
  const preflightNlsMessages = buildTranslatedNlsMessagesPayload(
    context,
    languagePack,
    mappingInfo.mergedMappings
  );

  writeStartLauncherPath(context);
  writeLocaleFiles(context);
  writeTranslatorBootstrap(context);
  const nextPackage = patchPackageJsonMain(context, installMetadata.pkg);
  generateTranslatedMain(context, mappingInfo.mergedMappings, preflightMainText);
  generateTranslatedNlsMessages(
    context,
    languagePack,
    mappingInfo.mergedMappings,
    preflightNlsMessages
  );

  const translatedWorkbench = generateTranslatedWorkbench(
    context,
    {
      version: nextPackage.version,
      distro: nextPackage.distro,
      generatedAt: new Date().toISOString(),
      mappingCount: mappingInfo.mergedMappings.length,
      runtimeMappingCount: runtimeMappingsInfo.runtimeMappings.length,
      runtimeConfig,
      ...(includeExperimentalRuntimeToggle
        ? {
            experimentalRuntimeToggleEnabled: true,
            toggleSignalPath: TOGGLE_SIGNAL_PATH,
          }
        : {}),
    },
    mappingInfo.mergedMappings,
    runtimeMappingsInfo.runtimeMappings,
    runtimeMappingsInfo.workbenchSource,
    staticTranslationResult,
    staticPatchContractEvaluation
  );

  writeExtensionTranslationFiles(context);
  const cursorWinCoverage = buildCursorWinCoverage(context, mappingInfo.mergedMappings);
  const dynamicCoverage = buildDynamicCoverage(
    context,
    mappingInfo.dynamicMappings,
    defaultCursorWinDynamicMappings()
  );
  const productTipsCoverage = buildProductTipsCoverage(mappingInfo.mergedMappings);
  const runtimeStrategy = buildRuntimeStrategyReport(
    mappingInfo,
    runtimeMappingsInfo.runtimeMappings,
    translatedWorkbench.runtimeFootprint,
    runtimeMode
  );

  const manifest = buildManifest(
    context,
    { pkg: nextPackage, product: installMetadata.product },
    languagePack,
    mappingInfo,
    backupDir,
    cursorWinCoverage,
    dynamicCoverage,
    productTipsCoverage,
    runtimeStrategy,
    translatedWorkbench.staticTranslationResult.contracts,
    translatedWorkbench.contractEvaluation
  );
  writeManifest(manifest);

  for (const warning of translatedWorkbench.contractEvaluation.warnings) {
    console.log(`Warning: ${warning}`);
  }

  printStaticPatchContracts(translatedWorkbench.staticTranslationResult.contracts);
  console.log(`Product tips total: ${productTipsCoverage.totalTipCount}`);
  console.log(`Product tips mapped: ${productTipsCoverage.mappedTipCount}`);
  console.log(`Product tips missing: ${productTipsCoverage.missingTips.length}`);

  let shortcutPath = null;
  if (!context.options.noShortcut) {
    shortcutPath = createDesktopShortcut(context);
  }

  console.log(`已完成应用，备份目录：${backupDir}`);
  console.log(`基础翻译条目：${mappingInfo.baseMappings.length}`);
  console.log(`零散覆盖条目：${mappingInfo.overlayMappings.length}`);
  console.log(`Cursor Win 常用页条目：${mappingInfo.cursorWinCommonMappings.length}`);
  console.log(`Cursor Win 动态规则条目：${mappingInfo.dynamicMappings.length}`);
  console.log(`合并后翻译条目：${mappingInfo.mergedMappings.length}`);
  console.log(`Cursor Win 命中 bundle：${cursorWinCoverage.bundleTargetCount}`);
  console.log(`Cursor Win 缺失关键词：${cursorWinCoverage.missingTargets.length}`);
  console.log(`动态规则命中 bundle：${dynamicCoverage.bundleRuleCount}`);
  console.log(`动态规则缺失：${dynamicCoverage.missingRules.length}`);
  console.log(`运行模式：${runtimeStrategy.mode}`);
  console.log(`Runtime mapping count: ${runtimeStrategy.runtimeMappingCount}`);
  console.log(`Runtime header chars: ${runtimeStrategy.runtimeHeaderChars}`);
  console.log(`Runtime header KB: ${runtimeStrategy.runtimeHeaderKB}`);
  console.log(`Pruned from runtime: ${runtimeStrategy.prunedMappingCount}`);
  if (includeExperimentalRuntimeToggle) {
    console.log('实验性 runtime toggle 注入：已启用');
  }
  if (shortcutPath) {
    console.log(`已创建桌面快捷方式：${shortcutPath}`);
  }

  return manifest;
}

function runVerify(context) {
  const installMetadata = loadInstallMetadata(context);
  const languagePack = findLanguagePack(context.paths.userExtensionRoot);
  const result = verifyState(context, installMetadata, languagePack);
  printReport('Cursor 汉化状态', result);
  printCursorWinCoverage(result.cursorWinCoverage);
  printDynamicCoverage(result.dynamicCoverage);
  printProductTipsCoverage(result.productTipsCoverage);
  printStaticPatchContracts(result.staticPatchContracts);
  printRuntimeStrategy(result.runtimeStrategy);
  console.log(`Runtime mapping count: ${result.runtimeStrategy.runtimeMappingCount}`);
  console.log(`Runtime header chars: ${result.runtimeStrategy.runtimeHeaderChars}`);
  console.log(`Runtime header KB: ${result.runtimeStrategy.runtimeHeaderKB}`);
  console.log(`Pruned from runtime: ${result.runtimeStrategy.prunedMappingCount}`);

  if (fs.existsSync(BUILD_MANIFEST_PATH)) {
    const manifest = readJson(BUILD_MANIFEST_PATH);
    console.log('\n[最近一次构建]');
    console.log(`  - 时间: ${manifest.generatedAt}`);
    console.log(`  - Cursor 版本: ${manifest.cursorVersion}`);
    console.log(`  - VS Code 内核: ${manifest.vscodeVersion}`);
    console.log(`  - 合并后翻译条目: ${manifest.mappingCounts?.merged ?? 'unknown'}`);
    console.log(
      `  - Cursor Win 条目: ${manifest.mappingCounts?.cursorWinCommon ?? 'unknown'}`
    );
    console.log(`  - 动态规则条目: ${manifest.mappingCounts?.dynamic ?? 'unknown'}`);
    console.log(`  - 观察范围选择器: ${manifest.mappingCounts?.scopeSelectors ?? 'unknown'}`);
  }

  if (result.issues.length > 0) {
    process.exitCode = 1;
  }
}

function runEnsure(context) {
  const installMetadata = loadInstallMetadata(context);
  const languagePack = findLanguagePack(context.paths.userExtensionRoot);
  const verification = verifyState(context, installMetadata, languagePack);

  if (verification.issues.length === 0 && !context.options.force) {
    printReport('Cursor 汉化状态', verification);
    printCursorWinCoverage(verification.cursorWinCoverage);
    printDynamicCoverage(verification.dynamicCoverage);
    printProductTipsCoverage(verification.productTipsCoverage);
    printStaticPatchContracts(verification.staticPatchContracts);
    printRuntimeStrategy(verification.runtimeStrategy);
    console.log('\n无需重新应用，当前状态已满足要求。');
    return;
  }

  console.log('\n检测到需要修复的项目，开始自动重建汉化层...');
  runApply(context);
}

function isCursorRunning() {
  try {
    const result = childProcess.execSync(
      'powershell -NoProfile -Command "Get-Process Cursor -ErrorAction SilentlyContinue | Select-Object -First 1 Id"',
      { encoding: 'utf8', timeout: 3000 }
    );
    return result.trim().length > 0;
  } catch {
    return false;
  }
}

function readToggleSignal() {
  if (!fs.existsSync(TOGGLE_SIGNAL_PATH)) {
    return { desiredState: 'zh', updatedAt: null, source: 'default' };
  }
  try {
    return JSON.parse(readText(TOGGLE_SIGNAL_PATH));
  } catch {
    return { desiredState: 'zh', updatedAt: null, source: 'default' };
  }
}

function writeToggleSignal(desiredState) {
  const signal = {
    desiredState,
    updatedAt: new Date().toISOString(),
    source: 'cli-toggle',
  };
  writeText(TOGGLE_SIGNAL_PATH, `${JSON.stringify(signal, null, 2)}\n`);
  return signal;
}

function runToggle(context) {
  const current = readToggleSignal();
  const nextState = current.desiredState === 'zh' ? 'en' : 'zh';
  writeToggleSignal(nextState);
  const running = isCursorRunning();
  if (nextState === 'en') {
    console.log('已发送切换信号：中文 → 英文');
  } else {
    console.log('已发送切换信号：英文 → 中文');
  }
  if (running) {
    console.log('Cursor 正在运行，约 2 秒内生效。');
  } else {
    console.log('Cursor 未运行，将在下次启动时生效。');
  }
}

function runDisable(context) {
  writeToggleSignal('en');
  const running = isCursorRunning();
  console.log('已发送切换信号：切换到英文');
  if (running) {
    console.log('Cursor 正在运行，约 2 秒内生效。');
  } else {
    console.log('Cursor 未运行，将在下次启动时生效。');
  }
}

function runEnable(context) {
  writeToggleSignal('zh');
  const running = isCursorRunning();
  console.log('已发送切换信号：切换到中文');
  if (running) {
    console.log('Cursor 正在运行，约 2 秒内生效。');
  } else {
    console.log('Cursor 未运行，将在下次启动时生效。');
  }
}

function runStatus(context) {
  const signal = readToggleSignal();
  const running = isCursorRunning();
  const stateLabel = signal.desiredState === 'zh' ? '中文' : '英文';
  console.log(`当前信号状态：${stateLabel}`);
  console.log(`Cursor 运行状态：${running ? '运行中' : '未运行'}`);
  if (signal.updatedAt) {
    console.log(`最后更新时间：${signal.updatedAt}`);
  }
}

try {
  main();
} catch (error) {
  console.error(`Cursor ZH tool failed: ${error.message}`);
  process.exitCode = 1;
}
