const test = require('node:test');
const assert = require('node:assert/strict');

const { classifyRuntimeMappingPool } = require('../../lib/mapping/runtime-pools.js');
const { selectRuntimeMappings } = require('../../lib/patcher/runtime-selector.js');
const { buildTranslatedWorkbenchBundle } = require('../../cursor-zh-lib.js');

test('P-UX-0: L3 exact with static literal is static-only unless forceRuntime', () => {
  const pool = classifyRuntimeMappingPool(
    {
      originalText: 'Toggle Expand Agent',
      changeText: '切换展开智能体',
      searchType: 'exact',
      surface: 'command_palette',
    },
    { staticLiteralPresent: true }
  );
  assert.equal(pool, 'static-only');
});

test('P-UX-0: selectRuntimeMappings excludes L3 static exact without forceRuntime', () => {
  const source = 'title:"Toggle Expand Agent"';
  const mappings = [
    {
      originalText: 'Toggle Expand Agent',
      changeText: '切换展开智能体',
      searchType: 'exact',
      surface: 'command_palette',
    },
  ];
  const runtime = selectRuntimeMappings(source, mappings);
  assert.deepEqual(runtime, []);
});

test('P-UX-0: selectRuntimeMappings excludes forceRuntime exact when static literal exists', () => {
  const source =
    'jLi={subtitle:"Balanced quality and speed, recommended for most tasks"}';
  const mappings = [
    {
      originalText: 'Balanced quality and speed, recommended for most tasks',
      changeText: '质量与速度均衡，适合大多数任务',
      searchType: 'exact',
      surface: 'composer_chrome',
      forceRuntime: true,
    },
  ];
  const runtime = selectRuntimeMappings(source, mappings);
  assert.deepEqual(runtime, []);
});

test('P-UX-0: selectRuntimeMappings keeps scoped exact without static literal', () => {
  const source = 'const tip = ne?.text??"";';
  const mappings = [
    {
      originalText: 'No agents yet',
      changeText: '暂无 Agent',
      searchType: 'exact',
      scopeSelectors: ['[class*="empty-state"]'],
    },
  ];
  const runtime = selectRuntimeMappings(source, mappings);
  assert.deepEqual(runtime.map((e) => e.originalText), ['No agents yet']);
});

test('P-UX-0: selectRuntimeMappings excludes unscoped L3 exact without static literal', () => {
  const source = 'const dynamic = fetchMenu();';
  const mappings = [
    {
      originalText: 'Ephemeral Glass Label',
      changeText: '临时 Glass 标签',
      searchType: 'exact',
      surface: 'glass_menu',
    },
  ];
  const runtime = selectRuntimeMappings(source, mappings);
  assert.deepEqual(runtime, []);
});

test('P-UX-0: classifyRuntimeMappingPool treats static-covered forceRuntime exact as static-only', () => {
  const pool = classifyRuntimeMappingPool(
    {
      originalText: 'Balanced quality and speed, recommended for most tasks',
      changeText: '质量与速度均衡，适合大多数任务',
      searchType: 'exact',
      forceRuntime: true,
      surface: 'composer_chrome',
    },
    { staticLiteralPresent: true }
  );
  assert.equal(pool, 'static-only');
});

test('P-UX-0: buildTranslatedWorkbenchBundle omits static-covered L3 from runtime JSON', () => {
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
  assert.doesNotMatch(bundle, /"originalText"\s*:\s*"Toggle Expand Agent"/);
});
