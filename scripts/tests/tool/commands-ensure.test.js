const test = require('node:test');
const assert = require('node:assert/strict');

const { createCommandsModule } = require('../../tool/commands.js');

test('runEnsure returns immediately without apply when fast verify reports no issues', async () => {
  let applyCalls = 0;
  let cursorWinPrintCalls = 0;
  const lines = [];
  const originalLog = console.log;
  console.log = (line) => lines.push(String(line));

  const { runEnsure } = createCommandsModule({
    toolPaths: { buildManifestPath: '/manifest.json' },
    readJson: () => ({}),
    compareLanguagePackVersion: () => ({ compatible: true }),
    findLanguagePack: () => ({ version: '1.0.0' }),
    loadInstallMetadata: () => ({
      pkg: { main: './out/cursorTranslatorMain.js' },
      product: { vscodeVersion: '1.0.0' },
    }),
    verifyState: () => ({
      issues: [],
      info: ['ok'],
      warnings: [],
      cursorWinCoverage: { totalTargetCount: 0, bundleTargetCount: 0, mappedTargetCount: 0, missingTargets: [], sourceAvailable: true },
      dynamicCoverage: { totalRuleCount: 0, bundleRuleCount: 0, mappedRuleCount: 0, missingRules: [], sourceAvailable: true },
      productTipsCoverage: { totalTipCount: 0, mappedTipCount: 0, missingTips: [] },
      staticPatchContracts: {},
      runtimeStrategy: { mode: 'performance' },
    }),
    runApply: () => {
      applyCalls += 1;
    },
    printReport: () => {},
    printCursorWinCoverage: () => {
      cursorWinPrintCalls += 1;
    },
    printDynamicCoverage: () => {},
    printProductTipsCoverage: () => {},
    printStaticPatchContracts: () => {},
    printRuntimeStrategy: () => {},
  });

  try {
    await runEnsure({ options: { force: false }, paths: {} });
  } finally {
    console.log = originalLog;
  }

  assert.equal(applyCalls, 0);
  assert.equal(cursorWinPrintCalls, 0);
  assert.match(lines.join('\n'), /无需重新应用/);
});

test('runApply skips backup when reusing applied artifacts', async () => {
  let backupCalls = 0;
  const manifest = {
    backupDir: '/existing-backup',
    runtimeStrategy: { mode: 'performance', runtimeMappingCount: 1, runtimeHeaderChars: 1, runtimeHeaderKB: 0, prunedMappingCount: 0 },
    cursorWinCoverage: { totalTargetCount: 0, bundleTargetCount: 0, mappedTargetCount: 0, missingTargets: [], sourceAvailable: true },
    dynamicCoverage: { totalRuleCount: 0, bundleRuleCount: 0, mappedRuleCount: 0, missingRules: [], sourceAvailable: true },
    productTipsCoverage: { totalTipCount: 0, mappedTipCount: 0, missingTips: [] },
    staticPatchContracts: {},
    staticPatchContractEvaluation: { issues: [], warnings: [] },
    mappingCounts: { base: 0, overlay: 0, cursorWinCommon: 0, dynamic: 0, merged: 0 },
    mappingSourceSnapshots: {},
    hashes: { workbenchOriginal: 'h', workbenchTranslated: 'h', generatedWorkbench: 'h', mainTranslated: 'h', generatedMain: 'h' },
  };

  const { runApply } = createCommandsModule({
    toolPaths: { buildManifestPath: '/manifest.json', toggleSignalPath: '/toggle.json', generatedMainPath: '/g-main.js', generatedWorkbenchPath: '/g-wb.js' },
    fs: { existsSync: () => true },
    readText: () => '',
    readJson: () => manifest,
    readJsonIfExists: () => manifest,
    compareLanguagePackVersion: () => ({ compatible: true }),
    findLanguagePack: () => ({ version: '1.0.0' }),
    loadInstallMetadata: () => ({ pkg: { version: '1.0.0', distro: 'cursor' }, product: { vscodeVersion: '1.0.0' } }),
    ensureBackup: () => {
      backupCalls += 1;
      return '/new-backup';
    },
    loadMergedMappings: () => { throw new Error('should not load mappings on reuse'); },
    buildRuntimeConfig: () => ({ mode: 'performance' }),
    buildRuntimeMappingsInfo: () => { throw new Error('should not build runtime mappings on reuse'); },
    shouldIncludeExperimentalRuntimeToggle: () => false,
    applyStaticSourceTranslationsDetailed: () => { throw new Error('should not static translate on reuse'); },
    evaluatePatchContracts: () => ({ issues: [], warnings: [] }),
    buildTranslatedMainText: () => 'main',
    buildTranslatedNlsMessagesPayload: () => [],
    writeStartLauncherPath: () => {},
    writeLocaleFiles: () => {},
    writeTranslatorBootstrap: () => {},
    patchPackageJsonMain: (_c, pkg) => pkg,
    generateTranslatedMain: () => {},
    generateTranslatedNlsMessages: () => {},
    generateTranslatedWorkbench: () => { throw new Error('should not generate workbench on reuse'); },
    writeExtensionTranslationFiles: () => {},
    buildCursorWinCoverage: () => { throw new Error('should not analyze coverage on reuse'); },
    buildDynamicCoverage: () => ({}),
    buildProductTipsCoverage: () => ({ totalTipCount: 0, mappedTipCount: 0, missingTips: [] }),
    defaultCursorWinDynamicMappings: () => [],
    buildRuntimeStrategyReport: () => manifest.runtimeStrategy,
    buildManifest: (_c, _i, _l, _m, backupDir) => ({ backupDir }),
    writeManifest: () => {},
    sha256OfFile: () => 'h',
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
    canReuseAppliedArtifacts: () => true,
    createMappingInfoFromManifest: (m) => ({ baseMappings: [], overlayMappings: [], cursorWinCommonMappings: [], dynamicMappings: [], mergedMappings: new Array(m.mappingCounts.merged).fill(null) }),
  });

  await runApply({ options: { runtimeMode: 'performance', noShortcut: true }, paths: { workbenchOriginalPath: '/wb.js', workbenchTranslatedPath: '/wb-t.js', mainTranslatedPath: '/m.js', mainOriginalPath: '/m0.js' } });
  assert.equal(backupCalls, 0);
});
