const productTipScopeSelectors = ['[class*="empty-state-rotating-tips"]'];

function isProductTipScopedMapping(entry) {
  const scopeSelectors = Array.isArray(entry?.scopeSelectors) ? entry.scopeSelectors : [];
  return (
    scopeSelectors.length === productTipScopeSelectors.length &&
    scopeSelectors.every((selector, index) => selector === productTipScopeSelectors[index])
  );
}

function productTipScopedMappings(mappings = []) {
  return mappings.filter((entry) => isProductTipScopedMapping(entry));
}

module.exports = {
  productTipScopeSelectors,
  isProductTipScopedMapping,
  productTipScopedMappings,
};
