const { runStaticPreflightSync } = require('../../tool/static-parallel.js');

function createSyncStaticPreflightRunner(defaults = {}) {
  return async (options = {}) =>
    runStaticPreflightSync({
      ...options,
      applyStaticSourceTranslationsDetailed:
        options.applyStaticSourceTranslationsDetailed ||
        defaults.applyStaticSourceTranslationsDetailed,
      evaluatePatchContracts:
        options.evaluatePatchContracts || defaults.evaluatePatchContracts,
    });
}

module.exports = {
  createSyncStaticPreflightRunner,
};
