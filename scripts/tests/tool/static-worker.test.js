const test = require('node:test');
const assert = require('node:assert/strict');

const { createWorkbenchIndex } = require('../../lib/patcher/workbench-index.js');
const {
  applyStaticSourceTranslationsDetailed,
  evaluatePatchContracts,
} = require('../../lib/patcher/contracts.js');
const {
  runStaticPreflightParallel,
  runStaticPreflightSync,
} = require('../../tool/static-parallel.js');

const PERF_ENABLED = process.env.CURSOR_ZH_PERF === '1';

function buildSyntheticSource(labelPrefix, paddingSize) {
  const literals = Array.from({ length: 50 }, (_, index) => `"${labelPrefix}${index}"`).join('');
  return `${'x'.repeat(paddingSize)}${literals}${'y'.repeat(paddingSize)}`;
}

function buildSyntheticMappings(labelPrefix) {
  return Array.from({ length: 50 }, (_, index) => ({
    originalText: `${labelPrefix}${index}`,
    changeText: `标签${index}`,
    searchType: 'exact',
  }));
}

function buildTaskPair() {
  const desktopSource = buildSyntheticSource('Desk', 500_000);
  const glassSource = buildSyntheticSource('Glass', 500_000);
  const desktopIndex = createWorkbenchIndex(desktopSource);
  const glassIndex = createWorkbenchIndex(glassSource);
  const mappings = [
    ...buildSyntheticMappings('Desk'),
    ...buildSyntheticMappings('Glass'),
  ];

  return {
    desktop: {
      workbenchSource: desktopSource,
      workbenchIndex: desktopIndex,
      mappings,
      cursorVersion: '9.9.9',
    },
    glass: {
      workbenchSource: glassSource,
      workbenchIndex: glassIndex,
      mappings,
      cursorVersion: '9.9.9',
    },
    runtimeMode: 'performance',
  };
}

test('runStaticPreflightParallel matches sync output for desktop and glass', async () => {
  const tasks = buildTaskPair();

  const syncResult = runStaticPreflightSync({
    ...tasks,
    applyStaticSourceTranslationsDetailed,
    evaluatePatchContracts,
  });

  const parallelResult = await runStaticPreflightParallel({
    ...tasks,
    applyStaticSourceTranslationsDetailed,
    evaluatePatchContracts,
  });

  assert.equal(
    parallelResult.staticDesktop.result.translatedSource,
    syncResult.staticDesktop.result.translatedSource
  );
  assert.equal(
    parallelResult.staticGlass.result.translatedSource,
    syncResult.staticGlass.result.translatedSource
  );
  assert.deepEqual(
    parallelResult.staticDesktop.result.contracts,
    syncResult.staticDesktop.result.contracts
  );
  assert.deepEqual(
    parallelResult.staticGlass.result.contracts,
    syncResult.staticGlass.result.contracts
  );
  assert.deepEqual(parallelResult.staticDesktop.evaluation, syncResult.staticDesktop.evaluation);
  assert.deepEqual(parallelResult.staticGlass.evaluation, syncResult.staticGlass.evaluation);
});

test('runStaticPreflightParallel falls back to sync when worker execution fails', async () => {
  const tasks = buildTaskPair();

  const syncResult = runStaticPreflightSync({
    ...tasks,
    applyStaticSourceTranslationsDetailed,
    evaluatePatchContracts,
  });

  const parallelResult = await runStaticPreflightParallel({
    ...tasks,
    applyStaticSourceTranslationsDetailed,
    evaluatePatchContracts,
    forceWorkerFailure: true,
  });

  assert.equal(
    parallelResult.staticDesktop.result.translatedSource,
    syncResult.staticDesktop.result.translatedSource
  );
  assert.equal(
    parallelResult.staticGlass.result.translatedSource,
    syncResult.staticGlass.result.translatedSource
  );
  assert.equal(parallelResult.usedWorkerParallel, false);
});

(PERF_ENABLED ? test : test.skip)(
  'runStaticPreflightParallel is faster than sync on synthetic bundles',
  async () => {
    const tasks = buildTaskPair();

    const syncStartedAt = performance.now();
    runStaticPreflightSync({
      ...tasks,
      applyStaticSourceTranslationsDetailed,
      evaluatePatchContracts,
    });
    const syncElapsedMs = performance.now() - syncStartedAt;

    const parallelStartedAt = performance.now();
    await runStaticPreflightParallel({
      ...tasks,
      applyStaticSourceTranslationsDetailed,
      evaluatePatchContracts,
    });
    const parallelElapsedMs = performance.now() - parallelStartedAt;

    assert.ok(
      parallelElapsedMs < syncElapsedMs * 0.75,
      `expected parallel ${parallelElapsedMs.toFixed(1)}ms < sync ${syncElapsedMs.toFixed(1)}ms * 0.75`
    );
  }
);
