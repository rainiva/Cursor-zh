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
  assert.equal(counts['runtime-by-surface'], 1);
});
