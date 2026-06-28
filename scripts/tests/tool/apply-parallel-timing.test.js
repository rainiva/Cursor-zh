const test = require('node:test');
const assert = require('node:assert/strict');

const { createCommandsModule } = require('../../tool/commands.js');
const { createSyncStaticPreflightRunner } = require('./mock-static-preflight.js');

function sleepMs(ms) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    // busy wait for deterministic timing in test
  }
}

function createTimingHarness(options = {}) {
  const capturedManifests = [];
  const desktopDelayMs = options.desktopDelayMs ?? 40;
  const glassDelayMs = options.glassDelayMs ?? 60;
  const includeGlass = options.includeGlass !== false;

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
      isAuthoritative: true,
    }),
    buildRuntimeMappingsInfo: (_c, _m, _mode, optionsArg = {}) => ({
      workbenchSource: optionsArg.workbenchSources?.[0]?.workbenchSource || '',
      workbenchIndex: optionsArg.workbenchSources?.[0]?.workbenchIndex,
      runtimeMappings: [{ originalText: 'General', changeText: '常规', searchType: 'exact' }],
    }),
    shouldIncludeExperimentalRuntimeToggle: () => false,
    applyStaticSourceTranslationsDetailed: (_source, _mappings, _index, optionsArg = {}) => {
      if (optionsArg.bundleRole === 'glass') {
        sleepMs(glassDelayMs);
      } else {
        sleepMs(desktopDelayMs);
      }
      return {
        translatedSource: 'translated',
        contracts: { search_models: { matchCount: 1 } },
      };
    },
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
    buildManifest: (_context, _install, _lp, _mapping, _backup, _cw, _dyn, _tips, _runtime, _contracts, _eval, applyCache) => {
      const manifest = {
        generatedAt: new Date().toISOString(),
        coverageDeferred: true,
        preflightTiming: applyCache?.preflightTiming || null,
      };
      capturedManifests.push(manifest);
      return manifest;
    },
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
    runStaticPreflightParallel: createSyncStaticPreflightRunner({
      applyStaticSourceTranslationsDetailed: (_source, _mappings, _index, optionsArg = {}) => {
        if (optionsArg.bundleRole === 'glass') {
          sleepMs(glassDelayMs);
        } else {
          sleepMs(desktopDelayMs);
        }
        return {
          translatedSource: 'translated',
          contracts: { search_models: { matchCount: 1 } },
        };
      },
      evaluatePatchContracts: () => ({ issues: [], warnings: [] }),
    }),
  });

  return { runApply, capturedManifests };
}

test('runApply records 04-05 preflight sub-stage timing in manifest', async () => {
  const { runApply, capturedManifests } = createTimingHarness({
    desktopDelayMs: 40,
    glassDelayMs: 60,
  });

  await runApply({
    options: { runtimeMode: 'performance', noShortcut: true, force: true },
    paths: {
      workbenchOriginalPath: '/wb.js',
      workbenchGlassOriginalPath: '/glass.js',
      mainOriginalPath: '/main.js',
    },
  });

  assert.equal(capturedManifests.length, 1);
  const timing = capturedManifests[0].preflightTiming;
  assert.ok(timing, 'expected preflightTiming on manifest');
  assert.ok(typeof timing.staticDesktopMs === 'number' && timing.staticDesktopMs >= 35);
  assert.ok(typeof timing.staticGlassMs === 'number' && timing.staticGlassMs >= 55);
  assert.ok(typeof timing.contractMs === 'number' && timing.contractMs >= 0);
});
