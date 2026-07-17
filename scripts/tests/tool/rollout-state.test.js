'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  recordPendingActivation,
  planNextLaunchRecovery,
  acknowledgeReadiness,
} = require('../../tool/rollout-state.js');
const { createBootstrapHarness } = require('../../tool/builder/bootstrap.js');

function createAcceptedFixture({ buildId, previousBuildId }) {
  return {
    acceptedManifest: { buildId },
    recoveryCapsule: {
      path: `state/generated/${buildId}/recovery-capsule.json`,
      buildId,
    },
    snapshot: { buildId, installDir: 'D:/Apps/Cursor' },
    previousAccepted: {
      buildId: previousBuildId,
      manifest: { buildId: previousBuildId },
      recoveryCapsule: {
        path: `state/generated/${previousBuildId}/recovery-capsule.json`,
        buildId: previousBuildId,
      },
      snapshot: { buildId: previousBuildId, installDir: 'D:/Apps/Cursor' },
    },
  };
}

test('accepted canary records lastKnownGood and a one-use activation nonce', () => {
  const state = recordPendingActivation(createAcceptedFixture({ buildId: 'b2', previousBuildId: 'b1' }));
  assert.equal(state.lastKnownGood.buildId, 'b1');
  assert.equal(state.pendingActivation.buildId, 'b2');
  assert.ok(state.pendingActivation.nonce);
});

test('readiness requires matching nonce, finished workbench load, and nonempty DOM', async () => {
  const bootstrap = createBootstrapHarness({ nonce: 'n1' });
  await bootstrap.didFinishLoad({ nonce: 'wrong', bodyChildCount: 1 });
  await bootstrap.didFinishLoad({ nonce: 'n1', bodyChildCount: 0 });
  assert.equal(bootstrap.acknowledgements.length, 0);
  await bootstrap.didFinishLoad({ nonce: 'n1', bodyChildCount: 1 });
  assert.equal(bootstrap.acknowledgements.length, 1);
});

test('acknowledgeReadiness accepts only the exact pending nonce and build ID', () => {
  const pending = recordPendingActivation(createAcceptedFixture({ buildId: 'b2', previousBuildId: 'b1' }));
  const wrongNonce = acknowledgeReadiness(pending, {
    nonce: 'other',
    buildId: 'b2',
    observedAt: 1,
  });
  assert.ok(wrongNonce.pendingActivation);
  const wrongBuild = acknowledgeReadiness(pending, {
    nonce: pending.pendingActivation.nonce,
    buildId: 'b9',
    observedAt: 1,
  });
  assert.ok(wrongBuild.pendingActivation);
  const ok = acknowledgeReadiness(pending, {
    nonce: pending.pendingActivation.nonce,
    buildId: 'b2',
    observedAt: 42,
  });
  assert.equal(ok.pendingActivation, null);
  assert.equal(ok.lastAcknowledged.nonce, pending.pendingActivation.nonce);
  assert.equal(ok.lastAcknowledged.buildId, 'b2');
});

test('planNextLaunchRecovery waits while Cursor is running', () => {
  assert.deepEqual(
    planNextLaunchRecovery({
      rolloutState: {
        lastKnownGood: { buildId: 'b1' },
        pendingActivation: { buildId: 'b2', nonce: 'n1' },
      },
      cursorProcesses: [{ pid: 42 }],
    }),
    {
      action: 'wait-for-stop',
      reason: 'pending-activation-unconfirmed',
    }
  );
});
