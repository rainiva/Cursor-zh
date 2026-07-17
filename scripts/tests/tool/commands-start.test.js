'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

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

async function runStartFixture({
  rolloutState,
  cursorProcesses,
  readinessMarker = null,
  toolPaths = null,
  readJsonIfExists = null,
  saveRolloutState = null,
}) {
  const events = [];
  let savedState = null;

  const { runStart } = createCommandsModule({
    toolPaths: toolPaths || undefined,
    fs: {
      existsSync: () => true,
    },
    readJsonIfExists:
      readJsonIfExists ||
      ((filePath, fallback) => {
        if (
          readinessMarker &&
          (String(filePath).endsWith('readiness-ack.json') ||
            String(filePath).includes('readiness-ack'))
        ) {
          return readinessMarker;
        }
        return fallback;
      }),
    clearCursorExtensionCache: () => ({ removed: [], missing: [] }),
    childProcess: {
      spawn: () => {
        events.push('spawn');
        return { unref: () => {} };
      },
    },
    listCursorProcesses: () => cursorProcesses,
    loadRolloutState: () => rolloutState,
    saveRolloutState: (state) => {
      savedState = state;
      Object.assign(rolloutState, state);
      if (typeof saveRolloutState === 'function') {
        saveRolloutState(state);
      }
    },
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

  return { events, savedState, rolloutState };
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

test('matching readiness-ack clears pending and starts without restore', async () => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-ack-'));
  const markerPath = path.join(stateDir, 'readiness-ack.json');
  const rolloutState = pendingFixture();
  const marker = {
    nonce: rolloutState.pendingActivation.nonce,
    buildId: rolloutState.pendingActivation.buildId,
    observedAt: 99,
  };
  fs.writeFileSync(markerPath, `${JSON.stringify(marker)}\n`, 'utf8');

  const { events, rolloutState: after } = await runStartFixture({
    rolloutState,
    cursorProcesses: [],
    toolPaths: { stateDir, rolloutStatePath: path.join(stateDir, 'rollout-state.json') },
    readJsonIfExists: (filePath, fallback) => {
      if (filePath === markerPath || String(filePath).endsWith('readiness-ack.json')) {
        return JSON.parse(fs.readFileSync(markerPath, 'utf8'));
      }
      return fallback;
    },
  });

  assert.deepEqual(events, ['spawn']);
  assert.equal(after.pendingActivation, null);
  assert.equal(after.lastAcknowledged?.nonce, 'pending-nonce');
  assert.equal(after.lastAcknowledged?.buildId, 'b2');
});

test('wrong readiness-ack nonce leaves pending and restores when stopped', async () => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-ack-bad-'));
  const markerPath = path.join(stateDir, 'readiness-ack.json');
  const rolloutState = pendingFixture();
  fs.writeFileSync(
    markerPath,
    `${JSON.stringify({
      nonce: 'wrong-nonce',
      buildId: rolloutState.pendingActivation.buildId,
      observedAt: 1,
    })}\n`,
    'utf8'
  );

  const { events, rolloutState: after } = await runStartFixture({
    rolloutState,
    cursorProcesses: [],
    toolPaths: { stateDir, rolloutStatePath: path.join(stateDir, 'rollout-state.json') },
    readJsonIfExists: (filePath, fallback) => {
      if (filePath === markerPath || String(filePath).endsWith('readiness-ack.json')) {
        return JSON.parse(fs.readFileSync(markerPath, 'utf8'));
      }
      return fallback;
    },
  });

  assert.deepEqual(events, ['lock', 'restore-last-known-good', 'verify-restored', 'release', 'spawn']);
  // clearPendingActivation still runs after successful restore; mismatched ack must not acknowledge
  assert.equal(after.pendingActivation, null);
  assert.equal(after.lastAcknowledged, undefined);
});
