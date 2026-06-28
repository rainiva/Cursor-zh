const test = require('node:test');
const assert = require('node:assert/strict');

const { CRITICAL_EMBEDDED_UI_PATCHES } = require('../../lib/mapping/critical-ui-targets.js');
const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');

const MARKETPLACE_MAP_HOOK = '__cursorZhMarketplaceLazyTranslatePlugin';

const MARKETPLACE_FIXTURE = [
  'async function FXy(n){const t=[...(await n.listMarketplacePlugins({})).plugins].map(l2);try{const i=await n.listMarketplaces({}),r=await Promise.all(i.marketplaces.map(async o=>[...(await n.listMarketplacePlugins({marketplaceId:o.id})).plugins].map(l2))),s=new Map;return t}catch{return[]}}',
  'async function refreshMarketplace(t){const r=[...(await t.listMarketplacePlugins(new I_n({}),{headers:Vb(Yr())})).plugins].map(l2),s=await t.listMarketplaces(new N9a({}),{headers:Vb(Yr())});return {r,s}}',
].join('\n');

const MARKETPLACE_PATCH_FROM = [
  '(await n.listMarketplacePlugins({})).plugins].map(l2)',
  '(await n.listMarketplacePlugins({marketplaceId:o.id})).plugins].map(l2)',
  '(await t.listMarketplacePlugins(new I_n({}),{headers:Vb(Yr())})).plugins].map(l2)',
];

test('embedded patches register marketplace plugin map hook wrappers', () => {
  for (const from of MARKETPLACE_PATCH_FROM) {
    const match = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === from);
    assert.ok(match, `missing embedded patch: ${from}`);
    assert.match(match.to, new RegExp(MARKETPLACE_MAP_HOOK));
  }
});

test('applyStaticSourceTranslations wraps listMarketplacePlugins map sites with lazy hook', () => {
  const translated = applyStaticSourceTranslations(MARKETPLACE_FIXTURE, []);

  for (const from of MARKETPLACE_PATCH_FROM) {
    assert.doesNotMatch(translated, new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(translated, new RegExp(MARKETPLACE_MAP_HOOK));
  assert.doesNotMatch(translated, /__cursorZhTranslateMarketplacePlugins/);
  assert.doesNotMatch(translated, /__cursorZhTranslateMarketplaceResponse/);
  assert.doesNotMatch(translated, /\.plugins\]\.map\(l2\)/);
});
