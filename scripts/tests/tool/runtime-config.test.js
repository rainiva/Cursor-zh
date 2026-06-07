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
  assert.ok(Array.isArray(config.observeScopeSelectors));
  assert.ok(config.observeScopeSelectors.length > 0);
});

test('buildRuntimeConfig returns compatibility mode with rescan delays', () => {
  const config = buildRuntimeConfig('compatibility');

  assert.equal(config.mode, 'compatibility');
  assert.deepEqual(config.rescanDelaysMs, [300, 1500]);
});

test('buildRuntimeConfig rejects unsupported runtime mode', () => {
  assert.throws(() => buildRuntimeConfig('turbo'), /Unsupported runtime mode/);
});
