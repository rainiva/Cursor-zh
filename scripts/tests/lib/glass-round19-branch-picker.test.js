const test = require('node:test');
const assert = require('node:assert/strict');

const {
  CRITICAL_GLASS_ROUND19_UI_TARGETS,
  CRITICAL_EMBEDDED_UI_PATCHES,
} = require('../../lib/mapping/critical-ui-targets.js');
const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');

const ROUND19_EMBEDDED = [
  { from: 'searchPlaceholder:"Search branches..."', to: 'searchPlaceholder:"搜索分支..."' },
  { from: 'placeholder:"Search branches..."', to: 'placeholder:"搜索分支..."' },
  { from: '"aria-label":"Search branches"', to: '"aria-label":"搜索分支"' },
  { from: 'C="Loading branches..."', to: 'C="正在加载分支..."' },
  { from: '"Loading branches..."', to: '"正在加载分支..."' },
];

test('round 19 defines branch picker UI targets', () => {
  const originals = CRITICAL_GLASS_ROUND19_UI_TARGETS.map((entry) => entry.originalText);
  assert.ok(originals.includes('Search branches...'));
  assert.ok(originals.includes('Loading branches...'));
  assert.ok(originals.includes('No branches found'));
});

test('round 19 embedded patches are registered', () => {
  for (const patch of ROUND19_EMBEDDED) {
    const match = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === patch.from);
    assert.ok(match, `missing embedded patch: ${patch.from}`);
    assert.equal(match.to, patch.to);
  }
});

test('static translation applies round 19 branch picker snippets', () => {
  const source = [
    'searchPlaceholder:"Search branches...",noItemsText:je',
    'placeholder:"Search branches...",className:QO',
    '"aria-label":"Search branches"}',
    'C="Loading branches...";break e',
    'children:u===""?"Select a repository first":"Loading branches..."',
  ].join(';');

  const translated = applyStaticSourceTranslations(source, []);

  assert.match(translated, /搜索分支/);
  assert.match(translated, /正在加载分支/);
  assert.equal(translated.includes('Search branches'), false);
  assert.equal(translated.includes('Loading branches'), false);
});
