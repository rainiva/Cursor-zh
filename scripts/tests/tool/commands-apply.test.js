const test = require('node:test');
const assert = require('node:assert/strict');

const { createCommandsModule } = require('../../tool/commands.js');
const { createStageTimer } = require('../../tool/timing.js');
const { runParallelTasksSync } = require('../../tool/parallel.js');
const { createSyncStaticPreflightRunner } = require('./mock-static-preflight.js');
const { createSessionCache, canReuseAppliedArtifacts, createMappingInfoFromManifest } = require('../../tool/session-cache.js');

test('runApply skips coverage analysis during cold apply and defers to verify', async () => {
  let coverageCalls = 0;
  const { runApply } = createCommandsModule({
    toolPaths: { buildManifestPath: '/manifest.json', toggleSignalPath: '/toggle.json', generatedMainPath: '/g-main.js', generatedWorkbenchPath: '/g-wb.js' },
    fs: { existsSync: () => true },
    readText: () => 'const label = "General";',
    readJsonIfExists: () => null,
    compareLanguagePackVersion: () => ({ compatible: true }),
    findLanguagePack: () => ({ version: '1.0.0' }),
    loadInstallMetadata: () => ({ pkg: { version: '1.0.0', distro: 'cursor', main: './out/main.js' }, product: { vscodeVersion: '1.0.0' } }),
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
    patchPackageJsonMain: (_c, pkg) => pkg,
    generateTranslatedMain: () => {},
    generateTranslatedNlsMessages: () => {},
    generateTranslatedWorkbench: () => ({
      runtimeFootprint: { runtimeMappingCount: 1, runtimeHeaderChars: 1, runtimeHeaderKB: 0 },
      staticTranslationResult: { contracts: {} },
      contractEvaluation: { warnings: [] },
    }),
    writeExtensionTranslationFiles: () => {},
    buildCursorWinCoverage: () => {
      coverageCalls += 1;
      return {};
    },
    buildDynamicCoverage: () => ({}),
    buildProductTipsCoverage: () => ({ totalTipCount: 0, mappedTipCount: 0, missingTips: [] }),
    defaultCursorWinDynamicMappings: () => [],
    buildRuntimeStrategyReport: () => ({ mode: 'performance', runtimeMappingCount: 1, runtimeHeaderChars: 1, runtimeHeaderKB: 0, prunedMappingCount: 0 }),
    buildManifest: () => ({ generatedAt: new Date().toISOString(), coverageDeferred: true }),
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
  });

  await runApply({
    options: { runtimeMode: 'performance', noShortcut: true },
    paths: { workbenchOriginalPath: '/wb.js', mainOriginalPath: '/main.js' },
  });

  assert.equal(coverageCalls, 0);
});

test('runApply builds workbenchIndex once per bundle and reuses it for runtime and static steps', async () => {
  let indexBuildCalls = 0;
  let runtimeOptions = null;
  let staticIndex = null;
  const reusedIndex = {
    sourceText: 'const label = "General";',
    hasQuotedLiteral: () => true,
  };

  const { runApply } = createCommandsModule({
    toolPaths: { buildManifestPath: '/manifest.json', toggleSignalPath: '/toggle.json', generatedMainPath: '/g-main.js', generatedWorkbenchPath: '/g-wb.js' },
    fs: {
      existsSync: (filePath) => !String(filePath).includes('glass'),
    },
    readText: () => 'const label = "General";',
    readJsonIfExists: () => null,
    compareLanguagePackVersion: () => ({ compatible: true }),
    findLanguagePack: () => ({ version: '1.0.0' }),
    loadInstallMetadata: () => ({ pkg: { version: '1.0.0', distro: 'cursor', main: './out/main.js' }, product: { vscodeVersion: '1.0.0' } }),
    ensureBackup: () => '/backup',
    loadMergedMappings: () => ({
      baseMappings: [],
      overlayMappings: [],
      cursorWinCommonMappings: [],
      dynamicMappings: [],
      mergedMappings: [{ originalText: 'General', changeText: '常规', searchType: 'exact' }],
    }),
    buildRuntimeConfig: () => ({ mode: 'performance' }),
    createWorkbenchIndex: () => {
      indexBuildCalls += 1;
      return reusedIndex;
    },
    buildRuntimeMappingsInfo: (_c, _m, _mode, options = {}) => {
      runtimeOptions = options;
      return {
        workbenchSource: options.workbenchSources?.[0]?.workbenchSource,
        workbenchIndex: options.workbenchSources?.[0]?.workbenchIndex,
        runtimeMappings: [],
      };
    },
    shouldIncludeExperimentalRuntimeToggle: () => false,
    applyStaticSourceTranslationsDetailed: (_source, _mappings, workbenchIndex) => {
      staticIndex = workbenchIndex;
      return { translatedSource: 'ok', contracts: {} };
    },
    evaluatePatchContracts: () => ({ issues: [], warnings: [] }),
    buildTranslatedMainText: () => 'main',
    buildTranslatedNlsMessagesPayload: () => [],
    writeStartLauncherPath: () => {},
    writeLocaleFiles: () => {},
    writeTranslatorBootstrap: () => {},
    patchPackageJsonMain: (_c, pkg) => pkg,
    generateTranslatedMain: () => {},
    generateTranslatedNlsMessages: () => {},
    generateTranslatedWorkbench: () => ({
      runtimeFootprint: { runtimeMappingCount: 0, runtimeHeaderChars: 1, runtimeHeaderKB: 0 },
      staticTranslationResult: { contracts: {} },
      contractEvaluation: { warnings: [] },
    }),
    generateTranslatedGlassWorkbench: () => null,
    writeExtensionTranslationFiles: () => {},
    buildCursorWinCoverage: () => ({}),
    buildDynamicCoverage: () => ({}),
    buildProductTipsCoverage: () => ({ totalTipCount: 0, mappedTipCount: 0, missingTips: [] }),
    defaultCursorWinDynamicMappings: () => [],
    buildRuntimeStrategyReport: () => ({ mode: 'performance', runtimeMappingCount: 0, runtimeHeaderChars: 1, runtimeHeaderKB: 0, prunedMappingCount: 0 }),
    buildManifest: () => ({ generatedAt: new Date().toISOString(), coverageDeferred: true }),
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
  });

  await runApply({
    options: { runtimeMode: 'performance', noShortcut: true },
    paths: {
      workbenchOriginalPath: '/wb.js',
      workbenchGlassOriginalPath: '/glass.js',
      mainOriginalPath: '/main.js',
    },
  });

  assert.equal(indexBuildCalls, 1);
  assert.equal(runtimeOptions.workbenchSources[0].workbenchIndex, staticIndex);
  assert.equal(staticIndex.sourceText, reusedIndex.sourceText);
  assert.ok(staticIndex.applicableEmbeddedPatches);
  assert.ok(Array.isArray(staticIndex.applicableEmbeddedPatches.preStatic));
  assert.ok(Array.isArray(staticIndex.applicableEmbeddedPatches.postStatic));
});

test('runApply reuses artifacts when inputs unchanged', async () => {
  let generateTranslatedWorkbenchCalls = 0;
  let staticTranslationCalls = 0;
  let buildCursorWinCoverageCalls = 0;

  const manifest = {
    backupDir: '/existing-backup',
    runtimeStrategy: {
      mode: 'performance',
      runtimeMappingCount: 10,
      runtimeHeaderChars: 100,
      runtimeHeaderKB: 0.1,
      prunedMappingCount: 2,
    },
    cursorWinCoverage: { totalTargetCount: 1, bundleTargetCount: 1, mappedTargetCount: 1, missingTargets: [], sourceAvailable: true },
    dynamicCoverage: { totalRuleCount: 1, bundleRuleCount: 1, mappedRuleCount: 1, missingRules: [], sourceAvailable: true },
    productTipsCoverage: { totalTipCount: 1, mappedTipCount: 1, missingTips: [] },
    staticPatchContracts: { contractA: { matchCount: 1 } },
    staticPatchContractEvaluation: { issues: [], warnings: [] },
    mappingCounts: { base: 1, overlay: 0, cursorWinCommon: 0, dynamic: 0, merged: 1 },
    mappingSourceSnapshots: {},
    hashes: {
      workbenchOriginal: 'same',
      workbenchTranslated: 'same',
      generatedWorkbench: 'same',
      mainTranslated: 'same',
      generatedMain: 'same',
    },
  };

  const { runApply } = createCommandsModule({
    toolPaths: {
      buildManifestPath: '/manifest.json',
      toggleSignalPath: '/toggle.json',
      generatedMainPath: '/generated-main.js',
      generatedWorkbenchPath: '/generated-workbench.js',
    },
    fs: {
      existsSync: () => true,
    },
    readText: () => '',
    readJson: () => manifest,
    readJsonIfExists: (_path, fallback) => manifest,
    compareLanguagePackVersion: () => ({ compatible: true }),
    findLanguagePack: () => ({ version: '1.0.0' }),
    loadInstallMetadata: () => ({
      pkg: { version: '1.0.0', distro: 'cursor' },
      product: { vscodeVersion: '1.0.0' },
    }),
    ensureBackup: () => '/backup',
    loadMergedMappings: () => {
      throw new Error('loadMergedMappings should not run on artifact reuse path');
    },
    buildRuntimeConfig: () => ({ mode: 'performance' }),
    buildRuntimeMappingsInfo: () => {
      throw new Error('buildRuntimeMappingsInfo should not run on artifact reuse path');
    },
    shouldIncludeExperimentalRuntimeToggle: () => false,
    applyStaticSourceTranslationsDetailed: () => {
      staticTranslationCalls += 1;
      return { translatedSource: '', contracts: {} };
    },
    evaluatePatchContracts: () => ({ issues: [], warnings: [] }),
    buildTranslatedMainText: () => 'main',
    buildTranslatedNlsMessagesPayload: () => [],
    writeStartLauncherPath: () => {},
    writeLocaleFiles: () => {},
    writeTranslatorBootstrap: () => {},
    patchPackageJsonMain: (_context, pkg) => pkg,
    generateTranslatedMain: () => {},
    generateTranslatedNlsMessages: () => {},
    generateTranslatedWorkbench: () => {
      generateTranslatedWorkbenchCalls += 1;
      return {
        runtimeFootprint: {},
        staticTranslationResult: { contracts: {} },
        contractEvaluation: { warnings: [] },
      };
    },
    writeExtensionTranslationFiles: () => {},
    buildCursorWinCoverage: () => {
      buildCursorWinCoverageCalls += 1;
      return {};
    },
    buildDynamicCoverage: () => ({}),
    buildProductTipsCoverage: () => ({ totalTipCount: 0, mappedTipCount: 0, missingTips: [] }),
    defaultCursorWinDynamicMappings: () => [],
    buildRuntimeStrategyReport: () => manifest.runtimeStrategy,
    buildManifest: () => manifest,
    writeManifest: () => {},
    sha256OfFile: () => 'same',
    createDesktopShortcut: () => null,
    verifyState: () => ({}),
    printReport: () => {},
    printCursorWinCoverage: () => {},
    printDynamicCoverage: () => {},
    printProductTipsCoverage: () => {},
    printStaticPatchContracts: () => {},
    printRuntimeStrategy: () => {},
    createStageTimer,
    createSessionCache,
    runParallelTasks: runParallelTasksSync,
    runStaticPreflightParallel: createSyncStaticPreflightRunner(),
    canReuseAppliedArtifacts: () => true,
    createMappingInfoFromManifest: (manifest) => ({
      baseMappings: new Array(manifest.mappingCounts.base).fill(null),
      overlayMappings: [],
      cursorWinCommonMappings: [],
      dynamicMappings: [],
      mergedMappings: new Array(manifest.mappingCounts.merged).fill(null),
    }),
  });

  const context = {
    options: { runtimeMode: 'performance', noShortcut: true },
    paths: {
      workbenchOriginalPath: '/workbench.original.js',
      workbenchTranslatedPath: '/workbench.translated.js',
      mainOriginalPath: '/main.original.js',
      mainTranslatedPath: '/main.translated.js',
      userExtensionRoot: '/extensions',
    },
  };

  await runApply(context);

  assert.equal(generateTranslatedWorkbenchCalls, 0);
  assert.equal(staticTranslationCalls, 0);
  assert.equal(buildCursorWinCoverageCalls, 0);
});

test('runApply clears Cursor extension cache to avoid modified-on-disk popup loop', async () => {
  let cacheClearCalls = 0;

  const { runApply } = createCommandsModule({
    toolPaths: { buildManifestPath: '/manifest.json', toggleSignalPath: '/toggle.json', generatedMainPath: '/g-main.js', generatedWorkbenchPath: '/g-wb.js' },
    fs: { existsSync: () => true },
    readText: () => 'const label = "General";',
    readJsonIfExists: () => null,
    compareLanguagePackVersion: () => ({ compatible: true }),
    findLanguagePack: () => ({ version: '1.0.0' }),
    loadInstallMetadata: () => ({ pkg: { version: '1.0.0', distro: 'cursor', main: './out/main.js' }, product: { vscodeVersion: '1.0.0' } }),
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
      runtimeMappings: [],
    }),
    shouldIncludeExperimentalRuntimeToggle: () => false,
    applyStaticSourceTranslationsDetailed: () => ({ translatedSource: 'ok', contracts: {} }),
    evaluatePatchContracts: () => ({ issues: [], warnings: [] }),
    buildTranslatedMainText: () => 'main',
    buildTranslatedNlsMessagesPayload: () => [],
    writeStartLauncherPath: () => {},
    writeLocaleFiles: () => {},
    writeTranslatorBootstrap: () => {},
    patchPackageJsonMain: (_c, pkg) => pkg,
    generateTranslatedMain: () => {},
    generateTranslatedNlsMessages: () => {},
    generateTranslatedWorkbench: () => ({
      runtimeFootprint: { runtimeMappingCount: 0, runtimeHeaderChars: 0, runtimeHeaderKB: 0 },
      staticTranslationResult: { contracts: {} },
      contractEvaluation: { warnings: [] },
    }),
    writeExtensionTranslationFiles: () => {},
    buildCursorWinCoverage: () => ({}),
    buildDynamicCoverage: () => ({}),
    buildProductTipsCoverage: () => ({ totalTipCount: 0, mappedTipCount: 0, missingTips: [] }),
    defaultCursorWinDynamicMappings: () => [],
    buildRuntimeStrategyReport: () => ({ mode: 'performance', runtimeMappingCount: 0, runtimeHeaderChars: 0, runtimeHeaderKB: 0, prunedMappingCount: 0 }),
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
    clearCursorExtensionCache: () => {
      cacheClearCalls += 1;
      return { removed: ['CachedProfilesData'], missing: ['CachedExtensionVSIXs'] };
    },
  });

  await runApply({
    options: { runtimeMode: 'performance', noShortcut: true },
    paths: { workbenchOriginalPath: '/wb.js', mainOriginalPath: '/main.js' },
  });

  assert.equal(cacheClearCalls, 1);
});
