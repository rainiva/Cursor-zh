const { normalizeTextForComparison } = require('../engine/normalize');
const { translateTextWithMappings } = require('../engine/translator');

function describeCoverageEntry(entry) {
  if (!entry) {
    return '';
  }

  if (Array.isArray(entry.coverageHints) && entry.coverageHints.length > 0) {
    return entry.coverageHints[0];
  }

  return entry.originalText || '';
}

function entryAppearsInSource(entry, workbenchSource = '', options = {}) {
  const haystack =
    options.normalizedHaystack ?? normalizeTextForComparison(workbenchSource);
  const hints =
    Array.isArray(entry?.coverageHints) && entry.coverageHints.length > 0
      ? entry.coverageHints
      : [entry?.originalText];

  return hints.some((hint) => haystack.includes(normalizeTextForComparison(hint)));
}

function buildExactMappingLookup(mappings = []) {
  const lookup = new Map();
  for (const entry of mappings) {
    if (!entry || typeof entry.originalText !== 'string' || entry.originalText.length === 0) {
      continue;
    }
    if (entry.searchType === 'exact' || entry.searchType === 'normalizedExact' || !entry.searchType) {
      lookup.set(entry.originalText, entry);
    }
  }
  return lookup;
}

function isExactTargetMapped(target, lookup, mappings) {
  const indexed = lookup.get(target);
  if (indexed) {
    if (indexed.searchType === 'normalizedExact') {
      return (
        normalizeTextForComparison(indexed.changeText) !== normalizeTextForComparison(target)
      );
    }
    return indexed.changeText !== target;
  }

  return translateTextWithMappings(target, mappings) !== target;
}

module.exports = {
  describeCoverageEntry,
  entryAppearsInSource,
  buildExactMappingLookup,
  isExactTargetMapped,
};
