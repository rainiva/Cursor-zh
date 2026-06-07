const { normalizeTextForComparison } = require('../engine/normalize');

function describeCoverageEntry(entry) {
  if (!entry) {
    return '';
  }

  if (Array.isArray(entry.coverageHints) && entry.coverageHints.length > 0) {
    return entry.coverageHints[0];
  }

  return entry.originalText || '';
}

function entryAppearsInSource(entry, workbenchSource = '') {
  const haystack = normalizeTextForComparison(workbenchSource);
  const hints =
    Array.isArray(entry?.coverageHints) && entry.coverageHints.length > 0
      ? entry.coverageHints
      : [entry?.originalText];

  return hints.some((hint) => haystack.includes(normalizeTextForComparison(hint)));
}

module.exports = {
  describeCoverageEntry,
  entryAppearsInSource,
};
