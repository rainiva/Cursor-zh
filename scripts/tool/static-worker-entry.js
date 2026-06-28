const { parentPort, workerData } = require('worker_threads');
const { applyStaticSourceTranslationsDetailed } = require('../lib/patcher/contracts.js');
const { deserializeWorkbenchIndex } = require('./workbench-index-serialization.js');

const {
  workbenchSource,
  mappings,
  workbenchIndex,
  cursorVersion,
  bundleRole,
  deferContractsToVerify,
} = workerData;

try {
  const result = applyStaticSourceTranslationsDetailed(
    workbenchSource,
    mappings,
    deserializeWorkbenchIndex(workbenchIndex),
    { cursorVersion, bundleRole, deferContractsToVerify: deferContractsToVerify === true }
  );
  parentPort.postMessage({ ok: true, result });
} catch (error) {
  parentPort.postMessage({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  });
}
