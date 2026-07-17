const { tokenizeStructuralSource, tokenMatches } = require('./structural-tokenizer.js');

function resolveSemanticLocator(sourceText, locator) {
  const tokens = tokenizeStructuralSource(sourceText);
  const matches = [];
  tokens.forEach((token, tokenIndex) => {
    if (!tokenMatches(token, locator.anchor)) return;
    const radius = locator.maxTokenDistance;
    const neighborhood = tokens.slice(Math.max(0, tokenIndex - radius), tokenIndex + radius + 1);
    if (locator.required.every((expected) => neighborhood.some((item) => tokenMatches(item, expected)))) {
      matches.push({ tokenIndex, offset: token.offset });
    }
  });
  if (matches.length === locator.cardinality) return { status: 'resolved', matches, target: matches[0] };
  return { status: matches.length === 0 ? 'missing' : 'ambiguous', matches };
}

module.exports = {
  resolveSemanticLocator,
};
