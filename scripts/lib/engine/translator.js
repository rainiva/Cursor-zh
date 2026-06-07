const { normalizeTextForComparison } = require('./normalize');

function scopeHintsMatch(scopeContainsText = [], scopeText = '') {
  if (!Array.isArray(scopeContainsText) || scopeContainsText.length === 0) {
    return true;
  }

  const normalizedScopeText = normalizeTextForComparison(scopeText);
  if (!normalizedScopeText) {
    return false;
  }

  return scopeContainsText.some((hint) =>
    normalizedScopeText.includes(normalizeTextForComparison(hint))
  );
}

function mappingMatchesScope(entry, options = {}) {
  const hasScopeSelectors =
    Array.isArray(entry?.scopeSelectors) && entry.scopeSelectors.length > 0;
  const hasScopeHints =
    Array.isArray(entry?.scopeContainsText) && entry.scopeContainsText.length > 0;

  if (!hasScopeSelectors && !hasScopeHints) {
    return true;
  }

  if (options.scopeMatched === false) {
    return false;
  }

  if (options.scopeMatched === true) {
    return true;
  }

  return scopeHintsMatch(entry.scopeContainsText, options.scopeText || '');
}

function translateTextWithMappings(text, mappings = [], options = {}) {
  if (typeof text !== 'string' || text.length === 0) {
    return text;
  }

  let current = text;
  for (const entry of mappings) {
    if (!entry || !entry.originalText) {
      continue;
    }

    if (!mappingMatchesScope(entry, options)) {
      continue;
    }

    if (entry.searchType === 'exact') {
      if (current.trim() === entry.originalText) {
        current = entry.changeText;
      }
    } else if (entry.searchType === 'normalizedExact') {
      if (
        normalizeTextForComparison(current) ===
        normalizeTextForComparison(entry.originalText)
      ) {
        current = entry.changeText;
      }
    } else if (entry.searchType === 'partial') {
      current = current.split(entry.originalText).join(entry.changeText);
    } else if (entry.searchType === 'regex') {
      const regex = new RegExp(entry.originalText, entry.flags || 'g');
      current = current.replace(regex, entry.changeText);
    }
  }

  return current;
}

module.exports = {
  scopeHintsMatch,
  mappingMatchesScope,
  translateTextWithMappings,
};
