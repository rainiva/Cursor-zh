const { escapeRegExp } = require('../engine/substring');
const { isProductTipScopedMapping } = require('../shared/product-tip-scope');

function sourceHasQuotedLiteral(workbenchSource, originalText) {
  if (typeof originalText !== 'string' || originalText.length === 0) {
    return false;
  }

  const escapedOriginal = escapeRegExp(originalText);
  const literalPattern = new RegExp(`(['"\`])${escapedOriginal}\\1`);
  return literalPattern.test(String(workbenchSource || ''));
}

function selectRuntimeMappings(workbenchSource, mappings = []) {
  return mappings.filter((entry) => {
    if (!entry || typeof entry.originalText !== 'string' || entry.originalText.length === 0) {
      return false;
    }

    if (entry.forceRuntime === true) {
      return true;
    }

    if (isProductTipScopedMapping(entry)) {
      return false;
    }

    const hasScopeSelectors =
      Array.isArray(entry.scopeSelectors) && entry.scopeSelectors.length > 0;
    const hasScopeHints =
      Array.isArray(entry.scopeContainsText) && entry.scopeContainsText.length > 0;

    if (entry.searchType !== 'exact') {
      return true;
    }

    if (hasScopeSelectors || hasScopeHints) {
      return true;
    }

    return !sourceHasQuotedLiteral(workbenchSource, entry.originalText);
  });
}

module.exports = {
  sourceHasQuotedLiteral,
  selectRuntimeMappings,
};

