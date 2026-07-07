const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { createWorkbenchIndex } = require('../../lib/patcher/workbench-index.js');
const { selectRuntimeMappingsUnion } = require('../../lib/patcher/runtime-selector.js');
const { mergeMappings } = require('../../lib/mapping/merge.js');
const { readJsonIfExists } = require('../../tool/io.js');
const { createToolPaths } = require('../../tool/paths.js');

const toolPaths = createToolPaths(path.join(__dirname, '../../..'));
const INSTALL_DESKTOP = 'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js';
const INSTALL_GLASS = 'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.glass.main.js';

function loadMergedMappings() {
  return mergeMappings(
    mergeMappings(
      mergeMappings(
        readJsonIfExists(toolPaths.baseMappingPath, []),
        readJsonIfExists(toolPaths.overlayMappingPath, [])
      ),
      readJsonIfExists(toolPaths.cursorWinCommonPath, [])
    ),
    readJsonIfExists(toolPaths.dynamicMappingPath, [])
  );
}

function loadRuntimeUnionCount() {
  if (!fs.existsSync(INSTALL_DESKTOP) || !fs.existsSync(INSTALL_GLASS)) {
    return null;
  }

  const desktop = fs.readFileSync(INSTALL_DESKTOP, 'utf8');
  const glass = fs.readFileSync(INSTALL_GLASS, 'utf8');
  const indexD = createWorkbenchIndex(desktop);
  const indexG = createWorkbenchIndex(glass);
  const merged = loadMergedMappings();
  return selectRuntimeMappingsUnion(
    [
      { workbenchSource: desktop, workbenchIndex: indexD },
      { workbenchSource: glass, workbenchIndex: indexG },
    ],
    merged
  ).length;
}

const BATCH3_OWNERSHIP_SAMPLES = [
  { originalText: 'Plugin MCP Servers', surface: 'plugins_onboarding', forceRuntime: false },
  { originalText: 'Open MCP Settings', surface: 'plugins_onboarding', forceRuntime: false },
  {
    originalText: 'Provide domain-specific knowledge and workflows for the agent',
    surface: 'settings_search',
    forceRuntime: false,
  },
  { originalText: 'Send', forceRuntime: false },
];

test('P-UX-3: batch3 assigns L3 ownership to high-volume legacy runtime debt', () => {
  const mappings = readJsonIfExists(toolPaths.cursorWinCommonPath, []);

  for (const expected of BATCH3_OWNERSHIP_SAMPLES) {
    const entry = mappings.find((item) => item.originalText === expected.originalText);
    assert.ok(entry, `${expected.originalText} mapping should exist`);
    if (expected.surface) {
      assert.equal(entry.surface, expected.surface, `${expected.originalText} surface`);
    }
    assert.equal(entry.forceRuntime, false, `${expected.originalText} forceRuntime`);
  }
});

test('P-UX-3: batch3 drives runtime injection union toward phase2 mapping cap', () => {
  const runtimeCount = loadRuntimeUnionCount();
  if (runtimeCount === null) {
    return;
  }

  assert.ok(
    runtimeCount <= 800,
    `expected runtime injection union <= 800 after batch3 ownership, got ${runtimeCount}`
  );
});
