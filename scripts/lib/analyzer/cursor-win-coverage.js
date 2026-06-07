const {
  defaultCursorWinCommonMappings,
} = require('../mapping/data');
const { translateTextWithMappings } = require('../engine/translator');

function defaultCursorWinCommonMappingsLoader() {
  return defaultCursorWinCommonMappings();
}

function cursorWinCoverageTargets() {
  return defaultCursorWinCommonMappingsLoader().map((item) => item.originalText);
}

function analyzeCursorWinCoverage({ workbenchSource = '', mappings = [], targets = [] }) {
  const bundleTargets = targets.filter((target) => workbenchSource.includes(target));
  const mappedTargets = bundleTargets.filter(
    (target) => translateTextWithMappings(target, mappings) !== target
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
