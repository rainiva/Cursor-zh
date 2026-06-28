const test = require('node:test');
const assert = require('node:assert/strict');

const { applyAnchorStaticTranslations } = require('../../lib/patcher/anchor-static.js');
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
