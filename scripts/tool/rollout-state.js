'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const { LEGACY_APPLY_EXPIRY_VERSION } = require('./prepared-build.js');

const ROLLOUT_STATE_FILENAME = 'rollout-state.json';
const READINESS_SIDECAR_FILENAME = 'cursor-zh-readiness.json';
const ROLLOUT_EVIDENCE_FILENAME = 'rollout-evidence.json';
const DEFAULT_ROLLOUT_MODE = 'shadow';
const ROLLOUT_MODES = Object.freeze(['shadow', 'canary', 'enforced', 'legacy']);
const LEGACY_WRITER_EXPIRES_AT = LEGACY_APPLY_EXPIRY_VERSION;
const REQUIRED_PROMOTION_GATES = Object.freeze([
  'deterministic',
  'privacy',
  'recovery',
  'liveOperation',
  'performance',
]);

function normalizeInstallPath(value) {
  if (value == null || value === '') {
    return null;
  }
  return path.resolve(String(value)).replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
}

function compareToolVersions(left, right) {
  const parse = (version) =>
    String(version || '0')
      .split(/[.+-]/)
      .filter(Boolean)
      .map((part) => {
        const n = Number(part);
        return Number.isFinite(n) ? n : 0;
      });
  const a = parse(left);
  const b = parse(right);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const delta = (a[i] || 0) - (b[i] || 0);
    if (delta < 0) {
      return -1;
    }
    if (delta > 0) {
      return 1;
    }
  }
  return 0;
}

function resolveRolloutMode(options = {}, governance = null) {
  if (options.legacyApply) {
    return 'legacy';
  }
  if (options.safetyNetCanary) {
    return 'canary';
  }
  if (options.rolloutMode && ROLLOUT_MODES.includes(options.rolloutMode)) {
    return options.rolloutMode;
  }
  return governance?.rollout?.defaultMode || DEFAULT_ROLLOUT_MODE;
}

function assertCanaryInstallAllowed({
  safetyNetCanary,
  installDir,
  canaryInstallDir,
  dailyInstallDir,
} = {}) {
  if (!safetyNetCanary) {
    throw new Error('canary requires --safety-net-canary flag');
  }
  if (!canaryInstallDir) {
    throw new Error('canary requires CURSOR_ZH_CANARY_INSTALL_DIR');
  }
  const normalizedInstall = normalizeInstallPath(installDir);
  const normalizedCanary = normalizeInstallPath(canaryInstallDir);
  const normalizedDaily = normalizeInstallPath(dailyInstallDir);
  if (!normalizedInstall || normalizedInstall !== normalizedCanary) {
    throw new Error('canary install path mismatch with CURSOR_ZH_CANARY_INSTALL_DIR');
  }
  if (normalizedDaily && normalizedInstall === normalizedDaily) {
    throw new Error('canary rejects the detected daily install');
  }
  return { installDir: normalizedInstall };
}

function assertLegacyApplyAllowed({
  packageVersion,
  expiresAt = LEGACY_WRITER_EXPIRES_AT,
} = {}) {
  if (compareToolVersions(packageVersion, expiresAt) >= 0) {
    throw new Error(
      `legacy writer expired at legacyWriterExpiresAt=${expiresAt} (package ${packageVersion})`
    );
  }
  return {
    warning: `maintenance-only legacy apply enabled until ${expiresAt}; prefer shadow/canary safety-net path`,
    expiresAt,
  };
}

function validateRolloutPromotion(evidence) {
  const issues = [];
  if (!evidence || typeof evidence !== 'object') {
    return { promotable: false, issues: ['missing rollout evidence'] };
  }

  const gates = evidence.gates || {};
  for (const gateName of REQUIRED_PROMOTION_GATES) {
    const gate = gates[gateName];
    if (!gate || gate.status !== 'pass') {
      issues.push(`gate ${gateName} is not pass`);
    }
  }

  const builds = Array.isArray(evidence.builds) ? evidence.builds : [];
  const distinct = new Set(builds.map((entry) => entry?.buildId).filter(Boolean));
  if (distinct.size < 2) {
    issues.push('requires two distinct Cursor builds');
  }
  if (!builds.some((entry) => entry?.upstreamUpdate === true)) {
    issues.push('requires at least one upstreamUpdate: true build');
  }

  if (evidence.liveOperation?.status !== 'pass') {
    issues.push('liveOperation did not pass');
  }
  if (!evidence.qualifiedPerformanceEvidenceId) {
    issues.push('missing qualifiedPerformanceEvidenceId');
  }

  const expiresAt = evidence.legacyWriterExpiresAt || LEGACY_WRITER_EXPIRES_AT;
  const packageVersion = evidence.packageVersion;
  if (
    evidence.legacyWriterRemoved !== true &&
    packageVersion != null &&
    compareToolVersions(packageVersion, expiresAt) >= 0
  ) {
    issues.push('legacy writer dependency expired');
  }

  return { promotable: issues.length === 0, issues };
}

function buildRolloutEvidence({
  rolloutMode = DEFAULT_ROLLOUT_MODE,
  buildId = null,
  upstreamUpdate = false,
  liveOperation = null,
  newEngineManagedWrites = 0,
  qualifiedPerformanceEvidenceId = null,
  gates = null,
  builds = null,
  packageVersion = null,
  legacyWriterExpiresAt = LEGACY_WRITER_EXPIRES_AT,
  legacyWriterRemoved = false,
  priorEvidence = null,
} = {}) {
  const priorBuilds = Array.isArray(priorEvidence?.builds) ? priorEvidence.builds : [];
  const nextBuilds =
    builds ||
    (buildId
      ? [
          ...priorBuilds.filter((entry) => entry?.buildId !== buildId),
          { buildId, upstreamUpdate: Boolean(upstreamUpdate) },
        ]
      : priorBuilds);

  return {
    rolloutMode,
    legacyWriterExpiresAt,
    legacyWriterRemoved: Boolean(legacyWriterRemoved),
    packageVersion: packageVersion || null,
    gates: gates || {
      deterministic: { status: 'pass' },
      privacy: { status: 'pass' },
      recovery: { status: 'pass' },
      liveOperation: { status: liveOperation?.status === 'pass' ? 'pass' : 'fail' },
      performance: {
        status: qualifiedPerformanceEvidenceId ? 'pass' : 'fail',
      },
    },
    builds: nextBuilds,
    liveOperation: liveOperation || { status: 'fail' },
    qualifiedPerformanceEvidenceId: qualifiedPerformanceEvidenceId || null,
    newEngineManagedWrites: Number(newEngineManagedWrites) || 0,
    recordedAt: new Date().toISOString(),
  };
}

function resolveRolloutEvidencePath(toolPaths) {
  if (toolPaths?.rolloutEvidencePath) {
    return toolPaths.rolloutEvidencePath;
  }
  if (toolPaths?.harvestReportsDir) {
    return path.join(toolPaths.harvestReportsDir, ROLLOUT_EVIDENCE_FILENAME);
  }
  if (toolPaths?.stateDir) {
    return path.join(toolPaths.stateDir, 'reports', ROLLOUT_EVIDENCE_FILENAME);
  }
  return null;
}

function loadRolloutEvidence(toolPaths, { fs: fsRef = fs, readJsonIfExists } = {}) {
  const evidencePath = resolveRolloutEvidencePath(toolPaths);
  if (!evidencePath) {
    return null;
  }
  if (typeof readJsonIfExists === 'function') {
    return readJsonIfExists(evidencePath, null);
  }
  try {
    if (!fsRef.existsSync(evidencePath)) {
      return null;
    }
    return JSON.parse(fsRef.readFileSync(evidencePath, 'utf8'));
  } catch {
    return null;
  }
}

function persistRolloutEvidence(toolPaths, evidence, { fs: fsRef = fs, writeJson } = {}) {
  const evidencePath = resolveRolloutEvidencePath(toolPaths);
  if (!evidencePath) {
    throw new Error('persistRolloutEvidence requires harvestReportsDir, stateDir, or rolloutEvidencePath');
  }
  fsRef.mkdirSync(path.dirname(evidencePath), { recursive: true });
  if (typeof writeJson === 'function') {
    writeJson(evidencePath, evidence);
  } else {
    const tempPath = `${evidencePath}.${process.pid}.tmp`;
    fsRef.writeFileSync(tempPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
    fsRef.renameSync(tempPath, evidencePath);
  }
  return evidencePath;
}

function createActivationNonce() {
  return crypto.randomBytes(16).toString('hex');
}

function recordPendingActivation({
  acceptedManifest,
  recoveryCapsule,
  snapshot,
  nonce,
  previousAccepted,
} = {}) {
  if (!acceptedManifest || acceptedManifest.buildId == null) {
    throw new Error('recordPendingActivation requires acceptedManifest.buildId');
  }
  if (!previousAccepted || previousAccepted.buildId == null) {
    throw new Error('recordPendingActivation requires previousAccepted.buildId');
  }

  const activationNonce = nonce || createActivationNonce();
  return {
    lastKnownGood: {
      buildId: previousAccepted.buildId,
      manifest: previousAccepted.manifest || { buildId: previousAccepted.buildId },
      recoveryCapsule: previousAccepted.recoveryCapsule || null,
      snapshot: previousAccepted.snapshot || null,
    },
    pendingActivation: {
      buildId: acceptedManifest.buildId,
      nonce: activationNonce,
      acceptedManifest,
      recoveryCapsule: recoveryCapsule || null,
      snapshot: snapshot || null,
    },
    lastAcknowledged: null,
  };
}

function acknowledgeReadiness(rolloutState, { nonce, buildId, observedAt } = {}) {
  const pending = rolloutState?.pendingActivation;
  if (!pending) {
    return rolloutState;
  }
  if (pending.nonce !== nonce || pending.buildId !== buildId) {
    return rolloutState;
  }

  return {
    ...rolloutState,
    pendingActivation: null,
    lastAcknowledged: {
      nonce,
      buildId,
      observedAt: observedAt == null ? Date.now() : observedAt,
    },
  };
}

function planNextLaunchRecovery({ rolloutState, cursorProcesses } = {}) {
  if (!rolloutState?.pendingActivation) {
    return { action: 'proceed', reason: 'no-pending-activation' };
  }

  if (Array.isArray(cursorProcesses) && cursorProcesses.length > 0) {
    return {
      action: 'wait-for-stop',
      reason: 'pending-activation-unconfirmed',
    };
  }

  return {
    action: 'restore-last-known-good',
    reason: 'pending-activation-unconfirmed',
  };
}

function resolveRolloutStatePath(toolPaths) {
  if (toolPaths?.rolloutStatePath) {
    return toolPaths.rolloutStatePath;
  }
  if (toolPaths?.stateDir) {
    return path.join(toolPaths.stateDir, ROLLOUT_STATE_FILENAME);
  }
  return null;
}

function loadRolloutState(toolPaths, { fs: fsRef = fs, readJsonIfExists } = {}) {
  const statePath = resolveRolloutStatePath(toolPaths);
  if (!statePath) {
    return null;
  }
  if (typeof readJsonIfExists === 'function') {
    return readJsonIfExists(statePath, null);
  }
  try {
    if (!fsRef.existsSync(statePath)) {
      return null;
    }
    return JSON.parse(fsRef.readFileSync(statePath, 'utf8'));
  } catch {
    return null;
  }
}

function saveRolloutState(toolPaths, state, { fs: fsRef = fs, writeJson } = {}) {
  const statePath = resolveRolloutStatePath(toolPaths);
  if (!statePath) {
    throw new Error('saveRolloutState requires toolPaths.rolloutStatePath or stateDir');
  }
  fsRef.mkdirSync(path.dirname(statePath), { recursive: true });
  if (typeof writeJson === 'function') {
    writeJson(statePath, state);
    return statePath;
  }
  const tempPath = `${statePath}.${process.pid}.tmp`;
  fsRef.writeFileSync(tempPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  fsRef.renameSync(tempPath, statePath);
  return statePath;
}

function clearPendingActivation(toolPaths, deps = {}) {
  const current = loadRolloutState(toolPaths, deps);
  if (!current?.pendingActivation) {
    return current;
  }
  const next = {
    ...current,
    pendingActivation: null,
  };
  saveRolloutState(toolPaths, next, deps);
  return next;
}

function buildReadinessMetadata(rolloutState, { markerPath } = {}) {
  const pending = rolloutState?.pendingActivation;
  if (!pending) {
    return null;
  }
  return {
    markerPath: markerPath || null,
    nonce: pending.nonce,
    buildId: pending.buildId,
  };
}

function writeReadinessSidecar(resourcesAppDir, readiness, { fs: fsRef = fs, writeJson } = {}) {
  if (!resourcesAppDir || !readiness?.nonce) {
    return null;
  }
  const sidecarPath = path.join(resourcesAppDir, READINESS_SIDECAR_FILENAME);
  fsRef.mkdirSync(resourcesAppDir, { recursive: true });
  if (typeof writeJson === 'function') {
    writeJson(sidecarPath, readiness);
  } else {
    fsRef.writeFileSync(sidecarPath, `${JSON.stringify(readiness, null, 2)}\n`, 'utf8');
  }
  return sidecarPath;
}

function removeReadinessSidecar(resourcesAppDir, { fs: fsRef = fs } = {}) {
  if (!resourcesAppDir) {
    return;
  }
  const sidecarPath = path.join(resourcesAppDir, READINESS_SIDECAR_FILENAME);
  try {
    if (fsRef.existsSync(sidecarPath)) {
      fsRef.unlinkSync(sidecarPath);
    }
  } catch {
    // best-effort
  }
}

module.exports = {
  ROLLOUT_STATE_FILENAME,
  READINESS_SIDECAR_FILENAME,
  ROLLOUT_EVIDENCE_FILENAME,
  DEFAULT_ROLLOUT_MODE,
  ROLLOUT_MODES,
  LEGACY_WRITER_EXPIRES_AT,
  REQUIRED_PROMOTION_GATES,
  createActivationNonce,
  recordPendingActivation,
  acknowledgeReadiness,
  planNextLaunchRecovery,
  resolveRolloutStatePath,
  loadRolloutState,
  saveRolloutState,
  clearPendingActivation,
  buildReadinessMetadata,
  writeReadinessSidecar,
  removeReadinessSidecar,
  normalizeInstallPath,
  compareToolVersions,
  resolveRolloutMode,
  assertCanaryInstallAllowed,
  assertLegacyApplyAllowed,
  validateRolloutPromotion,
  buildRolloutEvidence,
  resolveRolloutEvidencePath,
  loadRolloutEvidence,
  persistRolloutEvidence,
};
