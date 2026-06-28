const test = require('node:test');
const assert = require('node:assert/strict');

const { createCommandsModule } = require('../../tool/commands.js');
const { createSyncStaticPreflightRunner } = require('./mock-static-preflight.js');

test('runApply translates auxiliary chunks during 04-05 preflight batch', async () => {
  const preflightBatchKeys = [];
  const auxiliaryCalls = [];

  const { runApply } = createCommandsModule({
    toolPaths: {
      buildManifestPath: '/manifest.json',
      toggleSignalPath: '/toggle.json',
      generatedMainPath: '/g-main.js',
      generatedWorkbenchPath: '/g-wb.js',
      generatedGlassWorkbenchPath: '/g-glass.js',
    },
    fs: {
      existsSync: (filePath) => !String(filePath).includes('glass'),
    },
    readText: (filePath) => {
      if (String(filePath).includes('automations')) {
        return 'const title = "Automations";';
      }
      return 'const label = "General";';
    },
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
      mergedMappings: [
        { originalText: 'General', changeText: '常规', searchType: 'exact' },
        { originalText: 'Automations', changeText: '自动化', searchType: 'exact' },
      ],
    }),
    buildRuntimeConfig: () => ({ mode: 'performance' }),
    createWorkbenchIndex: (sourceText) => ({
      sourceText,
      hasQuotedLiteral: (text) => String(sourceText).includes(`"${text}"`),
      quotedLiterals: new Set(['General']),
      isAuthoritative: true,
    }),
    buildRuntimeMappingsInfo: (_c, _m, _mode, optionsArg = {}) => ({
      workbenchSource: optionsArg.workbenchSources?.[0]?.workbenchSource || '',
      workbenchIndex: optionsArg.workbenchSources?.[0]?.workbenchIndex,
      runtimeMappings: [{ originalText: 'General', changeText: '常规', searchType: 'exact' }],
    }),
    shouldIncludeExperimentalRuntimeToggle: () => false,
    applyStaticSourceTranslationsDetailed: () => ({
      translatedSource: 'translated',
      contracts: {},
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
    runParallelTasks: require('../../tool/parallel.js').runParallelTasksSync,
    runStaticPreflightParallel: createSyncStaticPreflightRunner(),
    generateAuxiliaryWorkbenchChunks: (options) => {
      auxiliaryCalls.push('generate');
      return [
        {
          bundle: { targetFilename: 'workbench.anysphere-ui-automations.js' },
          translatedSource: 'const title = "自动化";',
        },
      ];
    },
    runPreflightBatch: async (tasks) => {
      preflightBatchKeys.push(Object.keys(tasks).sort());
      const results = {};
      for (const [key, task] of Object.entries(tasks)) {
        results[key] = await Promise.resolve().then(() => task());
      }
      return results;
    },
  });

  await runApply({
    options: { runtimeMode: 'performance', noShortcut: true, force: true },
    paths: {
      workbenchOriginalPath: '/wb.js',
      workbenchGlassOriginalPath: '/glass.js',
      mainOriginalPath: '/main.js',
      resourcesAppDir: '/resources/app',
    },
  });

  assert.deepEqual(preflightBatchKeys[0], ['auxiliary', 'main', 'nls', 'static']);
  assert.deepEqual(auxiliaryCalls, ['generate']);
});
