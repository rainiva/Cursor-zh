const test = require('node:test');
const assert = require('node:assert/strict');

const {
  CRITICAL_UI_ALL_TARGETS,
  CRITICAL_EMBEDDED_UI_PATCHES,
} = require('../../lib/mapping/critical-ui-targets.js');
const { CRITICAL_NLS_TARGETS } = require('../../lib/mapping/critical-nls-targets.js');
const { readJsonIfExists } = require('../../tool/io.js');
const { createToolPaths } = require('../../tool/paths.js');
const path = require('path');
const { sourceHasQuotedLiteral } = require('../../lib/patcher/runtime-selector.js');
const {
  isRealWorkbenchAvailable,
  loadRealWorkbenchFixture,
} = require('./helpers/real-workbench-fixture.js');

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

// 阶段三：Copy Messages 与 Default browser 的英文字面量在双 bundle 已 0 命中（死目标），
// 从 critical 清单移除并改由 ID 锚点承接（copy-messages / externalBrowser）。
test('dead critical exact targets are superseded by ID anchors', () => {
  const anchors = readJsonIfExists(toolPaths.cursorWinAnchorsPath, []);
  const byAnchorId = new Map(anchors.map((entry) => [entry.anchorId, entry]));

  const superseded = [
    { originalText: 'Copy Messages', anchorId: 'copy-messages', changeText: '复制会话记录' },
    { originalText: 'Default browser', anchorId: 'externalBrowser', changeText: '默认浏览器' },
  ];

  for (const item of superseded) {
    const stillCritical = CRITICAL_UI_ALL_TARGETS.some(
      (critical) => critical.originalText === item.originalText
    );
    assert.equal(stillCritical, false, `${item.originalText} should leave critical targets`);
    const anchor = byAnchorId.get(item.anchorId);
    assert.ok(anchor, `missing anchor: ${item.anchorId}`);
    assert.equal(anchor.anchorType, 'glassCommand', item.anchorId);
    assert.equal(anchor.changeText, item.changeText, item.anchorId);
  }
});

test('merged mappings cover critical UI literals present in real workbench', () => {
  if (!isRealWorkbenchAvailable()) {
    return;
  }

  const fixture = loadRealWorkbenchFixture();
  const lookup = new Map(fixture.mergedMappings.map((entry) => [entry.originalText, entry]));
  const missing = [];

  for (const critical of [...CRITICAL_UI_ALL_TARGETS, ...CRITICAL_NLS_TARGETS]) {
    if (
      !sourceHasQuotedLiteral(fixture.source, critical.originalText, fixture.index) ||
      lookup.has(critical.originalText)
    ) {
      continue;
    }
    missing.push(critical.originalText);
  }

  assert.deepEqual(missing, []);
});

test('static translation removes quoted literals for non-runtime critical menu labels on real workbench', () => {
  if (!isRealWorkbenchAvailable()) {
    return;
  }

  const fixture = loadRealWorkbenchFixture();

  function countQuoted(text, literal) {
    const escaped = literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return (text.match(new RegExp(`(['"\`])${escaped}\\1`, 'g')) || []).length;
  }

  for (const critical of [...CRITICAL_UI_ALL_TARGETS, ...CRITICAL_NLS_TARGETS]) {
    if (critical.forceRuntime || !sourceHasQuotedLiteral(fixture.source, critical.originalText, fixture.index)) {
      continue;
    }
    assert.equal(
      countQuoted(fixture.translated, critical.originalText),
      0,
      `${critical.originalText} quoted literals remain after static translation`
    );
  }
});

test('embedded UI patches remove settings template fragments from translated workbench', () => {
  if (!isRealWorkbenchAvailable()) {
    return;
  }

  const fixture = loadRealWorkbenchFixture();

  for (const patch of CRITICAL_EMBEDDED_UI_PATCHES) {
    if (!fixture.source.includes(patch.from)) {
      continue;
    }

    assert.ok(
      fixture.translated.includes(patch.to),
      `embedded translation missing: ${patch.to}`
    );

    const isPrefixInjection =
      patch.to.includes(patch.from) && patch.to.length > patch.from.length;
    if (!isPrefixInjection) {
      assert.equal(
        fixture.translated.includes(patch.from),
        false,
        `embedded fragment remains: ${patch.from}`
      );
    }
  }
});
