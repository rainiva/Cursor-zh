const test = require('node:test');
const assert = require('node:assert/strict');

const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');

const GLASS_SEND_FOLLOW_UP_V3 =
  'wu=$a?"Drop here to attach...":Te?"Send follow-up with subagent":ue.header.source==="claude-code"?"Continue chatting in Cursor":"Send follow-up"';

test('static translation applies glass v3 composer follow-up ternary literals', () => {
  const translated = applyStaticSourceTranslations(GLASS_SEND_FOLLOW_UP_V3, []);

  assert.match(translated, /"拖放到此处以附加\.\.\."/);
  assert.match(translated, /"向子 Agent 继续追问"/);
  assert.match(translated, /"在 Cursor 中继续聊天"/);
  assert.match(translated, /"继续追问"/);
  assert.doesNotMatch(translated, /Send follow-up/);
});

test('static translation applies glass skS Search Settings anchor', () => {
  const translated = applyStaticSourceTranslations('var skS="Search Settings";function r5E(n){', []);

  assert.match(translated, /var skS="搜索设置"/);
  assert.doesNotMatch(translated, /Search Settings/);
});

test('static translation applies glass logout confirm dialog strings', () => {
  const translated = applyStaticSourceTranslations(
    'await h.confirm({title:"Log out?",description:"You\'ll be logged out of your Cursor account on this device.",primaryLabel:"Log Out",regretLabel:"Cancel"}',
    []
  );

  assert.match(translated, /title:"退出登录？"/);
  assert.match(translated, /description:"你将在此设备上退出 Cursor 账户登录。"/);
  assert.match(translated, /primaryLabel:"退出登录"/);
  assert.doesNotMatch(translated, /Log out\?/);
});

test('static translation applies glass logout confirm dialog before Log Out literal replacement', () => {
  const source =
    'await h.confirm({title:"Log out?",description:"You\'ll be logged out of your Cursor account on this device.",primaryLabel:"Log Out",regretLabel:"Cancel"}';
  const translated = applyStaticSourceTranslations(source, [
    { searchType: 'exact', originalText: 'Log Out', changeText: '退出登录' },
    { searchType: 'exact', originalText: 'Cancel', changeText: '取消' },
  ]);

  assert.match(translated, /title:"退出登录？"/);
  assert.match(translated, /description:"你将在此设备上退出 Cursor 账户登录。"/);
  assert.doesNotMatch(translated, /Log out\?/);
  assert.doesNotMatch(translated, /You'll be logged out/);
});
