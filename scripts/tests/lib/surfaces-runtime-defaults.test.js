const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const {
  loadSurfaceDefinitions,
  applySurfaceRuntimeDefaults,
} = require('../../lib/mapping/surfaces.js');
const { selectRuntimeMappings } = require('../../lib/patcher/runtime-selector.js');

const workspaceRoot = path.resolve(__dirname, '../../..');

test('applySurfaceRuntimeDefaults keeps forcing runtime for L3 mappings without explicit forceRuntime', () => {
  const surfaces = loadSurfaceDefinitions(workspaceRoot);
  const result = applySurfaceRuntimeDefaults(
    {
      originalText: 'Toggle Expand Agent',
      changeText: '切换展开智能体',
      searchType: 'exact',
      surface: 'command_palette',
    },
    surfaces
  );
  assert.equal(result.forceRuntime, true);
  assert.notEqual(result.staticPreferred, true);
});

test('applySurfaceRuntimeDefaults marks explicit forceRuntime:false L3 mappings as staticPreferred', () => {
  const surfaces = loadSurfaceDefinitions(workspaceRoot);
  const result = applySurfaceRuntimeDefaults(
    {
      originalText: 'Ask Mode',
      changeText: '询问模式',
      searchType: 'exact',
      surface: 'mode_menu',
      forceRuntime: false,
    },
    surfaces
  );
  assert.equal(result.staticPreferred, true, 'L3 + forceRuntime:false 应标记 staticPreferred');
  assert.equal(result.forceRuntime, false, '不得改写显式 forceRuntime:false');
});

test('applySurfaceRuntimeDefaults leaves non-L3 mappings untouched', () => {
  const surfaces = loadSurfaceDefinitions(workspaceRoot);
  const mapping = {
    originalText: 'Search models',
    changeText: '搜索模型',
    searchType: 'exact',
    surface: 'model_picker',
    forceRuntime: false,
  };
  const result = applySurfaceRuntimeDefaults(mapping, surfaces);
  assert.deepEqual(result, mapping);
  assert.equal('staticPreferred' in result, false);
});

test('selectRuntimeMappings still prunes staticPreferred L3 exact mappings without scope', () => {
  // 回补由 builder 层对账（任务 1.2）负责，选择器剪枝行为保持不变。
  const source = 'label:"Ask Mode"';
  const runtime = selectRuntimeMappings(source, [
    {
      originalText: 'Ask Mode',
      changeText: '询问模式',
      searchType: 'exact',
      surface: 'mode_menu',
      forceRuntime: false,
      staticPreferred: true,
    },
  ]);
  assert.deepEqual(runtime, []);
});
