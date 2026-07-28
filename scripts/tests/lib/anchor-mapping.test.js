const test = require('node:test');
const assert = require('node:assert/strict');

const {
  applyAnchorStaticTranslations,
  sourceHasAnchor,
} = require('../../lib/patcher/anchor-static.js');
const { buildGlassCommandAnchorIndex } = require('../../lib/mapping/anchor-index.js');
const { mergeMappings } = require('../../lib/mapping/merge.js');

const TOGGLE_EXPAND_ANCHOR = {
  anchorType: 'glassCommand',
  anchorId: 'D5h',
  field: 'title',
  changeText: '切换展开智能体',
  searchType: 'anchor',
};

test('anchor mapping replaces glass command title by stable id', () => {
  const source = 'Ns({id:D5h,title:"Toggle Expand Agent",icon:"layers",glassCategory:"View"})';
  const translated = applyAnchorStaticTranslations(source, [TOGGLE_EXPAND_ANCHOR]);

  assert.match(translated, /title:"切换展开智能体"/);
  assert.equal(translated.includes('Toggle Expand Agent'), false);
});

test('anchor mapping survives rewritten English title when id stays stable', () => {
  const source = 'Ns({id:D5h,title:"Expand Agent Panel",icon:"layers"})';
  const exactOnly = applyAnchorStaticTranslations(source, [
    { originalText: 'Toggle Expand Agent', changeText: '切换展开智能体', searchType: 'exact' },
  ]);
  assert.match(exactOnly, /Expand Agent Panel/);

  const translated = applyAnchorStaticTranslations(source, [TOGGLE_EXPAND_ANCHOR]);
  assert.match(translated, /title:"切换展开智能体"/);
  assert.equal(translated.includes('Expand Agent Panel'), false);
});

test('buildGlassCommandAnchorIndex indexes ids and titles from bundle snippet', () => {
  const source =
    'Ns({id:D5h,title:"Toggle Expand Agent"})Ns({id:"workbench.action.copyAsMarkdown",title:"Copy as Markdown"})';
  const index = buildGlassCommandAnchorIndex(source);

  assert.ok(index.get('D5h:title'));
  assert.equal(index.get('D5h:title').text, 'Toggle Expand Agent');
  assert.ok(index.get('workbench.action.copyAsMarkdown:title'));
});

test('mergeMappings keeps anchor overlay entries separate from exact duplicates', () => {
  const merged = mergeMappings(
    [
      {
        anchorType: 'glassCommand',
        anchorId: 'D5h',
        field: 'title',
        changeText: 'overlay 标题',
        searchType: 'anchor',
      },
    ],
    [
      {
        originalText: 'Toggle Expand Agent',
        changeText: 'exact 标题',
        searchType: 'exact',
      },
      {
        anchorType: 'glassCommand',
        anchorId: 'D5h',
        field: 'title',
        changeText: 'overlay 标题',
        searchType: 'anchor',
      },
    ]
  );

  assert.equal(merged.length, 2);
  const anchor = merged.find((entry) => entry.searchType === 'anchor');
  assert.equal(anchor.changeText, 'overlay 标题');
});

// —— 任务 2.2：settingsSlug / i18nKey 两类新锚点（fixture 取自 3.13.10 真实 bundle 上下文）——

const SETTINGS_SLUG_ANCHOR = {
  anchorType: 'settingsSlug',
  anchorId: 'open-agents-on-startup',
  field: 'label',
  changeText: '窗口恢复',
  searchType: 'anchor',
};

// desktop bundle 真实上下文（nu 为 minified 调用名）
const SETTINGS_DESKTOP_SOURCE =
  'nu("general","open-agents-on-startup",{label:"Window Restoration",description:"Controls which windows Cursor restores on startup",aliases:["startup"]})';
// glass bundle 同一注册点调用名漂移为 ku —— 模式不得锚定函数名
const SETTINGS_GLASS_SOURCE =
  'ku("general","open-agents-on-startup",{label:"Window Restoration",description:"Controls which windows Cursor restores on startup",aliases:["startup"]})';

test('settingsSlug anchor replaces label field after slug registration', () => {
  const translated = applyAnchorStaticTranslations(SETTINGS_DESKTOP_SOURCE, [SETTINGS_SLUG_ANCHOR]);
  assert.match(translated, /label:"窗口恢复"/);
  assert.equal(translated.includes('label:"Window Restoration"'), false);
});

test('settingsSlug anchor survives minified caller rename (nu -> ku)', () => {
  const translated = applyAnchorStaticTranslations(SETTINGS_GLASS_SOURCE, [SETTINGS_SLUG_ANCHOR]);
  assert.match(translated, /label:"窗口恢复"/);
});

test('settingsSlug anchor rewrites drifted Title Case label by stable slug', () => {
  // 第 4 条试点：exact 绑死旧原文 "Auto-hide editor when empty"，bundle 现文案已 Title Case 化
  const source =
    'nu("general","auto-hide-editor",{label:"Auto-Hide Editor When Empty",surface:"ide"})';
  const translated = applyAnchorStaticTranslations(source, [
    {
      anchorType: 'settingsSlug',
      anchorId: 'auto-hide-editor',
      field: 'label',
      changeText: '编辑器为空时自动隐藏',
      searchType: 'anchor',
    },
  ]);
  assert.match(translated, /label:"编辑器为空时自动隐藏"/);
  assert.equal(translated.includes('Auto-Hide Editor When Empty'), false);
});

const I18N_KEY_ANCHOR = {
  anchorType: 'i18nKey',
  anchorId: 'glass.agentPanel.continueWorking',
  changeText: '继续工作',
  searchType: 'anchor',
};

test('i18nKey anchor replaces default copy right after the key string', () => {
  const source = '(o=C("glass.agentPanel.continueWorking","Continue Working"),n[2]=o)';
  const translated = applyAnchorStaticTranslations(source, [I18N_KEY_ANCHOR]);
  assert.match(translated, /"glass\.agentPanel\.continueWorking","继续工作"/);
  assert.equal(translated.includes('Continue Working'), false);
});

test('i18nKey anchor survives minified caller rename and rewritten default copy (B5)', () => {
  // glass bundle 调用名 C -> x 漂移 + 默认文案改写：key 不变即须存活
  const source = '(o=x("glass.agentPanel.continueWorking","Keep Working"),n[2]=o)';
  const translated = applyAnchorStaticTranslations(source, [I18N_KEY_ANCHOR]);
  assert.match(translated, /"glass\.agentPanel\.continueWorking","继续工作"/);
  assert.equal(translated.includes('Keep Working'), false);
});

// —— 任务 11（RC-1）：settingsSlug 模式跨对象误匹配修复 ——
// 修复前缺陷：`(?:[\s\S]{0,500}?[,{])?` 贪婪可选组优先展开，经 lazy 回溯跨过目标对象
// 闭括号进入下一个 nu() 条目的 {label:，把中文写到相邻条目（2026-07-27 真实 bundle
// 实测全部 8 条 settingsSlug 锚点均错位，如 open-agents-on-startup 捕获 "Notifications"）。
const ADJACENT_ENTRIES_SOURCE =
  'nu("general","open-agents-on-startup",{label:"Window Restoration",description:"Controls which windows Cursor restores on startup",aliases:["startup","agents window","launch","open agents window on startup"]}),nu("general","notifications",{label:"Notifications"})';

test('settingsSlug anchor must not leak translation into the adjacent nu() entry (RC-1)', () => {
  const translated = applyAnchorStaticTranslations(ADJACENT_ENTRIES_SOURCE, [SETTINGS_SLUG_ANCHOR]);
  // 修复前实际输出：notifications 条目被错写成 label:"窗口恢复"，目标条目纹丝不动。
  assert.match(translated, /"open-agents-on-startup",\{label:"窗口恢复"/);
  assert.match(translated, /"notifications",\{label:"Notifications"\}/);
  assert.equal(translated.includes('label:"Window Restoration"'), false);
});

test('settingsSlug anchor fails closed when target object lacks the field (no cross-object fallback)', () => {
  // 目标对象无 label 字段而相邻对象有 → 必须失配（源文本原样返回），不得错配到相邻对象。
  const source =
    'nu("general","open-agents-on-startup",{surface:"ide"}),nu("general","notifications",{label:"Notifications"})';
  const translated = applyAnchorStaticTranslations(source, [SETTINGS_SLUG_ANCHOR]);
  assert.equal(translated, source);
});

test('settingsSlug anchor still matches label preceded by simple fields inside the same object', () => {
  const source =
    'nu("general","open-agents-on-startup",{surface:"ide",label:"Window Restoration"}),nu("x","y",{label:"Other"})';
  const translated = applyAnchorStaticTranslations(source, [SETTINGS_SLUG_ANCHOR]);
  assert.match(translated, /\{surface:"ide",label:"窗口恢复"\}/);
  assert.match(translated, /\{label:"Other"\}/);
});

test('unknown anchorType is skipped without throwing', () => {
  const source = 'nu("general","open-agents-on-startup",{label:"Window Restoration"})';
  const translated = applyAnchorStaticTranslations(source, [
    { ...SETTINGS_SLUG_ANCHOR, anchorType: 'mysteryType' },
  ]);
  assert.equal(translated, source);
});

test('sourceHasAnchor dispatches existence checks by anchorType', () => {
  const glassEntry = {
    anchorType: 'glassCommand',
    anchorId: 'copy-messages',
    searchType: 'anchor',
  };
  assert.equal(sourceHasAnchor('e.push({id:"copy-messages",label:"Copy Transcript"})', glassEntry), true);
  assert.equal(sourceHasAnchor('e.push({id:"other",label:"Copy Transcript"})', glassEntry), false);

  assert.equal(sourceHasAnchor(SETTINGS_DESKTOP_SOURCE, SETTINGS_SLUG_ANCHOR), true);
  assert.equal(sourceHasAnchor('nu("general","other-slug",{label:"X"})', SETTINGS_SLUG_ANCHOR), false);

  assert.equal(
    sourceHasAnchor('(o=x("glass.agentPanel.continueWorking","Keep Working"))', I18N_KEY_ANCHOR),
    true
  );
  assert.equal(sourceHasAnchor('(o=x("glass.other.key","Keep Working"))', I18N_KEY_ANCHOR), false);
  assert.equal(sourceHasAnchor('', I18N_KEY_ANCHOR), false);
});
