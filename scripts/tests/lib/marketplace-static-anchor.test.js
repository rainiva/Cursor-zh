const test = require('node:test');
const assert = require('node:assert/strict');

const { CRITICAL_EMBEDDED_UI_PATCHES } = require('../../lib/mapping/critical-ui-targets.js');
const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');

const MARKETPLACE_ACTIVATE_ANCHOR_FROM =
  'Df(cQf,{plugins:zt,installedPluginIdSet:n.installedPluginIdSet';

const MARKETPLACE_FIXTURE = `section({className:"ui-marketplace",children:[Df(Pl,{size:"lg",weight:"medium",className:"ui-yab65l",children:"Discover"}),${MARKETPLACE_ACTIVATE_ANCHOR_FROM},onAdd:Nn=>{}}]})`;

test('embedded patch registers marketplace static activate anchor', () => {
  const match = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === MARKETPLACE_ACTIVATE_ANCHOR_FROM);
  assert.ok(match, 'missing marketplace activate anchor patch');
  assert.match(match.to, /__cursorZhMarketplaceLazy\?\.activate/);
});

test('applyStaticSourceTranslations injects marketplace activate call at discover mount', () => {
  const translated = applyStaticSourceTranslations(MARKETPLACE_FIXTURE, []);
  assert.match(translated, /__cursorZhMarketplaceLazy\?\.activate/);
  assert.doesNotMatch(translated, /__cursorZhTranslateMarketplacePlugins/);
});
