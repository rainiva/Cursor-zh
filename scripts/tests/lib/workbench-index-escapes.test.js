const test = require('node:test');
const assert = require('node:assert/strict');

const { createQuotedLiteralSet } = require('../../lib/patcher/workbench-index.js');

test('createQuotedLiteralSet handles unicode escapes without desyncing quote scan', () => {
  const source = `const icon = "\\u2713"; const label = "Search models";`;
  const literals = createQuotedLiteralSet(source);
  assert.equal(literals.has('Search models'), true);
});

test('createQuotedLiteralSet extracts placeholder object literals from minified JSX-like snippets', () => {
  const source = 'return $(ki.SearchInput,{placeholder:"Search models"}),e[18]=H';
  const literals = createQuotedLiteralSet(source);
  assert.equal(literals.has('Search models'), true);
});

test('createQuotedLiteralSet skips regex literals that contain quote characters', () => {
  const source =
    's.replace(/^["\']|["\']$/g,""),a=i.match(/^([|o}{]+)(--|\\.\\.?)([|o}{]+)$/),placeholder:"Search models"';
  const literals = createQuotedLiteralSet(source);
  assert.equal(literals.has('Search models'), true);
});
