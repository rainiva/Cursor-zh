const test = require('node:test');
const assert = require('node:assert/strict');

const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');
const {
  hasResilientMarketplaceMapHook,
  hasFragileMarketplaceMapHook,
} = require('../../lib/patcher/marketplace-map-hook-guard.js');

// 3.14.7 真实邻域字节（Node Buffer 扫描 D:\Apps\cursor 双 bundle，
// 见 scripts/dev/t24-verify-marketplace-bytes.js 输出）。
// desktop map fn = RE，wrapper Fv，class lat，headers Pu(Gn())。
// glass  map fn = xA，wrapper db，class ipt，headers Ch(Ti())。

const DESKTOP_LIST_FIXTURE_3147 =
  'const i=((await Fv(e.listMarketplacePlugins({}),t))?.plugins??[]).map(RE);const a=await zu(s.map(l=>l.id),async l=>[...(await e.listMarketplacePlugins({marketplaceId:l})).plugins].map(RE),t);';

const DESKTOP_DASHBOARD_FIXTURE_3147 =
  'const r=((await Fv(t.listMarketplacePlugins(new lat({}),{headers:Pu(Gn())}),n))?.plugins??[]).map(RE),o=(await Fv(t.listMarketplaces(new thn({}),{headers:Pu(Gn())}),n));const l=await zu(o.map(u=>u.id),async u=>[...(await t.listMarketplacePlugins(new lat({marketplaceId:u}),{headers:Pu(Gn())})).plugins].map(RE),n);';

const GLASS_LIST_FIXTURE_3147 =
  'const i=((await db(t.listMarketplacePlugins({}),e))?.plugins??[]).map(xA);const a=await op(s.map(c=>c.id),async c=>[...(await t.listMarketplacePlugins({marketplaceId:c})).plugins].map(xA),e);';

const GLASS_DASHBOARD_FIXTURE_3147 =
  'const r=((await db(e.listMarketplacePlugins(new ipt({}),{headers:Ch(Ti())}),n))?.plugins??[]).map(xA),o=(await db(e.listMarketplaces(new qqn({}),{headers:Ch(Ti())}),n));const l=await op(o.map(u=>u.id),async u=>[...(await e.listMarketplacePlugins(new ipt({marketplaceId:u}),{headers:Ch(Ti())})).plugins].map(xA),n);';

// 3.14.7 glass 中 excludeCloudAgentPlugins 的 .plugins.filter(...).map(sek)
// 站点历来不包裹，抗漂移正则不得误伤它。
const GLASS_EXCLUDE_CLOUD_FIXTURE_3147 =
  'return(await(await i.dashboardClient()).listMarketplacePlugins(new ipt({excludeCloudAgentPlugins:!0}),{signal:m})).plugins.filter(lek).filter(aek).map(sek)';

test('static translation wraps 3.14.7 desktop marketplace list map sites with resilient hook', () => {
  const translated = applyStaticSourceTranslations(DESKTOP_LIST_FIXTURE_3147, []);

  assert.doesNotMatch(translated, /\.map\(RE\)/);
  assert.equal(hasResilientMarketplaceMapHook(translated), true);
  assert.equal(hasFragileMarketplaceMapHook(translated), false);
});

test('static translation wraps 3.14.7 desktop marketplace dashboard map sites with resilient hook', () => {
  const translated = applyStaticSourceTranslations(DESKTOP_DASHBOARD_FIXTURE_3147, []);

  assert.doesNotMatch(translated, /\.map\(RE\)/);
  assert.equal(hasResilientMarketplaceMapHook(translated), true);
  assert.equal(hasFragileMarketplaceMapHook(translated), false);
});

test('static translation wraps 3.14.7 glass marketplace list map sites with resilient hook', () => {
  const translated = applyStaticSourceTranslations(GLASS_LIST_FIXTURE_3147, []);

  assert.doesNotMatch(translated, /\.map\(xA\)/);
  assert.equal(hasResilientMarketplaceMapHook(translated), true);
  assert.equal(hasFragileMarketplaceMapHook(translated), false);
});

test('static translation wraps 3.14.7 glass marketplace dashboard map sites with resilient hook', () => {
  const translated = applyStaticSourceTranslations(GLASS_DASHBOARD_FIXTURE_3147, []);

  assert.doesNotMatch(translated, /\.map\(xA\)/);
  assert.equal(hasResilientMarketplaceMapHook(translated), true);
  assert.equal(hasFragileMarketplaceMapHook(translated), false);
});

test('static translation does not wrap 3.14.7 excludeCloudAgentPlugins filter/map site', () => {
  const translated = applyStaticSourceTranslations(GLASS_EXCLUDE_CLOUD_FIXTURE_3147, []);

  // 该站点必须原样保留，不引入 lazy-translate 包裹。
  assert.ok(
    translated.includes('.plugins.filter(lek).filter(aek).map(sek)'),
    `expected excludeCloudAgentPlugins site untouched, got: ${translated}`
  );
  assert.equal(hasResilientMarketplaceMapHook(translated), false);
});
