const test = require('node:test');
const assert = require('node:assert/strict');

const { buildMarketplaceLazyBootstrapLines } = require('../../lib/runtime/marketplace-lazy-template.js');
const { createMarketplaceLazyTranslator } = require('../../lib/runtime/marketplace-lazy-translator.js');

const INLINE_CATALOG = {
  version: 2,
  generatedAt: '2026-06-26T12:00:00.000Z',
  entries: [
    {
      id: 'datadog-mcp',
      originalText: 'Use Datadog MCP to query metrics and logs.',
      changeText: '使用 Datadog MCP 查询指标与日志。',
      searchType: 'exact',
    },
  ],
};

function installBootstrapHarness(translationMetadata, fetchImpl, requireImpl = require) {
  const lines = buildMarketplaceLazyBootstrapLines();
  const source = [
    'const translationMetadata = metadata;',
    'const fetch = fetchImpl;',
    'const require = requireImpl;',
    ...lines,
    'return globalThis.__cursorZhMarketplaceLazy;',
  ].join('\n');
  const factory = new Function('metadata', 'fetchImpl', 'requireImpl', source);
  return factory(translationMetadata, fetchImpl, requireImpl);
}

test('bootstrap fetchJson prefers inline catalog and skips cursor-zh fetch', async () => {
  const fetchCalls = [];
  const fetchImpl = async (url) => {
    fetchCalls.push(url);
    throw new Error(`fetch should not be called: ${url}`);
  };

  const lazyApi = installBootstrapHarness(
    {
      marketplaceDescriptionsUrl: 'cursor-zh://marketplace.descriptions.json',
      marketplaceDescriptionsInline: INLINE_CATALOG,
      marketplaceDescriptionsVersion: INLINE_CATALOG.version,
      runtimeConfig: { marketplaceLazyTranslationEnabled: true },
    },
    fetchImpl
  );

  await lazyApi.activate();
  assert.equal(fetchCalls.length, 0);
  assert.equal(lazyApi.getState().mapSize, 1);
  assert.equal(lazyApi.getState().loadedVersion, 2);
});

test('bootstrap fetchJson falls back to fs path when inline catalog is absent', async () => {
  const fetchCalls = [];
  const fetchImpl = async (url) => {
    fetchCalls.push(url);
    throw new Error(`fetch should not be called: ${url}`);
  };

  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const catalogPath = path.join(os.tmpdir(), `cursor-zh-mkt-${Date.now()}.json`);
  fs.writeFileSync(catalogPath, JSON.stringify(INLINE_CATALOG), 'utf8');

  try {
    const lazyApi = installBootstrapHarness(
      {
        marketplaceDescriptionsUrl: 'cursor-zh://marketplace.descriptions.json',
        marketplaceDescriptionsPath: catalogPath,
        marketplaceDescriptionsVersion: INLINE_CATALOG.version,
        runtimeConfig: { marketplaceLazyTranslationEnabled: true },
      },
      fetchImpl
    );

    await lazyApi.activate();
    assert.equal(fetchCalls.length, 0);
    assert.equal(lazyApi.getState().mapSize, 1);
  } finally {
    fs.unlinkSync(catalogPath);
  }
});

test('inline catalog enables marketplace plugin hook translation after activate', async () => {
  installBootstrapHarness(
    {
      marketplaceDescriptionsInline: INLINE_CATALOG,
      marketplaceDescriptionsVersion: INLINE_CATALOG.version,
      runtimeConfig: { marketplaceLazyTranslationEnabled: true },
    },
    async () => {
      throw new Error('fetch unavailable');
    }
  );

  await globalThis.__cursorZhMarketplaceLazy.activate();
  const translated = globalThis.__cursorZhMarketplaceLazyTranslatePlugin({
    description: INLINE_CATALOG.entries[0].originalText,
  });
  assert.equal(translated.description, INLINE_CATALOG.entries[0].changeText);
});

test('buildMarketplaceDescriptionsMetadata includes inline catalog payload', () => {
  const { createMarketplaceDescriptionsModule } = require('../../tool/builder/marketplace-descriptions.js');
  const module = createMarketplaceDescriptionsModule({
    toolPaths: {
      marketplaceDescriptionsCachePath: '/tmp/cache.json',
      marketplaceDescriptionsGeneratedPath: '/tmp/generated.json',
      generatedDir: '/tmp/generated',
    },
    readJsonIfExists: () => INLINE_CATALOG,
    writeJson: () => {},
    ensureDir: () => {},
  });

  const metadata = module.buildMarketplaceDescriptionsMetadata(INLINE_CATALOG);
  assert.deepEqual(metadata.marketplaceDescriptionsInline, INLINE_CATALOG);
});
