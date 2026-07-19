const { iterateQuotedLiterals } = require('../patcher/workbench-index.js');

function tokenizeStructuralSource(sourceText) {
  const source = String(sourceText || '');
  const tokens = [];
  const literalSpans = [];
  iterateQuotedLiterals(source, (_quote, value, start, end) => {
    literalSpans.push({ start, end });
    tokens.push({ type: 'literal', value, offset: start });
  });
  // literalSpans are emitted left-to-right by iterateQuotedLiterals so they are
  // already sorted by start; sort defensively and pre-extract starts so the
  // hot-path insideLiteral() is O(log n) via binary search instead of O(n).
  literalSpans.sort((a, b) => a.start - b.start);
  const spanStarts = literalSpans.map((span) => span.start);
  const insideLiteral = (offset) => {
    // Find the last span whose start <= offset (rightmost candidate).
    let lo = 0;
    let hi = spanStarts.length - 1;
    let idx = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (spanStarts[mid] <= offset) { idx = mid; lo = mid + 1; }
      else { hi = mid - 1; }
    }
    if (idx < 0) return false; // offset precedes every span
    return offset < literalSpans[idx].end;
  };
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
