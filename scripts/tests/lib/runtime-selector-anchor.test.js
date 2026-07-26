'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { selectRuntimeMappings, selectRuntimeMappingsUnion } = require('../../lib/patcher/runtime-selector');

// 任务 2.3：selector 锚点准入按 anchorType 泛化（不再只认 glassCommand 的 id: 形态）。
const SOURCE_WITH_ALL_ANCHORS = [
  'var a={id:"copy-messages",label:"Copy Transcript",icon:"paragraph"};',
  'nu("general","open-agents-on-startup",{label:"Window Restoration",description:"d"});',
  'const t=C("glass.agentPanel.continueWorking","Continue Working");',
].join('');

const SOURCE_WITHOUT_ANCHORS = 'var b={id:"other-command",label:"Other"};x("some.other.key","Text");';

test('selector admits settingsSlug anchor entry when slug exists in source', () => {
  const entry = {
    searchType: 'anchor',
    anchorType: 'settingsSlug',
    anchorId: 'open-agents-on-startup',
    field: 'label',
    changeText: '窗口恢复',
  };
  const selected = selectRuntimeMappings(SOURCE_WITH_ALL_ANCHORS, [entry]);
  assert.strictEqual(selected.length, 1);
  assert.strictEqual(selected[0].anchorId, 'open-agents-on-startup');
});

test('selector admits i18nKey anchor entry when key exists in source', () => {
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

test('selector still admits glassCommand anchor entry via id: shape', () => {
  const entry = {
    searchType: 'anchor',
    anchorType: 'glassCommand',
    anchorId: 'copy-messages',
    field: 'label',
    changeText: '复制会话记录',
  };
  const selected = selectRuntimeMappings(SOURCE_WITH_ALL_ANCHORS, [entry]);
  assert.strictEqual(selected.length, 1);
});

test('selector rejects anchor entries whose anchorId is absent from source', () => {
  const entries = [
    { searchType: 'anchor', anchorType: 'settingsSlug', anchorId: 'open-agents-on-startup', field: 'label', changeText: '窗口恢复' },
    { searchType: 'anchor', anchorType: 'i18nKey', anchorId: 'glass.agentPanel.continueWorking', changeText: '继续工作' },
    { searchType: 'anchor', anchorType: 'glassCommand', anchorId: 'copy-messages', field: 'label', changeText: '复制会话记录' },
  ];
  const selected = selectRuntimeMappings(SOURCE_WITHOUT_ANCHORS, entries);
  assert.deepStrictEqual(selected, []);
});

// 任务 2.3 REFACTOR：originalText 非空的锚点条目路径（runtime-selector.js 55-57 行）也需直接覆盖。
test('selector admits anchor entry carrying non-empty originalText when anchorId exists in source', () => {
  const entry = {
    searchType: 'anchor',
    anchorType: 'settingsSlug',
    anchorId: 'open-agents-on-startup',
    field: 'label',
    originalText: 'Window Restoration',
    changeText: '窗口恢复',
  };
  const selected = selectRuntimeMappings(SOURCE_WITH_ALL_ANCHORS, [entry]);
  assert.strictEqual(selected.length, 1);
  assert.strictEqual(selected[0].anchorId, 'open-agents-on-startup');
});

test('selector rejects anchor entry carrying non-empty originalText when anchorId is absent from source', () => {
  const entry = {
    searchType: 'anchor',
    anchorType: 'settingsSlug',
    anchorId: 'open-agents-on-startup',
    field: 'label',
    originalText: 'Window Restoration',
    changeText: '窗口恢复',
  };
  const selected = selectRuntimeMappings(SOURCE_WITHOUT_ANCHORS, [entry]);
  assert.deepStrictEqual(selected, []);
});

test('selectRuntimeMappingsUnion keeps distinct anchor entries (originalText-less) without collapsing', () => {
  const entries = [
    { searchType: 'anchor', anchorType: 'glassCommand', anchorId: 'copy-messages', field: 'label', changeText: '复制会话记录' },
    { searchType: 'anchor', anchorType: 'settingsSlug', anchorId: 'open-agents-on-startup', field: 'label', changeText: '窗口恢复' },
    { searchType: 'anchor', anchorType: 'i18nKey', anchorId: 'glass.agentPanel.continueWorking', changeText: '继续工作', forceRuntime: true },
  ];
  const selected = selectRuntimeMappingsUnion(
    [{ workbenchSource: SOURCE_WITH_ALL_ANCHORS }],
    entries
  );
  const anchorIds = selected.map((entry) => entry.anchorId).sort();
  assert.deepStrictEqual(anchorIds, [
    'copy-messages',
    'glass.agentPanel.continueWorking',
    'open-agents-on-startup',
  ]);
});
