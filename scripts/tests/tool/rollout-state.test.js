'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  recordPendingActivation,
  planNextLaunchRecovery,
  acknowledgeReadiness,
  validateRolloutPromotion,
  assertCanaryInstallAllowed,
  assertLegacyApplyAllowed,
  resolveRolloutMode,
  DEFAULT_ROLLOUT_MODE,
  LEGACY_WRITER_EXPIRES_AT,
  buildRolloutEvidence,
  persistRolloutEvidence,
  ROLLOUT_EVIDENCE_FILENAME,
} = require('../../tool/rollout-state.js');
const { createBootstrapHarness } = require('../../tool/builder/bootstrap.js');
const { createCommandsModule } = require('../../tool/commands.js');
const { createPreparedBuild, LEGACY_APPLY_EXPIRY_VERSION } = require('../../tool/prepared-build.js');

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

function createPromotableEvidence(overrides = {}) {
  return {
    rolloutMode: 'canary',
    legacyWriterExpiresAt: LEGACY_WRITER_EXPIRES_AT,
    legacyWriterRemoved: false,
    gates: {
      deterministic: { status: 'pass' },
      privacy: { status: 'pass' },
      recovery: { status: 'pass' },
      liveOperation: { status: 'pass' },
      performance: { status: 'pass' },
    },
    builds: [
      { buildId: 'cursor-3.10.16', upstreamUpdate: false },
      { buildId: 'cursor-3.10.17', upstreamUpdate: true },
    ],
    liveOperation: { status: 'pass', command: 'ensure' },
    qualifiedPerformanceEvidenceId: 'perf-baseline-1',
    ...overrides,
  };
}

test('accepted canary records lastKnownGood and a one-use activation nonce', () => {
  const state = recordPendingActivation(createAcceptedFixture({ buildId: 'b2', previousBuildId: 'b1' }));
  assert.equal(state.lastKnownGood.buildId, 'b1');
  assert.equal(state.pendingActivation.buildId, 'b2');
  assert.ok(state.pendingActivation.nonce);
});

test('readiness requires matching nonce, finished workbench load, and nonempty DOM', async () => {
  const bootstrap = createBootstrapHarness({ nonce: 'n1', buildId: 'b2' });
  await bootstrap.didFinishLoad({ nonce: 'wrong', buildId: 'b2', bodyChildCount: 1 });
  await bootstrap.didFinishLoad({ nonce: 'n1', buildId: 'b9', bodyChildCount: 1 });
  await bootstrap.didFinishLoad({ nonce: 'n1', buildId: 'b2', bodyChildCount: 0 });
  assert.equal(bootstrap.acknowledgements.length, 0);
  await bootstrap.didFinishLoad({ nonce: 'n1', buildId: 'b2', bodyChildCount: 1 });
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

test('default rollout mode is shadow for the transition release', () => {
  assert.equal(DEFAULT_ROLLOUT_MODE, 'shadow');
  assert.equal(resolveRolloutMode({}), 'shadow');
  assert.equal(resolveRolloutMode({ safetyNetCanary: true }), 'canary');
  assert.equal(resolveRolloutMode({ rolloutMode: 'enforced' }), 'enforced');
  assert.equal(resolveRolloutMode({ legacyApply: true }), 'legacy');
});

test('validateRolloutPromotion requires two builds with one upstreamUpdate and all gates green', () => {
  const incomplete = validateRolloutPromotion({
    rolloutMode: 'shadow',
    gates: { deterministic: { status: 'pass' } },
    builds: [{ buildId: 'a', upstreamUpdate: false }],
    liveOperation: { status: 'pass' },
    qualifiedPerformanceEvidenceId: null,
  });
  assert.equal(incomplete.promotable, false);
  assert.ok(incomplete.issues.length > 0);

  const noUpstream = validateRolloutPromotion(
    createPromotableEvidence({
      builds: [
        { buildId: 'a', upstreamUpdate: false },
        { buildId: 'b', upstreamUpdate: false },
      ],
    })
  );
  assert.equal(noUpstream.promotable, false);
  assert.ok(noUpstream.issues.some((issue) => /upstreamUpdate/i.test(issue)));

  const failedGate = validateRolloutPromotion(
    createPromotableEvidence({
      gates: {
        deterministic: { status: 'pass' },
        privacy: { status: 'fail' },
        recovery: { status: 'pass' },
        liveOperation: { status: 'pass' },
        performance: { status: 'pass' },
      },
    })
  );
  assert.equal(failedGate.promotable, false);

  const expiredLegacy = validateRolloutPromotion(
    createPromotableEvidence({
      legacyWriterExpiresAt: '0.2.2',
      packageVersion: '0.3.0',
      legacyWriterRemoved: false,
    })
  );
  assert.equal(expiredLegacy.promotable, false);
  assert.ok(expiredLegacy.issues.some((issue) => /legacy/i.test(issue)));

  const ok = validateRolloutPromotion(createPromotableEvidence());
  assert.equal(ok.promotable, true);
  assert.deepEqual(ok.issues, []);
});

test('canary rejects missing flag, missing env, path mismatch, or daily install', () => {
  assert.throws(
    () =>
      assertCanaryInstallAllowed({
        safetyNetCanary: false,
        installDir: 'D:/Apps/cursor-canary',
        canaryInstallDir: 'D:/Apps/cursor-canary',
        dailyInstallDir: 'D:/Apps/Cursor',
      }),
    /safety-net-canary|canary flag/i
  );

  assert.throws(
    () =>
      assertCanaryInstallAllowed({
        safetyNetCanary: true,
        installDir: 'D:/Apps/cursor-canary',
        canaryInstallDir: null,
        dailyInstallDir: 'D:/Apps/Cursor',
      }),
    /CURSOR_ZH_CANARY_INSTALL_DIR/
  );

  assert.throws(
    () =>
      assertCanaryInstallAllowed({
        safetyNetCanary: true,
        installDir: 'D:/Apps/other',
        canaryInstallDir: 'D:/Apps/cursor-canary',
        dailyInstallDir: 'D:/Apps/Cursor',
      }),
    /mismatch|canary install/i
  );

  assert.throws(
    () =>
      assertCanaryInstallAllowed({
        safetyNetCanary: true,
        installDir: 'D:/Apps/Cursor',
        canaryInstallDir: 'D:/Apps/Cursor',
        dailyInstallDir: 'D:/Apps/Cursor',
      }),
    /daily install/i
  );

  assert.doesNotThrow(() =>
    assertCanaryInstallAllowed({
      safetyNetCanary: true,
      installDir: 'D:\\Apps\\cursor-canary',
      canaryInstallDir: 'D:/Apps/cursor-canary',
      dailyInstallDir: 'D:/Apps/Cursor',
    })
  );
});

test('legacy-apply warns during transition and fails at or after expiry', () => {
  assert.equal(LEGACY_WRITER_EXPIRES_AT, LEGACY_APPLY_EXPIRY_VERSION);

  const allowed = assertLegacyApplyAllowed({
    packageVersion: '0.2.2',
    expiresAt: LEGACY_WRITER_EXPIRES_AT,
  });
  assert.match(allowed.warning, /maintenance|legacy/i);

  assert.throws(
    () =>
      assertLegacyApplyAllowed({
        packageVersion: '0.3.0',
        expiresAt: LEGACY_WRITER_EXPIRES_AT,
      }),
    /expired|legacyWriterExpiresAt/i
  );

  assert.throws(
    () =>
      assertLegacyApplyAllowed({
        packageVersion: '0.3.1',
        expiresAt: LEGACY_WRITER_EXPIRES_AT,
      }),
    /expired|legacyWriterExpiresAt/i
  );
});

test('shadow runs prepare comparison with zero new-engine writes then uses legacy writer', async () => {
  const events = [];
  const preparedRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-shadow-'));
  const preparedPath = path.join(preparedRoot, 'artifact.js');
  const targetPath = path.join(preparedRoot, 'install', 'artifact.js');
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(preparedPath, 'prepared\n', 'utf8');
  const reportsDir = path.join(preparedRoot, 'state', 'reports');

  const { runApply } = createCommandsModule({
    toolPaths: {
      stateDir: path.join(preparedRoot, 'state'),
      harvestReportsDir: reportsDir,
    },
    prepareBuild: async () =>
      createPreparedBuild({
        buildId: 'shadow-1',
        rootDir: preparedRoot,
        artifacts: [{ preparedPath, targetPath }],
        admission: { status: 'KNOWN_DRIFT', blockers: [], fallbacks: [] },
        manifest: { buildId: 'shadow-1' },
        recoveryCapsule: { path: path.join(preparedRoot, 'recovery-capsule.json') },
        managedTargetSnapshot: [],
      }),
    commitPreparedBuild: async () => {
      events.push('new-engine-commit');
    },
    printPreparedBuildReport: () => {},
    acquireCommitLease: async () => ({
      release: async () => {
        events.push('lease-release');
      },
    }),
    onLegacyApply: async (context) => {
      events.push('legacy-apply');
      return {
        buildId: 'shadow-1',
        via: 'legacy',
        rolloutMode: context.options?.rolloutMode,
      };
    },
  });

  const result = await runApply({
    options: { force: false, rolloutMode: 'shadow' },
    paths: { installDir: path.join(preparedRoot, 'install') },
  });

  assert.ok(!events.includes('new-engine-commit'), 'shadow must not commit new-engine artifacts');
  assert.ok(events.includes('legacy-apply'), 'shadow must use the transition legacy writer');
  assert.equal(result.via, 'legacy');
  const evidencePath = path.join(reportsDir, ROLLOUT_EVIDENCE_FILENAME);
  assert.ok(fs.existsSync(evidencePath), 'shadow must persist rollout evidence');
  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  assert.equal(evidence.rolloutMode, 'shadow');
  assert.equal(evidence.newEngineManagedWrites, 0);
});

test('BLOCKED never auto-calls the legacy writer', async () => {
  const events = [];
  const { runApply } = createCommandsModule({
    prepareBuild: async () =>
      createPreparedBuild({
        buildId: 'blocked-1',
        rootDir: '/tmp/blocked',
        artifacts: [],
        admission: { status: 'BLOCKED', blockers: ['composer.send_follow_up'] },
        manifest: {},
        recoveryCapsule: {},
        managedTargetSnapshot: [],
      }),
    commitPreparedBuild: async () => {
      events.push('commit');
    },
    printPreparedBuildReport: () => {},
    ensureBackup: () => {
      events.push('backup');
    },
    writeLocaleFiles: () => {
      events.push('legacy-locale');
    },
  });

  await assert.rejects(
    () => runApply({ options: { force: false, rolloutMode: 'shadow' }, paths: {} }),
    /blocked: composer.send_follow_up/
  );
  assert.deepEqual(events, []);
});

test('enforced is unavailable until promotion gates pass', async () => {
  const { runApply } = createCommandsModule({
    prepareBuild: async () => {
      throw new Error('prepare must not run when enforced is unavailable');
    },
    printPreparedBuildReport: () => {},
  });

  await assert.rejects(
    () =>
      runApply({
        options: {
          force: false,
          rolloutMode: 'enforced',
          rolloutEvidence: {
            rolloutMode: 'canary',
            gates: {},
            builds: [{ buildId: 'only-one', upstreamUpdate: false }],
            liveOperation: { status: 'fail' },
          },
        },
        paths: {},
      }),
    /enforced unavailable|not promotable|promotion/i
  );
});

test('canary transition with empty artifacts uses legacy writer after gates', async () => {
  const events = [];
  const preparedRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-canary-happy-'));
  const canaryInstall = path.join(preparedRoot, 'canary-install');
  const dailyInstall = path.join(preparedRoot, 'daily-install');
  const reportsDir = path.join(preparedRoot, 'state', 'reports');
  fs.mkdirSync(canaryInstall, { recursive: true });

  const { runApply } = createCommandsModule({
    toolPaths: {
      stateDir: path.join(preparedRoot, 'state'),
      harvestReportsDir: reportsDir,
    },
    detectCursorInstallDir: () => dailyInstall,
    prepareBuild: async () =>
      createPreparedBuild({
        buildId: 'canary-1',
        rootDir: preparedRoot,
        artifacts: [],
        admission: { status: 'KNOWN_DRIFT', blockers: [], fallbacks: [] },
        manifest: { buildId: 'canary-1' },
        recoveryCapsule: { path: path.join(preparedRoot, 'recovery-capsule.json') },
        managedTargetSnapshot: [],
      }),
    commitPreparedBuild: async () => {
      events.push('new-engine-commit');
    },
    printPreparedBuildReport: () => {},
    acquireCommitLease: async () => ({
      release: async () => {
        events.push('lease-release');
      },
    }),
    onLegacyApply: async (context) => {
      events.push('legacy-apply');
      return {
        buildId: 'canary-1',
        via: 'legacy',
        rolloutMode: context.options?.rolloutMode,
      };
    },
  });

  const result = await runApply({
    options: {
      force: false,
      rolloutMode: 'canary',
      safetyNetCanary: true,
      canaryInstallDir: canaryInstall,
      dailyInstallDir: dailyInstall,
    },
    paths: { installDir: canaryInstall },
  });

  assert.ok(!events.includes('new-engine-commit'), 'canary transition must not commit empty new-engine artifacts');
  assert.ok(events.includes('legacy-apply'), 'canary transition must use the shadow-style legacy writer');
  assert.equal(result.via, 'legacy');
  assert.equal(result.rolloutMode, 'canary');
  const evidencePath = path.join(reportsDir, ROLLOUT_EVIDENCE_FILENAME);
  assert.ok(fs.existsSync(evidencePath), 'canary must persist rollout evidence');
  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  assert.equal(evidence.rolloutMode, 'canary');
  assert.equal(evidence.newEngineManagedWrites, 0);
});

test('enforced without promotable evidence stays fail-closed (no legacy)', async () => {
  const events = [];
  const { runApply } = createCommandsModule({
    prepareBuild: async () => {
      events.push('prepare');
      return createPreparedBuild({
        buildId: 'enforced-blocked',
        rootDir: '/tmp/enforced-blocked',
        artifacts: [],
        admission: { status: 'KNOWN_DRIFT', blockers: [], fallbacks: [] },
        manifest: {},
        recoveryCapsule: {},
        managedTargetSnapshot: [],
      });
    },
    onLegacyApply: async () => {
      events.push('legacy-apply');
      return { via: 'legacy' };
    },
    printPreparedBuildReport: () => {},
  });

  await assert.rejects(
    () =>
      runApply({
        options: {
          force: false,
          rolloutMode: 'enforced',
          rolloutEvidence: {
            rolloutMode: 'canary',
            gates: {},
            builds: [{ buildId: 'only-one', upstreamUpdate: false }],
            liveOperation: { status: 'fail' },
          },
        },
        paths: {},
      }),
    /enforced unavailable|not promotable|promotion/i
  );
  assert.deepEqual(events, []);
});

test('buildRolloutEvidence does not default unmeasured gates to pass', () => {
  const evidence = buildRolloutEvidence({
    rolloutMode: 'shadow',
    buildId: 'cursor-3.10.17',
    upstreamUpdate: true,
    liveOperation: { status: 'pass', command: 'apply' },
    newEngineManagedWrites: 0,
    qualifiedPerformanceEvidenceId: null,
  });

  assert.notEqual(evidence.gates.deterministic?.status, 'pass');
  assert.notEqual(evidence.gates.privacy?.status, 'pass');
  assert.notEqual(evidence.gates.recovery?.status, 'pass');
  assert.equal(evidence.gates.liveOperation?.status, 'pass');
  assert.equal(evidence.gates.performance?.status, 'fail');

  const promotion = validateRolloutPromotion(evidence);
  assert.equal(promotion.promotable, false);
  assert.ok(promotion.issues.some((issue) => /deterministic|privacy|recovery/i.test(issue)));
});

test('buildRolloutEvidence and persistRolloutEvidence write rollout-evidence.json', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-evidence-'));
  const reportsDir = path.join(root, 'state', 'reports');
  const evidence = buildRolloutEvidence({
    rolloutMode: 'shadow',
    buildId: 'cursor-3.10.17',
    upstreamUpdate: true,
    liveOperation: { status: 'pass', command: 'apply' },
    newEngineManagedWrites: 0,
    qualifiedPerformanceEvidenceId: 'perf-1',
    gates: {
      deterministic: { status: 'pass' },
      privacy: { status: 'pass' },
      recovery: { status: 'pass' },
      liveOperation: { status: 'pass' },
      performance: { status: 'pass' },
    },
  });
  assert.equal(evidence.rolloutMode, 'shadow');
  assert.equal(evidence.newEngineManagedWrites, 0);
  assert.equal(evidence.legacyWriterExpiresAt, LEGACY_WRITER_EXPIRES_AT);

  const written = persistRolloutEvidence(
    { harvestReportsDir: reportsDir, stateDir: path.join(root, 'state') },
    evidence,
    { fs }
  );
  assert.ok(written.endsWith(ROLLOUT_EVIDENCE_FILENAME));
  assert.equal(JSON.parse(fs.readFileSync(written, 'utf8')).rolloutMode, 'shadow');
});

test('validate-rollout-promotion-cli blocks incomplete evidence for release', () => {
  const {
    main: validateRolloutPromotionMain,
  } = require('../../tool/validate-rollout-promotion-cli.js');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-cli-release-'));
  const evidencePath = path.join(root, 'rollout-evidence.json');
  fs.writeFileSync(
    evidencePath,
    `${JSON.stringify(
      {
        rolloutMode: 'shadow',
        legacyWriterExpiresAt: LEGACY_WRITER_EXPIRES_AT,
        legacyWriterRemoved: false,
        packageVersion: '0.2.2',
        gates: {
          deterministic: { status: 'pass' },
          privacy: { status: 'pass' },
          recovery: { status: 'pass' },
          liveOperation: { status: 'pass' },
          performance: { status: 'pass' },
        },
        builds: [{ buildId: 'only-one', upstreamUpdate: false }],
        liveOperation: { status: 'pass', command: 'verify' },
        qualifiedPerformanceEvidenceId: 'perf-1',
        newEngineManagedWrites: 0,
      },
      null,
      2
    )}\n`,
    'utf8'
  );

  const soft = validateRolloutPromotionMain(['--file', evidencePath]);
  assert.equal(soft, 0, 'local transition check may soft-pass incomplete shadow evidence');

  const releaseGate = validateRolloutPromotionMain([
    '--file',
    evidencePath,
    '--require-promotable',
  ]);
  assert.equal(releaseGate, 1, 'release must block incomplete evidence');

  const missing = validateRolloutPromotionMain([
    '--file',
    path.join(root, 'missing-rollout-evidence.json'),
    '--require-promotable',
  ]);
  assert.equal(missing, 1, 'release must block missing evidence');
});
