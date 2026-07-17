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
  collectRuntimeSizeActual,
  createVerifyModule,
} = require('../../tool/verify.js');
const {
  clearVerifySessionCache,
  createSessionCache,
  canReuseManifestCoverage,
  canReuseManifestStaticContracts,
  createMappingInfoFromManifest,
  collectMappingSourceSnapshots,
  readVerifySessionCache,
} = require('../../tool/session-cache.js');
const { createCommandsModule } = require('../../tool/commands.js');
const { createPreparedBuild } = require('../../tool/prepared-build.js');
const { createToolPaths } = require('../../tool/paths.js');
const { assertRuntimeFootprintBudget } = require('../../tool/runtime-strategy.js');
const { createStageTimer } = require('../../tool/timing.js');

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

test('missing runtimeShards fails size budgets instead of 0 KB withinBudget', () => {
  const sizeActual = collectRuntimeSizeActual({});
  assert.equal(sizeActual.sizeEvidenceMissing, true);

  const result = evaluateSafetyNetBudgets(
    {
      ...sizeActual,
      warmVerifySamplesMs: [],
      coldVerifySamplesMs: [],
      qualification: 'UNQUALIFIED',
    },
    { maxCoreKB: 80, maxSurfaceKB: 20, maxWarmVerifyMs: 3000, maxColdVerifyMs: 8000 }
  );

  assert.equal(result.withinBudget, false);
  assert.ok(
    result.issues.some((issue) => /runtime size evidence missing|runtimeShards/i.test(issue)),
    `expected missing size evidence issue, got: ${JSON.stringify(result.issues)}`
  );
  assert.ok(
    !result.issues.some((issue) => /0 KB/.test(issue)),
    'missing evidence must not be reported as a 0 KB overage'
  );
});

test('warm verify reuses hash-keyed session; cold clears and recomputes', async () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-warm-reuse-'));
  const toolPaths = createToolPaths(workspaceRoot);
  const installDir = path.join(workspaceRoot, 'cursor');
  const context = {
    paths: {
      installDir,
      resourcesAppDir: path.join(installDir, 'resources/app'),
      packageJsonPath: path.join(installDir, 'resources/app/package.json'),
      translatorBootstrapPath: path.join(installDir, 'resources/app/out/cursorTranslatorMain.js'),
      mainOriginalPath: path.join(installDir, 'resources/app/out/main.js'),
      mainTranslatedPath: path.join(installDir, 'resources/app/out/main_translated.js'),
      nlsMessagesPath: path.join(installDir, 'resources/app/out/nls.messages.json'),
      workbenchOriginalPath: path.join(
        installDir,
        'resources/app/out/vs/workbench/workbench.desktop.main.js'
      ),
      workbenchTranslatedPath: path.join(
        installDir,
        'resources/app/out/vs/workbench/workbench.desktop.main_translated.js'
      ),
      argvPath: path.join(installDir, 'data/argv.json'),
      userLocaleMirrorPath: path.join(installDir, 'data/locale.json'),
    },
  };

  const files = {
    [context.paths.packageJsonPath]: JSON.stringify({ main: './out/cursorTranslatorMain.js' }),
    [context.paths.translatorBootstrapPath]: 'bootstrap',
    [context.paths.mainTranslatedPath]: 'main-translated',
    [context.paths.nlsMessagesPath]: '{}',
    [context.paths.workbenchTranslatedPath]:
      '/* Cursor ZH generated runtime: do not edit generated file directly. */',
    [context.paths.workbenchOriginalPath]: 'workbench-original',
    [context.paths.argvPath]: '{}',
    [toolPaths.baseMappingPath]: '[]',
    [toolPaths.overlayMappingPath]: '[]',
    [toolPaths.cursorWinCommonPath]: '[]',
    [toolPaths.dynamicMappingPath]: '[]',
    [toolPaths.generatedMainPath]: 'main-translated',
    [toolPaths.generatedNlsMessagesPath]: '{}',
    [toolPaths.generatedWorkbenchPath]:
      '/* Cursor ZH generated runtime: do not edit generated file directly. */',
  };
  for (const [filePath, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  }

  let buildCursorWinCoverageCalls = 0;
  const verifyModule = createVerifyModule({
    toolPaths,
    fs,
    readText: (filePath) => fs.readFileSync(filePath, 'utf8'),
    readJson: (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8')),
    readJsonIfExists: (filePath, fallback) => {
      if (!fs.existsSync(filePath)) {
        return fallback;
      }
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    },
    sha256OfFile: () => 'same-hash',
    compareLanguagePackVersion: () => ({ compatible: true }),
    readArgvConfig: () => ({ locale: 'zh-cn' }),
    loadMergedMappings: () => ({
      baseMappings: [1],
      overlayMappings: [2],
      cursorWinCommonMappings: [3],
      dynamicMappings: [4],
      mergedMappings: [1, 2, 3, 4],
    }),
    buildCursorWinCoverage: () => {
      buildCursorWinCoverageCalls += 1;
      return {
        totalTargetCount: 99,
        bundleTargetCount: 1,
        mappedTargetCount: 1,
        missingTargets: [],
        sourceAvailable: true,
      };
    },
    buildDynamicCoverage: () => ({
      totalRuleCount: 1,
      bundleRuleCount: 1,
      mappedRuleCount: 1,
      missingRules: [],
      sourceAvailable: true,
    }),
    buildProductTipsCoverage: () => ({
      totalTipCount: 1,
      mappedTipCount: 1,
      missingTips: [],
    }),
    defaultCursorWinDynamicMappings: () => [],
    detectAppliedRuntimeMode: () => 'performance',
    buildRuntimeMappingsInfo: () => ({
      workbenchSource: 'workbench',
      runtimeMappings: [],
    }),
    buildRuntimeStrategyReport: (_mappingInfo, _runtimeMappings, footprint) => ({
      mode: 'performance',
      rescanDelaysMs: [],
      scopeSelectorCount: 1,
      marketplaceRemoteTranslationEnabled: false,
      runtimeMappingCount: footprint?.runtimeMappingCount ?? 0,
      runtimeHeaderChars: footprint?.runtimeHeaderChars ?? 0,
      runtimeHeaderKB: footprint?.runtimeHeaderKB ?? 0,
      prunedMappingCount: 0,
    }),
    parseInstalledRuntimeArtifact: () => null,
    summarizeStaticPatchContractsFromTranslatedSource: () => ({}),
    evaluatePatchContracts: () => ({ issues: [], warnings: [] }),
    summarizeRuntimeFootprint: () => ({
      runtimeMappingCount: 0,
      runtimeHeaderChars: 0,
      runtimeHeaderKB: 0,
    }),
    isTranslatorBootstrapSource: () => true,
    createBootstrapSource: () => 'bootstrap',
    hasInstalledRuntimeHeader: () => true,
    createStageTimer,
    createSessionCache,
    canReuseManifestCoverage,
    canReuseManifestStaticContracts,
    createMappingInfoFromManifest,
    assertRuntimeFootprintBudget,
  });

  const manifest = {
    generatedAt: new Date().toISOString(),
    coverageDeferred: true,
    runtimeShards: {
      core: [{ translationId: 'core.a' }],
      surfaces: { composer: { selectors: [], entries: [] } },
    },
    admission: { status: 'PASS', blockers: [], fallbacks: [] },
    cursorWinCoverage: {
      deferred: true,
      totalTargetCount: 0,
      bundleTargetCount: 0,
      mappedTargetCount: 0,
      missingTargets: [],
      sourceAvailable: true,
    },
    dynamicCoverage: {
      deferred: true,
      totalRuleCount: 0,
      bundleRuleCount: 0,
      mappedRuleCount: 0,
      missingRules: [],
      sourceAvailable: true,
    },
    productTipsCoverage: {
      deferred: true,
      totalTipCount: 0,
      mappedTipCount: 0,
      missingTips: [],
    },
    runtimeStrategy: {
      mode: 'performance',
      rescanDelaysMs: [],
      scopeSelectorCount: 1,
      marketplaceRemoteTranslationEnabled: false,
      runtimeMappingCount: 10,
      runtimeHeaderChars: 100,
      runtimeHeaderKB: 0.1,
      prunedMappingCount: 2,
    },
    staticPatchContracts: {},
    staticPatchContractEvaluation: { issues: [], warnings: [] },
    mappingCounts: {
      base: 1,
      overlay: 1,
      cursorWinCommon: 1,
      dynamic: 1,
      merged: 4,
    },
    mappingSourceSnapshots: collectMappingSourceSnapshots(fs, toolPaths),
    hashes: {
      workbenchOriginal: 'same-hash',
      workbenchTranslated: 'same-hash',
      nlsMessages: 'same-hash',
    },
  };
  fs.mkdirSync(path.dirname(toolPaths.buildManifestPath), { recursive: true });
  fs.writeFileSync(toolPaths.buildManifestPath, JSON.stringify(manifest));

  const installMetadata = {
    pkg: { main: './out/cursorTranslatorMain.js' },
    product: { vscodeVersion: '1.99.0' },
  };
  const languagePack = { version: '1.99.0' };
  const verifyOpts = { profile: false, persistVerifySession: true, toolVersion: '0.0.0-test' };

  const coldOrFirst = verifyModule.verifyState(context, installMetadata, languagePack, verifyOpts);
  assert.equal(coldOrFirst.performance.warmReuse, false);
  assert.equal(buildCursorWinCoverageCalls, 1);
  assert.ok(readVerifySessionCache(workspaceRoot), 'warm sample must persist verify session');

  const warm = verifyModule.verifyState(context, installMetadata, languagePack, verifyOpts);
  assert.equal(warm.performance.warmReuse, true);
  assert.equal(
    buildCursorWinCoverageCalls,
    1,
    'warm path must short-circuit coverage when reuse key matches'
  );
  assert.equal(warm.cursorWinCoverage.totalTargetCount, 99);

  await clearVerifySessionCache({ workspaceRoot, fs });
  assert.equal(readVerifySessionCache(workspaceRoot), null);

  const cold = verifyModule.verifyState(context, installMetadata, languagePack, verifyOpts);
  assert.equal(cold.performance.warmReuse, false);
  assert.equal(buildCursorWinCoverageCalls, 2, 'cold path must fully recompute coverage');
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
