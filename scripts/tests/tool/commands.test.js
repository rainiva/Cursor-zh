const test = require('node:test');
const assert = require('node:assert/strict');

const { createCommandsModule } = require('../../tool/commands.js');
const { createStageTimer } = require('../../tool/timing.js');
const { createSyncStaticPreflightRunner } = require('./mock-static-preflight.js');

test('runApply prints staged timing summary', async () => {
  const lines = [];
  const originalLog = console.log;
  console.log = (line) => lines.push(String(line));

  const commands = createCommandsModule({
    toolPaths: { toggleSignalPath: '/tmp/toggle.json', buildManifestPath: '/tmp/manifest.json' },
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
      mergedMappings: [{ source: 'A', target: 'B' }],
    }),
    buildRuntimeConfig: () => ({ mode: 'performance' }),
    buildRuntimeMappingsInfo: (_context, _mappingInfo, _mode, options = {}) => ({
      workbenchSource: options.workbenchSource || 'workbench',
      runtimeMappings: [{ source: 'A', target: 'B' }],
    }),
    shouldIncludeExperimentalRuntimeToggle: () => false,
    applyStaticSourceTranslationsDetailed: () => ({
      translatedSource: 'translated',
      contracts: {},
    }),
    evaluatePatchContracts: () => ({ issues: [], warnings: [] }),
    buildTranslatedMainText: () => 'main',
    buildTranslatedNlsMessagesPayload: () => [],
    writeStartLauncherPath: () => {},
    writeLocaleFiles: () => {},
    writeTranslatorBootstrap: () => {},
    patchPackageJsonMain: (_context, pkg) => pkg,
    generateTranslatedMain: () => {},
    generateTranslatedNlsMessages: () => {},
    generateTranslatedWorkbench: () => ({
      runtimeFootprint: {
        runtimeMappingCount: 1,
        runtimeHeaderChars: 10,
        runtimeHeaderKB: 0.1,
      },
      staticTranslationResult: { contracts: {} },
      contractEvaluation: { warnings: [] },
    }),
    writeExtensionTranslationFiles: () => {},
    buildCursorWinCoverage: () => ({
      totalTargetCount: 0,
      bundleTargetCount: 0,
      mappedTargetCount: 0,
      missingTargets: [],
      sourceAvailable: true,
    }),
    buildDynamicCoverage: () => ({
      totalRuleCount: 0,
      bundleRuleCount: 0,
      mappedRuleCount: 0,
      missingRules: [],
      sourceAvailable: true,
    }),
    buildProductTipsCoverage: () => ({
      totalTipCount: 0,
      mappedTipCount: 0,
      missingTips: [],
    }),
    defaultCursorWinDynamicMappings: () => [],
    buildRuntimeStrategyReport: () => ({
      mode: 'performance',
      runtimeMappingCount: 1,
      runtimeHeaderChars: 10,
      runtimeHeaderKB: 0.1,
      prunedMappingCount: 0,
    }),
    buildManifest: () => ({ generatedAt: new Date().toISOString() }),
    writeManifest: () => {},
    sha256OfFile: () => 'hash',
    createDesktopShortcut: () => null,
    verifyState: () => ({ issues: [] }),
    printReport: () => {},
    printCursorWinCoverage: () => {},
    printDynamicCoverage: () => {},
    printProductTipsCoverage: () => {},
    printStaticPatchContracts: () => {},
    printRuntimeStrategy: () => {},
    createStageTimer,
    createSessionCache: () => ({
      readTextCached: () => 'workbench',
      sha256Cached: () => 'hash',
    }),
    readText: () => 'workbench',
    runStaticPreflightParallel: createSyncStaticPreflightRunner(),
  });

  const context = {
    options: { noShortcut: true, runtimeMode: 'performance' },
    paths: {
      mainOriginalPath: '/main.js',
      workbenchOriginalPath: '/workbench.js',
    },
  };

  try {
    await commands.runApply(context);
  } finally {
    console.log = originalLog;
  }

  assert.match(lines.join('\n'), /\[Apply 耗时\]/);
  assert.match(lines.join('\n'), /01 检测安装与语言包/);
});
