'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { selectRuntimeMappings, selectRuntimeMappingsUnion } = require('../../lib/patcher/runtime-selector');

// 任务 2.3：selector 锚点准入按 anchorType 泛化（不再只认 glassCommand 的 id: 形态）。
// 任务 11（RC-2 诚实化，leader 批准 2026-07-27）：anchor 条目彻底不入运行时头部——
// 运行时引擎对无 originalText 条目一律 continue 跳过，历史上准入的 anchor 条目
// 序列化为 [null, changeText] 死数据（110.9KB 头部中的纯体积浪费与假象）。
// 静态锚点补丁（apply 构建期）是 anchor 条目唯一落地路径，forceRuntime 标记对 anchor 失效。
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

test('selector excludes forceRuntime i18nKey anchor entry even when key exists in source (RC-2)', () => {
  const entry = {
    searchType: 'anchor',
    anchorType: 'i18nKey',
    anchorId: 'glass.agentPanel.continueWorking',
    changeText: '继续工作',
    forceRuntime: true,
  };
  const selected = selectRuntimeMappings(SOURCE_WITH_ALL_ANCHORS, [entry]);
  assert.deepStrictEqual(selected, []);
});

test('selector excludes forceRuntime settingsSlug/glassCommand anchor entries regardless of anchor presence (RC-2)', () => {
  const entries = [
    { searchType: 'anchor', anchorType: 'settingsSlug', anchorId: 'open-agents-on-startup', field: 'label', changeText: '窗口恢复', forceRuntime: true },
    { searchType: 'anchor', anchorType: 'glassCommand', anchorId: 'copy-messages', field: 'label', changeText: '复制会话记录', forceRuntime: true },
  ];
  const selected = selectRuntimeMappings(SOURCE_WITH_ALL_ANCHORS, entries);
  assert.deepStrictEqual(selected, []);
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

// 任务 2.3 REFACTOR 延续：originalText 非空的锚点条目路径同样受排除规则约束。
test('selector excludes forceRuntime anchor entry carrying non-empty originalText even when anchorId exists in source', () => {
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
  assert.deepStrictEqual(selected, []);
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

test('selectRuntimeMappingsUnion drops every anchor entry (forceRuntime or not)', () => {
  const entries = [
    { searchType: 'anchor', anchorType: 'glassCommand', anchorId: 'copy-messages', field: 'label', changeText: '复制会话记录' },
    { searchType: 'anchor', anchorType: 'settingsSlug', anchorId: 'open-agents-on-startup', field: 'label', changeText: '窗口恢复', forceRuntime: true },
    { searchType: 'anchor', anchorType: 'i18nKey', anchorId: 'glass.agentPanel.continueWorking', changeText: '继续工作', forceRuntime: true },
  ];
  const selected = selectRuntimeMappingsUnion(
    [{ workbenchSource: SOURCE_WITH_ALL_ANCHORS }],
    entries
  );
  assert.deepStrictEqual(selected, []);
});
