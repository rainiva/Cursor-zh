const test = require('node:test');
const assert = require('node:assert/strict');

const { summarizeRuntimePools } = require('../../lib/mapping/runtime-pools.js');

test('summarizeRuntimePools counts static-only vs runtime-general', () => {
  const mappings = [
    { originalText: 'A', searchType: 'exact', surface: 'model_picker' },
    { originalText: 'B', searchType: 'exact', surface: 'command_palette', forceRuntime: true },
  ];
  const counts = summarizeRuntimePools(mappings, (text) => text === 'A');
  assert.equal(counts['static-only'], 1);
  assert.equal(counts['runtime-force'], 1);
});

test('summarizeRuntimePools isolates legacy global exact runtime debt', () => {
  const selected = [
    { originalText: 'Search models', searchType: 'exact', surface: 'model_picker' },
    { originalText: 'Plan Mode', searchType: 'exact', forceRuntime: true, surface: 'glass_menu' },
    { originalText: 'Long generic sentence', searchType: 'exact' },
    { originalText: 'Settings hint', searchType: 'exact', scopeSelectors: ['[class*="settings"]'] },
    { originalText: '^foo$', searchType: 'regex' },
  ];

  const counts = summarizeRuntimePools(selected, () => false);

  assert.equal(counts['runtime-by-surface'], 1);
  assert.equal(counts['runtime-force'], 1);
  assert.equal(counts['legacy-global-exact'], 1);
  assert.equal(counts['runtime-scoped'], 1);
  assert.equal(counts['runtime-regex'], 1);
});
