const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { translateMarketplacePluginRecord } = require('../../lib/runtime/marketplace-lazy-translator.js');

const CATALOG_PATH = path.resolve(
  __dirname,
  '../../../translations/cache/marketplace.descriptions.json'
);

const REQUIRED_PLUGIN_IDS = [
  'slack-mcp',
  'claude-api-sdk',
  'datadog-mcp',
  'figma-mcp',
  'linear-mcp',
  'anthropic-skills',
];

test('marketplace descriptions cache keeps curated plugin entries with Chinese changeText', () => {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  assert.ok(Array.isArray(catalog.entries));
  assert.ok(catalog.entries.length >= 6);
  assert.ok(catalog.entries.length <= 80);

  for (const id of REQUIRED_PLUGIN_IDS) {
    const entry = catalog.entries.find((item) => item.id === id);
    assert.ok(entry, `missing curated marketplace entry: ${id}`);
    assert.notEqual(entry.changeText, entry.originalText);
    assert.match(entry.changeText, /[\u4e00-\u9fff]/);
  }
});

test('translateMarketplacePluginRecord applies curated Datadog description from catalog', () => {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  const datadog = catalog.entries.find((entry) => entry.id === 'datadog-mcp');
  assert.ok(datadog);

  const mappingMap = new Map([[datadog.originalText, datadog.changeText]]);
  const translated = translateMarketplacePluginRecord(
    { description: datadog.originalText },
    mappingMap
  );
  assert.equal(translated.description, datadog.changeText);
});
