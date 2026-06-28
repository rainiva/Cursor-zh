const test = require('node:test');
const assert = require('node:assert/strict');

const {
  hasFragileMarketplaceMapHook,
  hasBrokenMarketplaceActivatePatch,
  hasResilientMarketplaceMapHook,
  inspectMarketplaceWorkbenchPatches,
} = require('../../lib/patcher/marketplace-map-hook-guard.js');

const RESILIENT_G7K_SNIPPET =
  'const i=((await $k(n.listMarketplacePlugins({}),e))?.plugins??[]).map(p=>r1((()=>{try{const h=globalThis.__cursorZhMarketplaceLazyTranslatePlugin;return h?h(p):p}catch(e){return p}})()));';

const FRAGILE_G7K_SNIPPET =
  'const i=((await $k(n.listMarketplacePlugins({}),e))?.plugins??[]).map(p=>r1((h=globalThis.__cursorZhMarketplaceLazyTranslatePlugin)?h(p):p));';

const BROKEN_ACTIVATE_SNIPPET =
  'children:[Hv(er,{children:"发现"}),try{globalThis.__cursorZhMarketplaceLazy?.activate?.()}catch(e){}Hv(gzg,{plugins:Et})]';

const SAFE_ACTIVATE_SNIPPET =
  'children:[Hv(er,{children:"发现"}),(()=>{try{globalThis.__cursorZhMarketplaceLazy?.activate?.()}catch(e){}})(),Hv(gzg,{plugins:Et})]';

test('hasFragileMarketplaceMapHook detects legacy bare hook wrapper', () => {
  assert.equal(hasFragileMarketplaceMapHook(FRAGILE_G7K_SNIPPET), true);
  assert.equal(hasFragileMarketplaceMapHook(RESILIENT_G7K_SNIPPET), false);
});

test('hasBrokenMarketplaceActivatePatch detects illegal try-before-Hv activate patch', () => {
  assert.equal(hasBrokenMarketplaceActivatePatch(BROKEN_ACTIVATE_SNIPPET), true);
  assert.equal(hasBrokenMarketplaceActivatePatch(SAFE_ACTIVATE_SNIPPET), false);
});

test('hasResilientMarketplaceMapHook detects try/catch passthrough wrapper', () => {
  assert.equal(hasResilientMarketplaceMapHook(RESILIENT_G7K_SNIPPET), true);
  assert.equal(hasResilientMarketplaceMapHook(FRAGILE_G7K_SNIPPET), false);
});

test('hasResilientMarketplaceMapHook detects l2 minified wrapper from embedded patches', () => {
  const l2Snippet =
    '(await n.listMarketplacePlugins({})).plugins].map(p=>l2((()=>{try{const h=globalThis.__cursorZhMarketplaceLazyTranslatePlugin;return h?h(p):p}catch(e){return p}})()))';
  assert.equal(hasResilientMarketplaceMapHook(l2Snippet), true);
});

test('inspectMarketplaceWorkbenchPatches passes resilient glass marketplace bundle', () => {
  const report = inspectMarketplaceWorkbenchPatches(
    `${RESILIENT_G7K_SNIPPET}${SAFE_ACTIVATE_SNIPPET}`
  );
  assert.equal(report.skipped, false);
  assert.equal(report.ok, true);
  assert.deepEqual(report.issues, []);
});

test('inspectMarketplaceWorkbenchPatches flags fragile map hook and broken activate', () => {
  const report = inspectMarketplaceWorkbenchPatches(
    `${FRAGILE_G7K_SNIPPET}${BROKEN_ACTIVATE_SNIPPET}`
  );
  assert.equal(report.ok, false);
  assert.ok(report.issues.some((issue) => issue.includes('map hook')));
  assert.ok(report.issues.some((issue) => issue.includes('activate')));
});

test('inspectMarketplaceWorkbenchPatches skips bundles without marketplace hook', () => {
  const report = inspectMarketplaceWorkbenchPatches('children:"Discover"');
  assert.equal(report.skipped, true);
  assert.equal(report.ok, true);
});
