const test = require('node:test');
const assert = require('node:assert/strict');

const { selectRuntimeMappingsUnion } = require('../../lib/patcher/runtime-selector.js');

test('selectRuntimeMappingsUnion keeps runtime mappings found in any workbench source', () => {
  const mappings = [
    { originalText: 'Desktop only', changeText: '仅 desktop', searchType: 'exact' },
    { originalText: 'Glass only', changeText: '仅 glass', searchType: 'exact' },
    { originalText: 'Shared label', changeText: '共享', searchType: 'exact', forceRuntime: true },
  ];

  const selected = selectRuntimeMappingsUnion(
    [
      {
        workbenchSource: 'const label = "Desktop only";',
      },
      {
        workbenchSource: 'const label = "Glass only";',
      },
    ],
    mappings
  );

  assert.deepEqual(
    selected.map((entry) => entry.originalText).sort(),
    ['Desktop only', 'Glass only', 'Shared label']
  );
});
