'use strict';

const crypto = require('node:crypto');

function isCurrentFallbackProof(proof, currentProofKey) {
  const contracts = proof?.contracts || {};
  return proof?.testPassed === true && proof?.shardCompiled === true
    && ['scope', 'lifecycle', 'placeholders', 'privacy'].every((name) => contracts[name] === true)
    && proof?.capabilityEvidence?.status === 'matched'
    && proof?.capabilityEvidence?.matchCount === 1
    && proof?.proofKey === currentProofKey;
}

function classifyUpdateAdmission({ drift, outcomes, currentProofKey }) {
  if (!drift) return { status: 'UNCHANGED', blockers: [], fallbacks: [] };
  const blockers = outcomes.filter((item) =>
    item.severity === 'error' && item.primary !== 'resolved'
      && !isCurrentFallbackProof(item.fallbackProof, currentProofKey)
  ).map((item) => item.translationId);
  if (blockers.length > 0) return { status: 'BLOCKED', blockers, fallbacks: [] };
  const fallbacks = outcomes.filter((item) => item.primary !== 'resolved'
    && isCurrentFallbackProof(item.fallbackProof, currentProofKey))
    .map((item) => item.translationId);
  return { status: fallbacks.length > 0 ? 'DEGRADED' : 'KNOWN_DRIFT', blockers: [], fallbacks };
}

function createFallbackProofKey({
  bundleHashes,
  nlsInventoryHash,
  runtimeGovernanceHash,
  toolVersion,
}) {
  const normalizedBundles = Object.entries(bundleHashes || {})
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([capabilityId, hash]) => `${capabilityId}=${hash}`)
    .join('\n');
  const payload = [
    normalizedBundles,
    String(nlsInventoryHash || ''),
    String(runtimeGovernanceHash || ''),
    String(toolVersion || ''),
  ].join('\0');
  return crypto.createHash('sha256').update(payload).digest('hex');
}

module.exports = {
  classifyUpdateAdmission,
  createFallbackProofKey,
  isCurrentFallbackProof,
};
