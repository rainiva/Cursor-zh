const test = require('node:test');
const assert = require('node:assert/strict');

const {
  canReapplyStaticOnly,
  mappingSourcesMatchManifest,
  collectMappingSourceSnapshots,
  createSessionCache,
  canReuseAppliedArtifacts,
} = require('../../tool/session-cache.js');
const { createMappingsModule } = require('../../tool/mappings.js');
const { mergeMappings } = require('../../cursor-zh-lib.js');
const { createToolPaths } = require('../../tool/paths.js');
const { ensureDir, readJsonIfExists, writeJson } = require('../../tool/io.js');
const { createOverlaySeedModule } = require('../../tool/overlay-seed.js');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function createFsMock(snapshotByPath) {
  return {
    existsSync: (filePath) => Boolean(snapshotByPath[filePath]),
    statSync: (filePath) => snapshotByPath[filePath],
  };
}

test('loadMergedMappings does not seed overlays by default', () => {
  let seedCalls = 0;
  const { loadMergedMappings } = createMappingsModule({
    toolPaths: {
      baseMappingPath: '/base.json',
      overlayMappingPath: '/overlay.json',
      cursorWinCommonPath: '/common.json',
      cursorWinAnchorsPath: '/anchors.json',
      dynamicMappingPath: '/dynamic.json',
    },
    fs: {
      existsSync: () => false,
    },
    readText: () => '',
    writeJson: () => {},
    readJsonIfExists: (_filePath, fallback) => fallback,
    mergeMappings: (left, right) => [...left, ...right],
    parseLegacyWorktreeMappings: () => [],
    seedOverlayFiles: () => {
      seedCalls += 1;
    },
    asArray: (value) => (Array.isArray(value) ? value : []),
  });

  loadMergedMappings({ paths: {} });
  assert.equal(seedCalls, 0);

  loadMergedMappings({ paths: {} }, { seed: true });
  assert.equal(seedCalls, 1);
});

test('unchanged overlay seed sync preserves snapshots so apply can reuse artifacts', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-reuse-seed-'));
  const toolPaths = createToolPaths(workspaceRoot);
  const defaults = [{ originalText: 'Save', changeText: '保存', searchType: 'exact' }];
  const { syncJsonArrayFileWithDefaults } = createOverlaySeedModule({
    toolPaths,
    ensureDir,
    readJsonIfExists,
    writeJson,
    mergeMappings,
    readDefaultMappings: () => defaults,
  });

  writeJson(toolPaths.overlayMappingPath, [
    { originalText: 'Custom', changeText: '自定义', searchType: 'exact' },
  ]);
  syncJsonArrayFileWithDefaults(toolPaths.overlayMappingPath, defaults);
  const snapshotsAfterSeed = collectMappingSourceSnapshots(fs, toolPaths);

  syncJsonArrayFileWithDefaults(toolPaths.overlayMappingPath, defaults);
  const snapshotsAfterNoopResync = collectMappingSourceSnapshots(fs, toolPaths);

  assert.equal(
    snapshotsAfterSeed[toolPaths.overlayMappingPath].mtimeMs,
    snapshotsAfterNoopResync[toolPaths.overlayMappingPath].mtimeMs
  );

  const workbenchOriginal = path.join(workspaceRoot, 'workbench.original.js');
  const workbenchTranslated = path.join(workspaceRoot, 'workbench.translated.js');
  const generatedWorkbench = path.join(workspaceRoot, 'workbench.generated.js');
  const mainTranslated = path.join(workspaceRoot, 'main.translated.js');
  const generatedMain = path.join(workspaceRoot, 'main.generated.js');
  fs.writeFileSync(workbenchOriginal, 'original');
  fs.writeFileSync(workbenchTranslated, 'translated');
  fs.writeFileSync(generatedWorkbench, 'translated');
  fs.writeFileSync(mainTranslated, 'main');
  fs.writeFileSync(generatedMain, 'main');

  const manifest = {
    runtimeStrategy: { mode: 'performance' },
    mappingSourceSnapshots: snapshotsAfterNoopResync,
    hashes: {
      workbenchOriginal: 'wb-original',
      workbenchTranslated: 'wb-translated',
      generatedWorkbench: 'wb-translated',
      mainTranslated: 'main-hash',
      generatedMain: 'main-hash',
    },
  };

  const cache = createSessionCache({
    sha256OfFile: (filePath) => {
      if (filePath === workbenchOriginal) return 'wb-original';
      if (filePath === workbenchTranslated || filePath === generatedWorkbench) return 'wb-translated';
      return 'main-hash';
    },
  });

  const context = {
    paths: {
      workbenchOriginalPath: workbenchOriginal,
      workbenchTranslatedPath: workbenchTranslated,
      mainTranslatedPath: mainTranslated,
    },
  };

  assert.equal(
    canReuseAppliedArtifacts(
      manifest,
      cache,
      context,
      fs,
      {
        ...toolPaths,
        generatedWorkbenchPath: generatedWorkbench,
        generatedMainPath: generatedMain,
      },
      'performance'
    ),
    true
  );
});

test('canReapplyStaticOnly returns true when mappings changed but workbench original is unchanged', () => {
  const commonPath = '/cursor-win.common.json';
  const manifest = {
    runtimeStrategy: { mode: 'performance' },
    mappingSourceSnapshots: {
      [commonPath]: { size: 10, mtimeMs: 100 },
    },
    hashes: {
      workbenchOriginal: 'workbench-hash',
    },
  };
  const cache = {
    sha256Cached: (_filePath, key) => (key === 'workbenchOriginal' ? 'workbench-hash' : null),
  };
  const context = {
    paths: {
      workbenchOriginalPath: '/wb.js',
      workbenchTranslatedPath: '/wb-t.js',
      translatorBootstrapPath: '/bootstrap.js',
    },
  };
  const toolPaths = {
    cursorWinCommonPath: commonPath,
    overlayMappingPath: '/overlay.json',
    baseMappingPath: '/base.json',
    dynamicMappingPath: '/dynamic.json',
    runtimeConfigPath: '/runtime.json',
    criticalUiTargetsPath: '/critical.js',
    productTipsHookPath: '/tips.js',
    textTranslatorTemplatePath: '/template.js',
  };
  const fs = createFsMock({
    [commonPath]: { size: 20, mtimeMs: 100 },
    '/overlay.json': { size: 1, mtimeMs: 1 },
    '/base.json': { size: 1, mtimeMs: 1 },
    '/dynamic.json': { size: 1, mtimeMs: 1 },
    '/runtime.json': { size: 1, mtimeMs: 1 },
    '/critical.js': { size: 1, mtimeMs: 1 },
    '/tips.js': { size: 1, mtimeMs: 1 },
    '/template.js': { size: 1, mtimeMs: 1 },
    '/wb-t.js': { size: 1, mtimeMs: 1 },
    '/bootstrap.js': { size: 1, mtimeMs: 1 },
  });

  assert.equal(mappingSourcesMatchManifest(manifest, fs, toolPaths), false);
  assert.equal(
    canReapplyStaticOnly(manifest, cache, context, fs, toolPaths, 'performance'),
    true
  );
});

test('canReapplyStaticOnly returns false when workbench original hash changed', () => {
  const manifest = {
    runtimeStrategy: { mode: 'performance' },
    mappingSourceSnapshots: {},
    hashes: {
      workbenchOriginal: 'old-workbench-hash',
    },
  };
  const cache = {
    sha256Cached: (_filePath, key) => (key === 'workbenchOriginal' ? 'new-workbench-hash' : null),
  };

  assert.equal(
    canReapplyStaticOnly(
      manifest,
      cache,
      {
        paths: {
          workbenchOriginalPath: '/wb.js',
          workbenchTranslatedPath: '/wb-t.js',
          translatorBootstrapPath: '/bootstrap.js',
        },
      },
      { existsSync: () => true },
      {},
      'performance'
    ),
    false
  );
});
