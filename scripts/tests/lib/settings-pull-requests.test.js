const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const {
  CRITICAL_GLASS_ROUND39_UI_TARGETS,
  CRITICAL_EMBEDDED_UI_PATCHES,
} = require('../../lib/mapping/critical-ui-targets.js');
const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');
const { readJsonIfExists } = require('../../tool/io.js');
const { createToolPaths } = require('../../tool/paths.js');
const path = require('path');
const {
  isRealWorkbenchAvailable,
  loadRealWorkbenchFixture,
} = require('./helpers/real-workbench-fixture.js');

const GLASS_WORKBENCH_PATH =
  process.env.CURSOR_GLASS_WORKBENCH_PATH ||
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.glass.main.js';

const toolPaths = createToolPaths(path.join(__dirname, '../../..'));

const PR_SETTINGS_EMBEDDED_PATCHES = CRITICAL_EMBEDDED_UI_PATCHES.filter((patch) =>
  [
    'function FtT(n){return`Choose ${BtT(n)} for pull request links on web and desktop`}',
    'function JtT(n){return n==="externalBrowser"?"Default browser":"Inside Cursor"}',
    'e.length===2?`${e[0]} or ${e[1]}`:`${e.slice(0,-1).join(", ")}, or ${e[e.length-1]}`',
  ].includes(patch.from)
);

test('cursor-win.common.json defines Pull Requests settings mappings', () => {
  const mappings = readJsonIfExists(toolPaths.cursorWinCommonPath, []);
  const byOriginal = new Map(mappings.map((entry) => [entry.originalText, entry]));

  for (const critical of CRITICAL_GLASS_ROUND39_UI_TARGETS) {
    const entry = byOriginal.get(critical.originalText);
    assert.ok(entry, `missing mapping: ${critical.originalText}`);
    assert.equal(entry.changeText, critical.changeText, critical.originalText);
    assert.equal(entry.surface, 'settings_search', critical.originalText);
    assert.equal(entry.forceRuntime, true, critical.originalText);
  }
});

test('embedded patches translate dynamic PR settings helpers on real glass workbench', () => {
  if (!fs.existsSync(GLASS_WORKBENCH_PATH)) {
    return;
  }

  const source = fs.readFileSync(GLASS_WORKBENCH_PATH, 'utf8');
  let translated = source;
  for (const patch of PR_SETTINGS_EMBEDDED_PATCHES) {
    if (translated.includes(patch.from)) {
      translated = translated.split(patch.from).join(patch.to);
    }
  }

  for (const patch of PR_SETTINGS_EMBEDDED_PATCHES) {
    if (!source.includes(patch.from)) {
      continue;
    }
    assert.ok(translated.includes(patch.to), `missing embedded patch: ${patch.to}`);
    assert.equal(translated.includes(patch.from), false, `fragment remains: ${patch.from}`);
  }
});

test('real glass workbench static translation removes Pull Requests settings quoted literals', () => {
  if (!isRealWorkbenchAvailable(GLASS_WORKBENCH_PATH)) {
    return;
  }

  const fixture = loadRealWorkbenchFixture({ workbenchPath: GLASS_WORKBENCH_PATH });
  const translated = applyStaticSourceTranslations(
    fixture.source,
    fixture.mergedMappings,
    fixture.index
  );

  const literals = CRITICAL_GLASS_ROUND39_UI_TARGETS.map((entry) => entry.originalText);

  for (const literal of literals) {
    const escaped = literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const quoted = new RegExp(`(['"\`])${escaped}\\1`, 'g');
    assert.equal(
      (translated.match(quoted) || []).length,
      0,
      `${literal} quoted literals remain after static translation`
    );
  }
});
