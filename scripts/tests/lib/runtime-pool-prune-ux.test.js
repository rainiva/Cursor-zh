const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { classifyRuntimeMappingPool } = require('../../lib/mapping/runtime-pools.js');
const { selectRuntimeMappings } = require('../../lib/patcher/runtime-selector.js');
const { buildTranslatedWorkbenchBundle } = require('../../cursor-zh-lib.js');
const { readJsonIfExists } = require('../../tool/io.js');
const { createToolPaths } = require('../../tool/paths.js');

const toolPaths = createToolPaths(path.join(__dirname, '../../..'));

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

test('P-UX-0: selectRuntimeMappings includes forceRuntime exact even when static literal exists', () => {
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
  assert.deepEqual(runtime.map(e => e.originalText), ['Balanced quality and speed, recommended for most tasks']);
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

test('P-UX-1: first phase2 batch assigns mode labels to mode_menu ownership', () => {
  const mappings = readJsonIfExists(toolPaths.cursorWinCommonPath, []);
  const planMode = mappings.find((item) => item.originalText === 'Plan Mode');
  const multitaskMode = mappings.find((item) => item.originalText === 'Multitask Mode');
  const debugMode = mappings.find((item) => item.originalText === 'Debug Mode');
  const askMode = mappings.find((item) => item.originalText === 'Ask Mode');

  assert.ok(planMode, 'Plan Mode mapping should exist');
  assert.ok(multitaskMode, 'Multitask Mode mapping should exist');
  assert.ok(debugMode, 'Debug Mode mapping should exist');
  assert.ok(askMode, 'Ask Mode mapping should exist');

  assert.equal(planMode.surface, 'mode_menu');
  assert.equal(multitaskMode.surface, 'mode_menu');
  assert.equal(debugMode.surface, 'mode_menu');
  assert.equal(askMode.surface, 'mode_menu');

  assert.equal(planMode.forceRuntime, false);
  assert.equal(multitaskMode.forceRuntime, false);
  assert.equal(debugMode.forceRuntime, false);
  assert.equal(askMode.forceRuntime, false);
});

const BATCH2_CONTRACT_OWNERSHIP = [
  { originalText: 'Open Settings', surface: 'settings' },
  { originalText: 'Reload Window', surface: 'window_menu' },
  { originalText: 'New Tab', surface: 'editor_chrome' },
  { originalText: 'Log out?', surface: 'logout_dialog' },
  { originalText: 'Agent is still working', surface: 'agent_shutdown_dialog' },
  { originalText: '{0} agents are still working', surface: 'agent_shutdown_dialog' },
  { originalText: 'Stopping now will cancel the current task.', surface: 'agent_shutdown_dialog' },
  { originalText: 'Stopping now will cancel their current tasks.', surface: 'agent_shutdown_dialog' },
  { originalText: 'Quit Anyway', surface: 'agent_shutdown_dialog' },
  {
    originalText: 'Extensions have been modified on disk. Please reload the window.',
    surface: 'extension_cache_dialog',
  },
  { originalText: '&&Reload Window', surface: 'extension_cache_dialog' },
];

test('P-UX-2: phase2 batch2 assigns contract mapping surfaces without forceRuntime debt', () => {
  const mappings = readJsonIfExists(toolPaths.cursorWinCommonPath, []);

  for (const expected of BATCH2_CONTRACT_OWNERSHIP) {
    const entry = mappings.find((item) => item.originalText === expected.originalText);
    assert.ok(entry, `${expected.originalText} mapping should exist`);
    assert.equal(entry.surface, expected.surface, `${expected.originalText} surface`);
    assert.equal(entry.forceRuntime, false, `${expected.originalText} forceRuntime`);
  }
});
