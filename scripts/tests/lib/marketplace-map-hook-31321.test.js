const test = require('node:test');
const assert = require('node:assert/strict');

const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');
const {
  hasResilientMarketplaceMapHook,
  hasFragileMarketplaceMapHook,
} = require('../../lib/patcher/marketplace-map-hook-guard.js');

// 3.13.21 真实邻域字节（state/reports/task15-drift-evidence-3.13.21.txt）

const GLASS_LIST_FIXTURE =
  'async function yFb(t,e=Gpn){const i=((await p_(t.listMarketplacePlugins({}),e))?.plugins??[]).map(z0);try{const s=(await p_(t.listMarketplaces({}),e))?.marketplaces??[],o=[];for(const c of s){const u=QHn(c);u!==void 0&&o.push(u)}const a=await Tjm(s.map(c=>c.id),async c=>[...(await t.listMarketplacePlugins({marketplaceId:c})).plugins].map(z0),e),l=new Map;for(const c of i)l.set(c.id,c);for(const c of a.values())for(const u of c)l.set(u.id,u);return{allMarketplacePlugins:Array.from(l.values()),pluginsByMarketplaceId:a,marketplaces:o}}catch{return{allMarketplacePlugins:i,pluginsByMarketplaceId:a,marketplaces:o}}}';

const GLASS_DASHBOARD_FIXTURE =
  'async refreshMarketplacePluginsFromDashboardClient(t){try{const e=await this._cursorAuthenticationService.dashboardClient(),n=P5r(this._experimentService),r=((await p_(e.listMarketplacePlugins(new emt({}),{headers:Qh(Ti())}),n))?.plugins??[]).map(z0),o=(await p_(e.listMarketplaces(new Hni({}),{headers:Qh(Ti())}),n))?.marketplaces??[],a=[];for(const u of o){const d=QHn(u);d!==void 0&&a.push(d)}const l=await Tjm(o.map(u=>u.id),async u=>[...(await e.listMarketplacePlugins(new emt({marketplaceId:u}),{headers:Qh(Ti())})).plugins].map(z0),n),c=new Map;for(const u of r)c.set(u.id,u)}catch{}}';

const DESKTOP_LIST_FIXTURE =
  'async function Qub(t,e=Ran){const i=((await k_(t.listMarketplacePlugins({}),e))?.plugins??[]).map(z0);try{const s=(await k_(t.listMarketplaces({}),e))?.marketplaces??[],o=[];for(const c of s){const u=dXi(c);u!==void 0&&o.push(u)}const a=await BIm(s.map(c=>c.id),async c=>[...(await t.listMarketplacePlugins({marketplaceId:c})).plugins].map(z0),e),l=new Map;for(const c of i)l.set(c.id,c);for(const c of a.values())for(const u of c)l.set(u.id,u);return{allMarketplacePlugins:Array.from(l.values()),pluginsByMarketplaceId:a,marketplaces:o}}catch{return{allMarketplacePlugins:i,pluginsByMarketplaceId:a,marketplaces:o}}}';

const DESKTOP_DASHBOARD_FIXTURE =
  'async refreshMarketplacePluginsFromDashboardClient(t){try{const e=await this._cursorAuthenticationService.dashboardClient(),n=YAr(this._experimentService),r=((await k_(e.listMarketplacePlugins(new nut({}),{headers:Ih(bi())}),n))?.plugins??[]).map(z0),o=(await k_(e.listMarketplaces(new iKn({}),{headers:Ih(bi())}),n))?.marketplaces??[],a=[];for(const u of o){const d=dXi(u);d!==void 0&&a.push(d)}const l=await BIm(o.map(u=>u.id),async u=>[...(await e.listMarketplacePlugins(new nut({marketplaceId:u}),{headers:Ih(bi())})).plugins].map(z0),n),c=new Map;for(const u of r)c.set(u.id,u)}catch{}}';

const GLASS_DISCOVER_FIXTURE =
  'children:[cy(Pn,{size:"lg",weight:"medium",className:"ui-yab65l",children:"Discover"}),cy(D8d,{plugins:St,installedPluginIdSet:t.installedPluginIdSet,installCountByPluginId:t.teamInstallCountByPluginId,onPluginClick:mt})]';

const DESKTOP_DISCOVER_FIXTURE =
  'children:[B_(ki,{size:"lg",weight:"medium",className:"ui-yab65l",children:"Discover"}),B_(BCd,{plugins:It,installedPluginIdSet:t.installedPluginIdSet,installCountByPluginId:t.teamInstallCountByPluginId,onPluginClick:bt})]';

test('static translation wraps 3.13.21 glass marketplace list map sites with resilient hook', () => {
  const translated = applyStaticSourceTranslations(GLASS_LIST_FIXTURE, []);

  assert.doesNotMatch(translated, /\.map\(z0\)/);
  assert.equal(hasResilientMarketplaceMapHook(translated), true);
  assert.equal(hasFragileMarketplaceMapHook(translated), false);
});

test('static translation wraps 3.13.21 glass marketplace dashboard map sites with resilient hook', () => {
  const translated = applyStaticSourceTranslations(GLASS_DASHBOARD_FIXTURE, []);

  assert.doesNotMatch(translated, /\.map\(z0\)/);
  assert.equal(hasResilientMarketplaceMapHook(translated), true);
  assert.equal(hasFragileMarketplaceMapHook(translated), false);
});

test('static translation wraps 3.13.21 desktop marketplace list map sites with resilient hook', () => {
  const translated = applyStaticSourceTranslations(DESKTOP_LIST_FIXTURE, []);

  assert.doesNotMatch(translated, /\.map\(z0\)/);
  assert.equal(hasResilientMarketplaceMapHook(translated), true);
  assert.equal(hasFragileMarketplaceMapHook(translated), false);
});

test('static translation wraps 3.13.21 desktop marketplace dashboard map sites with resilient hook', () => {
  const translated = applyStaticSourceTranslations(DESKTOP_DASHBOARD_FIXTURE, []);

  assert.doesNotMatch(translated, /\.map\(z0\)/);
  assert.equal(hasResilientMarketplaceMapHook(translated), true);
  assert.equal(hasFragileMarketplaceMapHook(translated), false);
});

test('static translation injects safe marketplace activate IIFE before 3.13.21 glass discover section', () => {
  const translated = applyStaticSourceTranslations(GLASS_DISCOVER_FIXTURE, []);

  assert.ok(
    translated.includes(
      '(()=>{try{globalThis.__cursorZhMarketplaceLazy?.activate?.()}catch(e){}})(),cy(D8d,{plugins:St,installedPluginIdSet:t.installedPluginIdSet'
    ),
    `expected safe activate IIFE, got: ${translated}`
  );
});

test('static translation injects safe marketplace activate IIFE before 3.13.21 desktop discover section', () => {
  const translated = applyStaticSourceTranslations(DESKTOP_DISCOVER_FIXTURE, []);

  assert.ok(
    translated.includes(
      '(()=>{try{globalThis.__cursorZhMarketplaceLazy?.activate?.()}catch(e){}})(),B_(BCd,{plugins:It,installedPluginIdSet:t.installedPluginIdSet'
    ),
    `expected safe activate IIFE, got: ${translated}`
  );
});
