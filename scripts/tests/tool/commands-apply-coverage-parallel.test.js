const test = require('node:test');
const assert = require('node:assert/strict');

const { createCommandsModule } = require('../../tool/commands.js');
const { createStageTimer } = require('../../tool/timing.js');
const { runParallelTasksSync } = require('../../tool/parallel.js');
const { createSyncStaticPreflightRunner } = require('./mock-static-preflight.js');
const { createSessionCache } = require('../../tool/session-cache.js');

// 任务 4.3（B 方案）：覆盖率计算并入 apply 04-05 preflight 并行槽。
// RED 覆盖点：①并行槽内覆盖率结果与串行一致 ②失败传播不被并行吞掉
// ③--defer-coverage 旗标仍生效降级（并行槽不含 coverage 任务）。

function buildDeps(overrides = {}) {
  return {
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
    buildCursorWinCoverage: () => ({
      totalTargetCount: 5,
      bundleTargetCount: 4,
      mappedTargetCount: 3,
      missingTargets: [],
      sourceAvailable: true,
    }),
    buildDynamicCoverage: () => ({
      totalRuleCount: 2,
      bundleRuleCount: 2,
      mappedRuleCount: 2,
      missingRules: [],
      sourceAvailable: true,
    }),
    buildProductTipsCoverage: () => ({ totalTipCount: 0, mappedTipCount: 0, missingTips: [] }),
    defaultCursorWinDynamicMappings: () => [],
    buildRuntimeStrategyReport: () => ({ mode: 'performance', runtimeMappingCount: 1, runtimeHeaderChars: 1, runtimeHeaderKB: 0, prunedMappingCount: 0 }),
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
    createStageTimer,
    createSessionCache,
    runParallelTasks: runParallelTasksSync,
    runStaticPreflightParallel: createSyncStaticPreflightRunner(),
    ...overrides,
  };
}

function createRecordingPreflightBatchRunner(recorded) {
  return async (tasks) => {
    recorded.taskKeys = Object.keys(tasks);
    const entries = await Promise.all(
      Object.entries(tasks).map(async ([key, task]) => {
        const value = await Promise.resolve().then(() => task());
        return [key, value];
      })
    );
    return Object.fromEntries(entries);
  };
}

test('runApply 默认路径：覆盖率任务并入 04-05 preflight 并行槽且结果与串行一致', async () => {
  const recorded = {};
  let coverageCalls = 0;
  let coverageOptionsSeen = null;
  let manifestCoverageSeen = null;
  let manifestDynamicSeen = null;
  const serialCursorWinCoverage = {
    totalTargetCount: 7,
    bundleTargetCount: 6,
    mappedTargetCount: 5,
    missingTargets: ['Serial Key'],
    sourceAvailable: true,
  };
  const serialDynamicCoverage = {
    totalRuleCount: 3,
    bundleRuleCount: 3,
    mappedRuleCount: 2,
    missingRules: ['serial-rule'],
    sourceAvailable: true,
  };
  const { runApply } = createCommandsModule(
    buildDeps({
      buildCursorWinCoverage: (_context, _mappings, options) => {
        coverageCalls += 1;
        coverageOptionsSeen = options;
        return { ...serialCursorWinCoverage };
      },
      buildDynamicCoverage: () => ({ ...serialDynamicCoverage }),
      buildManifest: (_c, _im, _lp, _mi, _bd, cursorWinCoverage, dynamicCoverage) => {
        manifestCoverageSeen = cursorWinCoverage;
        manifestDynamicSeen = dynamicCoverage;
        return { generatedAt: new Date().toISOString() };
      },
      runPreflightBatch: createRecordingPreflightBatchRunner(recorded),
    })
  );

  const originalLog = console.log;
  console.log = () => {};
  try {
    await runApply({
      options: { runtimeMode: 'performance', noShortcut: true },
      paths: { workbenchOriginalPath: '/wb.js', mainOriginalPath: '/main.js' },
    });
  } finally {
    console.log = originalLog;
  }

  assert.ok(
    recorded.taskKeys?.includes('coverage'),
    `默认路径覆盖率计算必须进入 04-05 preflight 并行槽任务表，实际任务：${JSON.stringify(recorded.taskKeys)}`
  );
  assert.equal(coverageCalls, 1, '覆盖率仍只计算一次');
  assert.ok(
    coverageOptionsSeen?.workbenchIndex,
    '并行槽内覆盖率仍须复用构建期 workbenchIndex'
  );
  assert.deepEqual(
    manifestCoverageSeen,
    serialCursorWinCoverage,
    '并行槽内覆盖率结果必须与串行计算一致（manifest 静态覆盖率）'
  );
  assert.deepEqual(
    manifestDynamicSeen,
    serialDynamicCoverage,
    '并行槽内覆盖率结果必须与串行计算一致（manifest 动态覆盖率）'
  );
});

test('runApply 并行槽内覆盖率计算失败必须传播（不被并行吞掉）', async () => {
  const { runApply } = createCommandsModule(
    buildDeps({
      buildCursorWinCoverage: () => {
        throw new Error('coverage exploded');
      },
    })
  );

  const originalLog = console.log;
  console.log = () => {};
  try {
    await assert.rejects(
      runApply({
        options: { runtimeMode: 'performance', noShortcut: true },
        paths: { workbenchOriginalPath: '/wb.js', mainOriginalPath: '/main.js' },
      }),
      /coverage exploded/,
      '覆盖率计算抛错必须让 apply 失败，不得被并行编排吞掉'
    );
  } finally {
    console.log = originalLog;
  }
});

test('runApply --defer-coverage：并行槽不含 coverage 任务且降级仍生效', async () => {
  const recorded = {};
  let coverageCalls = 0;
  let manifestCoverageSeen = null;
  const { runApply } = createCommandsModule(
    buildDeps({
      buildCursorWinCoverage: () => {
        coverageCalls += 1;
        return {};
      },
      buildManifest: (_c, _im, _lp, _mi, _bd, cursorWinCoverage) => {
        manifestCoverageSeen = cursorWinCoverage;
        return { generatedAt: new Date().toISOString() };
      },
      runPreflightBatch: createRecordingPreflightBatchRunner(recorded),
    })
  );

  const originalLog = console.log;
  console.log = () => {};
  try {
    await runApply({
      options: { runtimeMode: 'performance', noShortcut: true, deferCoverage: true },
      paths: { workbenchOriginalPath: '/wb.js', mainOriginalPath: '/main.js' },
    });
  } finally {
    console.log = originalLog;
  }

  assert.ok(
    !recorded.taskKeys?.includes('coverage'),
    `--defer-coverage 时并行槽不得包含 coverage 任务，实际任务：${JSON.stringify(recorded.taskKeys)}`
  );
  assert.equal(coverageCalls, 0, '--defer-coverage 时不得在 apply 期计算覆盖率');
  assert.equal(manifestCoverageSeen?.deferred, true, '--defer-coverage 时 manifest 覆盖率仍为 deferred 占位');
});
