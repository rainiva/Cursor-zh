const { escapeRegExp } = require('../engine/substring');

function buildGlassCommandFieldPattern(anchorId, field = 'title') {
  const escapedId = escapeRegExp(String(anchorId));
  const escapedField = escapeRegExp(String(field));
  return new RegExp(
    `(id\\s*:\\s*["']?${escapedId}["']?)([\\s\\S]{0,500}?${escapedField}\\s*:\\s*)(["'])([^"']*)(\\3)`,
    'g'
  );
}

function applyAnchorStaticTranslations(source, mappings = []) {
  let current = String(source || '');

  for (const mapping of mappings) {
    if (!mapping || mapping.searchType !== 'anchor') {
      continue;
    }

    if (!mapping.anchorId || typeof mapping.changeText !== 'string') {
      continue;
    }

    if (mapping.anchorType === 'glassCommand') {
      const field = mapping.field || 'title';
      const pattern = buildGlassCommandFieldPattern(mapping.anchorId, field);
      current = current.replace(pattern, (_match, idPart, middle, quote, _oldText, endQuote) => {
        return `${idPart}${middle}${quote}${mapping.changeText}${endQuote}`;
      });
    }
  }

  return current;
}

function sourceHasGlassCommandAnchor(source, anchorId) {
  if (!anchorId) {
    return false;
  }
  const escapedId = escapeRegExp(String(anchorId));
  return new RegExp(`id\\s*:\\s*["']?${escapedId}["']?`).test(String(source || ''));
}

module.exports = {
  buildGlassCommandFieldPattern,
  applyAnchorStaticTranslations,
  sourceHasGlassCommandAnchor,
};
