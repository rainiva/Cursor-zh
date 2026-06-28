const test = require('node:test');
const assert = require('node:assert/strict');

const { createCommandsModule } = require('../../tool/commands.js');
const { runParallelTasksSync } = require('../../tool/parallel.js');
const { createSyncStaticPreflightRunner } = require('./mock-static-preflight.js');

function createMockModule(overrides = {}) {
  const originalPkg = { version: '1.0.0', distro: 'cursor', main: './out/main.js' };
  const deletedFiles = [];
  let patchedPkg = null;
  let packageWrites = [];

  const module = {
    toolPaths: {
      buildManifestPath: '/manifest.json',
      toggleSignalPath: '/toggle.json',
      generatedMainPath: '/g-main.js',
      generatedWorkbenchPath: '/g-wb.js',
    },
    fs: {
      existsSync: () => true,
      unlinkSync: (filePath) => {
        deletedFiles.push(filePath);
      },
    },
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
    writeJson: (_filePath, value) => {
      packageWrites.push(value);
    },
    patchPackageJsonMain: (_c, pkg) => {
      patchedPkg = { ...pkg, main: './out/cursorTranslatorMain.js' };
      packageWrites.push(patchedPkg);
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

  return { module, originalPkg, deletedFiles, packageWrites };
}

test('runApply rolls back bootstrap and package.json when artifact generation fails', async () => {
  const { module, originalPkg, deletedFiles, packageWrites } = createMockModule();
  const { runApply } = createCommandsModule(module);

  const context = {
    options: { runtimeMode: 'performance', noShortcut: true },
    paths: {
      workbenchOriginalPath: '/wb.js',
      mainOriginalPath: '/main.js',
      packageJsonPath: '/app/package.json',
      translatorBootstrapPath: '/app/out/cursorTranslatorMain.js',
    },
  };

  await assert.rejects(
    () => runApply(context),
    /Workbench generation failed/
  );

  assert.equal(packageWrites.length, 2, 'package.json should be patched then restored');
  assert.equal(packageWrites[0].main, './out/cursorTranslatorMain.js');
  assert.equal(packageWrites[1].main, originalPkg.main);
  assert.ok(
    deletedFiles.includes(context.paths.translatorBootstrapPath),
    'bootstrap should be removed on rollback'
  );
});
