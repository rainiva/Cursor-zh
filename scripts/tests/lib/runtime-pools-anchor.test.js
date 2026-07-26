'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  classifyRuntimeMappingPool,
  summarizeRuntimePools,
} = require('../../lib/mapping/runtime-pools');

// 任务 2.4（审查记录 B3）：anchor 判定必须前置于 forceRuntime，归入独立 runtime-anchor 池。
test('anchor entry classifies into runtime-anchor pool', () => {
  const pool = classifyRuntimeMappingPool({
    searchType: 'anchor',
    anchorType: 'settingsSlug',
    anchorId: 'open-agents-on-startup',
    field: 'label',
    changeText: '窗口恢复',
  });
  assert.strictEqual(pool, 'runtime-anchor');
});

test('anchor entry with forceRuntime still lands in runtime-anchor (anchor check precedes forceRuntime)', () => {
  const pool = classifyRuntimeMappingPool({
    searchType: 'anchor',
    anchorType: 'i18nKey',
    anchorId: 'glass.agentPanel.continueWorking',
    changeText: '继续工作',
    forceRuntime: true,
  });
  assert.strictEqual(pool, 'runtime-anchor');
});

test('non-anchor forceRuntime entry keeps runtime-force pool', () => {
  const pool = classifyRuntimeMappingPool({
    searchType: 'exact',
    originalText: 'Some Text',
    changeText: '某文本',
    forceRuntime: true,
  });
  assert.strictEqual(pool, 'runtime-force');
});

test('summarizeRuntimePools reports runtime-anchor count', () => {
  const counts = summarizeRuntimePools(
    [
      { searchType: 'anchor', anchorType: 'glassCommand', anchorId: 'copy-messages', field: 'label', changeText: '复制会话记录' },
      { searchType: 'anchor', anchorType: 'i18nKey', anchorId: 'glass.agentPanel.continueWorking', changeText: '继续工作', forceRuntime: true },
      { searchType: 'regex', originalText: 'a(b)', changeText: 'x' },
    ],
    () => false
  );
  assert.strictEqual(counts['runtime-anchor'], 2);
  assert.strictEqual(counts['runtime-regex'], 1);
  assert.strictEqual(counts['runtime-force'], 0);
});
