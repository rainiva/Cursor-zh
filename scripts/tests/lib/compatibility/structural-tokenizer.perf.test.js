const test = require('node:test');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');

const {
  tokenizeStructuralSource,
} = require('../../../lib/compatibility/structural-tokenizer.js');

/**
 * Build a large source with `numLiterals` quoted strings and approximately
 * `numProperties` `.p` property accesses placed *between* literals (so every
 * insideLiteral() call hits the worst case: scanning all spans and returning
 * false).
 */
function buildLargeSource(numLiterals, numProperties) {
  const parts = [];
  const gaps = numLiterals + 1;
  const propsPerGap = Math.ceil(numProperties / gaps);
  let placed = 0;
  for (let g = 0; g < gaps; g++) {
    for (let j = 0; j < propsPerGap && placed < numProperties; j++, placed++) {
      parts.push('.p');
    }
    if (g < numLiterals) {
      parts.push(`"lit${g}"`);
    }
  }
  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Performance guard — guards against O(n²) insideLiteral regression.
//
// The real-world failure (Cursor ensure) involves ~105k literalSpans and
// millions of structural-token queries, i.e. >100 billion comparisons which
// hangs for 120s+. We scale down to 50k spans × 200k queries = 10 billion
// comparisons: enough to blow past the 2s budget with the old O(n²) linear
// scan, while finishing in well under 100ms with O(log n) binary search.
// ---------------------------------------------------------------------------
test('tokenizeStructuralSource stays under 2s for 50k literals + 200k properties (O(n²) guard)', () => {
  const source = buildLargeSource(50000, 200000);
  const start = performance.now();
  const tokens = tokenizeStructuralSource(source);
  const elapsed = performance.now() - start;

  assert.ok(tokens.length > 200000, `expected >200000 tokens, got ${tokens.length}`);
  assert.ok(
    elapsed < 2000,
    `tokenizeStructuralSource took ${elapsed.toFixed(0)}ms, expected < 2000ms (O(n²) insideLiteral regression)`
  );
});

// ---------------------------------------------------------------------------
// Correctness — boundary conditions that a binary-search rewrite must honour.
// ---------------------------------------------------------------------------

test('keeps property accesses that sit outside literals', () => {
  const tokens = tokenizeStructuralSource('.a "x" .b');
  const props = tokens.filter((t) => t.type === 'property').map((t) => t.value);
  assert.deepEqual(props, ['a', 'b']);
});

test('filters property accesses nested inside a literal', () => {
  const tokens = tokenizeStructuralSource('".a.b.c.d"');
  const props = tokens.filter((t) => t.type === 'property');
  assert.equal(props.length, 0);
});

test('keeps property access at the literal end boundary (offset === span.end)', () => {
  // .a"lit".b  →  .b starts exactly at span.end of "lit", so insideLiteral must
  // return false (offset < span.end is false) and .b is kept.
  const tokens = tokenizeStructuralSource('.a"lit".b');
  const props = tokens.filter((t) => t.type === 'property').map((t) => t.value);
  assert.deepEqual(props, ['a', 'b']);
});

test('keeps property access between two adjacent literals', () => {
  const tokens = tokenizeStructuralSource('"a""b".c"d"');
  const props = tokens.filter((t) => t.type === 'property').map((t) => t.value);
  assert.deepEqual(props, ['c']);
});

test('offset before the first literal is treated as outside', () => {
  const tokens = tokenizeStructuralSource('.x"lit"');
  const props = tokens.filter((t) => t.type === 'property').map((t) => t.value);
  assert.deepEqual(props, ['x']);
});

test('offset after the last literal is treated as outside', () => {
  const tokens = tokenizeStructuralSource('"lit".x');
  const props = tokens.filter((t) => t.type === 'property').map((t) => t.value);
  assert.deepEqual(props, ['x']);
});
