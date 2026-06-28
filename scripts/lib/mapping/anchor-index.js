const { extractAnchorsFromSource } = require('../analyzer/string-harvest.js');

function anchorIndexKey(anchorId, field = 'title') {
  return `${anchorId}:${field}`;
}

function buildGlassCommandAnchorIndex(source, filePath = '') {
  const anchors = extractAnchorsFromSource(source, filePath);
  const index = new Map();

  for (const anchor of anchors) {
    if (anchor.type !== 'glassCommand') {
      continue;
    }
    index.set(anchorIndexKey(anchor.id, anchor.field || 'title'), {
      id: anchor.id,
      field: anchor.field || 'title',
      text: anchor.text,
      path: anchor.path,
      lineHint: anchor.lineHint,
    });
  }

  return index;
}

module.exports = {
  anchorIndexKey,
  buildGlassCommandAnchorIndex,
};
