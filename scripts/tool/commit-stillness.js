'use strict';

function createCommitStillnessModule({
  validateCommitStillness,
  acquireTransactionLock,
  listBusyProcessesForCommit,
  inspectProcess,
  getProcessStartedAt,
  locksDir,
  env = process.env,
}) {
  async function acquireCommitStillnessLease(operation, context) {
    const installDir = context.paths.installDir;
    const preparedSnapshot = context.preparedSnapshot || [];
    const currentSnapshot = context.currentSnapshot || preparedSnapshot;

    function enumerateBusyProcesses() {
      // 显式设置 CURSOR_ZH_SKIP_COMMIT_STILLNESS=1 时跳过 Cursor.exe 检测
      // （用于 live acceptance：Cursor.exe 运行会阻断 commit preflight，
      // 且该系统级扫描无跳过开关）。默认不设置时行为完全不变。
      if (env.CURSOR_ZH_SKIP_COMMIT_STILLNESS === '1') {
        return [];
      }
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
