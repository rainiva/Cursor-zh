'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const {
  evaluateSafetyNetBudgets,
  evaluatePerformanceQualification,
} = require('../../tool/verify.js');
const { clearVerifySessionCache } = require('../../tool/session-cache.js');
const { createCommandsModule } = require('../../tool/commands.js');
const { createPreparedBuild } = require('../../tool/prepared-build.js');

let scopedCacheFixture = null;

function createScopedCacheFixture() {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-perf-cache-'));
  const cacheRel = path.join('state', 'cache', 'verify-session.json');
  const backupRel = path.join('state', 'backups', 'keep-me.bin');
  const cacheAbs = path.join(workspaceRoot, cacheRel);
  const backupAbs = path.join(workspaceRoot, backupRel);
  fs.mkdirSync(path.dirname(cacheAbs), { recursive: true });
  fs.mkdirSync(path.dirname(backupAbs), { recursive: true });
  fs.writeFileSync(cacheAbs, JSON.stringify({ warm: true }), 'utf8');
  fs.writeFileSync(backupAbs, 'backup-bytes', 'utf8');
  scopedCacheFixture = {
    workspaceRoot,
    cacheAbs,
    backupAbs,
    cacheRel: cacheRel.replace(/\\/g, '/'),
  };
  return scopedCacheFixture;
}

async function fixtureBackupStillExists() {
  return Boolean(scopedCacheFixture && fs.existsSync(scopedCacheFixture.backupAbs));
}

function createCurrentFixtureProof() {
  return {
    testId: 'product-tip-runtime-fallback',
    testPassed: true,
    shardCompiled: true,
    contracts: { scope: true, lifecycle: true, placeholders: true, privacy: true },
    capabilityEvidence: { status: 'matched', matchCount: 1, signature: 'product-tips:v1' },
    proofKey: 'current-fixture-proof-key',
  };
}

function hashFile(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

async function runFixtureEnsure({ admission, fallbackProof } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-perf-ensure-'));
  const installDir = path.join(root, 'install');
  const resourcesAppDir = path.join(installDir, 'resources', 'app');
  const outDir = path.join(resourcesAppDir, 'out');
  const workbenchDir = path.join(outDir, 'vs', 'code', 'electron-sandbox', 'workbench');
  fs.mkdirSync(workbenchDir, { recursive: true });

  const managedTargets = {
    packageJson: path.join(resourcesAppDir, 'package.json'),
    mainJs: path.join(outDir, 'main.js'),
    bootstrap: path.join(outDir, 'cursorTranslatorMain.js'),
    workbenchTranslated: path.join(workbenchDir, 'workbench.desktop.main_translated.js'),
  };

  fs.writeFileSync(
    managedTargets.packageJson,
    JSON.stringify({ name: 'cursor', main: './out/main.js', version: '1.0.0' }, null, 2),
    'utf8'
  );
  fs.writeFileSync(managedTargets.mainJs, '/* main */\n', 'utf8');
  fs.writeFileSync(managedTargets.bootstrap, '/* bootstrap-before */\n', 'utf8');
  fs.writeFileSync(managedTargets.workbenchTranslated, '/* workbench-before */\n', 'utf8');

  const beforeManagedTargetHashes = Object.fromEntries(
    Object.entries(managedTargets).map(([key, filePath]) => [key, hashFile(filePath)])
  );

  const preparedRoot = path.join(root, 'state', 'generated', 'build-1');
  fs.mkdirSync(preparedRoot, { recursive: true });
  const preparedBootstrap = path.join(preparedRoot, 'cursorTranslatorMain.js');
  const preparedWorkbench = path.join(preparedRoot, 'workbench.desktop.main_translated.js');
  fs.writeFileSync(preparedBootstrap, '/* bootstrap-after */\n', 'utf8');
  fs.writeFileSync(preparedWorkbench, '/* workbench-after */\n', 'utf8');

  const admissionStatus = typeof admission === 'string' ? admission : admission?.status;
  const preparedAdmission =
    admissionStatus === 'BLOCKED'
      ? { status: 'BLOCKED', blockers: ['composer.send_follow_up'], fallbacks: [] }
      : {
          status: 'DEGRADED',
          blockers: [],
          fallbacks: ['product_tips.render_text'],
          fallbackProof: fallbackProof || createCurrentFixtureProof(),
        };

  const artifacts =
    admissionStatus === 'BLOCKED'
      ? [
          { preparedPath: preparedBootstrap, targetPath: managedTargets.bootstrap },
          { preparedPath: preparedWorkbench, targetPath: managedTargets.workbenchTranslated },
        ]
      : [
          { preparedPath: preparedBootstrap, targetPath: managedTargets.bootstrap },
          { preparedPath: preparedWorkbench, targetPath: managedTargets.workbenchTranslated },
        ];

  let verifyCallCount = 0;
  let lastVerifyIssues = ['needs-repair'];
  const { runEnsure } = createCommandsModule({
    toolPaths: {
      buildManifestPath: path.join(root, 'state', 'build-manifest.json'),
      generatedDir: path.join(root, 'state', 'generated'),
    },
    fs,
    prepareBuild: async () =>
      createPreparedBuild({
        buildId: 'build-1',
        rootDir: preparedRoot,
        artifacts,
        admission: preparedAdmission,
        manifest: { admission: preparedAdmission },
        recoveryCapsule: { path: path.join(preparedRoot, 'recovery-capsule.json') },
        managedTargetSnapshot: Object.values(managedTargets).map((targetPath) => ({
          targetPath,
          kind: 'install',
          contentHash: hashFile(targetPath),
        })),
      }),
    acquireCommitLease: async () => ({ release: async () => {} }),
    ensureBackup: () => path.join(root, 'state', 'backups', 'snap'),
    loadInstallMetadata: () => ({
      pkg: JSON.parse(fs.readFileSync(managedTargets.packageJson, 'utf8')),
      product: { vscodeVersion: '1.0.0' },
    }),
    findLanguagePack: () => ({ version: '1.0.0' }),
    verifyState: () => {
      verifyCallCount += 1;
      // First call drives ensure→apply; post-commit / follow-up verifies are clean.
      lastVerifyIssues = verifyCallCount === 1 ? ['needs-repair'] : [];
      return { issues: lastVerifyIssues, info: [], warnings: [] };
    },
    printReport: () => {},
    printPreparedBuildReport: () => {},
    publishAcceptedState: async () => {},
    compareLanguagePackVersion: () => ({ compatible: true }),
  });

  let ensureError = null;
  try {
    await runEnsure({
      options: { force: false },
      paths: {
        installDir,
        resourcesAppDir,
        packageJsonPath: managedTargets.packageJson,
        userExtensionRoot: path.join(root, 'extensions'),
      },
    });
  } catch (error) {
    ensureError = error;
  }

  const afterManagedTargetHashes = Object.fromEntries(
    Object.entries(managedTargets).map(([key, filePath]) => [key, hashFile(filePath)])
  );

  return {
    beforeManagedTargetHashes,
    afterManagedTargetHashes,
    verifyIssues: lastVerifyIssues,
    ensureError,
    admission: preparedAdmission,
  };
}

test('enforces core, shard, warm verify, and cold verify budgets', () => {
  const result = evaluateSafetyNetBudgets(
    {
      coreRuntimeKB: 80.1,
      surfaceShardKB: { composer: 19.5 },
      warmVerifySamplesMs: [2700, 2750, 2800, 2900, 2950],
      coldVerifySamplesMs: [7600, 7800, 7900],
      qualification: 'QUALIFIED',
    },
    { maxCoreKB: 80, maxSurfaceKB: 20, maxWarmVerifyMs: 3000, maxColdVerifyMs: 8000 }
  );
  assert.deepEqual(result.issues, ['core runtime payload (80.1 KB > 80 KB)']);
});

test('unregistered timing is UNQUALIFIED and cannot satisfy release proof', () => {
  const result = evaluatePerformanceQualification({
    computedFingerprint: 'machine-a',
    registeredFingerprint: 'machine-b',
    requireReleaseProof: true,
  });
  assert.deepEqual(result, {
    status: 'UNQUALIFIED',
    releaseAllowed: false,
    reason: 'fingerprint-mismatch',
  });
});

test('cold measurement clears only cursor-zh verify session cache', async () => {
  const cleared = await clearVerifySessionCache(createScopedCacheFixture());
  assert.deepEqual(cleared, ['state/cache/verify-session.json']);
  assert.equal(await fixtureBackupStillExists(), true);
});

test('blocked ensure preserves every managed-target hash while degraded ensure commits current proofs', async () => {
  const blocked = await runFixtureEnsure({ admission: 'BLOCKED' });
  assert.deepEqual(blocked.beforeManagedTargetHashes, blocked.afterManagedTargetHashes);
  const degraded = await runFixtureEnsure({
    admission: 'DEGRADED',
    fallbackProof: createCurrentFixtureProof(),
  });
  assert.equal(degraded.verifyIssues.length, 0);
});
