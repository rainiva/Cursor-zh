'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROLLOUT_STATE_FILENAME = 'rollout-state.json';
const READINESS_SIDECAR_FILENAME = 'cursor-zh-readiness.json';

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
};
