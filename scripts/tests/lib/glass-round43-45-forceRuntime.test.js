const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const {
  CRITICAL_GLASS_ROUND43_UI_TARGETS,
  CRITICAL_GLASS_ROUND44_UI_TARGETS,
  CRITICAL_GLASS_ROUND45_UI_TARGETS,
} = require('../../lib/mapping/critical-ui-targets.js');
const { readJsonIfExists } = require('../../tool/io');
const { createToolPaths } = require('../../tool/paths');

const toolPaths = createToolPaths(path.join(__dirname, '../../..'));

const PATCH_COVERED_ROUND_TARGETS = [
  ...CRITICAL_GLASS_ROUND43_UI_TARGETS,
  ...CRITICAL_GLASS_ROUND44_UI_TARGETS,
  ...CRITICAL_GLASS_ROUND45_UI_TARGETS,
];

test('round 43-45 patch-covered mappings do not set forceRuntime in common overlay', () => {
  const mappings = readJsonIfExists(toolPaths.cursorWinCommonPath, []);
  const byOriginal = new Map(mappings.map((entry) => [entry.originalText, entry]));

  for (const critical of PATCH_COVERED_ROUND_TARGETS) {
    const entry = byOriginal.get(critical.originalText);
    assert.ok(entry, `missing mapping: ${critical.originalText}`);
    assert.notEqual(
      entry.forceRuntime,
      true,
      `${critical.originalText} should rely on embedded patch/static, not forceRuntime`
    );
  }
});
