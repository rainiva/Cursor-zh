const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const {
  CRITICAL_GLASS_ROUND40_UI_TARGETS,
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

const COPIED_EMBEDDED_PATCH = CRITICAL_EMBEDDED_UI_PATCHES.find(
  (patch) => patch.from === "this.title = 'Copied!'"
);

const DESKTOP_TAB_MENU_LITERALS = [
  'Close Others',
  'Close to the Right',
  'Close All',
  'Rename tab',
];

const GLASS_TAB_MENU_LITERALS = ['Pin to workspace', 'Open in Editor Window', 'Copied'];

test('cursor-win.common.json defines tab context menu and copy feedback mappings', () => {
  const mappings = readJsonIfExists(toolPaths.cursorWinCommonPath, []);
  const byOriginal = new Map(mappings.map((entry) => [entry.originalText, entry]));

  for (const critical of CRITICAL_GLASS_ROUND40_UI_TARGETS) {
    const entry = byOriginal.get(critical.originalText);
    assert.ok(entry, `missing mapping: ${critical.originalText}`);
    assert.equal(entry.changeText, critical.changeText, critical.originalText);
    assert.equal(entry.forceRuntime, true, critical.originalText);
  }
});

test('embedded patch translates Copied! notification title on real workbench', () => {
  if (!isRealWorkbenchAvailable()) {
    return;
  }

  assert.ok(COPIED_EMBEDDED_PATCH, 'Copied! embedded patch should be registered');

  const source = fs.readFileSync(
    process.env.CURSOR_WORKBENCH_PATH ||
      'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js',
    'utf8'
  );

  if (!source.includes(COPIED_EMBEDDED_PATCH.from)) {
    return;
  }

  const translated = source.split(COPIED_EMBEDDED_PATCH.from).join(COPIED_EMBEDDED_PATCH.to);
  assert.ok(translated.includes(COPIED_EMBEDDED_PATCH.to), 'missing embedded patch output');
  assert.equal(translated.includes(COPIED_EMBEDDED_PATCH.from), false, 'fragment remains');
});

test('real desktop workbench static translation removes tab menu quoted literals', () => {
  if (!isRealWorkbenchAvailable()) {
    return;
  }

  const fixture = loadRealWorkbenchFixture();
  const translated = applyStaticSourceTranslations(
    fixture.source,
    fixture.mergedMappings,
    fixture.index
  );

  for (const literal of DESKTOP_TAB_MENU_LITERALS) {
    const escaped = literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const quoted = new RegExp(`(['"\`])${escaped}\\1`, 'g');
    assert.equal(
      (translated.match(quoted) || []).length,
      0,
      `${literal} quoted literals remain after static translation`
    );
  }
});

test('real glass workbench static translation removes glass-only tab menu quoted literals', () => {
  if (!isRealWorkbenchAvailable(GLASS_WORKBENCH_PATH)) {
    return;
  }

  const fixture = loadRealWorkbenchFixture({ workbenchPath: GLASS_WORKBENCH_PATH });
  const translated = applyStaticSourceTranslations(
    fixture.source,
    fixture.mergedMappings,
    fixture.index
  );

  for (const literal of GLASS_TAB_MENU_LITERALS) {
    const escaped = literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const quoted = new RegExp(`(['"\`])${escaped}\\1`, 'g');
    assert.equal(
      (translated.match(quoted) || []).length,
      0,
      `${literal} quoted literals remain after static translation`
    );
  }
});
