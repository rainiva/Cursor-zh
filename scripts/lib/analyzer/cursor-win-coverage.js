const {
  defaultCursorWinCommonMappings,
} = require('../mapping/data');
const { normalizeTextForComparison } = require('../engine/normalize');
const { translateTextWithMappings } = require('../engine/translator');
const { buildExactMappingLookup, isExactTargetMapped } = require('./coverage-helpers');
const { createCoverageWorkbenchContext } = require('./workbench-coverage-context');

function defaultCursorWinCommonMappingsLoader() {
  return defaultCursorWinCommonMappings();
}

function cursorWinCoverageTargets() {
  return defaultCursorWinCommonMappingsLoader().map((item) => item.originalText);
}

function analyzeCursorWinCoverage({
  workbenchSource = '',
  mappings = [],
  targets = [],
  coverageContext,
} = {}) {
  const lookup = buildExactMappingLookup(mappings);
  const context =
    coverageContext || createCoverageWorkbenchContext(workbenchSource);
  const bundleTargets = targets.filter((target) => context.isTargetPresent(target));
  const mappedTargets = bundleTargets.filter((target) =>
    isExactTargetMapped(target, lookup, mappings)
  );
  const missingTargets = bundleTargets.filter(
    (target) => !mappedTargets.includes(target)
  );

  return {
    totalTargetCount: targets.length,
    bundleTargetCount: bundleTargets.length,
    mappedTargetCount: mappedTargets.length,
    missingTargets,
  };
}

module.exports = {
  cursorWinCoverageTargets,
  analyzeCursorWinCoverage,
};
