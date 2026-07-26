'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { selectRuntimeMappings, selectRuntimeMappingsUnion } = require('../../lib/patcher/runtime-selector');

// 任务 2.3：selector 锚点准入按 anchorType 泛化（不再只认 glassCommand 的 id: 形态）。
// 阶段三收紧（D2 + 运行时性能零增量约束，leader 批准 2026-07-26）：
// anchor 条目准入运行时须 forceRuntime===true 且锚点在场；
// 纯静态锚点（apply 构建期已替换落盘）不再进运行时头部。
const SOURCE_WITH_ALL_ANCHORS = [
  'var a={id:"copy-messages",label:"Copy Transcript",icon:"paragraph"};',
  'nu("general","open-agents-on-startup",{label:"Window Restoration",description:"d"});',
  'const t=C("glass.agentPanel.continueWorking","Continue Working");',
].join('');

const SOURCE_WITHOUT_ANCHORS = 'var b={id:"other-command",label:"Other"};x("some.other.key","Text");';

test('selector prunes static settingsSlug anchor entry (no forceRuntime) even when slug exists in source', () => {
  const entry = {
    searchType: 'anchor',
    anchorType: 'settingsSlug',
    anchorId: 'open-agents-on-startup',
    field: 'label',
    changeText: '窗口恢复',
  };
  const selected = selectRuntimeMappings(SOURCE_WITH_ALL_ANCHORS, [entry]);
  assert.deepStrictEqual(selected, []);
});

test('selector prunes static glassCommand anchor entry (no forceRuntime) even when id exists in source', () => {
  const entry = {
    searchType: 'anchor',
    anchorType: 'glassCommand',
    anchorId: 'copy-messages',
    field: 'label',
    changeText: '复制会话记录',
  };
  const selected = selectRuntimeMappings(SOURCE_WITH_ALL_ANCHORS, [entry]);
  assert.deepStrictEqual(selected, []);
});

test('selector admits forceRuntime i18nKey anchor entry when key exists in source', () => {
  const entry = {
    searchType: 'anchor',
    anchorType: 'i18nKey',
    anchorId: 'glass.agentPanel.continueWorking',
    changeText: '继续工作',
    forceRuntime: true,
  };
  const selected = selectRuntimeMappings(SOURCE_WITH_ALL_ANCHORS, [entry]);
  assert.strictEqual(selected.length, 1);
});

test('selector admits forceRuntime settingsSlug/glassCommand anchor entries when anchor exists in source', () => {
  const entries = [
    { searchType: 'anchor', anchorType: 'settingsSlug', anchorId: 'open-agents-on-startup', field: 'label', changeText: '窗口恢复', forceRuntime: true },
    { searchType: 'anchor', anchorType: 'glassCommand', anchorId: 'copy-messages', field: 'label', changeText: '复制会话记录', forceRuntime: true },
  ];
  const selected = selectRuntimeMappings(SOURCE_WITH_ALL_ANCHORS, entries);
  assert.strictEqual(selected.length, 2);
});

test('selector rejects forceRuntime anchor entries whose anchorId is absent from source', () => {
  const entries = [
    { searchType: 'anchor', anchorType: 'settingsSlug', anchorId: 'open-agents-on-startup', field: 'label', changeText: '窗口恢复', forceRuntime: true },
    { searchType: 'anchor', anchorType: 'i18nKey', anchorId: 'glass.agentPanel.continueWorking', changeText: '继续工作', forceRuntime: true },
    { searchType: 'anchor', anchorType: 'glassCommand', anchorId: 'copy-messages', field: 'label', changeText: '复制会话记录', forceRuntime: true },
  ];
  const selected = selectRuntimeMappings(SOURCE_WITHOUT_ANCHORS, entries);
  assert.deepStrictEqual(selected, []);
});

// 任务 2.3 REFACTOR 延续：originalText 非空的锚点条目路径同样受收紧规则约束。
test('selector admits forceRuntime anchor entry carrying non-empty originalText when anchorId exists in source', () => {
  const entry = {
    searchType: 'anchor',
    anchorType: 'settingsSlug',
    anchorId: 'open-agents-on-startup',
    field: 'label',
    originalText: 'Window Restoration',
    changeText: '窗口恢复',
    forceRuntime: true,
  };
  const selected = selectRuntimeMappings(SOURCE_WITH_ALL_ANCHORS, [entry]);
  assert.strictEqual(selected.length, 1);
  assert.strictEqual(selected[0].anchorId, 'open-agents-on-startup');
});

test('selector prunes static anchor entry carrying non-empty originalText even when anchorId exists in source', () => {
  const entry = {
    searchType: 'anchor',
    anchorType: 'settingsSlug',
    anchorId: 'open-agents-on-startup',
    field: 'label',
    originalText: 'Window Restoration',
    changeText: '窗口恢复',
  };
  const selected = selectRuntimeMappings(SOURCE_WITH_ALL_ANCHORS, [entry]);
  assert.deepStrictEqual(selected, []);
});

test('selector rejects forceRuntime anchor entry carrying non-empty originalText when anchorId is absent from source', () => {
  const entry = {
    searchType: 'anchor',
    anchorType: 'settingsSlug',
    anchorId: 'open-agents-on-startup',
    field: 'label',
    originalText: 'Window Restoration',
    changeText: '窗口恢复',
    forceRuntime: true,
  };
  const selected = selectRuntimeMappings(SOURCE_WITHOUT_ANCHORS, [entry]);
  assert.deepStrictEqual(selected, []);
});

test('selectRuntimeMappingsUnion keeps distinct forceRuntime anchor entries and drops static anchor entries', () => {
  const entries = [
    { searchType: 'anchor', anchorType: 'glassCommand', anchorId: 'copy-messages', field: 'label', changeText: '复制会话记录' },
    { searchType: 'anchor', anchorType: 'settingsSlug', anchorId: 'open-agents-on-startup', field: 'label', changeText: '窗口恢复', forceRuntime: true },
    { searchType: 'anchor', anchorType: 'i18nKey', anchorId: 'glass.agentPanel.continueWorking', changeText: '继续工作', forceRuntime: true },
  ];
  const selected = selectRuntimeMappingsUnion(
    [{ workbenchSource: SOURCE_WITH_ALL_ANCHORS }],
    entries
  );
  const anchorIds = selected.map((entry) => entry.anchorId).sort();
  assert.deepStrictEqual(anchorIds, [
    'glass.agentPanel.continueWorking',
    'open-agents-on-startup',
  ]);
});
