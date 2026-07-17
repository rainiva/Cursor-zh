'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const { normalizeInstallDir } = require('../lib/compatibility/state-schema.js');

const DEFAULT_STALE_LOCK_MS = 30 * 60 * 1000;

function installLockIdentity(installDir) {
  const normalized = normalizeInstallDir(installDir);
  if (!normalized) {
    throw new Error('installDir is required for transaction lock identity');
  }
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

function resolveLockPath(installDir, locksDir) {
  if (!locksDir) {
    throw new Error('locksDir is required for transaction lock');
  }
  return path.join(locksDir, `${installLockIdentity(installDir)}.lock`);
}

function readLockPayload(lockPath, fsRef) {
  try {
    return JSON.parse(fsRef.readFileSync(lockPath, 'utf8'));
  } catch {
    return null;
  }
}

function canReclaimStaleLock(existing, { nowMs, staleLockMs, inspectProcess }) {
  if (!existing || typeof existing !== 'object') {
    return false;
  }
  const acquiredAt = Number(existing.acquiredAt);
  if (!Number.isFinite(acquiredAt) || nowMs - acquiredAt < staleLockMs) {
    return false;
  }

  const inspection = inspectProcess(existing.pid) || { exists: false };
  if (!inspection.exists) {
    return true;
  }

  const currentStartedAt = Number(inspection.startedAt);
  const lockStartedAt = Number(existing.processStartedAt);
  if (
    Number.isFinite(currentStartedAt)
    && Number.isFinite(lockStartedAt)
    && currentStartedAt !== lockStartedAt
  ) {
    return true;
  }

  return false;
}

function buildLease({
  lockPath,
  payload,
  reclaimed = false,
  fsRef,
}) {
  let released = false;
  return {
    acquired: true,
    reclaimed,
    status: 'OK',
    reason: null,
    lockPath,
    payload,
    release: async () => {
      if (released) {
        return;
      }
      released = true;
      try {
        if (fsRef.existsSync(lockPath)) {
          const current = readLockPayload(lockPath, fsRef);
          if (
            current
            && current.ownerToken === payload.ownerToken
            && Number(current.pid) === Number(payload.pid)
          ) {
            fsRef.unlinkSync(lockPath);
          }
        }
      } catch {
        // Best-effort release; caller still completed the critical section.
      }
    },
  };
}

function blockedLease(reason, evidence = {}) {
  return {
    acquired: false,
    reclaimed: false,
    status: 'BLOCKED',
    reason,
    evidence,
    lockPath: evidence.lockPath || null,
    payload: evidence.existing || null,
    release: async () => {},
  };
}

async function acquireTransactionLock({
  installDir,
  operationId,
  operation,
  inspectProcess = () => ({ exists: false }),
  now = () => Date.now(),
  locksDir,
  staleLockMs = DEFAULT_STALE_LOCK_MS,
  fs: fsRef = fs,
  pid = process.pid,
  processStartedAt = null,
  ownerToken = null,
} = {}) {
  const normalizedInstallDir = normalizeInstallDir(installDir);
  const lockPath = resolveLockPath(installDir, locksDir);
  fsRef.mkdirSync(path.dirname(lockPath), { recursive: true });

  const nowMs = Number(now());
  const startedAt =
    processStartedAt == null || !Number.isFinite(Number(processStartedAt))
      ? null
      : Number(processStartedAt);
  const token = ownerToken || crypto.randomBytes(16).toString('hex');
  const payload = {
    pid,
    processStartedAt: startedAt,
    ownerToken: token,
    installIdentity: normalizedInstallDir,
    operation: String(operation || 'unknown'),
    operationId: String(operationId || ''),
    acquiredAt: nowMs,
  };

  try {
    const fd = fsRef.openSync(lockPath, 'wx');
    try {
      fsRef.writeFileSync(fd, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    } finally {
      fsRef.closeSync(fd);
    }
    return buildLease({ lockPath, payload, reclaimed: false, fsRef });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }

  const existing = readLockPayload(lockPath, fsRef);
  if (
    canReclaimStaleLock(existing, {
      nowMs,
      staleLockMs,
      inspectProcess,
    })
  ) {
    try {
      fsRef.unlinkSync(lockPath);
    } catch {
      return blockedLease('transaction-active', { lockPath, existing });
    }

    try {
      const fd = fsRef.openSync(lockPath, 'wx');
      try {
        fsRef.writeFileSync(fd, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
      } finally {
        fsRef.closeSync(fd);
      }
      return buildLease({ lockPath, payload, reclaimed: true, fsRef });
    } catch (error) {
      if (error.code === 'EEXIST') {
        return blockedLease('transaction-active', {
          lockPath,
          existing: readLockPayload(lockPath, fsRef),
        });
      }
      throw error;
    }
  }

  return blockedLease('transaction-active', { lockPath, existing });
}

module.exports = {
  DEFAULT_STALE_LOCK_MS,
  installLockIdentity,
  resolveLockPath,
  acquireTransactionLock,
};
