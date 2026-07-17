'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createCommandsModule } = require('../../tool/commands.js');
const { createToolPaths } = require('../../tool/paths.js');
const { createPreparedBuild } = require('../../tool/prepared-build.js');
const { runParallelTasksSync } = require('../../tool/parallel.js');
const { createSyncStaticPreflightRunner } = require('./mock-static-preflight.js');

function createLegacyApplyDeps({ toolPaths, buildManifest, writeManifest, writeJson }) {
  // Omit generatedDir so apply uses in-memory workbench indexes (same as other unit tests).
  const { generatedDir: _generatedDir, ...applyToolPaths } = toolPaths;
  return {
    toolPaths: applyToolPaths,
    fs: {
      existsSync: (filePath) => !String(filePath).includes('glass'),
      mkdirSync: (dir, options) => fs.mkdirSync(dir, options),
      writeFileSync: (filePath, contents) => fs.writeFileSync(filePath, contents),
      unlinkSync: () => {},
    },
    readText: () => 'const label = "General";',
    readJsonIfExists: () => null,
    createWorkbenchIndex: (sourceText) => ({
      sourceText,
      hasQuotedLiteral: () => true,
    }),
    compareLanguagePackVersion: () => ({ compatible: true }),
    findLanguagePack: () => ({ version: '1.0.0' }),
    loadInstallMetadata: () => ({
      pkg: { version: '1.0.0', distro: 'cursor', main: './out/main.js' },
      product: { vscodeVersion: '1.0.0' },
    }),
    ensureBackup: () => path.join(toolPaths.workspaceRoot, 'backup'),
    loadMergedMappings: () => ({
      baseMappings: [],
      overlayMappings: [],
      cursorWinCommonMappings: [],
      dynamicMappings: [],
      mergedMappings: [{ originalText: 'General', changeText: '常规', searchType: 'exact' }],
    }),
    buildRuntimeConfig: () => ({ mode: 'performance' }),
    buildRuntimeMappingsInfo: (_c, _m, _mode, options = {}) => ({
      workbenchSource: options.workbenchSource || '',
      runtimeMappings: [{ originalText: 'General', changeText: '常规', searchType: 'exact' }],
    }),
    shouldIncludeExperimentalRuntimeToggle: () => false,
    applyStaticSourceTranslationsDetailed: () => ({ translatedSource: 'ok', contracts: {} }),
    evaluatePatchContracts: () => ({ issues: [], warnings: [] }),
    buildTranslatedMainText: () => 'main',
    buildTranslatedNlsMessagesPayload: () => [],
    writeStartLauncherPath: () => {},
    writeLocaleFiles: () => {},
    writeTranslatorBootstrap: () => {},
    patchPackageJsonMain: (_c, pkg) => pkg,
    writeJson,
    generateTranslatedMain: () => {},
    generateTranslatedNlsMessages: () => {},
    generateTranslatedWorkbench: () => ({
      runtimeFootprint: { runtimeMappingCount: 1, runtimeHeaderChars: 1, runtimeHeaderKB: 0 },
      staticTranslationResult: { contracts: {} },
      contractEvaluation: { warnings: [] },
      runtimeShards: { core: [{ id: 'core' }], surfaces: { composer: { mappings: [] } } },
    }),
    writeExtensionTranslationFiles: () => {},
    buildCursorWinCoverage: () => ({}),
    buildDynamicCoverage: () => ({}),
    buildProductTipsCoverage: () => ({ totalTipCount: 0, mappedTipCount: 0, missingTips: [] }),
    defaultCursorWinDynamicMappings: () => [],
    buildRuntimeStrategyReport: () => ({
      mode: 'performance',
      runtimeMappingCount: 1,
      runtimeHeaderChars: 1,
      runtimeHeaderKB: 0,
      prunedMappingCount: 0,
    }),
    buildManifest,
    writeManifest,
    sha256OfFile: () => 'hash',
    createDesktopShortcut: () => null,
    verifyState: () => ({}),
    printReport: () => {},
    printCursorWinCoverage: () => {},
    printDynamicCoverage: () => {},
    printProductTipsCoverage: () => {},
    printStaticPatchContracts: () => {},
    printRuntimeStrategy: () => {},
    createStageTimer: require('../../tool/timing.js').createStageTimer,
    createSessionCache: require('../../tool/session-cache.js').createSessionCache,
    runParallelTasks: runParallelTasksSync,
    runStaticPreflightParallel: createSyncStaticPreflightRunner(),
    clearCursorExtensionCache: () => ({ removed: [], missing: [] }),
  };
}

test('runApply persists admission evidence and writes quarantine report on legacy apply path', async () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-apply-admission-'));
  const toolPaths = createToolPaths(workspaceRoot);
  const written = {};
  let capturedUpdateProfile = null;
  let capturedSafetyNet = null;

  const { runApply } = createCommandsModule(
    createLegacyApplyDeps({
      toolPaths,
      writeJson: (filePath, payload) => {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
        written[filePath] = payload;
      },
      buildManifest: (...args) => {
        capturedUpdateProfile = args[12];
        capturedSafetyNet = args[13];
        return {
          generatedAt: new Date().toISOString(),
          updateProfile: args[12],
          admission: args[13]?.admission,
          runtimeShards: args[13]?.runtimeShards,
          quarantineReportPath: args[13]?.quarantineReportPath,
          quarantineReport: args[13]?.quarantineReport,
        };
      },
      writeManifest: () => {},
    })
  );

  await runApply({
    options: {
      runtimeMode: 'performance',
      noShortcut: true,
      quarantineRecords: [
        {
          source: 'runtime',
          text: 'private prompt',
          surface: 'composer',
          kind: 'unknown',
          capturePolicy: 'fingerprint-only',
          hmacKey: 'must-not-persist',
        },
      ],
    },
    paths: {
      workbenchOriginalPath: '/wb.js',
      mainOriginalPath: '/main.js',
      userExtensionRoot: '/extensions',
    },
  });

  assert.ok(capturedUpdateProfile, 'buildManifest must receive updateProfile');
  assert.equal(capturedUpdateProfile.version, 1);
  assert.equal(capturedSafetyNet?.admission?.status, 'UNCHANGED');
  assert.deepEqual(capturedSafetyNet?.runtimeShards?.core, [{ id: 'core' }]);
  assert.equal(capturedSafetyNet?.quarantineReportPath, toolPaths.quarantineReportPath);
  assert.ok(fs.existsSync(toolPaths.quarantineReportPath), 'quarantine report file must be written');
  const quarantinePayload = written[toolPaths.quarantineReportPath];
  assert.ok(quarantinePayload);
  assert.equal(JSON.stringify(quarantinePayload).includes('private prompt'), false);
  assert.equal(JSON.stringify(quarantinePayload).includes('must-not-persist'), false);
  assert.equal(quarantinePayload.privacyDrops, 1);
});

test('prepare→legacy apply reuses prepared admission on manifest write', async () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-prepare-admission-'));
  const toolPaths = createToolPaths(workspaceRoot);
  let capturedAdmission = null;

  const prepared = createPreparedBuild({
    buildId: 'prep-1',
    rootDir: path.join(workspaceRoot, 'state', 'generated', 'prep-1'),
    artifacts: [],
    admission: { status: 'KNOWN_DRIFT', blockers: [], fallbacks: [] },
    manifest: { buildId: 'prep-1' },
    recoveryCapsule: { path: path.join(workspaceRoot, 'recovery.json') },
    managedTargetSnapshot: [],
  });

  const { runApply } = createCommandsModule({
    ...createLegacyApplyDeps({
      toolPaths,
      writeJson: (filePath, payload) => {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(payload), 'utf8');
      },
      buildManifest: (...args) => {
        capturedAdmission = args[13]?.admission;
        return { generatedAt: new Date().toISOString() };
      },
      writeManifest: () => {},
    }),
    prepareBuild: async () => prepared,
    printPreparedBuildReport: () => {},
    acquireCommitLease: async () => ({ release: async () => {} }),
  });

  await runApply({
    options: { runtimeMode: 'performance', noShortcut: true },
    paths: {
      workbenchOriginalPath: '/wb.js',
      mainOriginalPath: '/main.js',
      userExtensionRoot: '/extensions',
    },
  });

  assert.deepEqual(capturedAdmission, {
    status: 'KNOWN_DRIFT',
    blockers: [],
    fallbacks: [],
  });
});

test('publishAcceptedState path persists admission evidence and quarantine report', async () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-publish-admission-'));
  const toolPaths = createToolPaths(workspaceRoot);
  const published = [];
  const preparedDir = path.join(workspaceRoot, 'prepared');
  fs.mkdirSync(preparedDir, { recursive: true });
  const preparedArtifact = path.join(preparedDir, 'artifact.js');
  const targetArtifact = path.join(workspaceRoot, 'install', 'artifact.js');
  fs.mkdirSync(path.dirname(targetArtifact), { recursive: true });
  fs.writeFileSync(preparedArtifact, 'ok', 'utf8');

  const prepared = createPreparedBuild({
    buildId: 'pub-1',
    rootDir: preparedDir,
    artifacts: [{ preparedPath: preparedArtifact, targetPath: targetArtifact }],
    admission: { status: 'DEGRADED', blockers: [], fallbacks: ['product_tips.render_text'] },
    manifest: {
      buildId: 'pub-1',
      updateProfile: {
        version: 1,
        cursorVersion: '1.0.0',
        vscodeVersion: '1.0.0',
        bundles: [],
        nls: { inventoryHash: 'nls' },
        units: [{ translationId: 'product_tips.render_text', outcome: 'fallback' }],
      },
      runtimeShards: { core: [], surfaces: { tips: { mappings: [] } } },
    },
    recoveryCapsule: { path: path.join(preparedDir, 'recovery-capsule.json') },
    managedTargetSnapshot: [],
  });

  const { runApply } = createCommandsModule({
    toolPaths,
    fs,
    writeJson: (filePath, payload) => {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
    },
    writeText: (filePath, contents) => {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, contents, 'utf8');
    },
    prepareBuild: async () => prepared,
    printPreparedBuildReport: () => {},
    acquireCommitLease: async () => ({ release: async () => {} }),
    commitPreparedBuild: async (build, writers) => {
      for (const artifact of build.artifacts) {
        await writers.writeArtifact(artifact.preparedPath, artifact.targetPath);
      }
      return { committedPaths: build.artifacts.map((item) => item.targetPath) };
    },
    verifyState: () => ({ issues: [] }),
    loadInstallMetadata: () => ({
      pkg: { version: '1.0.0', distro: 'cursor' },
      product: { vscodeVersion: '1.0.0' },
    }),
    findLanguagePack: () => ({ version: '1.0.0' }),
    ensureBackup: () => path.join(workspaceRoot, 'backup'),
    publishAcceptedState: async ({ manifest }) => {
      published.push(manifest);
      return manifest;
    },
  });

  await runApply({
    options: {
      runtimeMode: 'performance',
      noShortcut: true,
      quarantineRecords: [{ translationId: 'composer.send', kind: 'blocked' }],
    },
    paths: { installDir: path.join(workspaceRoot, 'install') },
  });

  assert.equal(published.length, 1);
  assert.equal(published[0].admission.status, 'DEGRADED');
  assert.deepEqual(published[0].updateProfile.units[0].translationId, 'product_tips.render_text');
  assert.deepEqual(published[0].runtimeShards.surfaces.tips, { mappings: [] });
  assert.equal(published[0].quarantineReportPath, toolPaths.quarantineReportPath);
  assert.ok(fs.existsSync(toolPaths.quarantineReportPath));
  assert.deepEqual(published[0].quarantineReport.blockers.map((item) => item.translationId), [
    'composer.send',
  ]);
});
