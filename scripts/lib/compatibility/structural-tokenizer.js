const { iterateQuotedLiterals } = require('../patcher/workbench-index.js');

function tokenizeStructuralSource(sourceText) {
  const source = String(sourceText || '');
  const tokens = [];
  const literalSpans = [];
  iterateQuotedLiterals(source, (_quote, value, start, end) => {
    literalSpans.push({ start, end });
    tokens.push({ type: 'literal', value, offset: start });
  });
  const insideLiteral = (offset) => literalSpans.some((span) => offset >= span.start && offset < span.end);
  const pattern = /(\?\.|\.)\s*([A-Za-z_$][\w$]*)|(\?\?|[?:(),])/g;
  for (const match of source.matchAll(pattern)) {
    if (insideLiteral(match.index)) continue;
    if (match[2]) tokens.push({ type: 'property', value: match[2], offset: match.index });
    else tokens.push({ type: 'operator', value: match[3], offset: match.index });
  }
  return tokens.sort((left, right) => left.offset - right.offset);
}

function tokenMatches(token, expected) {
  return token?.type === expected.type && token?.value === expected.value;
}

module.exports = {
  tokenizeStructuralSource,
  tokenMatches,
};
