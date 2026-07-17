'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createCommandsModule } = require('../../tool/commands.js');
const { planNextLaunchRecovery } = require('../../tool/rollout-state.js');

function pendingFixture() {
  return {
    lastKnownGood: {
      buildId: 'b1',
      manifest: { buildId: 'b1' },
      recoveryCapsule: { path: 'state/generated/b1/recovery-capsule.json', buildId: 'b1' },
      snapshot: { buildId: 'b1' },
    },
    pendingActivation: {
      buildId: 'b2',
      nonce: 'pending-nonce',
      acceptedManifest: { buildId: 'b2' },
    },
  };
}

async function runStartFixture({ rolloutState, cursorProcesses }) {
  const events = [];

  const { runStart } = createCommandsModule({
    fs: {
      existsSync: () => true,
    },
    clearCursorExtensionCache: () => ({ removed: [], missing: [] }),
    childProcess: {
      spawn: () => {
        events.push('spawn');
        return { unref: () => {} };
      },
    },
    listCursorProcesses: () => cursorProcesses,
    loadRolloutState: () => rolloutState,
    acquireTransactionLock: async () => {
      events.push('lock');
      return {
        acquired: true,
        release: async () => {
          events.push('release');
        },
      };
    },
    restoreLastKnownGood: async () => {
      events.push('restore-last-known-good');
      return { restored: true };
    },
    verifyRestoredLastKnownGood: async () => {
      events.push('verify-restored');
      return { ok: true };
    },
    clearPendingActivation: async () => {
      rolloutState.pendingActivation = null;
    },
  });

  await runStart({
    paths: {
      cursorExePath: 'C:\\Cursor\\Cursor.exe',
      installDir: 'C:\\Cursor',
    },
    options: {
      rolloutState,
      cursorProcesses,
    },
  });

  return { events };
}

test('runStart clears extension cache before launching Cursor', async () => {
  const events = [];
  let cacheClearCalls = 0;

  const { runStart } = createCommandsModule({
    fs: {
      existsSync: (filePath) => {
        events.push(['exists', filePath]);
        return true;
      },
    },
    clearCursorExtensionCache: () => {
      cacheClearCalls += 1;
      events.push(['clearCache']);
      return { removed: ['CachedProfilesData'], missing: [] };
    },
    childProcess: {
      spawn: (exePath, args, options) => {
        events.push(['spawn', exePath, args, options]);
        return { unref: () => {} };
      },
    },
  });

  await runStart({
    paths: {
      cursorExePath: 'C:\\Cursor\\Cursor.exe',
      installDir: 'C:\\Cursor',
    },
  });

  assert.equal(cacheClearCalls, 1);
  assert.deepEqual(
    events.map((entry) => entry[0]),
    ['clearCache', 'exists', 'spawn']
  );
});

test('missing readiness never kills Cursor and restores before the next stopped launch', async () => {
  assert.deepEqual(planNextLaunchRecovery({ rolloutState: pendingFixture(), cursorProcesses: [{ pid: 42 }] }), {
    action: 'wait-for-stop', reason: 'pending-activation-unconfirmed',
  });
  const stopped = await runStartFixture({ rolloutState: pendingFixture(), cursorProcesses: [] });
  assert.deepEqual(stopped.events, ['lock', 'restore-last-known-good', 'verify-restored', 'release', 'spawn']);
});

test('pending activation while Cursor runs never spawns or restores', async () => {
  const events = [];
  let killed = false;

  const { runStart } = createCommandsModule({
    fs: { existsSync: () => true },
    clearCursorExtensionCache: () => ({ removed: [], missing: [] }),
    childProcess: {
      spawn: () => {
        events.push('spawn');
        return { unref: () => {} };
      },
      execSync: () => {
        killed = true;
      },
    },
    listCursorProcesses: () => [{ pid: 42 }],
    loadRolloutState: () => pendingFixture(),
    acquireTransactionLock: async () => {
      events.push('lock');
      return { acquired: true, release: async () => { events.push('release'); } };
    },
    restoreLastKnownGood: async () => {
      events.push('restore-last-known-good');
    },
  });

  const result = await runStart({
    paths: {
      cursorExePath: 'C:\\Cursor\\Cursor.exe',
      installDir: 'C:\\Cursor',
    },
  });

  assert.equal(killed, false);
  assert.deepEqual(events, []);
  assert.deepEqual(result, {
    action: 'wait-for-stop',
    reason: 'pending-activation-unconfirmed',
  });
});
