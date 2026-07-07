const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { classifyRuntimeMappingPool } = require('../../lib/mapping/runtime-pools.js');
const { selectRuntimeMappings } = require('../../lib/patcher/runtime-selector.js');
const { buildTranslatedWorkbenchBundle } = require('../../cursor-zh-lib.js');
const { readJsonIfExists } = require('../../tool/io.js');
const { createToolPaths } = require('../../tool/paths.js');

const toolPaths = createToolPaths(path.join(__dirname, '../../..'));

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

test('classifyRuntimeMappingPool marks L3 command_palette static-only when literal exists', () => {
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
  assert.deepEqual(runtime, []);
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

test('phase2 first batch tags Search models as model_picker-owned exact', () => {
  const mappings = readJsonIfExists(toolPaths.dynamicMappingPath, []);
  const entry = mappings.find((item) => item.originalText === 'Search models');

  assert.ok(entry, 'Search models mapping should exist');
  assert.equal(entry.surface, 'model_picker');
  assert.equal(entry.forceRuntime, false);
});

test('phase2 first batch keeps Search Settings surface-owned without forceRuntime debt', () => {
  const mappings = readJsonIfExists(toolPaths.cursorWinCommonPath, []);
  const entry = mappings.find((item) => item.originalText === 'Search Settings');

  assert.ok(entry, 'Search Settings mapping should exist');
  assert.equal(entry.surface, 'settings_search');
  assert.equal(entry.forceRuntime, false);
});

test('phase2 first batch keeps Ask Mode surface-owned without forceRuntime debt', () => {
  const mappings = readJsonIfExists(toolPaths.cursorWinCommonPath, []);
  const entry = mappings.find((item) => item.originalText === 'Ask Mode');

  assert.ok(entry, 'Ask Mode mapping should exist');
  assert.equal(entry.surface, 'mode_menu');
  assert.equal(entry.forceRuntime, false);
});

test('phase2 batch2 keeps contract dialog mappings surface-owned without forceRuntime', () => {
  const mappings = readJsonIfExists(toolPaths.cursorWinCommonPath, []);
  const logout = mappings.find((item) => item.originalText === 'Log out?');
  const shutdownTitle = mappings.find((item) => item.originalText === 'Agent is still working');

  assert.ok(logout);
  assert.ok(shutdownTitle);
  assert.equal(logout.surface, 'logout_dialog');
  assert.equal(shutdownTitle.surface, 'agent_shutdown_dialog');
  assert.equal(logout.forceRuntime, false);
  assert.equal(shutdownTitle.forceRuntime, false);
});
