'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const {
  acquireTransactionLock,
  DEFAULT_STALE_LOCK_MS,
} = require('../../tool/transaction-lock.js');
const {
  validateCommitStillness,
  runCommitPreflight,
} = require('../../tool/commit-preflight.js');

function makeTempRoot(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeLockFixturePayload(lockPath, payload) {
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  fs.writeFileSync(lockPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function runCommitPreflightFixture({
  processes = [],
  preparedHash = 'abc',
  currentHash = 'abc',
} = {}) {
  const managedWrites = [];
  const installDir = 'D:/Apps/Cursor';
  const preparedSnapshot = [
    { identity: 'resources/app/package.json', existed: true, contentHash: preparedHash },
  ];
  const currentSnapshot = [
    { identity: 'resources/app/package.json', existed: true, contentHash: currentHash },
  ];

  const result = await runCommitPreflight({
    installDir,
    operation: 'apply',
    operationId: 'op-fixture',
    processes,
    preparedSnapshot,
    currentSnapshot,
    locksDir: makeTempRoot('cursor-zh-preflight-'),
    inspectProcess: () => ({ exists: false }),
    now: () => Date.now(),
    onManagedWrite: (entry) => managedWrites.push(entry),
  });

  return { ...result, managedWrites };
}

async function runLockFixture({
  oldEnough = true,
  pidMissing = false,
  samePidStart = false,
} = {}) {
  const root = makeTempRoot('cursor-zh-lock-');
  const locksDir = path.join(root, 'locks');
  const installDir = 'D:/Apps/Cursor';
  const nowMs = 1_700_000_000_000;
  const staleMs = DEFAULT_STALE_LOCK_MS;
  const acquiredAt = oldEnough ? nowMs - staleMs - 1 : nowMs - Math.floor(staleMs / 2);
  const ownerPid = 4242;
  const ownerStartedAt = 1_600_000_000_000;

  const { lockPath } = await acquireTransactionLock({
    installDir,
    operationId: 'seed',
    operation: 'apply',
    locksDir,
    inspectProcess: () => ({ exists: false }),
    now: () => acquiredAt - 1,
  }).then(async (lease) => {
    const pathForLock = lease.lockPath;
    await lease.release();
    return { lockPath: pathForLock };
  }).catch(() => {
    const normalized = path.resolve(installDir).replace(/\\/g, '/').toLowerCase();
    const identity = crypto.createHash('sha256').update(normalized).digest('hex');
    return { lockPath: path.join(locksDir, `${identity}.lock`) };
  });

  writeLockFixturePayload(lockPath, {
    pid: ownerPid,
    processStartedAt: ownerStartedAt,
    ownerToken: 'stale-owner',
    installIdentity: path.resolve(installDir).replace(/\\/g, '/').toLowerCase(),
    operation: 'apply',
    operationId: 'stale-op',
    acquiredAt,
  });

  const inspectProcess = (pid) => {
    if (Number(pid) !== ownerPid) {
      return { exists: false };
    }
    if (pidMissing) {
      return { exists: false };
    }
    if (samePidStart) {
      return { exists: true, startedAt: ownerStartedAt };
    }
    return { exists: true, startedAt: ownerStartedAt + 999 };
  };

  const result = await acquireTransactionLock({
    installDir,
    operationId: 'reclaim-op',
    operation: 'ensure',
    locksDir,
    inspectProcess,
    now: () => nowMs,
    staleLockMs: staleMs,
  });

  return {
    reclaimed: Boolean(result.acquired && result.reclaimed),
    reason: result.reason || null,
    status: result.status,
  };
}

async function acquireFixtureLock({ operation, installDir }) {
  const locksDir = acquireFixtureLock.sharedLocksDir
    || (acquireFixtureLock.sharedLocksDir = makeTempRoot('cursor-zh-shared-lock-'));
  return acquireTransactionLock({
    installDir,
    operationId: `op-${operation}`,
    operation,
    locksDir,
    inspectProcess: () => ({ exists: false }),
    now: () => Date.now(),
  });
}

test('blocks before managed writes when Cursor is running or prepared targets drift', async () => {
  const busy = await runCommitPreflightFixture({ processes: [{ name: 'Cursor.exe', pid: 42 }] });
  assert.equal(busy.status, 'BLOCKED');
  assert.equal(busy.reason, 'busy');
  assert.deepEqual(busy.managedWrites, []);

  const drift = await runCommitPreflightFixture({ preparedHash: 'old', currentHash: 'new' });
  assert.equal(drift.status, 'BLOCKED');
  assert.equal(drift.reason, 'concurrent-drift');
  assert.deepEqual(drift.managedWrites, []);
});

test('reclaims a stale lock only after age and PID start-time proof', async () => {
  assert.equal((await runLockFixture({ oldEnough: false, pidMissing: true })).reclaimed, false);
  assert.equal((await runLockFixture({ oldEnough: true, samePidStart: true })).reclaimed, false);
  assert.equal((await runLockFixture({ oldEnough: true, pidMissing: true })).reclaimed, true);
});

test('apply ensure and uninstall contend on one per-install lock', async () => {
  acquireFixtureLock.sharedLocksDir = makeTempRoot('cursor-zh-contend-');
  const first = await acquireFixtureLock({ operation: 'apply', installDir: 'D:/Apps/Cursor' });
  assert.equal(first.acquired, true);
  const second = await acquireFixtureLock({ operation: 'uninstall', installDir: 'd:\\apps\\cursor' });
  assert.equal(second.acquired, false);
  assert.equal(second.reason, 'transaction-active');
  await first.release();
});

test('acquireTransactionLock stores null processStartedAt instead of Date.now fallback', async () => {
  const locksDir = makeTempRoot('cursor-zh-null-start-');
  const lease = await acquireTransactionLock({
    installDir: 'D:/Apps/Cursor',
    operationId: 'null-start',
    operation: 'apply',
    locksDir,
    inspectProcess: () => ({ exists: false }),
    now: () => 1_700_000_000_000,
    processStartedAt: null,
  });
  assert.equal(lease.acquired, true);
  assert.equal(lease.payload.processStartedAt, null);
  await lease.release();
});

test('validateCommitStillness fails closed when Cursor.exe path is unavailable', () => {
  const result = validateCommitStillness({
    installDir: 'D:/Apps/Cursor',
    processes: [{ name: 'Cursor.exe', pid: 7, pathUnavailable: true }],
    preparedSnapshot: [],
    currentSnapshot: [],
  });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.reason, 'busy');
});

test('validateCommitStillness detects install-scoped updater processes', () => {
  const result = validateCommitStillness({
    installDir: 'D:/Apps/Cursor',
    processes: [
      {
        name: 'CursorUpdate.exe',
        pid: 9,
        executablePath: 'D:/Apps/Cursor/tools/CursorUpdate.exe',
      },
    ],
    preparedSnapshot: [{ identity: 'a', existed: true, contentHash: '1' }],
    currentSnapshot: [{ identity: 'a', existed: true, contentHash: '1' }],
  });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.reason, 'busy');
});
