const path = require('path');
const { Worker } = require('worker_threads');
const { serializeWorkbenchIndex } = require('./workbench-index-serialization.js');

const STATIC_WORKER_ENTRY = path.join(__dirname, 'static-worker-entry.js');

function runStaticBundlePreflight({
  bundle,
  mappings,
  runtimeMode,
  bundleRole,
  applyStaticSourceTranslationsDetailed,
  evaluatePatchContracts,
  deferContractsToVerify = false,
}) {
  const staticStartedAt = performance.now();
  const result = applyStaticSourceTranslationsDetailed(
    bundle.workbenchSource,
    mappings,
    bundle.workbenchIndex,
    { cursorVersion: bundle.cursorVersion, bundleRole, deferContractsToVerify }
  );
  const staticMs = performance.now() - staticStartedAt;

  const contractStartedAt = performance.now();
  const evaluation = evaluatePatchContracts({
    runtimeMode,
    contracts: result.contracts,
  });
  const contractMs = performance.now() - contractStartedAt;

  if (evaluation.issues.length > 0) {
    throw new Error(evaluation.issues.join('\n'));
  }

  return { result, evaluation, staticMs, contractMs };
}

function runStaticPreflightSync({
  desktop,
  glass,
  runtimeMode,
  applyStaticSourceTranslationsDetailed,
  evaluatePatchContracts,
  deferContractsToVerify = false,
}) {
  const desktopBundle = runStaticBundlePreflight({
    bundle: desktop,
    mappings: desktop.mappings,
    runtimeMode,
    bundleRole: 'desktop',
    applyStaticSourceTranslationsDetailed,
    evaluatePatchContracts,
    deferContractsToVerify,
  });
  const glassBundle = glass
    ? runStaticBundlePreflight({
        bundle: glass,
        mappings: glass.mappings,
        runtimeMode,
        bundleRole: 'glass',
        applyStaticSourceTranslationsDetailed,
        evaluatePatchContracts,
        deferContractsToVerify,
      })
    : { result: null, evaluation: { issues: [], warnings: [] }, staticMs: 0, contractMs: 0 };

  return {
    staticDesktop: {
      result: desktopBundle.result,
      evaluation: desktopBundle.evaluation,
    },
    staticGlass: {
      result: glassBundle.result,
      evaluation: glassBundle.evaluation,
    },
    timing: {
      staticDesktopMs: desktopBundle.staticMs,
      staticGlassMs: glassBundle.staticMs,
      contractMs: desktopBundle.contractMs + glassBundle.contractMs,
    },
    usedWorkerParallel: false,
  };
}

function runStaticTranslationWorker(task) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(STATIC_WORKER_ENTRY, {
      workerData: {
        workbenchSource: task.workbenchSource,
        mappings: task.mappings,
        workbenchIndex: serializeWorkbenchIndex(task.workbenchIndex),
        cursorVersion: task.cursorVersion,
        bundleRole: task.bundleRole,
        deferContractsToVerify: task.deferContractsToVerify === true,
      },
    });

    worker.once('message', (message) => {
      if (message?.ok) {
        resolve(message.result);
        return;
      }
      reject(new Error(message?.error || 'static worker failed'));
    });
    worker.once('error', reject);
    worker.once('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`static worker exited with code ${code}`));
      }
    });
  });
}

async function runStaticPreflightParallel({
  desktop,
  glass,
  runtimeMode,
  applyStaticSourceTranslationsDetailed,
  evaluatePatchContracts,
  deferContractsToVerify = false,
  forceWorkerFailure = false,
  runWorker = runStaticTranslationWorker,
}) {
  if (forceWorkerFailure) {
    return runStaticPreflightSync({
      desktop,
      glass,
      runtimeMode,
      applyStaticSourceTranslationsDetailed,
      evaluatePatchContracts,
      deferContractsToVerify,
    });
  }

  try {
    const desktopStartedAt = performance.now();
    const glassStartedAt = performance.now();

    const [desktopResult, glassResult] = await Promise.all([
      runWorker({
        workbenchSource: desktop.workbenchSource,
        workbenchIndex: desktop.workbenchIndex,
        mappings: desktop.mappings,
        cursorVersion: desktop.cursorVersion,
        bundleRole: 'desktop',
        deferContractsToVerify,
      }),
      glass
        ? runWorker({
            workbenchSource: glass.workbenchSource,
            workbenchIndex: glass.workbenchIndex,
            mappings: glass.mappings,
            cursorVersion: glass.cursorVersion,
            bundleRole: 'glass',
            deferContractsToVerify,
          })
        : Promise.resolve(null),
    ]);

    const staticDesktopMs = performance.now() - desktopStartedAt;
    const staticGlassMs = performance.now() - glassStartedAt;

    const desktopContractStartedAt = performance.now();
    const desktopEvaluation = evaluatePatchContracts({
      runtimeMode,
      contracts: desktopResult.contracts,
    });
    const desktopContractMs = performance.now() - desktopContractStartedAt;
    if (desktopEvaluation.issues.length > 0) {
      throw new Error(desktopEvaluation.issues.join('\n'));
    }

    let glassEvaluation = { issues: [], warnings: [] };
    let glassContractMs = 0;
    if (glass && glassResult) {
      const glassContractStartedAt = performance.now();
      glassEvaluation = evaluatePatchContracts({
        runtimeMode,
        contracts: glassResult.contracts,
      });
      glassContractMs = performance.now() - glassContractStartedAt;
      if (glassEvaluation.issues.length > 0) {
        throw new Error(glassEvaluation.issues.join('\n'));
      }
    }

    return {
      staticDesktop: { result: desktopResult, evaluation: desktopEvaluation },
      staticGlass: {
        result: glassResult,
        evaluation: glassEvaluation,
      },
      timing: {
        staticDesktopMs,
        staticGlassMs,
        contractMs: desktopContractMs + glassContractMs,
      },
      usedWorkerParallel: true,
    };
  } catch (_error) {
    return runStaticPreflightSync({
      desktop,
      glass,
      runtimeMode,
      applyStaticSourceTranslationsDetailed,
      evaluatePatchContracts,
      deferContractsToVerify,
    });
  }
}

module.exports = {
  runStaticPreflightSync,
  runStaticPreflightParallel,
  runStaticTranslationWorker,
  serializeWorkbenchIndex,
};
