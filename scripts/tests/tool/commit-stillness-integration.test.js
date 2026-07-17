'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createCommitStillnessModule } = require('../../tool/commit-stillness.js');
const { acquireTransactionLock } = require('../../tool/transaction-lock.js');
const { validateCommitStillness } = require('../../tool/commit-preflight.js');

function makeTempLocksDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-stillness-'));
}

function makeModule(overrides = {}) {
  const locksDir = overrides.locksDir || makeTempLocksDir();
  return createCommitStillnessModule({
    validateCommitStillness,
    acquireTransactionLock,
    listBusyProcessesForCommit: overrides.listBusyProcessesForCommit
      || (() => []),
    inspectProcess: overrides.inspectProcess || (() => ({ exists: false })),
    getProcessStartedAt: overrides.getProcessStartedAt || (() => 1_700_000_000_000),
    locksDir,
    ...overrides,
  });
}

test('withCommitStillnessLease blocks apply when tasklist warning implies unknown stillness', async () => {
  const mod = makeModule({
    listBusyProcessesForCommit: () => ([{ name: 'Cursor.exe', pathUnavailable: true }]),
  });

  await assert.rejects(
    () => mod.withCommitStillnessLease('apply', async () => ({ ok: true }), {
      paths: { installDir: 'D:/Apps/Cursor' },
      preparedSnapshot: [],
      currentSnapshot: [],
    }),
    (error) => {
      assert.match(error.message, /Commit preflight blocked: busy/);
      assert.equal(error.preflight?.reason, 'busy');
      return true;
    },
  );
});

test('withCommitStillnessLease blocks when transaction lock is already held', async () => {
  const locksDir = makeTempLocksDir();
  const installDir = 'D:/Apps/Cursor';
  const first = await acquireTransactionLock({
    installDir,
    operationId: 'first',
    operation: 'apply',
    locksDir,
    inspectProcess: () => ({ exists: false }),
  });
  assert.equal(first.acquired, true);

  const mod = makeModule({ locksDir });
  await assert.rejects(
    () => mod.withCommitStillnessLease('ensure', async () => ({ ok: true }), {
      paths: { installDir },
      preparedSnapshot: [],
      currentSnapshot: [],
    }),
    (error) => {
      assert.match(error.message, /transaction-active/);
      return true;
    },
  );

  await first.release();
});

test('withCommitStillnessLease re-enumerates busy processes after lock acquisition', async () => {
  let calls = 0;
  const mod = makeModule({
    listBusyProcessesForCommit: () => {
      calls += 1;
      if (calls === 1) {
        return [];
      }
      return [{ name: 'Cursor.exe', pathUnavailable: true }];
    },
  });

  await assert.rejects(
    () => mod.withCommitStillnessLease('apply', async () => ({ ok: true }), {
      paths: { installDir: 'D:/Apps/Cursor' },
      preparedSnapshot: [{ identity: 'a', existed: true, contentHash: '1' }],
      currentSnapshot: [{ identity: 'a', existed: true, contentHash: '1' }],
    }),
    (error) => {
      assert.match(error.message, /Commit preflight blocked: busy/);
      assert.ok(calls >= 2, 'should re-enumerate before post-lock stillness');
      return true;
    },
  );
});

test('withCommitStillnessLease passes inspectProcess and processStartedAt to acquireTransactionLock', async () => {
  const seen = { inspectPid: null, startedAt: null };
  const mod = makeModule({
    inspectProcess: (pid) => {
      seen.inspectPid = pid;
      return { exists: true, startedAt: 1_600_000_000_000 };
    },
    getProcessStartedAt: () => 1_700_000_111_000,
    acquireTransactionLock: async (options) => {
      seen.startedAt = options.processStartedAt;
      options.inspectProcess(4242);
      return acquireTransactionLock(options);
    },
  });

  await mod.withCommitStillnessLease('apply', async () => ({ ok: true }), {
    paths: { installDir: 'D:/Apps/Cursor' },
    preparedSnapshot: [],
    currentSnapshot: [],
  });

  assert.equal(seen.inspectPid, 4242);
  assert.equal(seen.startedAt, 1_700_000_111_000);
});
