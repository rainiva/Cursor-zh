const test = require('node:test');
const assert = require('node:assert/strict');

const { classifyRuntimeMappingPool } = require('../../lib/mapping/runtime-pools.js');
const { selectRuntimeMappings } = require('../../lib/patcher/runtime-selector.js');
const { buildTranslatedWorkbenchBundle } = require('../../cursor-zh-lib.js');

test('classifyRuntimeMappingPool marks pure L2 exact as static-only when literal exists', () => {
  const pool = classifyRuntimeMappingPool(
    {
      originalText: 'Search models',
      changeText: '搜索模型',
      searchType: 'exact',
      surface: 'model_picker',
    },
    { staticLiteralPresent: true }
  );
  assert.equal(pool, 'static-only');
});

test('classifyRuntimeMappingPool keeps L3 command_palette in runtime-general', () => {
  const pool = classifyRuntimeMappingPool(
    {
      originalText: 'Toggle Expand Agent',
      changeText: '切换展开智能体',
      searchType: 'exact',
      surface: 'command_palette',
    },
    { staticLiteralPresent: true }
  );
  assert.equal(pool, 'runtime-general');
});

test('selectRuntimeMappings excludes pure L2 static exact from runtime injection set', () => {
  const source = 'const x = "Search models";';
  const mappings = [
    {
      originalText: 'Search models',
      changeText: '搜索模型',
      searchType: 'exact',
      surface: 'model_picker',
    },
    {
      originalText: 'Toggle Expand Agent',
      changeText: '切换展开智能体',
      searchType: 'exact',
      surface: 'command_palette',
    },
  ];
  const runtime = selectRuntimeMappings(source, mappings);
  assert.deepEqual(runtime.map((e) => e.originalText), ['Toggle Expand Agent']);
});

test('L3 command_palette survives static bundle without static replacement in runtime helper', () => {
  const bundle = buildTranslatedWorkbenchBundle({
    workbenchSource: 'title:"Toggle Expand Agent"',
    mappings: [
      {
        originalText: 'Toggle Expand Agent',
        changeText: '切换展开智能体',
        searchType: 'exact',
        surface: 'command_palette',
      },
    ],
    metadata: { runtimeConfig: { mode: 'performance' } },
  });
  assert.match(bundle, /切换展开智能体/);
  assert.match(bundle, /__cursorZhTranslateInlineText/);
});
