const SEARCH_TYPE_CODES = {
  exact: 0,
  normalizedExact: 1,
  partial: 2,
  regex: 3,
};

function serializeMappingsCompact(mappings) {
  const compact = mappings.map((m) => {
    const typeCode = SEARCH_TYPE_CODES[m.searchType || 'exact'] || 0;
    const arr = [m.originalText, m.changeText];
    const hasScope = m.scopeSelectors && m.scopeSelectors.length > 0;
    const hasContains = m.scopeContainsText != null;
    const hasFlags = m.flags != null;

    if (typeCode !== 0 || hasScope || hasContains || hasFlags) {
      arr.push(typeCode);
    }
    if (hasScope || hasContains || hasFlags) {
      arr.push(hasScope ? m.scopeSelectors : null);
    }
    if (hasContains || hasFlags) {
      arr.push(m.scopeContainsText != null ? m.scopeContainsText : null);
    }
    if (hasFlags) {
      arr.push(m.flags);
    }
    return arr;
  });
  return JSON.stringify(compact);
}

function generateDeserializerCode() {
  return `
  const SEARCH_TYPES = ['exact', 'normalizedExact', 'partial', 'regex'];
  function __decompactMappings(compact) {
    return compact.map(function(a) {
      return {
        originalText: a[0],
        changeText: a[1],
        searchType: SEARCH_TYPES[a[2] || 0],
        scopeSelectors: a[3] != null ? a[3] : null,
        scopeContainsText: a[4] != null ? a[4] : null,
        flags: a[5] != null ? a[5] : null
      };
    });
  }
  translationMappings = __decompactMappings(translationMappingsCompact);
  inlineTranslationMappings = __decompactMappings(inlineTranslationMappingsCompact);
  productTipMappings = __decompactMappings(productTipMappingsCompact);
  `;
}

module.exports = {
  serializeMappingsCompact,
  generateDeserializerCode,
};
