const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createMarketplaceLazyTranslator,
  resolveCatalogTranslation,
} = require('../../lib/runtime/marketplace-lazy-translator.js');

const PARTIAL_CATALOG = {
  version: 1,
  entries: [
    {
      id: 'slack-prefix',
      originalText: 'Slack MCP server.',
      changeText: 'Slack MCP 服务器。',
      searchType: 'partial',
    },
    {
      id: 'datadog-regex',
      originalText: '^Use Datadog(.+)$',
      changeText: '使用 Datadog$1',
      searchType: 'regex',
    },
  ],
};

test('resolveCatalogTranslation applies partial entries to longer API text', () => {
  const translated = resolveCatalogTranslation(
    'Slack MCP server. Search channels, read messages, and send me updates.',
    PARTIAL_CATALOG.entries
  );
  assert.equal(
    translated,
    'Slack MCP 服务器。 Search channels, read messages, and send me updates.'
  );
});

test('resolveCatalogTranslation applies regex entries for variant API wording', () => {
  const translated = resolveCatalogTranslation(
    'Use Datadog to investigate production errors quickly.',
    PARTIAL_CATALOG.entries
  );
  assert.equal(translated, '使用 Datadog to investigate production errors quickly.');
});

test('createMarketplaceLazyTranslator uses partial catalog entries for plugin records', async () => {
  const translator = createMarketplaceLazyTranslator({
    mappingsUrl: 'inline://catalog',
    fetchJson: async () => PARTIAL_CATALOG,
  });

  await translator.activate();
  const translated = translator.translateMarketplacePluginRecord({
    description: 'Slack MCP server. Search channels, read messages, and send me updates.',
  });
  assert.match(translated.description, /Slack MCP 服务器/);
});
