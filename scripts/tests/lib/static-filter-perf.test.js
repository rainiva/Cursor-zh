const test = require('node:test');
const assert = require('node:assert/strict');

const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');
const { createWorkbenchIndex } = require('../../lib/patcher/workbench-index.js');
const { sourceHasQuotedLiteral } = require('../../lib/patcher/runtime-selector.js');

test('applyStaticSourceTranslations filters mappings quickly on large sources with many absent labels', () => {
  const padding = `"General";${'a'.repeat(2_000_000)};"File";`;
  const index = createWorkbenchIndex(padding);
  const mappings = [
    { originalText: 'File', changeText: '文件', searchType: 'exact' },
    { originalText: 'General', changeText: '常规', searchType: 'exact' },
  ];

  const startedAt = Date.now();
  const translated = applyStaticSourceTranslations(padding, mappings, index);
  const elapsedMs = Date.now() - startedAt;

  assert.ok(elapsedMs < 1500, `static translation filter+apply took ${elapsedMs}ms`);
  assert.equal(translated.includes('"File"'), false);
  assert.equal(translated.includes('"General"'), false);
  assert.ok(translated.includes('"文件"'));
  assert.ok(translated.includes('"常规"'));

  const filterStartedAt = Date.now();
  for (let i = 0; i < 600; i += 1) {
    sourceHasQuotedLiteral(padding, 'a', index);
  }
  const filterElapsedMs = Date.now() - filterStartedAt;
  assert.ok(filterElapsedMs < 200, `mapping membership checks took ${filterElapsedMs}ms`);
});
