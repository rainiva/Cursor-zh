const test = require('node:test');
const assert = require('node:assert/strict');

const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');

test('applyStaticSourceTranslations replaces many quoted literals in a single pass on large sources', () => {
  const padding = 'a'.repeat(200_000);
  const literals = Array.from({ length: 120 }, (_entry, index) => `Label ${index}`);
  const mappings = literals.map((label) => ({
    originalText: label,
    changeText: `标签${label.slice(6)}`,
    searchType: 'exact',
  }));
  const quoted = literals.map((label) => `"${label}"`).join('');
  const source = `${padding}${quoted}${padding}`;
  const startedAt = Date.now();
  const translated = applyStaticSourceTranslations(source, mappings);
  const elapsedMs = Date.now() - startedAt;

  assert.match(translated, /"标签0"/);
  assert.match(translated, /"标签119"/);
  assert.ok(elapsedMs < 1500, `expected single-pass translation under 1.5s, took ${elapsedMs}ms`);
});
