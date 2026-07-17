const test = require('node:test');
const assert = require('node:assert/strict');

const { resolveSemanticLocator } = require('../../lib/compatibility/semantic-locator.js');
const { evaluateLocatorPostconditions } = require('../../lib/compatibility/locator-postconditions.js');
const {
  fixtureV1,
  fixtureRenamed,
  fixtureSingleQuoted,
  fixtureWithoutOptionalChain,
  fixtureReordered,
} = require('./fixtures/update-drift/product-tips.js');

const locator = {
  locatorId: 'product_tips.render_text',
  anchor: { type: 'property', value: 'text' },
  required: [{ type: 'literal', value: 'tip-dismissed' }],
  maxTokenDistance: 80,
  cardinality: 1,
};

test('relocates across identifier, quote, optional-chain, and harmless ordering drift', () => {
  for (const source of [
    fixtureV1,
    fixtureRenamed,
    fixtureSingleQuoted,
    fixtureWithoutOptionalChain,
    fixtureReordered,
  ]) {
    const result = resolveSemanticLocator(source, locator);
    assert.equal(result.status, 'resolved');
    assert.equal(result.matches.length, 1);
  }
});

test('returns ambiguous instead of guessing', () => {
  const result = resolveSemanticLocator(`${fixtureV1};${fixtureRenamed}`, locator);
  assert.equal(result.status, 'ambiguous');
  assert.equal(result.target, undefined);
});

test('returns missing when anchor evidence is absent', () => {
  const result = resolveSemanticLocator('const label = "unrelated";', locator);
  assert.equal(result.status, 'missing');
  assert.equal(result.matches.length, 0);
  assert.equal(result.target, undefined);
});

test('evaluateLocatorPostconditions checks fragment counts', () => {
  const patched = fixtureV1.replace(
    'le?.text??""',
    'window.__cursorZhTranslateProductTipText(le?.text??"")'
  );
  const ok = evaluateLocatorPostconditions(patched, [
  {
    id: 'translator_call',
    fragment: '__cursorZhTranslateProductTipText',
    count: 1,
  },
  ]);
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.failures, []);

  const bad = evaluateLocatorPostconditions(fixtureV1, [
    {
      id: 'translator_call',
      fragment: '__cursorZhTranslateProductTipText',
      count: 1,
    },
  ]);
  assert.equal(bad.ok, false);
  assert.deepEqual(bad.failures, ['translator_call']);
});
