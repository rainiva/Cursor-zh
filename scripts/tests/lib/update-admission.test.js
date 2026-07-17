const test = require('node:test');
const assert = require('node:assert/strict');
const {
  classifyUpdateAdmission,
  createFallbackProofKey,
} = require('../../lib/compatibility/admission.js');

test('admits DEGRADED only when every blocking failure has a current-version fallback proof', () => {
  const fallbackProof = {
    testId: 'product-tip-runtime-fallback',
    testPassed: true,
    shardCompiled: true,
    contracts: { scope: true, lifecycle: true, placeholders: true, privacy: true },
    capabilityEvidence: { status: 'matched', matchCount: 1, signature: 'product-tips:v1' },
    proofKey: 'current-key',
  };
  assert.deepEqual(classifyUpdateAdmission({ drift: true, currentProofKey: 'current-key', outcomes: [
    { translationId: 'product_tips.render_text', severity: 'error', primary: 'missing', fallbackProof },
  ] }), { status: 'DEGRADED', blockers: [], fallbacks: ['product_tips.render_text'] });

  assert.deepEqual(classifyUpdateAdmission({ drift: true, currentProofKey: 'current-key', outcomes: [
    { translationId: 'composer.send_follow_up', severity: 'error', primary: 'ambiguous', fallbackProof: { ...fallbackProof, proofKey: 'stale-key' } },
  ] }), { status: 'BLOCKED', blockers: ['composer.send_follow_up'], fallbacks: [] });
});

test('returns UNCHANGED without drift and KNOWN_DRIFT when primaries resolve', () => {
  assert.equal(classifyUpdateAdmission({ drift: false, outcomes: [] }).status, 'UNCHANGED');
  assert.equal(classifyUpdateAdmission({ drift: true, outcomes: [
    { translationId: 'composer.send_follow_up', severity: 'error', primary: 'resolved' },
  ] }).status, 'KNOWN_DRIFT');
});

test('createFallbackProofKey is deterministic and changes when evidence changes', () => {
  const input = {
    bundleHashes: { 'workbench.desktop': 'abc', 'workbench.glass': 'def' },
    nlsInventoryHash: 'nls-hash',
    runtimeGovernanceHash: 'gov-hash',
    toolVersion: '1.0.0',
  };
  const first = createFallbackProofKey(input);
  const second = createFallbackProofKey(input);
  assert.equal(first, second);
  assert.notEqual(first, createFallbackProofKey({ ...input, toolVersion: '1.0.1' }));
});
