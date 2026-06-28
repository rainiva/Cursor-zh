const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const { CRITICAL_EMBEDDED_UI_PATCHES } = require('../../lib/mapping/critical-ui-targets.js');
const { loadEmbeddedPatchesForVersion } = require('../../lib/mapping/versioned-patches.js');
const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');

const CURSOR_VERSION = '3.9.8';
const MARKETPLACE_ACTIVATE_ANCHOR_FROM =
  'Hv(gzg,{plugins:Et,installedPluginIdSet:n.installedPluginIdSet';
const MARKETPLACE_ACTIVATE_CRITICAL_FROM =
  'Df(cQf,{plugins:zt,installedPluginIdSet:n.installedPluginIdSet';

const MARKETPLACE_FIXTURE = `section({className:"ui-marketplace",children:[Hv("div",{size:"lg",weight:"medium",className:"ui-yab65l",children:"Discover"}),${MARKETPLACE_ACTIVATE_ANCHOR_FROM},installCountByPluginId:n.teamInstallCountByPluginId,onPluginClick:Nn=>{}})]})`;
const MARKETPLACE_CRITICAL_FIXTURE = `section({className:"ui-marketplace",children:[Df(Pl,{size:"lg",weight:"medium",className:"ui-yab65l",children:"Discover"}),${MARKETPLACE_ACTIVATE_CRITICAL_FROM},onAdd:Nn=>{}})]})`;

function assertParses(source, filename) {
  assert.doesNotThrow(() => {
    new vm.Script(source, { filename });
  });
}

test('embedded patch registers marketplace static activate anchor for 3.9.8', () => {
  const patches = loadEmbeddedPatchesForVersion(CURSOR_VERSION);
  const match = patches.find((entry) => entry.from === MARKETPLACE_ACTIVATE_ANCHOR_FROM);
  assert.ok(match, `missing marketplace activate anchor patch for ${CURSOR_VERSION}`);
  assert.match(match.to, /__cursorZhMarketplaceLazy\?\.activate/);
});

test('critical embedded patch registers marketplace static activate anchor for current workbench variant', () => {
  const match = CRITICAL_EMBEDDED_UI_PATCHES.find(
    (entry) => entry.from === MARKETPLACE_ACTIVATE_CRITICAL_FROM
  );
  assert.ok(match, 'missing marketplace activate anchor patch for current workbench variant');
  assert.match(match.to, /__cursorZhMarketplaceLazy\?\.activate/);
});

test('applyStaticSourceTranslations injects marketplace activate call at discover mount for 3.9.8 and keeps source parseable', () => {
  const translated = applyStaticSourceTranslations(MARKETPLACE_FIXTURE, [], undefined, {
    cursorVersion: CURSOR_VERSION,
  });
  assert.match(translated, /__cursorZhMarketplaceLazy\?\.activate/);
  assert.doesNotMatch(translated, /__cursorZhTranslateMarketplacePlugins/);
  assertParses(translated, 'marketplace-activate-anchor-3.9.8.js');
});

test('applyStaticSourceTranslations injects marketplace activate call for current workbench variant and keeps source parseable', () => {
  const translated = applyStaticSourceTranslations(MARKETPLACE_CRITICAL_FIXTURE, []);
  assert.match(translated, /__cursorZhMarketplaceLazy\?\.activate/);
  assertParses(translated, 'marketplace-activate-anchor-critical.js');
});
