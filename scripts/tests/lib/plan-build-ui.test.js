const test = require('node:test');
const assert = require('node:assert/strict');

const { CRITICAL_GLASS_ROUND41_UI_TARGETS } = require('../../lib/mapping/critical-ui-targets.js');
const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');
const { readJsonIfExists } = require('../../tool/io.js');
const { createToolPaths } = require('../../tool/paths.js');
const path = require('path');
const {
  isRealWorkbenchAvailable,
  loadRealWorkbenchFixture,
} = require('./helpers/real-workbench-fixture.js');

const toolPaths = createToolPaths(path.join(__dirname, '../../..'));

const PLAN_BUILD_LITERALS = CRITICAL_GLASS_ROUND41_UI_TARGETS.map((entry) => entry.originalText);

test('cursor-win.common.json defines plan build and agent feedback mappings', () => {
  const mappings = readJsonIfExists(toolPaths.cursorWinCommonPath, []);
  const byOriginal = new Map(mappings.map((entry) => [entry.originalText, entry]));

  for (const critical of CRITICAL_GLASS_ROUND41_UI_TARGETS) {
    const entry = byOriginal.get(critical.originalText);
    assert.ok(entry, `missing mapping: ${critical.originalText}`);
    assert.equal(entry.changeText, critical.changeText, critical.originalText);
    assert.equal(entry.forceRuntime, true, critical.originalText);
  }
});

test('real workbench static translation removes plan build quoted literals', () => {
  if (!isRealWorkbenchAvailable()) {
    return;
  }

  const fixture = loadRealWorkbenchFixture();
  const translated = applyStaticSourceTranslations(
    fixture.source,
    fixture.mergedMappings,
    fixture.index
  );

  for (const literal of PLAN_BUILD_LITERALS) {
    const escaped = literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const quoted = new RegExp(`(['"\`])${escaped}\\1`, 'g');
    assert.equal(
      (translated.match(quoted) || []).length,
      0,
      `${literal} quoted literals remain after static translation`
    );
  }
});
