const test = require('node:test');
const assert = require('node:assert/strict');

const {
  SURFACE_CONTRACTS,
  STATIC_PATCH_SURFACE_CONTRACTS,
  listSurfaceContractsBySeverity,
} = require('../../lib/mapping/surface-contracts.js');

test('SURFACE_CONTRACTS defines at least 20 contract surfaces', () => {
  assert.ok(SURFACE_CONTRACTS.length >= 20);
});

test('every surface contract has id, surface, and severity', () => {
  for (const contract of SURFACE_CONTRACTS) {
    assert.ok(typeof contract.id === 'string' && contract.id.length > 0, contract.id);
    assert.ok(typeof contract.surface === 'string' && contract.surface.length > 0, contract.id);
    assert.ok(
      contract.severity === 'error' || contract.severity === 'warning',
      contract.id
    );
  }
});

test('static patch contracts are a subset used by patcher contracts', () => {
  const staticFromRegistry = SURFACE_CONTRACTS.filter((entry) => entry.kind === 'static_patch');
  assert.ok(staticFromRegistry.length >= 3);
  assert.equal(STATIC_PATCH_SURFACE_CONTRACTS.length, staticFromRegistry.length);
  for (const contract of STATIC_PATCH_SURFACE_CONTRACTS) {
    assert.ok(contract.originalText || contract.patchVariants);
    assert.ok(contract.translatedText || contract.patchVariants);
  }
});

test('legacy round UI target groups are registered for governance', () => {
  const {
    LEGACY_ROUND_UI_TARGET_GROUP_NAMES,
  } = require('../../lib/mapping/critical-ui-targets.js');

  assert.ok(LEGACY_ROUND_UI_TARGET_GROUP_NAMES.length >= 9);
  for (const name of LEGACY_ROUND_UI_TARGET_GROUP_NAMES) {
    assert.match(name, /^CRITICAL_GLASS_ROUND\d+_UI_TARGETS$/);
  }
});
