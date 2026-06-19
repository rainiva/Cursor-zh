const test = require('node:test');
const assert = require('node:assert/strict');

const { summarizeRuntimeFootprintFromParts } = require('../../lib/runtime/footprint.js');

test('summarizeRuntimeFootprintFromParts reports header metrics without full bundle text', () => {
  const metrics = summarizeRuntimeFootprintFromParts(
    '/* header */',
    'translated-body',
    [{ originalText: 'A', changeText: 'B', searchType: 'exact' }]
  );

  assert.equal(metrics.runtimeHeaderChars, '/* header */'.length);
  assert.equal(metrics.runtimeHeaderKB, +(( '/* header */'.length / 1024).toFixed(1)));
  assert.equal(metrics.runtimeMappingCount, 1);
});
