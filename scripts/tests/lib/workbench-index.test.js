const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createQuotedLiteralSet,
  createWorkbenchIndex,
} = require('../../lib/patcher/workbench-index.js');

test('createQuotedLiteralSet extracts quoted string contents in one pass', () => {
  const source = `const a = "Search models"; const b = 'Sign In'; const c = \`Worked for \${n}\`;`;
  const literals = createQuotedLiteralSet(source);

  assert.equal(literals.has('Search models'), true);
  assert.equal(literals.has('Sign In'), true);
  assert.equal(literals.has('Worked for ${n}'), true);
  assert.equal(literals.has('Missing'), false);
});

test('createWorkbenchIndex answers quoted literal membership in O(1)', () => {
  const index = createWorkbenchIndex('const label = "General";');
  assert.equal(index.hasQuotedLiteral('General'), true);
  assert.equal(index.hasQuotedLiteral('Appearance'), false);
  assert.equal(index.includes('General'), true);
});
