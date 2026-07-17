'use strict';

function createCommitStillnessModule({
  validateCommitStillness,
  acquireTransactionLock,
  listBusyProcessesForCommit,
  inspectProcess,
  getProcessStartedAt,
  locksDir,
}) {
  async function acquireCommitStillnessLease(operation, context) {
    const installDir = context.paths.installDir;
    const preparedSnapshot = context.preparedSnapshot || [];
    const currentSnapshot = context.currentSnapshot || preparedSnapshot;

    function enumerateBusyProcesses() {
      return context.busyProcesses || listBusyProcessesForCommit(installDir);
    }

    const preLockProcesses = enumerateBusyProcesses();
    const stillness = validateCommitStillness({
      installDir,
      processes: preLockProcesses,
      preparedSnapshot,
      currentSnapshot,
    });
    if (stillness.status === 'BLOCKED') {
      const error = new Error(`Commit preflight blocked: ${stillness.reason}`);
      error.preflight = stillness;
      throw error;
    }

    const lease = await acquireTransactionLock({
      installDir,
      operationId: context.options?.operationId || `${operation}-${Date.now()}`,
      operation,
      locksDir,
      inspectProcess,
      processStartedAt: getProcessStartedAt(),
    });
    if (!lease.acquired) {
      const error = new Error(`Commit preflight blocked: ${lease.reason}`);
      error.preflight = lease;
      throw error;
    }

    const postLockProcesses = enumerateBusyProcesses();
    const postLock = validateCommitStillness({
      installDir,
      processes: postLockProcesses,
      preparedSnapshot,
      currentSnapshot,
    });
    if (postLock.status === 'BLOCKED') {
      await lease.release();
      const error = new Error(`Commit preflight blocked: ${postLock.reason}`);
      error.preflight = postLock;
      throw error;
    }

    return lease;
  }

  async function withCommitStillnessLease(operation, run, context) {
    const lease = await acquireCommitStillnessLease(operation, context);
    try {
      return await run(context);
    } finally {
      await lease.release();
    }
  }

  return {
    withCommitStillnessLease,
    acquireCommitStillnessLease,
  };
}

module.exports = {
  createCommitStillnessModule,
};
