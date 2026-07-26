'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  extractAnchorCandidates,
  isRejectedMinifiedAnchorId,
  joinCandidatesWithDeadExact,
} = require('../../tool/anchor-harvest');

// 任务 3.1：三类锚点上下文样本（取自 anchor-pilot-evidence.json 真实上下文缩样）。
// 注册函数名（nu/C）为 minified 可漂移名，提取器不得依赖函数名（B5 同源原则）。
const FIXTURE_SOURCE = [
  't.copyTranscript&&e.push({id:"copy-messages",label:"Copy Transcript",icon:"paragraph",onSelect:t.copyTranscript}),',
  'nu("general","open-agents-on-startup",{label:"Window Restoration",description:"Controls which windows Cursor restores on startup"}),',
  '(o=C("glass.agentPanel.continueWorking","Continue Working"),n[2]=o),',
  'e.push({id:"D5h",label:"Toggle Expand Agent"})',
].join('');

test('extractAnchorCandidates finds settingsSlug candidate with field/currentText/offset', () => {
  const candidates = extractAnchorCandidates(FIXTURE_SOURCE);
  const hit = candidates.find(
    (c) => c.anchorType === 'settingsSlug' && c.anchorId === 'open-agents-on-startup'
  );
  assert.ok(hit, 'settingsSlug candidate should be extracted');
  assert.strictEqual(hit.field, 'label');
  assert.strictEqual(hit.currentText, 'Window Restoration');
  assert.ok(Number.isInteger(hit.offset) && hit.offset >= 0);
  assert.notStrictEqual(hit.rejected, true);
});

test('extractAnchorCandidates finds i18nKey candidate with default text', () => {
  const candidates = extractAnchorCandidates(FIXTURE_SOURCE);
  const hit = candidates.find(
    (c) => c.anchorType === 'i18nKey' && c.anchorId === 'glass.agentPanel.continueWorking'
  );
  assert.ok(hit, 'i18nKey candidate should be extracted');
  assert.strictEqual(hit.currentText, 'Continue Working');
  assert.ok(Number.isInteger(hit.offset) && hit.offset >= 0);
  assert.notStrictEqual(hit.rejected, true);
});

test('extractAnchorCandidates finds glassCommand candidate via id: shape', () => {
  const candidates = extractAnchorCandidates(FIXTURE_SOURCE);
  const hit = candidates.find(
    (c) => c.anchorType === 'glassCommand' && c.anchorId === 'copy-messages'
  );
  assert.ok(hit, 'glassCommand candidate should be extracted');
  assert.strictEqual(hit.field, 'label');
  assert.strictEqual(hit.currentText, 'Copy Transcript');
  assert.notStrictEqual(hit.rejected, true);
});

test('minified short anchorId candidate is kept but marked rejected (D4)', () => {
  const candidates = extractAnchorCandidates(FIXTURE_SOURCE);
  const hit = candidates.find((c) => c.anchorId === 'D5h');
  assert.ok(hit, 'minified candidate should still be listed');
  assert.strictEqual(hit.rejected, true);
});

test('isRejectedMinifiedAnchorId follows D4 rule (≤4 chars without semantic separator)', () => {
  assert.strictEqual(isRejectedMinifiedAnchorId('D5h'), true);
  assert.strictEqual(isRejectedMinifiedAnchorId('x9h'), true);
  assert.strictEqual(isRejectedMinifiedAnchorId('a.b'), false); // 语义分隔符 .
  assert.strictEqual(isRejectedMinifiedAnchorId('ab-c'), false); // 语义分隔符 -
  assert.strictEqual(isRejectedMinifiedAnchorId('aBc'), false); // 驼峰词
  assert.strictEqual(isRejectedMinifiedAnchorId('queue'), false); // 长度 > 4
});

test('joinCandidatesWithDeadExact matches case-insensitively and excludes rejected candidates', () => {
  const candidates = extractAnchorCandidates(FIXTURE_SOURCE);
  const dead = [
    { originalText: 'window restoration', changeText: '窗口恢复', surface: 'settings_search' },
    { originalText: 'toggle expand agent', changeText: '切换展开智能体', surface: 'glass_menu' },
    { originalText: 'Rules & Commands', changeText: '规则与命令', surface: 'plugins_onboarding' },
  ];
  const { matched, unmatched } = joinCandidatesWithDeadExact(candidates, dead);

  const restoration = matched.find((m) => m.originalText === 'window restoration');
  assert.ok(restoration, 'Title Case 漂移词条应命中 settingsSlug 候选');
  assert.strictEqual(restoration.candidates[0].anchorId, 'open-agents-on-startup');

  // D5h 候选虽文本相同，但 rejected 候选不得作为迁移配对（B1 准入优先）。
  assert.ok(unmatched.some((d) => d.originalText === 'toggle expand agent'));
  assert.ok(unmatched.some((d) => d.originalText === 'Rules & Commands'));
});
