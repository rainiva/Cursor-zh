const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeRuntimeMode } = require('../../tool/context.js');
const { createRuntimeConfigModule } = require('../../tool/runtime-config.js');

const { buildRuntimeConfig } = createRuntimeConfigModule({ normalizeRuntimeMode });

test('buildRuntimeConfig returns performance mode by default', () => {
  const config = buildRuntimeConfig();

  assert.equal(config.mode, 'performance');
  assert.deepEqual(config.rescanDelaysMs, []);
  assert.equal(config.stageDocumentRoot, false);
  assert.equal(config.marketplaceRemoteTranslationEnabled, false);
  assert.equal(config.marketplaceLazyTranslationEnabled, true);
  assert.equal(config.marketplaceLazyBatchSize, 30);
  assert.ok(
    config.observeScopeSelectors.includes('[class*="tool-call"]'),
    'tool-call lines should be observed for split action/details labels'
  );
  assert.ok(
    !config.observeScopeSelectors.includes('[class*="marketplace"]'),
    'marketplace scope should be handled by lazy translator only'
  );
  assert.ok(Array.isArray(config.observeScopeSelectors));
  assert.ok(config.observeScopeSelectors.length > 0);
});

test('buildRuntimeConfig includes composer scope selector for commit dropdown coverage', () => {
  const config = buildRuntimeConfig();
  assert.ok(
    config.observeScopeSelectors.includes('[class*="composer"]'),
    'observeScopeSelectors must include composer scope to translate commit dropdown menu items'
  );
});

test('buildRuntimeConfig returns compatibility mode with rescan delays', () => {
  const config = buildRuntimeConfig('compatibility');

  assert.equal(config.mode, 'compatibility');
  assert.deepEqual(config.rescanDelaysMs, [300, 1500]);
});

test('buildRuntimeConfig rejects unsupported runtime mode', () => {
  assert.throws(() => buildRuntimeConfig('turbo'), /Unsupported runtime mode/);
});

test('buildRuntimeConfig includes at least 8 L3 surface scope selectors in performance mode', () => {
  const config = buildRuntimeConfig('performance');
  const l3Markers = [
    'quick-input',
    'command-palette',
    'sidebar',
    'automation',
  ];
  const matched = l3Markers.filter((marker) =>
    config.observeScopeSelectors.some((selector) => selector.includes(marker))
  );
  assert.ok(
    matched.length >= 3,
    `expected L3 surface scopes in observeScopeSelectors, got ${config.observeScopeSelectors.join(', ')}`
  );
  assert.ok(config.l3SurfaceCount >= 8);
});

test('buildRuntimeConfig compatibility mode keeps rescan delays and L3 scopes', () => {
  const config = buildRuntimeConfig('compatibility');
  assert.deepEqual(config.rescanDelaysMs, [300, 1500]);
  assert.ok(config.observeScopeSelectors.length > 0);
});
