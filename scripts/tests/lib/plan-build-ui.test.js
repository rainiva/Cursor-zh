const test = require('node:test');
const assert = require('node:assert/strict');

const { CRITICAL_GLASS_ROUND41_UI_TARGETS } = require('../../lib/mapping/critical-ui-targets.js');
const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');
const { selectRuntimeMappings } = require('../../lib/patcher/runtime-selector.js');
const { mergeMappings } = require('../../cursor-zh-lib.js');
const { readJsonIfExists } = require('../../tool/io.js');
const { createToolPaths } = require('../../tool/paths.js');
const path = require('path');
const { createRuntimeDomHarness } = require('./helpers/runtime-dom-harness.js');
const { createRuntimeConfigModule } = require('../../tool/runtime-config.js');
const { normalizeRuntimeMode } = require('../../tool/context.js');
const {
  isRealWorkbenchAvailable,
  loadRealWorkbenchFixture,
} = require('./helpers/real-workbench-fixture.js');

const { buildRuntimeConfig } = createRuntimeConfigModule({ normalizeRuntimeMode });

const toolPaths = createToolPaths(path.join(__dirname, '../../..'));

const PLAN_BUILD_EMBEDDED_LITERALS = [
  'Building...',
  'Built',
  'Build',
  'Build Locally',
  'Build in Parallel',
  'Build in Cloud',
];

const PLAN_BUILD_RUNTIME_LITERALS = CRITICAL_GLASS_ROUND41_UI_TARGETS.filter(
  (entry) => entry.forceRuntime === true
).map((entry) => entry.originalText);

test('cursor-win.common.json defines plan build and agent feedback mappings', () => {
  const mappings = readJsonIfExists(toolPaths.cursorWinCommonPath, []);
  const byOriginal = new Map(mappings.map((entry) => [entry.originalText, entry]));

  for (const critical of CRITICAL_GLASS_ROUND41_UI_TARGETS) {
    const entry = byOriginal.get(critical.originalText);
    assert.ok(entry, `missing mapping: ${critical.originalText}`);
    assert.equal(entry.changeText, critical.changeText, critical.originalText);
    assert.equal(entry.surface, 'composer_chrome', critical.originalText);
    assert.equal(entry.forceRuntime, critical.forceRuntime, critical.originalText);
    if (Array.isArray(critical.scopeSelectors)) {
      assert.deepEqual(entry.scopeSelectors, critical.scopeSelectors, critical.originalText);
    }
  }
});

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

test('embedded patch removes plan build menu label quoted literals', () => {
  const mappings = loadMergedMappings();
  const source = [
    'label:"Build Locally",onClick:buildLocal',
    'label:"Build in Parallel",onClick:buildParallel',
  ].join('\n');
  const translated = applyStaticSourceTranslations(source, mappings);
  assert.doesNotMatch(translated, /"Build Locally"/);
  assert.doesNotMatch(translated, /"Build in Parallel"/);
  assert.match(translated, /本地构建/);
  assert.match(translated, /并行构建/);
});

test('selectRuntimeMappings excludes embedded-covered plan build labels from runtime pool', () => {
  const mappings = loadMergedMappings();
  const source = [
    'label:"Build Locally",onClick:buildLocal',
    'label:"Build in Parallel",onClick:buildParallel',
    'label:"Build in Cloud",onClick:buildCloud',
    'children:"Building...",status:"Built"',
  ].join('\n');
  const runtime = selectRuntimeMappings(source, mappings);
  const originals = new Set(runtime.map((entry) => entry.originalText));

  for (const label of PLAN_BUILD_EMBEDDED_LITERALS) {
    assert.equal(originals.has(label), false, `${label} should not enter runtime when static handles it`);
  }

  for (const label of PLAN_BUILD_RUNTIME_LITERALS) {
    assert.equal(originals.has(label), true, `${label} should remain in runtime pool`);
  }
});

test('runtime DOM translates plan build menu items inside role=menu', () => {
  const mappings = loadMergedMappings();
  const harness = createRuntimeDomHarness({
    workbenchSource: 'Build Locally',
    runtimeMappings: selectRuntimeMappings('Build Locally', mappings),
    runtimeConfig: {
      ...buildRuntimeConfig('performance'),
      marketplaceLazyTranslationEnabled: false,
    },
  });
  harness.runDueTimers(Infinity);

  const { menu } = harness.mountMenuItem('Build Locally');
  harness.runtime.translateTree(menu);
  harness.runDueTimers(Infinity);

  assert.equal(harness.getMenuItemText(menu), '本地构建');
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

  for (const literal of [...PLAN_BUILD_EMBEDDED_LITERALS, ...PLAN_BUILD_RUNTIME_LITERALS]) {
    const escaped = literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const quoted = new RegExp(`(['"\`])${escaped}\\1`, 'g');
    assert.equal(
      (translated.match(quoted) || []).length,
      0,
      `${literal} quoted literals remain after static translation`
    );
  }
});
