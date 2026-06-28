const { buildGlassCommandAnchorIndex } = require('../mapping/anchor-index.js');

function suggestAnchorMappings({ harvest = {}, commonMappings = [] } = {}) {
  const commonByOriginal = new Map();
  for (const entry of commonMappings) {
    if (typeof entry.originalText === 'string' && typeof entry.changeText === 'string') {
      commonByOriginal.set(entry.originalText, entry.changeText);
    }
  }

  const suggestions = [];
  const seen = new Set();

  for (const anchor of harvest.anchors || []) {
    if (anchor.type !== 'glassCommand' || !anchor.id || !anchor.text) {
      continue;
    }

    const changeText = commonByOriginal.get(anchor.text);
    if (!changeText || changeText === anchor.text) {
      continue;
    }

    const key = `${anchor.id}:${anchor.field || 'title'}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    suggestions.push({
      anchorType: 'glassCommand',
      anchorId: anchor.id,
      field: anchor.field || 'title',
      changeText,
      searchType: 'anchor',
      sourceText: anchor.text,
      path: anchor.path,
    });
  }

  return suggestions;
}

function suggestAnchorMappingsFromSources({ sources = [], commonMappings = [] } = {}) {
  const anchors = [];
  for (const file of sources) {
    const index = buildGlassCommandAnchorIndex(file.source || '', file.path || '');
    for (const entry of index.values()) {
      anchors.push({
        type: 'glassCommand',
        id: entry.id,
        field: entry.field,
        text: entry.text,
        path: entry.path,
      });
    }
  }

  return suggestAnchorMappings({
    harvest: { anchors },
    commonMappings,
  });
}

module.exports = {
  suggestAnchorMappings,
  suggestAnchorMappingsFromSources,
};
