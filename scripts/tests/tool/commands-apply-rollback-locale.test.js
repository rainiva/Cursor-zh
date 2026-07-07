const test = require('node:test');
const assert = require('node:assert/strict');

const { createCommandsModule } = require('../../tool/commands.js');
const { runParallelTasksSync } = require('../../tool/parallel.js');
const { createSyncStaticPreflightRunner } = require('./mock-static-preflight.js');

function buildRollbackModule(overrides = {}) {
  const originalPkg = { version: '1.0.0', distro: 'cursor', main: './out/main.js' };
  const deletedFiles = [];
  let patchedPkg = null;
  const packageWrites = [];
  const fileWrites = {}; // path -> content
  const backupFiles = {
    '/backup/argv.json': JSON.stringify({ locale: 'en' }),
    '/backup/locale.json': JSON.stringify({ locale: 'en', source: 'original' }),
  };

  const fsMock = {
    existsSync: (filePath) => {
      if (filePath in backupFiles) return true;
      return true;
    },
    unlinkSync: (filePath) => {
      deletedFiles.push(filePath);
    },
    readFileSync: (filePath, encoding) => {
      if (filePath in backupFiles) return backupFiles[filePath];
      throw new Error(`File not found in backup: ${filePath}`);
    },
    copyFileSync: () => {},
  };

  const mod = {
    toolPaths: {
      buildManifestPath: '/manifest.json',
      toggleSignalPath: '/toggle.json',
      generatedMainPath: '/g-main.js',
      generatedWorkbenchPath: '/g-wb.js',
    },
    fs: fsMock,
    readText: () => 'const label = "General";',
    readJsonIfExists: () => null,
    compareLanguagePackVersion: () => ({ compatible: true }),
    findLanguagePack: () => ({ version: '1.0.0' }),
    loadInstallMetadata: () => ({
      pkg: originalPkg,
      product: { vscodeVersion: '1.0.0' },
    }),
    ensureBackup: () => '/backup',
    loadMergedMappings: () => ({
      baseMappings: [],
      overlayMappings: [],
      cursorWinCommonMappings: [],
      dynamicMappings: [],
      mergedMappings: [{ originalText: 'General', changeText: '常规', searchType: 'exact' }],
    }),
    buildRuntimeConfig: () => ({ mode: 'performance' }),
    buildRuntimeMappingsInfo: (_c, _m, _mode, options = {}) => ({
      workbenchSource: options.workbenchSource || '',
      runtimeMappings: [{ originalText: 'General', changeText: '常规', searchType: 'exact' }],
    }),
    shouldIncludeExperimentalRuntimeToggle: () => false,
    applyStaticSourceTranslationsDetailed: () => ({ translatedSource: 'ok', contracts: {} }),
    evaluatePatchContracts: () => ({ issues: [], warnings: [] }),
    buildTranslatedMainText: () => 'main',
    buildTranslatedNlsMessagesPayload: () => [],
    writeStartLauncherPath: () => {},
    writeLocaleFiles: () => {},
    writeTranslatorBootstrap: () => {},
    writeJson: (filePath, value) => {
      packageWrites.push({ filePath, value });
      fileWrites[filePath] = value;
    },
    writeText: (filePath, content) => {
      fileWrites[filePath] = content;
    },
    patchPackageJsonMain: (_c, pkg) => {
      patchedPkg = { ...pkg, main: './out/cursorTranslatorMain.js' };
      packageWrites.push({ filePath: '/app/package.json', value: patchedPkg });
      return patchedPkg;
    },
    generateTranslatedMain: () => {},
    generateTranslatedNlsMessages: () => {},
    generateTranslatedWorkbench: () => {
      throw new Error('Workbench generation failed');
    },
    writeExtensionTranslationFiles: () => {},
    buildCursorWinCoverage: () => ({}),
    buildDynamicCoverage: () => ({}),
    buildProductTipsCoverage: () => ({
      totalTipCount: 0,
      mappedTipCount: 0,
      missingTips: [],
    }),
    defaultCursorWinDynamicMappings: () => [],
    buildRuntimeStrategyReport: () => ({
      mode: 'performance',
      runtimeMappingCount: 1,
      runtimeHeaderChars: 1,
      runtimeHeaderKB: 0,
      prunedMappingCount: 0,
    }),
    buildManifest: () => ({ generatedAt: new Date().toISOString() }),
    writeManifest: () => {},
    sha256OfFile: () => 'hash',
    createDesktopShortcut: () => null,
    verifyState: () => ({}),
    printReport: () => {},
    printCursorWinCoverage: () => {},
    printDynamicCoverage: () => {},
    printProductTipsCoverage: () => {},
    printStaticPatchContracts: () => {},
    printRuntimeStrategy: () => {},
    createStageTimer: require('../../tool/timing.js').createStageTimer,
    createSessionCache: require('../../tool/session-cache.js').createSessionCache,
    runParallelTasks: runParallelTasksSync,
    runStaticPreflightParallel: createSyncStaticPreflightRunner(),
    clearCursorExtensionCache: () => ({ removed: [], missing: [] }),
    ...overrides,
  };

  return {
    module: mod,
    originalPkg,
    deletedFiles,
    packageWrites,
    fileWrites,
    backupFiles,
  };
}

function buildContext() {
  return {
    options: { runtimeMode: 'performance', noShortcut: true },
    paths: {
      workbenchOriginalPath: '/wb.js',
      mainOriginalPath: '/main.js',
      packageJsonPath: '/app/package.json',
      translatorBootstrapPath: '/app/out/cursorTranslatorMain.js',
      argvPath: '/home/user/.cursor/argv.json',
      userLocaleMirrorPath: '/home/user/AppData/Cursor/User/locale.json',
    },
  };
}

test('runApply rollback restores argv.json from backup when stage 07-08 fails', async () => {
  const { module, fileWrites, backupFiles } = buildRollbackModule();
  const { runApply } = createCommandsModule(module);
  const context = buildContext();

  await assert.rejects(
    () => runApply(context),
    /Workbench generation failed/
  );

  // argv.json should be restored from backup
  const argvWrite = fileWrites[context.paths.argvPath];
  assert.ok(argvWrite, 'argv.json should be restored during rollback');
  const restoredArgv = typeof argvWrite === 'string' ? JSON.parse(argvWrite) : argvWrite;
  const backupArgv = JSON.parse(backupFiles['/backup/argv.json']);
  assert.deepEqual(restoredArgv, backupArgv, 'argv.json content should match backup');
});

test('runApply rollback restores locale mirror from backup when stage 07-08 fails', async () => {
  const { module, fileWrites, backupFiles } = buildRollbackModule();
  const { runApply } = createCommandsModule(module);
  const context = buildContext();

  await assert.rejects(
    () => runApply(context),
    /Workbench generation failed/
  );

  // locale mirror should be restored from backup
  const localeWrite = fileWrites[context.paths.userLocaleMirrorPath];
  assert.ok(localeWrite, 'locale mirror should be restored during rollback');
  const restoredLocale = typeof localeWrite === 'string' ? JSON.parse(localeWrite) : localeWrite;
  const backupLocale = JSON.parse(backupFiles['/backup/locale.json']);
  assert.deepEqual(restoredLocale, backupLocale, 'locale mirror content should match backup');
});

test('runApply rollback skips locale restore when backup has no locale files', async () => {
  const { module: baseModule, fileWrites } = buildRollbackModule();
  // Override: backup has no locale files
  const noBackupFiles = {};
  baseModule.fs = {
    ...baseModule.fs,
    existsSync: (filePath) => {
      if (filePath === '/backup/argv.json' || filePath === '/backup/locale.json') return false;
      return true;
    },
    readFileSync: (filePath) => {
      throw new Error(`File not found: ${filePath}`);
    },
  };
  const { runApply } = createCommandsModule(baseModule);
  const context = buildContext();

  // Should still throw the original error, not a rollback error
  await assert.rejects(
    () => runApply(context),
    /Workbench generation failed/
  );

  // locale files should NOT be written during rollback (no backup available)
  const argvWrite = fileWrites[context.paths.argvPath];
  assert.equal(argvWrite, undefined, 'argv.json should not be restored when backup is missing');
});

test('runApply rollback still throws original error when locale restore itself fails', async () => {
  const { module: baseModule } = buildRollbackModule();
  // Override: reading backup files throws
  baseModule.fs = {
    ...baseModule.fs,
    existsSync: () => true,
    readFileSync: () => {
      throw new Error('Backup file corrupted');
    },
  };
  const { runApply } = createCommandsModule(baseModule);
  const context = buildContext();

  // Must throw original error, not the rollback error
  await assert.rejects(
    () => runApply(context),
    /Workbench generation failed/
  );
});

test('runApply rollback still deletes bootstrap and restores package.json alongside locale', async () => {
  const { module, originalPkg, deletedFiles, packageWrites } = buildRollbackModule();
  const { runApply } = createCommandsModule(module);
  const context = buildContext();

  await assert.rejects(
    () => runApply(context),
    /Workbench generation failed/
  );

  // package.json restored
  const lastPkgWrite = packageWrites[packageWrites.length - 1];
  assert.equal(lastPkgWrite.value.main, originalPkg.main, 'package.json should be restored');

  // bootstrap deleted
  assert.ok(
    deletedFiles.includes(context.paths.translatorBootstrapPath),
    'bootstrap should be removed on rollback'
  );
});
