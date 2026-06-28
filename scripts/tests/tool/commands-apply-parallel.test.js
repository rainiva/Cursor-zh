const test = require('node:test');
const assert = require('node:assert/strict');

const { createCommandsModule } = require('../../tool/commands.js');

function createColdApplyHarness(options = {}) {
  const parallelCalls = [];
  const staticPreflightCalls = [];
  const preflightBatchCalls = [];
  const includeGlass = options.includeGlass === true;

  const { runApply } = createCommandsModule({
    toolPaths: {
      buildManifestPath: '/manifest.json',
      toggleSignalPath: '/toggle.json',
      generatedMainPath: '/g-main.js',
      generatedWorkbenchPath: '/g-wb.js',
      generatedGlassWorkbenchPath: '/g-glass.js',
    },
    fs: {
      existsSync: (filePath) => {
        if (String(filePath).includes('glass')) {
          return includeGlass;
        }
        return true;
      },
    },
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
      mergedMappings: [{ originalText: 'General', changeText: '常规', searchType: 'exact' }],
    }),
    buildRuntimeConfig: () => ({ mode: 'performance' }),
    createWorkbenchIndex: () => ({
      sourceText: 'const label = "General";',
      hasQuotedLiteral: () => true,
      quotedLiterals: new Set(['General']),
    }),
    buildRuntimeMappingsInfo: (_c, _m, _mode, optionsArg = {}) => ({
      workbenchSource: optionsArg.workbenchSources?.[0]?.workbenchSource || '',
      workbenchIndex: optionsArg.workbenchSources?.[0]?.workbenchIndex,
      runtimeMappings: [{ originalText: 'General', changeText: '常规', searchType: 'exact' }],
    }),
    shouldIncludeExperimentalRuntimeToggle: () => false,
    applyStaticSourceTranslationsDetailed: () => ({
      translatedSource: 'translated',
      contracts: { search_models: { matchCount: 1 } },
    }),
    evaluatePatchContracts: () => ({ issues: [], warnings: [] }),
    buildTranslatedMainText: () => 'main-text',
    buildTranslatedNlsMessagesPayload: () => ['nls'],
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
    generateTranslatedGlassWorkbench: () => ({
      runtimeFootprint: { runtimeMappingCount: 1, runtimeHeaderChars: 1, runtimeHeaderKB: 0 },
      staticTranslationResult: { contracts: {} },
      contractEvaluation: { warnings: [] },
    }),
    writeExtensionTranslationFiles: () => {},
    buildCursorWinCoverage: () => ({}),
    buildDynamicCoverage: () => ({}),
    buildProductTipsCoverage: () => ({ totalTipCount: 0, mappedTipCount: 0, missingTips: [] }),
    defaultCursorWinDynamicMappings: () => [],
    buildRuntimeStrategyReport: () => ({
      mode: 'performance',
      runtimeMappingCount: 1,
      runtimeHeaderChars: 1,
      runtimeHeaderKB: 0,
      prunedMappingCount: 0,
    }),
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
    runStaticPreflightParallel: async () => {
      staticPreflightCalls.push('staticPreflight');
      return {
        staticDesktop: {
          result: {
            translatedSource: 'translated',
            contracts: { search_models: { matchCount: 1 } },
          },
          evaluation: { issues: [], warnings: [] },
        },
        staticGlass: {
          result: includeGlass
            ? {
                translatedSource: 'glass-translated',
                contracts: { send_follow_up: { matchCount: 1 } },
              }
            : null,
          evaluation: { issues: [], warnings: [] },
        },
        timing: {
          staticDesktopMs: 1,
          staticGlassMs: includeGlass ? 1 : 0,
          contractMs: 0,
        },
        usedWorkerParallel: true,
      };
    },
    runPreflightBatch: async (tasks) => {
      preflightBatchCalls.push(Object.keys(tasks).sort());
      const results = {};
      for (const [key, task] of Object.entries(tasks)) {
        results[key] = await Promise.resolve().then(() => task());
      }
      return results;
    },
    runParallelTasks: async (tasks) => {
      parallelCalls.push(Object.keys(tasks).sort());
      if (Object.keys(tasks).includes('workbenchDesktop')) {
        return {
          main: undefined,
          nls: undefined,
          workbenchDesktop: {
            runtimeFootprint: { runtimeMappingCount: 1, runtimeHeaderChars: 1, runtimeHeaderKB: 0 },
            staticTranslationResult: { contracts: {} },
            contractEvaluation: { warnings: [] },
          },
          workbenchGlass: includeGlass
            ? {
                runtimeFootprint: { runtimeMappingCount: 1, runtimeHeaderChars: 1, runtimeHeaderKB: 0 },
                staticTranslationResult: { contracts: {} },
                contractEvaluation: { warnings: [] },
              }
            : null,
        };
      }
      return {
        main: 'main-text',
        nls: ['nls'],
      };
    },
  });

  return { runApply, parallelCalls, staticPreflightCalls, preflightBatchCalls };
}

test('runApply parallelizes static translation with main and nls preflight', async () => {
  const { runApply, parallelCalls, staticPreflightCalls, preflightBatchCalls } = createColdApplyHarness();

  await runApply({
    options: { runtimeMode: 'performance', noShortcut: true, force: true },
    paths: {
      workbenchOriginalPath: '/wb.js',
      workbenchGlassOriginalPath: '/glass.js',
      mainOriginalPath: '/main.js',
    },
  });

  assert.deepEqual(preflightBatchCalls[0], ['auxiliary', 'main', 'nls', 'static']);
  assert.deepEqual(staticPreflightCalls, ['staticPreflight']);
  assert.deepEqual(parallelCalls[0], ['main', 'nls', 'workbenchDesktop', 'workbenchGlass']);
});

test('runApply parallelizes main/nls artifacts with workbench bundle generation', async () => {
  const { runApply, parallelCalls } = createColdApplyHarness();

  await runApply({
    options: { runtimeMode: 'performance', noShortcut: true, force: true },
    paths: {
      workbenchOriginalPath: '/wb.js',
      workbenchGlassOriginalPath: '/glass.js',
      mainOriginalPath: '/main.js',
    },
  });

  assert.deepEqual(parallelCalls[0], ['main', 'nls', 'workbenchDesktop', 'workbenchGlass']);
});

test('runApply skips glass preflight when glass bundle is absent', async () => {
  const { runApply, parallelCalls, staticPreflightCalls, preflightBatchCalls } = createColdApplyHarness({ includeGlass: false });

  await runApply({
    options: { runtimeMode: 'performance', noShortcut: true, force: true },
    paths: {
      workbenchOriginalPath: '/wb.js',
      workbenchGlassOriginalPath: '/glass.js',
      mainOriginalPath: '/main.js',
    },
  });

  assert.deepEqual(preflightBatchCalls[0], ['auxiliary', 'main', 'nls', 'static']);
  assert.deepEqual(staticPreflightCalls, ['staticPreflight']);
  assert.deepEqual(parallelCalls[0], ['main', 'nls', 'workbenchDesktop', 'workbenchGlass']);
});
