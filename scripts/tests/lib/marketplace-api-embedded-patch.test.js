const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const { loadEmbeddedPatchesForVersion } = require('../../lib/mapping/versioned-patches.js');
const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');
const { createMarketplaceLazyTranslator } = require('../../lib/runtime/marketplace-lazy-translator.js');

const MARKETPLACE_MAP_HOOK = '__cursorZhMarketplaceLazyTranslatePlugin';
const CURSOR_VERSION = '3.9.8';

const MARKETPLACE_FIXTURE = [
  'async function g7k(n,e=KAn){const i=((await $k(n.listMarketplacePlugins({}),e))?.plugins??[]).map(r1);try{const s=(await $k(n.listMarketplaces({}),e))?.marketplaces??[],o=[];for(const c of s){const u=Vsi(c);u!==void 0&&o.push(u)}const a=await xzy(s.map(c=>c.id),async c=>[...(await n.listMarketplacePlugins({marketplaceId:c})).plugins].map(r1),e),l=new Map;return i}catch{return[]}}',
  'async function refreshMarketplace(e){const t=lsu(this._experimentService),r=((await $k(e.listMarketplacePlugins(new fPt({}),{headers:np($i())}),t))?.plugins??[]).map(r1),o=(await $k(e.listMarketplaces(new k$r({}),{headers:np($i())}),t))?.marketplaces??[];return {r,o}}',
].join('\n');

const MARKETPLACE_G7K_FIXTURE =
  'async function g7k(n,e=KAn){const i=((await $k(n.listMarketplacePlugins({}),e))?.plugins??[]).map(r1);try{const s=(await $k(n.listMarketplaces({}),e))?.marketplaces??[],o=[];for(const c of s){const u=Vsi(c);u!==void 0&&o.push(u)}const a=await xzy(s.map(c=>c.id),async c=>[...(await n.listMarketplacePlugins({marketplaceId:c})).plugins].map(r1),e),l=new Map;for(const c of i)l.set(c.id,c);for(const c of a.values())for(const u of c)l.set(u.id,u);return{allMarketplacePlugins:Array.from(l.values()),pluginsByMarketplaceId:a,marketplaces:o}}catch{return{allMarketplacePlugins:i,pluginsByMarketplaceId:new Map,marketplaces:[]}}}';

const RESILIENT_MAP_HOOK = /catch\(e\)\{return p\}/;

const MARKETPLACE_PATCH_FROM = [
  '((await $k(n.listMarketplacePlugins({}),e))?.plugins??[]).map(r1)',
  '[...(await n.listMarketplacePlugins({marketplaceId:c})).plugins].map(r1)',
  '((await $k(e.listMarketplacePlugins(new fPt({}),{headers:np($i())}),t))?.plugins??[]).map(r1)',
];

test('embedded patches register marketplace plugin map hook wrappers for 3.9.8', () => {
  const patches = loadEmbeddedPatchesForVersion(CURSOR_VERSION);
  for (const from of MARKETPLACE_PATCH_FROM) {
    const match = patches.find((entry) => entry.from === from);
    assert.ok(match, `missing embedded patch for ${CURSOR_VERSION}: ${from}`);
    assert.match(match.to, new RegExp(MARKETPLACE_MAP_HOOK));
    assert.match(match.to, RESILIENT_MAP_HOOK);
  }
});

test('applyStaticSourceTranslations wraps listMarketplacePlugins map sites with lazy hook for 3.9.8', () => {
  const translated = applyStaticSourceTranslations(MARKETPLACE_FIXTURE, [], undefined, {
    cursorVersion: CURSOR_VERSION,
  });

  for (const from of MARKETPLACE_PATCH_FROM) {
    assert.doesNotMatch(translated, new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(translated, new RegExp(MARKETPLACE_MAP_HOOK));
  assert.match(translated, RESILIENT_MAP_HOOK);
  assert.doesNotMatch(translated, /__cursorZhTranslateMarketplacePlugins/);
  assert.doesNotMatch(translated, /__cursorZhTranslateMarketplaceResponse/);
  assert.doesNotMatch(translated, /\.map\(r1\)(?!\()/);
});

test('marketplace map hook wrappers stay strict-mode executable for 3.9.8', async () => {
  const translated = applyStaticSourceTranslations(MARKETPLACE_FIXTURE, [], undefined, {
    cursorVersion: CURSOR_VERSION,
  });
  const context = { resultPromise: null };

  vm.runInNewContext(
    [
      '"use strict";',
      'globalThis.__cursorZhMarketplaceLazyTranslatePlugin = (plugin) => ({ ...plugin, localized: true });',
      'async function $k(value){return value;}',
      'function r1(value){return value;}',
      'const KAn = {};',
      'function Vsi(value){return value;}',
      'async function xzy(){return []; }',
      'function lsu(){return {}; }',
      'function fPt(){}',
      'function np(){return {}; }',
      'function $i(){return {}; }',
      'function k$r(){}',
      translated,
      'resultPromise = (async () => {',
      '  const glass = await g7k({',
      '    listMarketplacePlugins: async () => ({ plugins: [{ id: "glass" }] }),',
      '    listMarketplaces: async () => ({ marketplaces: [] }),',
      '  });',
      '  const dashboard = await refreshMarketplace.call({ _experimentService: {} }, {',
      '    listMarketplacePlugins: async () => ({ plugins: [{ id: "dashboard" }] }),',
      '    listMarketplaces: async () => ({ marketplaces: [] }),',
      '  });',
      '  return { glass, dashboard };',
      '})();',
    ].join('\n'),
    context
  );

  const { glass, dashboard } = await context.resultPromise;
  assert.equal(JSON.stringify(glass), JSON.stringify([{ id: 'glass', localized: true }]));
  assert.equal(JSON.stringify(dashboard.r), JSON.stringify([{ id: 'dashboard', localized: true }]));
});

test('marketplace map hook preserves plugin instances before r1 for 3.9.8', async () => {
  const translated = applyStaticSourceTranslations(MARKETPLACE_FIXTURE, [], undefined, {
    cursorVersion: CURSOR_VERSION,
  });
  const translator = createMarketplaceLazyTranslator({
    fetchJson: async () => ({
      version: 1,
      entries: [
        {
          originalText: 'Slack MCP server. Search channels, read messages.',
          changeText: 'Slack MCP 服务器。搜索频道、读取消息。',
          searchType: 'exact',
        },
      ],
    }),
    requestIdleCallback: (callback) => {
      callback({ timeRemaining: () => 50 });
      return 1;
    },
    getDocument: () => ({ querySelector: () => null, body: null }),
    mappingsUrl: 'cursor-zh://marketplace.descriptions.json',
  });
  await translator.activate();

  const context = {
    hook(plugin) {
      return translator.translateMarketplacePluginRecord(plugin);
    },
    resultPromise: null,
  };

  try {
    vm.runInNewContext(
      [
        '"use strict";',
        'globalThis.__cursorZhMarketplaceLazyTranslatePlugin = hook;',
        'async function $k(value){return value;}',
        'class PluginMessage {',
        '  constructor(id, description) {',
        '    this.id = id;',
        '    this.description = description;',
        '  }',
        '  summary() {',
        '    return `${this.id}:${this.description}`;',
        '  }',
        '}',
        'function r1(value){',
        '  if (!(value instanceof PluginMessage)) throw new TypeError("expected PluginMessage");',
        '  return { summary: value.summary(), description: value.description };',
        '}',
        'const KAn = {};',
        'function Vsi(value){return value;}',
        'async function xzy(){return []; }',
        'function lsu(){return {}; }',
        'function fPt(){}',
        'function np(){return {}; }',
        'function $i(){return {}; }',
        'function k$r(){}',
        translated,
        'resultPromise = g7k({',
        '  listMarketplacePlugins: async () => ({',
        '    plugins: [new PluginMessage("glass", "Slack MCP server. Search channels, read messages.")],',
        '  }),',
        '  listMarketplaces: async () => ({ marketplaces: [] }),',
        '});',
      ].join('\n'),
      context
    );

    const [plugin] = await context.resultPromise;
    assert.equal(plugin.summary, 'glass:Slack MCP 服务器。搜索频道、读取消息。');
  } finally {
    translator.deactivate();
  }
});

test('g7k still returns marketplace plugins when map hook throws for 3.9.8', async () => {
  const translated = applyStaticSourceTranslations(MARKETPLACE_G7K_FIXTURE, [], undefined, {
    cursorVersion: CURSOR_VERSION,
  });
  assert.match(translated, RESILIENT_MAP_HOOK);

  const context = { refreshResult: null };

  vm.runInNewContext(
    [
      '"use strict";',
      'globalThis.__cursorZhMarketplaceLazyTranslatePlugin = () => {',
      '  throw new Error("marketplace hook failed");',
      '};',
      'async function $k(value){return value;}',
      'function r1(value){return { id: value.id, description: value.description };}',
      'const KAn = {};',
      'function Vsi(value){return value;}',
      'async function xzy(){return new Map();}',
      translated,
      'refreshResult = g7k({',
      '  listMarketplacePlugins: async () => ({',
      '    plugins: [',
      '      { id: "slack-mcp", description: "Slack MCP server." },',
      '      { id: "datadog-mcp", description: "Datadog MCP server." },',
      '    ],',
      '  }),',
      '  listMarketplaces: async () => ({ marketplaces: [] }),',
      '}, {});',
    ].join('\n'),
    context
  );

  const result = await context.refreshResult;
  assert.equal(result.allMarketplacePlugins.length, 2);
  assert.equal(result.allMarketplacePlugins[0].id, 'slack-mcp');
  assert.equal(result.allMarketplacePlugins[1].id, 'datadog-mcp');
});

test('refreshMarketplacePlugins keeps plugin cache when map hook throws for 3.9.8', async () => {
  const translated = applyStaticSourceTranslations(MARKETPLACE_G7K_FIXTURE, [], undefined, {
    cursorVersion: CURSOR_VERSION,
  });

  const context = { cachedPlugins: null };

  vm.runInNewContext(
    [
      '"use strict";',
      'globalThis.__cursorZhMarketplaceLazyTranslatePlugin = () => {',
      '  throw new Error("marketplace hook failed");',
      '};',
      'async function $k(value){return value;}',
      'function r1(value){return { id: value.id, description: value.description };}',
      'const KAn = {};',
      'function Vsi(value){return value;}',
      'async function xzy(){return new Map();}',
      translated,
      'async function refreshMarketplacePlugins(n) {',
      '  let cached = { allMarketplacePlugins: undefined };',
      '  try {',
      '    cached = await g7k(n, {});',
      '  } catch {}',
      '  return cached;',
      '}',
      'cachedPlugins = refreshMarketplacePlugins({',
      '  listMarketplacePlugins: async () => ({',
      '    plugins: [{ id: "slack-mcp", description: "Slack MCP server." }],',
      '  }),',
      '  listMarketplaces: async () => ({ marketplaces: [] }),',
      '});',
    ].join('\n'),
    context
  );

  const cached = await context.cachedPlugins;
  assert.equal(cached.allMarketplacePlugins.length, 1);
  assert.equal(cached.allMarketplacePlugins[0].id, 'slack-mcp');
});
