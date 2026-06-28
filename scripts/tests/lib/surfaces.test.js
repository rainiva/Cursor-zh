const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const {
  loadSurfaceDefinitions,
  applySurfaceRuntimeDefaults,
  getL3RuntimeScopeSelectors,
  inferHarvestEntrySurface,
} = require('../../lib/mapping/surfaces.js');

const workspaceRoot = path.resolve(__dirname, '../../..');

test('loadSurfaceDefinitions exposes at least 8 L3 surfaces', () => {
  const surfaces = loadSurfaceDefinitions(workspaceRoot);
  const l3 = Object.entries(surfaces).filter(([, def]) => def.defaultLayer === 'L3');
  assert.ok(l3.length >= 8, `expected >=8 L3 surfaces, got ${l3.length}`);
});

test('applySurfaceRuntimeDefaults sets forceRuntime for L3 surface mappings', () => {
  const surfaces = loadSurfaceDefinitions(workspaceRoot);
  const result = applySurfaceRuntimeDefaults(
    {
      originalText: 'New Palette Item',
      changeText: '新项',
      searchType: 'exact',
      surface: 'command_palette',
    },
    surfaces
  );
  assert.equal(result.forceRuntime, true);
});

test('applySurfaceRuntimeDefaults leaves L2 contract surfaces unchanged', () => {
  const surfaces = loadSurfaceDefinitions(workspaceRoot);
  const result = applySurfaceRuntimeDefaults(
    {
      originalText: 'Search models',
      changeText: '搜索模型',
      searchType: 'exact',
      surface: 'model_picker',
    },
    surfaces
  );
  assert.notEqual(result.forceRuntime, true);
});

test('getL3RuntimeScopeSelectors returns deduped selectors', () => {
  const selectors = getL3RuntimeScopeSelectors(workspaceRoot);
  assert.ok(selectors.length >= 8);
  assert.equal(selectors.length, new Set(selectors).size);
});

test('inferHarvestEntrySurface maps glass command titles to command_palette', () => {
  const surfaces = loadSurfaceDefinitions(workspaceRoot);
  assert.equal(
    inferHarvestEntrySurface(
      { path: 'workbench.glass.main.js', context: 'title:', text: 'Toggle Expand Agent' },
      surfaces
    ),
    'command_palette'
  );
});

test('inferHarvestEntrySurface maps desktop title context to command_palette', () => {
  const surfaces = loadSurfaceDefinitions(workspaceRoot);
  assert.equal(
    inferHarvestEntrySurface(
      {
        path: 'workbench.desktop.main.js',
        context: 'title:',
        text: 'Go to Next Difference',
      },
      surfaces
    ),
    'command_palette'
  );
});

test('inferHarvestEntrySurface maps desktop label context to glass_menu', () => {
  const surfaces = loadSurfaceDefinitions(workspaceRoot);
  assert.equal(
    inferHarvestEntrySurface(
      { path: 'workbench.desktop.main.js', context: 'label:', text: "Don't ask again" },
      surfaces
    ),
    'glass_menu'
  );
});

test('inferHarvestEntrySurface keeps glass title classification after desktop inference', () => {
  const surfaces = loadSurfaceDefinitions(workspaceRoot);
  assert.equal(
    inferHarvestEntrySurface(
      { path: 'workbench.glass.main.js', context: 'title:', text: 'Register Close Tooltip' },
      surfaces
    ),
    'command_palette'
  );
});

test('inferHarvestEntrySurface leaves desktop children without palette hints as unknown', () => {
  const surfaces = loadSurfaceDefinitions(workspaceRoot);
  assert.equal(
    inferHarvestEntrySurface(
      { path: 'workbench.desktop.main.js', context: 'children:', text: 'Zoom in' },
      surfaces
    ),
    'unknown'
  );
});
