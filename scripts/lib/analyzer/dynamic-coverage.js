const { mappingKey } = require('../mapping/merge');
const { translateTextWithMappings } = require('../engine/translator');
const { describeCoverageEntry, entryAppearsInSource } = require('./coverage-helpers');
const { createCoverageWorkbenchContext } = require('./workbench-coverage-context');

function analyzeDynamicRuleCoverage({
  workbenchSource = '',
  mappings = [],
  targets = [],
  normalizeTextForComparison: normalizeFn = require('../engine/normalize').normalizeTextForComparison,
  coverageContext,
} = {}) {
  const mappingIndex = new Map(mappings.map((entry) => [mappingKey(entry), entry]));
  const context =
    coverageContext || createCoverageWorkbenchContext(workbenchSource);
  const normalizedHaystack = context.getNormalizedHaystack();
  const bundleRules = targets.filter((entry) =>
    entryAppearsInSource(entry, context.workbenchSource, { normalizedHaystack })
  );
  const mappedRules = bundleRules.filter((entry) => {
    const activeEntry = mappingIndex.get(mappingKey(entry));
    if (!activeEntry) {
      return false;
    }

    if (activeEntry.searchType === 'regex') {
      return true;
    }

    const sampleText = describeCoverageEntry(activeEntry);
    const scopeText = Array.isArray(activeEntry.scopeContainsText)
      ? activeEntry.scopeContainsText.join(' ')
      : '';

    return (
      translateTextWithMappings(sampleText, [activeEntry], {
        scopeMatched: true,
        scopeText,
      }) !== sampleText
    );
  });
  const missingRules = bundleRules
    .filter((entry) => !mappedRules.some((mapped) => mappingKey(mapped) === mappingKey(entry)))
    .map((entry) => describeCoverageEntry(entry));

  return {
    totalRuleCount: targets.length,
    bundleRuleCount: bundleRules.length,
    mappedRuleCount: mappedRules.length,
    missingRules,
  };
}

module.exports = {
  analyzeDynamicRuleCoverage,
};
