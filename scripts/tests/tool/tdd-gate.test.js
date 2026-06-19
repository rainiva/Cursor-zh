const test = require('node:test');
const assert = require('node:assert/strict');

const {
  isProductionCodePath,
  isTestPath,
  evaluateTddPairing,
} = require('../../tool/tdd-gate.js');

test('isProductionCodePath matches lib/tool production files', () => {
  assert.equal(isProductionCodePath('scripts/lib/mapping/merge.js'), true);
  assert.equal(isProductionCodePath('scripts/tool/verify.js'), true);
  assert.equal(isProductionCodePath('scripts/cursor-zh-tool.js'), true);
  assert.equal(isProductionCodePath('scripts/tests/tool/io.test.js'), false);
  assert.equal(isProductionCodePath('scripts/dev/foo.js'), false);
  assert.equal(isProductionCodePath('translations/overlay/x.json'), false);
});

test('isTestPath matches node test files under scripts/tests', () => {
  assert.equal(isTestPath('scripts/tests/tool/tdd-gate.test.js'), true);
  assert.equal(isTestPath('scripts/tool/tdd-gate.js'), false);
});

test('evaluateTddPairing passes when only tests change', () => {
  const result = evaluateTddPairing(['scripts/tests/tool/io.test.js']);
  assert.equal(result.ok, true);
});

test('evaluateTddPairing passes when production and tests change together', () => {
  const result = evaluateTddPairing([
    'scripts/tool/verify.js',
    'scripts/tests/tool/verify.test.js',
  ]);
  assert.equal(result.ok, true);
});

test('evaluateTddPairing fails when production changes without test changes', () => {
  const result = evaluateTddPairing(['scripts/tool/verify.js']);
  assert.equal(result.ok, false);
  assert.deepEqual(result.productionChanges, ['scripts/tool/verify.js']);
  assert.match(result.message, /without.*test/i);
});

test('evaluateTddPairing ignores dev-only script changes', () => {
  const result = evaluateTddPairing(['scripts/dev/split-text-translator-template.js']);
  assert.equal(result.ok, true);
});
