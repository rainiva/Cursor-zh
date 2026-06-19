const test = require('node:test');
const assert = require('node:assert/strict');

const {
  CRITICAL_GLASS_ROUND17_UI_TARGETS,
  CRITICAL_EMBEDDED_UI_PATCHES,
} = require('../../lib/mapping/critical-ui-targets.js');
const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');

const ROUND17_EMBEDDED = [
  {
    from: 'label:"Context Usage"',
    to: 'label:"上下文用量"',
  },
  {
    from: 'children:"View Report"',
    to: 'children:"查看报告"',
  },
  {
    from: 'title:n?"Hide Canvas List":"Show Canvas List"',
    to: 'title:n?"隐藏画布列表":"显示画布列表"',
  },
  {
    from: 'children:"Create new canvas"',
    to: 'children:"新建画布"',
  },
  {
    from: 'description:"All team members can view"',
    to: 'description:"所有团队成员均可查看"',
  },
  {
    from: 'label:"Recent"',
    to: 'label:"最近"',
  },
  {
    from: 'return"0% Full"',
    to: 'return"0% 已满"',
  },
  {
    from: 'label:o.label,tokens:a,displayTokens:L9t(a),color:Ys1[o.id]',
    to: 'label:window.__cursorZhTranslateInlineText?window.__cursorZhTranslateInlineText(o.label):o.label,tokens:a,displayTokens:L9t(a),color:Ys1[o.id]',
  },
];

test('round 17 defines canvas and context usage UI targets', () => {
  const originals = CRITICAL_GLASS_ROUND17_UI_TARGETS.map((entry) => entry.originalText);
  assert.ok(originals.includes('Context Usage'));
  assert.ok(originals.includes('View Report'));
  assert.ok(originals.includes('Hide Canvas List'));
  assert.ok(originals.includes('Create new canvas'));
  assert.ok(originals.includes('All team members can view'));
  assert.ok(originals.includes('System prompt'));
  assert.ok(originals.some((text) => text.includes('context used')));
});

test('round 17 embedded patches are registered', () => {
  for (const patch of ROUND17_EMBEDDED) {
    const match = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === patch.from);
    assert.ok(match, `missing embedded patch: ${patch.from}`);
    assert.equal(match.to, patch.to);
  }
});

test('static translation applies round 17 context tray snippets', () => {
  const source = [
    'label:"Context Usage",showStepper:!1',
    'children:"View Report"',
    'title:n?"Hide Canvas List":"Show Canvas List"',
    'children:"Create new canvas"',
    'description:"All team members can view",leftSection:U(Xi,{name:"share"}),onSelect:x,children:"Publish"',
    'label:"Recent",children:[',
    'function mcA({totalTokensUsed:n,contextWindowSize:e}){if(e<=0)return"0% Full";const t=n/e*100;return`${Math.round(t)}% Full`}',
    'label:o.label,tokens:a,displayTokens:L9t(a),color:Ys1[o.id]',
  ].join(';');

  const translated = applyStaticSourceTranslations(source, []);

  assert.match(translated, /label:"上下文用量"/);
  assert.match(translated, /children:"查看报告"/);
  assert.match(translated, /隐藏画布列表/);
  assert.match(translated, /children:"新建画布"/);
  assert.match(translated, /所有团队成员均可查看/);
  assert.match(translated, /label:"最近"/);
  assert.match(translated, /0% 已满/);
  assert.match(translated, /__cursorZhTranslateInlineText\(o\.label\)/);
});
