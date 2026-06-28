function mappingKey(mapping) {
  if (mapping.searchType === 'anchor') {
    return [
      mapping.anchorType || '',
      mapping.anchorId || '',
      mapping.field || '',
      mapping.changeText || '',
      'anchor',
    ].join('::');
  }

  return [
    mapping.originalText || '',
    mapping.searchType || 'exact',
    mapping.flags || '',
    Array.isArray(mapping.scopeSelectors) ? mapping.scopeSelectors.join('|') : '',
    Array.isArray(mapping.scopeContainsText) ? mapping.scopeContainsText.join('|') : '',
  ].join('::');
}

function mergeMappings(baseMappings = [], overlayMappings = []) {
  const merged = new Map();

  for (const mapping of baseMappings) {
    merged.set(mappingKey(mapping), { ...mapping });
  }

  for (const mapping of overlayMappings) {
    merged.set(mappingKey(mapping), { ...mapping });
  }

  return Array.from(merged.values());
}

module.exports = {
  mappingKey,
  mergeMappings,
};
