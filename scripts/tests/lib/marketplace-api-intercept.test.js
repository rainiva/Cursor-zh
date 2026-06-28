const test = require('node:test');
const assert = require('node:assert/strict');

const { createMarketplaceLazyTranslator } = require('../../lib/runtime/marketplace-lazy-translator.js');

const SAMPLE_CATALOG = {
  version: 1,
  entries: [
    {
      originalText: 'Slack MCP server. Search channels, read messages.',
      changeText: 'Slack MCP 服务器。搜索频道、读取消息。',
      searchType: 'exact',
    },
  ],
};

test('active session installs API translate hook for plugin records', async () => {
  const translator = createMarketplaceLazyTranslator({
    fetchJson: async () => SAMPLE_CATALOG,
    requestIdleCallback: (callback) => {
      callback({ timeRemaining: () => 50 });
      return 1;
    },
    getDocument: () => ({ querySelector: () => null, body: null }),
    mappingsUrl: 'cursor-zh://marketplace.descriptions.json',
  });

  await translator.activate();
  assert.equal(typeof globalThis.__cursorZhMarketplaceLazyTranslatePlugin, 'function');

  const translated = globalThis.__cursorZhMarketplaceLazyTranslatePlugin({
    description: 'Slack MCP server. Search channels, read messages.',
    displayName: 'Slack',
  });
  assert.match(translated.description, /Slack MCP 服务器/);

  translator.deactivate();
  assert.equal(globalThis.__cursorZhMarketplaceLazyTranslatePlugin, undefined);
});

test('translatePluginsResponse maps plugin array during active session', async () => {
  const translator = createMarketplaceLazyTranslator({
    fetchJson: async () => SAMPLE_CATALOG,
    requestIdleCallback: (callback) => {
      callback({ timeRemaining: () => 50 });
      return 1;
    },
    getDocument: () => ({ querySelector: () => null, body: null }),
    mappingsUrl: 'cursor-zh://marketplace.descriptions.json',
  });

  await translator.activate();
  const plugins = translator.translateMarketplacePluginsResponse([
    { description: 'Slack MCP server. Search channels, read messages.' },
  ]);
  assert.match(plugins[0].description, /Slack MCP 服务器/);
  translator.deactivate();
});
