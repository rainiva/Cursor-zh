const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  CRITICAL_UI_ALL_TARGETS,
  CRITICAL_EMBEDDED_UI_PATCHES,
} = require('../../lib/mapping/critical-ui-targets.js');
const { CRITICAL_NLS_TARGETS } = require('../../lib/mapping/critical-nls-targets.js');
const { readJsonIfExists } = require('../../tool/io.js');
const { createToolPaths } = require('../../tool/paths.js');
const { mergeMappings } = require('../../cursor-zh-lib.js');
const { sourceHasQuotedLiteral } = require('../../lib/patcher/runtime-selector.js');
const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');
const { createWorkbenchIndex } = require('../../lib/patcher/workbench-index.js');

const toolPaths = createToolPaths(path.join(__dirname, '../../..'));

function loadOverlayCommonMappings() {
  return readJsonIfExists(toolPaths.cursorWinCommonPath, []);
}

test('Created automation sort label maps to 创建 not 创建时间', () => {
  const mappings = loadOverlayCommonMappings();
  const entry = mappings.find((mapping) => mapping.originalText === 'Created');
  assert.ok(entry, 'Created mapping should exist in cursor-win.common.json');
  assert.equal(entry.changeText, '创建', 'Created is a sort dimension label, not a timestamp');
});

test('cursor-win.common.json defines every critical chat and shell UI mapping', () => {
  const mappings = loadOverlayCommonMappings();
  const byOriginal = new Map(mappings.map((entry) => [entry.originalText, entry]));

  for (const critical of [...CRITICAL_UI_ALL_TARGETS, ...CRITICAL_NLS_TARGETS]) {
    const entry = byOriginal.get(critical.originalText);
    assert.ok(entry, `missing mapping: ${critical.originalText}`);
    assert.equal(entry.changeText, critical.changeText, critical.originalText);
    if (critical.forceRuntime) {
      assert.equal(entry.forceRuntime, true, `${critical.originalText} should use runtime`);
    }
  }
});

test('merged mappings cover critical UI literals present in real workbench', () => {
  const workbenchPath =
    process.env.CURSOR_WORKBENCH_PATH ||
    'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js';

  if (!fs.existsSync(workbenchPath)) {
    return;
  }

  const source = fs.readFileSync(workbenchPath, 'utf8');
  const mergedMappings = mergeMappings(
    mergeMappings(
      mergeMappings(
        readJsonIfExists(toolPaths.baseMappingPath, []),
        readJsonIfExists(toolPaths.overlayMappingPath, [])
      ),
      loadOverlayCommonMappings()
    ),
    readJsonIfExists(toolPaths.dynamicMappingPath, [])
  );
  const lookup = new Map(mergedMappings.map((entry) => [entry.originalText, entry]));
  const missing = [];

  for (const critical of [...CRITICAL_UI_ALL_TARGETS, ...CRITICAL_NLS_TARGETS]) {
    if (!sourceHasQuotedLiteral(source, critical.originalText) || lookup.has(critical.originalText)) {
      continue;
    }
    missing.push(critical.originalText);
  }

  assert.deepEqual(missing, []);
});

test('static translation removes quoted literals for non-runtime critical menu labels on real workbench', () => {
  const workbenchPath =
    process.env.CURSOR_WORKBENCH_PATH ||
    'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js';

  if (!fs.existsSync(workbenchPath)) {
    return;
  }

  const source = fs.readFileSync(workbenchPath, 'utf8');
  const mergedMappings = mergeMappings(
    mergeMappings(
      mergeMappings(
        readJsonIfExists(toolPaths.baseMappingPath, []),
        readJsonIfExists(toolPaths.overlayMappingPath, [])
      ),
      loadOverlayCommonMappings()
    ),
    readJsonIfExists(toolPaths.dynamicMappingPath, [])
  );
  const index = createWorkbenchIndex(source);
  const translated = applyStaticSourceTranslations(source, mergedMappings, index);

  function countQuoted(text, literal) {
    const escaped = literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return (text.match(new RegExp(`(['"\`])${escaped}\\1`, 'g')) || []).length;
  }

  for (const critical of [...CRITICAL_UI_ALL_TARGETS, ...CRITICAL_NLS_TARGETS]) {
    if (critical.forceRuntime || !sourceHasQuotedLiteral(source, critical.originalText, index)) {
      continue;
    }
    assert.equal(
      countQuoted(translated, critical.originalText),
      0,
      `${critical.originalText} quoted literals remain after static translation`
    );
  }
});

test('embedded UI patches remove settings template fragments from translated workbench', () => {
  const workbenchPath =
    process.env.CURSOR_WORKBENCH_PATH ||
    'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js';

  if (!fs.existsSync(workbenchPath)) {
    return;
  }

  const source = fs.readFileSync(workbenchPath, 'utf8');
  const mergedMappings = mergeMappings(
    mergeMappings(
      mergeMappings(
        readJsonIfExists(toolPaths.baseMappingPath, []),
        readJsonIfExists(toolPaths.overlayMappingPath, [])
      ),
      loadOverlayCommonMappings()
    ),
    readJsonIfExists(toolPaths.dynamicMappingPath, [])
  );
  const index = createWorkbenchIndex(source);
  const translated = applyStaticSourceTranslations(source, mergedMappings, index);

  for (const patch of CRITICAL_EMBEDDED_UI_PATCHES) {
    if (!source.includes(patch.from)) {
      continue;
    }

    assert.ok(
      translated.includes(patch.to),
      `embedded translation missing: ${patch.to}`
    );

    const isPrefixInjection =
      patch.to.includes(patch.from) && patch.to.length > patch.from.length;
    if (!isPrefixInjection) {
      assert.equal(
        translated.includes(patch.from),
        false,
        `embedded fragment remains: ${patch.from}`
      );
    }
  }
});
