const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createToolPaths } = require('../../tool/paths.js');
const { createManifestModule } = require('../../tool/manifest.js');
const { writeJson, ensureDir } = require('../../tool/io.js');

test('buildManifest includes core metadata and mapping counts', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-manifest-'));
  const toolPaths = createToolPaths(workspaceRoot);

  const context = {
    paths: {
      installDir: path.join(workspaceRoot, 'cursor'),
      packageJsonPath: path.join(workspaceRoot, 'pkg.json'),
      translatorBootstrapPath: path.join(workspaceRoot, 'bootstrap.js'),
      mainOriginalPath: path.join(workspaceRoot, 'main.js'),
      mainTranslatedPath: path.join(workspaceRoot, 'main_translated.js'),
      nlsKeysPath: path.join(workspaceRoot, 'nls.keys.json'),
      nlsMessagesPath: path.join(workspaceRoot, 'nls.messages.json'),
      workbenchOriginalPath: path.join(workspaceRoot, 'workbench.js'),
      workbenchTranslatedPath: path.join(workspaceRoot, 'workbench_translated.js'),
      argvPath: path.join(workspaceRoot, 'argv.json'),
      userLocaleMirrorPath: path.join(workspaceRoot, 'locale.json'),
    },
  };

  for (const filePath of Object.values(context.paths)) {
    if (filePath) {
      fs.writeFileSync(filePath, '{}');
    }
  }
  ensureDir(toolPaths.generatedDir);
  fs.writeFileSync(toolPaths.generatedMainPath, '{}');
  fs.writeFileSync(toolPaths.generatedNlsMessagesPath, '{}');
  fs.writeFileSync(toolPaths.generatedWorkbenchPath, '{}');

  const { buildManifest } = createManifestModule({
    toolPaths,
    sha256OfFile: () => 'hash',
    compareLanguagePackVersion: () => ({ compatible: true }),
    writeJson,
  });

  const manifest = buildManifest(
    context,
    { pkg: { version: '1.0.0', distro: 'cursor' }, product: { vscodeVersion: '1.99.0' } },
    { path: '/lp', version: '1.99.0' },
    {
      baseMappings: [1],
      overlayMappings: [2, 3],
      cursorWinCommonMappings: [4],
      dynamicMappings: [5, 6],
      mergedMappings: [1, 2, 3, 4, 5, 6],
    },
    '/backup/dir',
    { totalTargetCount: 10, bundleTargetCount: 8, mappedTargetCount: 7, missingTargets: [] },
    { totalRuleCount: 3, bundleRuleCount: 2, mappedRuleCount: 2, missingRules: [] },
    { totalTipCount: 4, mappedTipCount: 3, missingTips: [] },
    {
      mode: 'performance',
      runtimeMappingCount: 100,
      prunedMappingCount: 50,
      scopeSelectorCount: 9,
    },
    { contractA: { matchCount: 1 } },
    { issues: [], warnings: [] }
  );

  assert.equal(manifest.workspaceRoot, workspaceRoot);
  assert.equal(manifest.cursorVersion, '1.0.0');
  assert.equal(manifest.patchPackVersion, 'cursor-1.0');
  assert.equal(manifest.vscodeVersion, '1.99.0');
  assert.equal(manifest.backupDir, '/backup/dir');
  assert.equal(manifest.mappingCounts.base, 1);
  assert.equal(manifest.mappingCounts.overlay, 2);
  assert.equal(manifest.mappingCounts.cursorWinCommon, 1);
  assert.equal(manifest.mappingCounts.dynamic, 2);
  assert.equal(manifest.mappingCounts.merged, 6);
  assert.equal(manifest.mappingCounts.runtime, 100);
  assert.equal(manifest.runtimeStrategy.mode, 'performance');
  assert.ok(manifest.files.packageJsonPath);
  assert.ok(manifest.hashes.packageJson);
});

test('buildManifest uses hashCache when provided', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-manifest-'));
  const toolPaths = createToolPaths(workspaceRoot);
  const context = {
    paths: {
      installDir: path.join(workspaceRoot, 'cursor'),
      packageJsonPath: path.join(workspaceRoot, 'pkg.json'),
      translatorBootstrapPath: path.join(workspaceRoot, 'bootstrap.js'),
      mainOriginalPath: path.join(workspaceRoot, 'main.js'),
      mainTranslatedPath: path.join(workspaceRoot, 'main_translated.js'),
      nlsKeysPath: path.join(workspaceRoot, 'nls.keys.json'),
      nlsMessagesPath: path.join(workspaceRoot, 'nls.messages.json'),
      workbenchOriginalPath: path.join(workspaceRoot, 'workbench.js'),
      workbenchTranslatedPath: path.join(workspaceRoot, 'workbench_translated.js'),
      argvPath: path.join(workspaceRoot, 'argv.json'),
      userLocaleMirrorPath: path.join(workspaceRoot, 'locale.json'),
    },
  };

  for (const filePath of Object.values(context.paths)) {
    fs.writeFileSync(filePath, '{}');
  }
  ensureDir(toolPaths.generatedDir);
  fs.writeFileSync(toolPaths.generatedMainPath, '{}');
  fs.writeFileSync(toolPaths.generatedNlsMessagesPath, '{}');
  fs.writeFileSync(toolPaths.generatedWorkbenchPath, '{}');

  let sha256Calls = 0;
  const hashCache = {
    sha256Cached: (_filePath, key) => `cached-${key}`,
  };

  const { buildManifest } = createManifestModule({
    toolPaths,
    sha256OfFile: () => {
      sha256Calls += 1;
      return 'disk-hash';
    },
    compareLanguagePackVersion: () => ({ compatible: true }),
    writeJson,
  });

  const manifest = buildManifest(
    context,
    { pkg: { version: '1.0.0', distro: 'cursor' }, product: { vscodeVersion: '1.99.0' } },
    null,
    {
      baseMappings: [],
      overlayMappings: [],
      cursorWinCommonMappings: [],
      dynamicMappings: [],
      mergedMappings: [],
    },
    '/backup',
    { totalTargetCount: 0, bundleTargetCount: 0, mappedTargetCount: 0, missingTargets: [] },
    { totalRuleCount: 0, bundleRuleCount: 0, mappedRuleCount: 0, missingRules: [] },
    { totalTipCount: 0, mappedTipCount: 0, missingTips: [] },
    { mode: 'performance', runtimeMappingCount: 0, prunedMappingCount: 0, scopeSelectorCount: 0 },
    {},
    { issues: [], warnings: [] },
    hashCache
  );

  assert.equal(manifest.hashes.packageJson, 'cached-packageJson');
  assert.equal(sha256Calls, 0);
});

test('buildManifest sets coverageDeferred when apply defers coverage analysis', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-manifest-'));
  const toolPaths = createToolPaths(workspaceRoot);
  const context = {
    paths: {
      installDir: path.join(workspaceRoot, 'cursor'),
      packageJsonPath: path.join(workspaceRoot, 'pkg.json'),
      translatorBootstrapPath: path.join(workspaceRoot, 'bootstrap.js'),
      mainOriginalPath: path.join(workspaceRoot, 'main.js'),
      mainTranslatedPath: path.join(workspaceRoot, 'main_translated.js'),
      nlsKeysPath: path.join(workspaceRoot, 'nls.keys.json'),
      nlsMessagesPath: path.join(workspaceRoot, 'nls.messages.json'),
      workbenchOriginalPath: path.join(workspaceRoot, 'workbench.js'),
      workbenchTranslatedPath: path.join(workspaceRoot, 'workbench_translated.js'),
      argvPath: path.join(workspaceRoot, 'argv.json'),
      userLocaleMirrorPath: path.join(workspaceRoot, 'locale.json'),
    },
  };

  for (const filePath of Object.values(context.paths)) {
    fs.writeFileSync(filePath, '{}');
  }
  ensureDir(toolPaths.generatedDir);
  fs.writeFileSync(toolPaths.generatedMainPath, '{}');
  fs.writeFileSync(toolPaths.generatedNlsMessagesPath, '{}');
  fs.writeFileSync(toolPaths.generatedWorkbenchPath, '{}');

  const { buildManifest } = createManifestModule({
    toolPaths,
    sha256OfFile: () => 'hash',
    compareLanguagePackVersion: () => ({ compatible: true }),
    writeJson,
  });

  const deferredCursorWinCoverage = {
    deferred: true,
    totalTargetCount: 0,
    bundleTargetCount: 0,
    mappedTargetCount: 0,
    missingTargets: [],
    sourceAvailable: true,
  };
  const deferredDynamicCoverage = {
    deferred: true,
    totalRuleCount: 0,
    bundleRuleCount: 0,
    mappedRuleCount: 0,
    missingRules: [],
    sourceAvailable: true,
  };

  const manifest = buildManifest(
    context,
    { pkg: { version: '1.0.0', distro: 'cursor' }, product: { vscodeVersion: '1.99.0' } },
    null,
    {
      baseMappings: [],
      overlayMappings: [],
      cursorWinCommonMappings: [],
      dynamicMappings: [],
      mergedMappings: [],
    },
    '/backup',
    deferredCursorWinCoverage,
    deferredDynamicCoverage,
    { totalTipCount: 0, mappedTipCount: 0, missingTips: [] },
    { mode: 'performance', runtimeMappingCount: 0, prunedMappingCount: 0, scopeSelectorCount: 0 },
    {},
    { issues: [], warnings: [] }
  );

  assert.equal(manifest.coverageDeferred, true);
});

test('buildManifest records mappingSourceSnapshots when collector is provided', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-manifest-'));
  const toolPaths = createToolPaths(workspaceRoot);
  ensureDir(path.dirname(toolPaths.overlayMappingPath));
  fs.writeFileSync(toolPaths.overlayMappingPath, '[]');

  const { buildManifest } = createManifestModule({
    toolPaths,
    sha256OfFile: () => 'hash',
    compareLanguagePackVersion: () => ({ compatible: true }),
    writeJson,
    collectMappingSourceSnapshots: (fsModule, paths) => ({
      [paths.overlayMappingPath]: {
        size: fsModule.statSync(paths.overlayMappingPath).size,
        mtimeMs: fsModule.statSync(paths.overlayMappingPath).mtimeMs,
      },
    }),
  });

  const context = {
    paths: {
      installDir: path.join(workspaceRoot, 'cursor'),
      packageJsonPath: path.join(workspaceRoot, 'pkg.json'),
      translatorBootstrapPath: path.join(workspaceRoot, 'bootstrap.js'),
      mainOriginalPath: path.join(workspaceRoot, 'main.js'),
      mainTranslatedPath: path.join(workspaceRoot, 'main_translated.js'),
      nlsKeysPath: path.join(workspaceRoot, 'nls.keys.json'),
      nlsMessagesPath: path.join(workspaceRoot, 'nls.messages.json'),
      workbenchOriginalPath: path.join(workspaceRoot, 'workbench.js'),
      workbenchTranslatedPath: path.join(workspaceRoot, 'workbench_translated.js'),
      argvPath: path.join(workspaceRoot, 'argv.json'),
      userLocaleMirrorPath: path.join(workspaceRoot, 'locale.json'),
    },
  };

  for (const filePath of Object.values(context.paths)) {
    fs.writeFileSync(filePath, '{}');
  }
  ensureDir(toolPaths.generatedDir);
  fs.writeFileSync(toolPaths.generatedMainPath, '{}');
  fs.writeFileSync(toolPaths.generatedNlsMessagesPath, '{}');
  fs.writeFileSync(toolPaths.generatedWorkbenchPath, '{}');

  const manifest = buildManifest(
    context,
    { pkg: { version: '1.0.0', distro: 'cursor' }, product: { vscodeVersion: '1.99.0' } },
    null,
    {
      baseMappings: [],
      overlayMappings: [],
      cursorWinCommonMappings: [],
      dynamicMappings: [],
      mergedMappings: [],
    },
    '/backup',
    { totalTargetCount: 0, bundleTargetCount: 0, mappedTargetCount: 0, missingTargets: [] },
    { totalRuleCount: 0, bundleRuleCount: 0, mappedRuleCount: 0, missingRules: [] },
    { totalTipCount: 0, mappedTipCount: 0, missingTips: [] },
    { mode: 'performance', runtimeMappingCount: 0, prunedMappingCount: 0, scopeSelectorCount: 0 },
    {},
    { issues: [], warnings: [] }
  );

  assert.ok(manifest.mappingSourceSnapshots);
  assert.ok(manifest.mappingSourceSnapshots[toolPaths.overlayMappingPath]);
});
