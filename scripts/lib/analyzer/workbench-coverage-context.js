const { createWorkbenchIndex } = require('../patcher/workbench-index');
const { normalizeTextForComparison } = require('../engine/normalize');

function createCoverageWorkbenchContext(workbenchSource = '', workbenchIndex) {
  const state = {
    sourceText: String(workbenchSource || ''),
  };
  const index =
    workbenchIndex && workbenchIndex.quotedLiterals
      ? workbenchIndex
      : createWorkbenchIndex(state.sourceText);
  const quotedLiterals = index.quotedLiterals;
  let normalizedHaystack;

  return {
    get workbenchSource() {
      return state.sourceText;
    },
    set workbenchSource(value) {
      state.sourceText = String(value || '');
    },
    quotedLiterals,
    getNormalizedHaystack() {
      if (!normalizedHaystack) {
        normalizedHaystack = normalizeTextForComparison(state.sourceText);
      }
      return normalizedHaystack;
    },
    isTargetPresent(target) {
      if (typeof target !== 'string' || target.length === 0) {
        return false;
      }
      if (quotedLiterals.has(target)) {
        return true;
      }
      return state.sourceText.includes(target);
    },
  };
}

module.exports = {
  createCoverageWorkbenchContext,
};
