const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  RETIRED_GLASS_ROUND_TESTS,
  listTestFiles,
} = require('../../run-tests.js');

test('listTestFiles discovers tests under scripts/tests', () => {
  const files = listTestFiles();
  assert.ok(files.length >= 80, `expected at least 80 tests, got ${files.length}`);
  assert.ok(files.some((file) => file.replace(/\\/g, '/').endsWith('scripts/tests/cursor-zh-lib.test.js')));
  assert.ok(files.some((file) => file.replace(/\\/g, '/').endsWith('scripts/tests/tool/tdd-gate.test.js')));
});

test('listTestFiles excludes retired glass-round17 through round19 screenshot tests', () => {
  const files = listTestFiles().map((file) => path.basename(file));
  for (const retired of RETIRED_GLASS_ROUND_TESTS) {
    assert.equal(files.includes(retired), false, `retired test still included: ${retired}`);
  }
  assert.equal(files.includes('glass-round20-automation.test.js'), true);
});

test('listTestFiles includes previously omitted safety and coverage tests', () => {
  const files = listTestFiles().map((file) => path.basename(file));
  assert.equal(files.includes('runtime-regex-safety.test.js'), true);
  assert.equal(files.includes('coverage-normalize.test.js'), true);
  assert.equal(files.includes('commands-start.test.js'), true);
});

test('listTestFiles does not duplicate coverage-reverse.test.js', () => {
  const files = listTestFiles().map((file) => path.basename(file));
  assert.equal(files.filter((name) => name === 'coverage-reverse.test.js').length, 1);
});
