const test = require('node:test');
const assert = require('node:assert/strict');

const { createCommandsModule } = require('../../tool/commands.js');
const { createSyncStaticPreflightRunner } = require('./mock-static-preflight.js');

const DESKTOP_RECONCILE_ENTRY = {
  originalText: 'Open Agents On Startup',
  changeText: '启动时打开智能体',
};
const GLASS_RECONCILE_ENTRY = {
  originalText: 'Glass Only Entry',
  changeText: '仅 Glass 词条',
};

function createWiringHarness() {
  const captured = {
    desktopWorkbenchIndex: undefined,
    glassWorkbenchIndex: undefined,
    runtimeStrategyMappings: undefined,
    manifest: undefined,
  };

  const baseRuntimeMapping = { originalText: 'General', changeText: '常规', searchType: 'exact' };
  const staticTranslationResult = {
    translatedSource: 'translated',
    contracts: { search_models: { matchCount: 1 } },
  };
  const contractEvaluation = { issues: [], warnings: [] };

  const { runApply } = createCommandsModule({
    toolPaths: {
      buildManifestPath: '/manifest.json',
      toggleSignalPath: '/toggle.json',
      generatedMainPath: '/g-main.js',
      generatedWorkbenchPath: '/g-wb.js',
      generatedGlassWorkbenchPath: '/g-glass.js',
    },
    fs: { existsSync: () => true },
    readText: () => 'const label = "General";',
    readJsonIfExists: () => null,
    compareLanguagePackVersion: () => ({ compatible: true }),
    findLanguagePack: () => ({ version: '1.0.0' }),
    loadInstallMetadata: () => ({
      pkg: { version: '1.0.0', distro: 'cursor', main: './out/main.js' },
      product: { vscodeVersion: '1.0.0' },
    }),
    ensureBackup: () => '/backup',
    loadMergedMappings: () => ({
      baseMappings: [],
      overlayMappings: [],
      cursorWinCommonMappings: [],
      dynamicMappings: [],
      mergedMappings: [baseRuntimeMapping, DESKTOP_RECONCILE_ENTRY],
    }),
    buildRuntimeConfig: () => ({ mode: 'performance' }),
    createWorkbenchIndex: (source) => ({
      sourceText: source,
      hasQuotedLiteral: () => true,
      quotedLiterals: new Set(['General']),
      isAuthoritative: true,
    }),
    buildRuntimeMappingsInfo: (_c, _m, _mode, optionsArg = {}) => ({
      workbenchSource: optionsArg.workbenchSources?.[0]?.workbenchSource || '',
      workbenchIndex: optionsArg.workbenchSources?.[0]?.workbenchIndex,
      runtimeMappings: [baseRuntimeMapping],
    }),
    shouldIncludeExperimentalRuntimeToggle: () => false,
    applyStaticSourceTranslationsDetailed: () => staticTranslationResult,
    evaluatePatchContracts: () => contractEvaluation,
    buildTranslatedMainText: () => 'main-text',
    buildTranslatedNlsMessagesPayload: () => ['nls'],
    writeStartLauncherPath: () => {},
    writeLocaleFiles: () => {},
    writeTranslatorBootstrap: () => {},
    patchPackageJsonMain: (_c, pkg) => pkg,
    generateTranslatedMain: () => {},
    generateTranslatedNlsMessages: () => {},
    generateTranslatedWorkbench: (
      _context,
      _metadata,
      _mergedMappings,
      runtimeMappings,
      _workbenchSource,
      _staticTranslationResult,
      _contractEvaluation,
      workbenchIndex
    ) => {
      captured.desktopWorkbenchIndex = workbenchIndex;
      return {
        runtimeFootprint: { runtimeMappingCount: 2, runtimeHeaderChars: 1, runtimeHeaderKB: 0 },
        staticTranslationResult,
        contractEvaluation,
        runtimeMappings: [...runtimeMappings, DESKTOP_RECONCILE_ENTRY],
        staticReconcile: { count: 1, entries: [DESKTOP_RECONCILE_ENTRY] },
      };
    },
    generateTranslatedGlassWorkbench: (
      _context,
      _metadata,
      _mergedMappings,
      runtimeMappings,
      _workbenchSource,
      _staticTranslationResult,
      _contractEvaluation,
      workbenchIndex
    ) => {
      captured.glassWorkbenchIndex = workbenchIndex;
      return {
        runtimeFootprint: { runtimeMappingCount: 2, runtimeHeaderChars: 1, runtimeHeaderKB: 0 },
        staticTranslationResult,
        contractEvaluation,
        runtimeMappings: [...runtimeMappings, GLASS_RECONCILE_ENTRY],
        staticReconcile: { count: 1, entries: [GLASS_RECONCILE_ENTRY] },
      };
    },
    writeExtensionTranslationFiles: () => {},
    buildCursorWinCoverage: () => ({}),
    buildDynamicCoverage: () => ({}),
    buildProductTipsCoverage: () => ({ totalTipCount: 0, mappedTipCount: 0, missingTips: [] }),
    defaultCursorWinDynamicMappings: () => [],
    buildRuntimeStrategyReport: (_mappingInfo, runtimeMappings) => {
      captured.runtimeStrategyMappings = runtimeMappings;
      return {
        mode: 'performance',
        runtimeMappingCount: runtimeMappings.length,
        runtimeHeaderChars: 1,
        runtimeHeaderKB: 0,
        prunedMappingCount: 0,
      };
    },
    buildManifest: () => ({ generatedAt: new Date().toISOString() }),
    writeManifest: (manifest) => {
      captured.manifest = manifest;
    },
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
    clearCursorExtensionCache: () => ({ removed: [], missing: [] }),
    runParallelTasks: require('../../tool/parallel.js').runParallelTasksSync,
    runStaticPreflightParallel: createSyncStaticPreflightRunner({
      applyStaticSourceTranslationsDetailed: () => staticTranslationResult,
      evaluatePatchContracts: () => contractEvaluation,
    }),
  });

  return { runApply, captured };
}

test('runApply wires workbenchIndex into builders and reports reconciled runtime set (B4)', async () => {
  const { runApply, captured } = createWiringHarness();

  await runApply({
    options: { runtimeMode: 'performance', noShortcut: true, force: true },
    paths: {
      workbenchOriginalPath: '/wb.js',
      workbenchGlassOriginalPath: '/glass.js',
      mainOriginalPath: '/main.js',
    },
  });

  assert.equal(
    typeof captured.desktopWorkbenchIndex?.hasQuotedLiteral,
    'function',
    'generateTranslatedWorkbench 必须收到 workbenchSources[0].workbenchIndex'
  );
  assert.equal(
    typeof captured.glassWorkbenchIndex?.hasQuotedLiteral,
    'function',
    'generateTranslatedGlassWorkbench 必须收到 workbenchSources[1].workbenchIndex'
  );

  assert.ok(Array.isArray(captured.runtimeStrategyMappings));
  assert.ok(
    captured.runtimeStrategyMappings.some(
      (entry) => entry.originalText === DESKTOP_RECONCILE_ENTRY.originalText
    ),
    'runtimeStrategy 报告必须使用 builder 回补后的实际注入集合'
  );

  assert.deepEqual(captured.manifest?.staticReconcile, {
    count: 2,
    entries: [DESKTOP_RECONCILE_ENTRY, GLASS_RECONCILE_ENTRY],
  });
});
