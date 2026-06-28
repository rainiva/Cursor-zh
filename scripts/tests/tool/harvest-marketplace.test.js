const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildMarketplaceDescriptionEntries,
  extractMarketplaceDescriptionCandidates,
  mergeMarketplaceDescriptionsCatalog,
  pluginsFromHarvestSnapshot,
} = require('../../lib/analyzer/harvest-marketplace.js');

const FIXTURE_PLUGINS = [
  {
    id: 'slack-mcp',
    displayName: 'Slack',
    description: 'Slack MCP server. Search channels, read messages.',
    category: 'Infrastructure',
  },
  {
    id: 'claude-api',
    displayName: 'Claude API',
    description: 'Claude API and SDK. Use Anthropic models in Cursor.',
    category: 'Featured',
  },
];

test('buildMarketplaceDescriptionEntries extracts description entries from API snapshot', () => {
  const entries = buildMarketplaceDescriptionEntries(FIXTURE_PLUGINS);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].id, 'slack-mcp');
  assert.equal(entries[0].originalText, 'Slack MCP server. Search channels, read messages.');
  assert.equal(entries[0].searchType, 'exact');
});

test('mergeMarketplaceDescriptionsCatalog preserves existing changeText and adds new plugins', () => {
  const existing = {
    version: 1,
    generatedAt: '2026-06-01T00:00:00.000Z',
    entries: [
      {
        id: 'slack-mcp',
        originalText: 'Slack MCP server. Search channels, read messages.',
        changeText: 'Slack MCP 服务器。搜索频道、读取消息。',
        searchType: 'exact',
      },
    ],
  };

  const merged = mergeMarketplaceDescriptionsCatalog(existing, FIXTURE_PLUGINS);

  assert.equal(merged.version, 2);
  assert.ok(merged.generatedAt);
  assert.equal(merged.entries.length, 2);
  const slack = merged.entries.find((entry) => entry.id === 'slack-mcp');
  const claude = merged.entries.find((entry) => entry.id === 'claude-api');
  assert.equal(slack.changeText, 'Slack MCP 服务器。搜索频道、读取消息。');
  assert.equal(claude.originalText, 'Claude API and SDK. Use Anthropic models in Cursor.');
  assert.equal(claude.changeText, claude.originalText);
});

test('extractMarketplaceDescriptionCandidates filters long description-like harvest strings', () => {
  const candidates = extractMarketplaceDescriptionCandidates([
    { text: 'Discover', path: 'workbench.desktop.main.js', context: 'label' },
    {
      text: 'Slack MCP server. Search channels, read messages and post updates.',
      path: 'workbench.desktop.main.js',
      context: 'description',
    },
    { text: 'Enable', path: 'workbench.desktop.main.js', context: 'button' },
  ]);

  assert.equal(candidates.length, 1);
  assert.match(candidates[0].originalText, /Slack MCP server/);
  assert.equal(candidates[0].changeText, candidates[0].originalText);
});

test('pluginsFromHarvestSnapshot maps candidate entries to plugin records', () => {
  const plugins = pluginsFromHarvestSnapshot({
    files: [
      {
        path: 'workbench.desktop.main.js',
        strings: [
          {
            text: 'Claude API and SDK. Use Anthropic models in Cursor for coding tasks.',
            context: 'description',
          },
        ],
      },
    ],
  });
  assert.equal(plugins.length, 1);
  assert.match(plugins[0].description, /Claude API and SDK/);
});
