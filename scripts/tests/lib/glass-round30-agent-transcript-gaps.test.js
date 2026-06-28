const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const {
  CRITICAL_GLASS_ROUND29_UI_TARGETS,
  CRITICAL_GLASS_ROUND30_UI_TARGETS,
  CRITICAL_EMBEDDED_UI_PATCHES,
} = require('../../lib/mapping/critical-ui-targets.js');
const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');
const { mergeMappings, translateTextWithMappings } = require('../../cursor-zh-lib');
const { readJsonIfExists } = require('../../tool/io');
const { createToolPaths } = require('../../tool/paths');
const { createRuntimeDomHarness } = require('./helpers/runtime-dom-harness.js');

const toolPaths = createToolPaths(path.join(__dirname, '../../..'));

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

const ROUND30_EMBEDDED = [
  {
    from: 'return["Reading terminal","Read terminal","Read terminal attempted"]',
    to: 'return["正在读取终端","读取终端","尝试读取终端"]',
  },
  {
    from: 'loadingAction:`Monitoring background ${e===1?"task":"tasks"}`',
    to: 'loadingAction:`正在监控后台${e===1?"任务":"任务"}`',
  },
  {
    from: 'const r=[`background ${n===1?"task":"tasks"}`];return e>0&&r.push(`${e} complete`),t>0&&r.push(`${t} active`),{completedAction:"Monitored",completedDetails:r.join(", ")}',
    to: 'const r=[`${n===1?"后台任务":"后台任务"}`];return e>0&&r.push(`${e} 已完成`),t>0&&r.push(`${t} 进行中`),{completedAction:"已监控",completedDetails:r.join("，")}',
  },
];

test('round 30 defines agent transcript shell wait and terminal read targets', () => {
  const originals = [
    ...CRITICAL_GLASS_ROUND29_UI_TARGETS,
    ...CRITICAL_GLASS_ROUND30_UI_TARGETS,
  ].map((entry) => entry.originalText);
  assert.ok(originals.includes('Read terminal'));
  assert.ok(originals.includes('Reading terminal'));
  assert.ok(originals.includes('Monitoring background task'));
  assert.ok(originals.includes('Chat context summarized.'));
});

test('round 30 embedded patches are registered', () => {
  for (const patch of ROUND30_EMBEDDED) {
    const match = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === patch.from);
    assert.ok(match, `missing embedded patch: ${patch.from}`);
    assert.equal(match.to, patch.to);
  }
});

test('merged mappings translate agent shell wait countdown labels', () => {
  const mappings = loadMergedMappings();
  assert.equal(
    translateTextWithMappings('Waiting 6s for shell', mappings, { scopeMatched: true }),
    '正在等待 shell（6s）'
  );
  assert.equal(
    translateTextWithMappings('Waiting 1m 25s for shell', mappings, { scopeMatched: true }),
    '正在等待 shell（1m 25s）'
  );
  assert.equal(
    translateTextWithMappings('Waiting for shell', mappings, { scopeMatched: true }),
    '正在等待 shell'
  );
  assert.equal(
    translateTextWithMappings('Waited for shell', mappings, { scopeMatched: true }),
    '已等待 shell'
  );
});

test('merged mappings repair partial terminal read labels corrupted by token rules', () => {
  const mappings = loadMergedMappings();
  assert.equal(
    translateTextWithMappings('读取 terminal', mappings, { scopeMatched: true }),
    '读取终端'
  );
  assert.equal(
    translateTextWithMappings('正在读取 terminal', mappings, { scopeMatched: true }),
    '正在读取终端'
  );
});

test('merged mappings translate terminal read tool labels without leaving English fragments', () => {
  const mappings = loadMergedMappings();
  assert.equal(
    translateTextWithMappings('Read terminal', mappings, { scopeMatched: true }),
    '读取终端'
  );
  assert.equal(
    translateTextWithMappings('Reading terminal', mappings, { scopeMatched: true }),
    '正在读取终端'
  );
});

test('merged mappings translate chat summarization and background task status labels', () => {
  const mappings = loadMergedMappings();
  assert.equal(
    translateTextWithMappings('Chat context summarized.', mappings, { scopeMatched: true }),
    '聊天上下文已总结。'
  );
  assert.equal(
    translateTextWithMappings('Monitored background task, 1 active', mappings, {
      scopeMatched: true,
    }),
    '已监控后台任务，1 个进行中'
  );
  assert.equal(
    translateTextWithMappings('Monitoring background task', mappings, { scopeMatched: true }),
    '正在监控后台任务'
  );
});

test('runtime DOM renders translated shell wait status in the same turn after mount', () => {
  const mappings = loadMergedMappings();
  const harness = createRuntimeDomHarness({
    workbenchSource: 'Waiting 6s for shell',
    runtimeMappings: mappings.filter((entry) => entry.forceRuntime !== false),
  });
  harness.runDueTimers(Infinity);

  const { menu } = harness.mountMenuItem('Waiting 6s for shell');
  harness.flushMicrotasks();

  assert.equal(harness.getMenuItemText(menu), '正在等待 shell（6s）');
  assert.doesNotMatch(harness.getMenuItemText(menu), /Waiting|for shell/);
});

test('runtime DOM renders minute-based shell wait and waited labels in the same turn', () => {
  const mappings = loadMergedMappings();
  const harness = createRuntimeDomHarness({
    workbenchSource: 'Waiting 1m 25s for shell',
    runtimeMappings: mappings.filter((entry) => entry.forceRuntime !== false),
  });
  harness.runDueTimers(Infinity);

  const waiting = harness.mountMenuItem('Waiting 1m 25s for shell');
  harness.flushMicrotasks();
  assert.equal(harness.getMenuItemText(waiting.menu), '正在等待 shell（1m 25s）');

  waiting.menu.remove();
  const waited = harness.mountMenuItem('Waited for shell');
  harness.flushMicrotasks();
  assert.equal(harness.getMenuItemText(waited.menu), '已等待 shell');
});

test('runtime DOM renders repaired terminal read label without English terminal fragment', () => {
  const mappings = loadMergedMappings();
  const harness = createRuntimeDomHarness({
    workbenchSource: 'Read terminal',
    runtimeMappings: mappings.filter((entry) => entry.forceRuntime !== false),
  });
  harness.runDueTimers(Infinity);

  const { menu } = harness.mountMenuItem('读取 terminal');
  harness.flushMicrotasks();

  assert.equal(harness.getMenuItemText(menu), '读取终端');
  assert.doesNotMatch(harness.getMenuItemText(menu), /terminal/);
});

test('static translation applies round 30 terminal read snippets', () => {
  const source =
    'if(DKe(e.relativeWorkspacePath))return["Reading terminal","Read terminal","Read terminal attempted"];';
  const translated = applyStaticSourceTranslations(source, loadMergedMappings());

  assert.match(translated, /正在读取终端/);
  assert.match(translated, /读取终端/);
  assert.match(translated, /尝试读取终端/);
  assert.equal(translated.includes('Read terminal'), false);
});
