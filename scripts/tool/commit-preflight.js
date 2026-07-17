'use strict';

const path = require('node:path');

const { normalizeInstallDir } = require('../lib/compatibility/state-schema.js');
const { acquireTransactionLock } = require('./transaction-lock.js');

function normalizeProcessName(name) {
  return String(name || '').toLowerCase();
}

function pathBelongsToInstall(candidatePath, installDir) {
  if (!candidatePath || !installDir) {
    return false;
  }
  const normalizedCandidate = path.resolve(String(candidatePath)).replace(/\\/g, '/').toLowerCase();
  const normalizedInstall = normalizeInstallDir(installDir);
  if (!normalizedInstall) {
    return false;
  }
  return (
    normalizedCandidate === normalizedInstall
    || normalizedCandidate.startsWith(`${normalizedInstall}/`)
  );
}

function isBusyProcess(processInfo, installDir) {
  const name = normalizeProcessName(processInfo?.name);
  if (!name) {
    return false;
  }

  if (name === 'cursor.exe') {
    // Fail closed when path evidence is unavailable.
    if (processInfo.pathUnavailable || (!processInfo.executablePath && !processInfo.commandLine)) {
      return true;
    }
    return (
      pathBelongsToInstall(processInfo.executablePath, installDir)
      || pathBelongsToInstall(processInfo.commandLine, installDir)
    );
  }

  const looksLikeUpdater =
    name.includes('update')
    || name.includes('squirrel')
    || /cursor.*update/i.test(String(processInfo?.name || ''));
  if (!looksLikeUpdater) {
    return false;
  }

  return (
    pathBelongsToInstall(processInfo.executablePath, installDir)
    || pathBelongsToInstall(processInfo.commandLine, installDir)
  );
}

function snapshotKey(entry) {
  return String(entry?.identity || '').replace(/\\/g, '/');
}

function snapshotsMatch(preparedSnapshot = [], currentSnapshot = []) {
  const prepared = [...preparedSnapshot].sort((a, b) => snapshotKey(a).localeCompare(snapshotKey(b)));
  const current = [...currentSnapshot].sort((a, b) => snapshotKey(a).localeCompare(snapshotKey(b)));
  if (prepared.length !== current.length) {
    return false;
  }
  for (let i = 0; i < prepared.length; i += 1) {
    const left = prepared[i];
    const right = current[i];
    if (snapshotKey(left) !== snapshotKey(right)) {
      return false;
    }
    if (Boolean(left.existed) !== Boolean(right.existed)) {
      return false;
    }
    if ((left.contentHash || null) !== (right.contentHash || null)) {
      return false;
    }
  }
  return true;
}

function validateCommitStillness({
  installDir,
  processes = [],
  preparedSnapshot = [],
  currentSnapshot = [],
} = {}) {
  const busyProcesses = (processes || []).filter((entry) => isBusyProcess(entry, installDir));
  if (busyProcesses.length > 0) {
    return {
      status: 'BLOCKED',
      reason: 'busy',
      evidence: { processes: busyProcesses },
    };
  }

  if (!snapshotsMatch(preparedSnapshot, currentSnapshot)) {
    return {
      status: 'BLOCKED',
      reason: 'concurrent-drift',
      evidence: {
        preparedSnapshot,
        currentSnapshot,
      },
    };
  }

  return {
    status: 'OK',
    reason: null,
    evidence: {},
  };
}

async function runCommitPreflight({
  installDir,
  operation,
  operationId,
  processes = [],
  preparedSnapshot = [],
  currentSnapshot = [],
  locksDir,
  inspectProcess,
  now,
  staleLockMs,
  onManagedWrite,
  fs,
} = {}) {
  const managedWrites = [];
  const trackWrite = (entry) => {
    managedWrites.push(entry);
    if (typeof onManagedWrite === 'function') {
      onManagedWrite(entry);
    }
  };

  const stillness = validateCommitStillness({
    installDir,
    processes,
    preparedSnapshot,
    currentSnapshot,
  });
  if (stillness.status === 'BLOCKED') {
    return {
      status: 'BLOCKED',
      reason: stillness.reason,
      evidence: stillness.evidence,
      managedWrites,
      lease: null,
    };
  }

  const lease = await acquireTransactionLock({
    installDir,
    operationId,
    operation,
    locksDir,
    inspectProcess,
    now,
    staleLockMs,
    fs,
  });

  if (!lease.acquired) {
    return {
      status: 'BLOCKED',
      reason: lease.reason || 'transaction-active',
      evidence: lease.evidence || {},
      managedWrites,
      lease,
    };
  }

  // Revalidate snapshot after lock acquisition (exact recheck before writers).
  const postLockStillness = validateCommitStillness({
    installDir,
    processes,
    preparedSnapshot,
    currentSnapshot,
  });
  if (postLockStillness.status === 'BLOCKED') {
    await lease.release();
    return {
      status: 'BLOCKED',
      reason: postLockStillness.reason,
      evidence: postLockStillness.evidence,
      managedWrites,
      lease: null,
    };
  }

  return {
    status: 'OK',
    reason: null,
    evidence: {},
    managedWrites,
    lease,
    // Expose for tests that assert zero writes on blocked paths.
    trackWrite,
  };
}

module.exports = {
  validateCommitStillness,
  runCommitPreflight,
  snapshotsMatch,
  isBusyProcess,
};
