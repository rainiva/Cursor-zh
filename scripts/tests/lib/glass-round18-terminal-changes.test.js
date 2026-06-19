const test = require('node:test');
const assert = require('node:assert/strict');

const {
  CRITICAL_GLASS_ROUND18_UI_TARGETS,
  CRITICAL_EMBEDDED_UI_PATCHES,
} = require('../../lib/mapping/critical-ui-targets.js');
const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');

const ROUND18_EMBEDDED = [
  {
    from: 'M?"Hide Terminal List":"Show Terminal List"',
    to: 'M?"隐藏终端列表":"显示终端列表"',
  },
  {
    from: 'M?"Hide terminal list":"Show terminal list"',
    to: 'M?"隐藏终端列表":"显示终端列表"',
  },
  {
    from: 'return"Failed to load changes"',
    to: 'return"无法加载更改"',
  },
  {
    from: '"Failed to load changes"',
    to: '"无法加载更改"',
  },
];

test('round 18 defines terminal list and changes error UI targets', () => {
  const originals = CRITICAL_GLASS_ROUND18_UI_TARGETS.map((entry) => entry.originalText);
  assert.ok(originals.includes('Failed to load changes'));
  assert.ok(originals.includes('Hide Terminal List'));
  assert.ok(originals.includes('Show Terminal List'));
  assert.ok(originals.includes('Hide terminal list'));
  assert.ok(originals.includes('Show terminal list'));
});

test('round 18 embedded patches are registered', () => {
  for (const patch of ROUND18_EMBEDDED) {
    const match = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === patch.from);
    assert.ok(match, `missing embedded patch: ${patch.from}`);
    assert.equal(match.to, patch.to);
  }
});

test('static translation applies round 18 terminal and changes snippets', () => {
  const source = [
    'case"unknown":return"Failed to load changes"',
    'message:Sm==="notGitRepository"?"Failed to load changes":sp??"Failed to load changes"',
    'Ni=M?"Hide Terminal List":"Show Terminal List"',
    'ji=M?"Hide terminal list":"Show terminal list"',
  ].join(';');

  const translated = applyStaticSourceTranslations(source, []);

  assert.match(translated, /无法加载更改/);
  assert.match(translated, /隐藏终端列表/);
  assert.match(translated, /显示终端列表/);
  assert.equal(translated.includes('Failed to load changes'), false);
  assert.equal(translated.includes('Hide Terminal List'), false);
});
