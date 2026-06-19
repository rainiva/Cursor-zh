const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  createSessionCache,
  collectMappingSourceSnapshots,
  mappingSourcesMatchManifest,
  canReuseManifestCoverage,
  canReuseAppliedArtifacts,
  createMappingInfoFromManifest,
} = require('../../tool/session-cache.js');

test('createSessionCache reuses manifest hash when file mtime is unchanged', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-cache-'));
  const filePath = path.join(tempDir, 'workbench.js');
  fs.writeFileSync(filePath, 'bundle-source');

  const generatedAt = new Date().toISOString();
  const manifest = {
    generatedAt,
    hashes: { workbenchOriginal: 'manifest-hash' },
  };

  let sha256Calls = 0;
  const cache = createSessionCache({
    sha256OfFile: () => {
      sha256Calls += 1;
      return 'disk-hash';
    },
    manifest,
  });

  const first = cache.sha256Cached(filePath, 'workbenchOriginal');
  const second = cache.sha256Cached(filePath, 'workbenchOriginal');

  assert.equal(first, 'manifest-hash');
  assert.equal(second, 'manifest-hash');
  assert.equal(sha256Calls, 0);
});

test('createSessionCache falls back to disk hash when file changed after manifest', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-cache-'));
  const filePath = path.join(tempDir, 'workbench.js');
  fs.writeFileSync(filePath, 'bundle-source');

  const manifest = {
    generatedAt: new Date(Date.now() - 60_000).toISOString(),
    hashes: { workbenchOriginal: 'stale-hash' },
  };

  const cache = createSessionCache({
    sha256OfFile: () => 'fresh-hash',
    manifest,
  });

  assert.equal(cache.sha256Cached(filePath, 'workbenchOriginal'), 'fresh-hash');
});

test('filesEqualByHash compares size first and reuses cached digests', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-cache-'));
  const left = path.join(tempDir, 'left.js');
  const right = path.join(tempDir, 'right.js');
  fs.writeFileSync(left, 'same-content');
  fs.writeFileSync(right, 'same-content');

  let sha256Calls = 0;
  const cache = createSessionCache({
    sha256OfFile: (filePath) => {
      sha256Calls += 1;
      return filePath.endsWith('left.js') ? 'hash-a' : 'hash-b';
    },
  });

  assert.equal(cache.filesEqualByHash(left, right), false);
  assert.equal(sha256Calls, 2);

  sha256Calls = 0;
  const cacheSame = createSessionCache({
    sha256OfFile: () => {
      sha256Calls += 1;
      return 'same-hash';
    },
  });
  assert.equal(cacheSame.filesEqualByHash(left, right), true);
  assert.equal(sha256Calls, 2);
});

test('canReuseManifestCoverage returns false when coverageDeferred is true', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-cache-'));
  const mappingPath = path.join(tempDir, 'cursor-win.common.json');
  fs.writeFileSync(mappingPath, '[]');
  const stat = fs.statSync(mappingPath);

  const workbenchPath = path.join(tempDir, 'workbench.js');
  fs.writeFileSync(workbenchPath, 'bundle');

  const toolPaths = { cursorWinCommonPath: mappingPath };
  const context = { paths: { workbenchOriginalPath: workbenchPath } };
  const manifest = {
    coverageDeferred: true,
    cursorWinCoverage: { totalTargetCount: 1 },
    dynamicCoverage: { totalRuleCount: 1 },
    productTipsCoverage: { totalTipCount: 1 },
    mappingSourceSnapshots: {
      [mappingPath]: { size: stat.size, mtimeMs: stat.mtimeMs },
    },
    hashes: { workbenchOriginal: 'wb-hash' },
  };

  const cache = createSessionCache({
    sha256OfFile: () => 'wb-hash',
  });

  assert.equal(canReuseManifestCoverage(manifest, cache, context, fs, toolPaths), false);
});

test('canReuseManifestCoverage returns true when manifest snapshots and workbench hash match', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-cache-'));
  const mappingPath = path.join(tempDir, 'cursor-win.common.json');
  fs.writeFileSync(mappingPath, '[]');
  const stat = fs.statSync(mappingPath);

  const workbenchPath = path.join(tempDir, 'workbench.js');
  fs.writeFileSync(workbenchPath, 'bundle');

  const toolPaths = { cursorWinCommonPath: mappingPath };
  const context = { paths: { workbenchOriginalPath: workbenchPath } };
  const manifest = {
    cursorWinCoverage: { totalTargetCount: 1 },
    dynamicCoverage: { totalRuleCount: 1 },
    productTipsCoverage: { totalTipCount: 1 },
    mappingSourceSnapshots: {
      [mappingPath]: { size: stat.size, mtimeMs: stat.mtimeMs },
    },
    hashes: { workbenchOriginal: 'wb-hash' },
  };

  const cache = createSessionCache({
    sha256OfFile: () => 'wb-hash',
  });

  assert.equal(canReuseManifestCoverage(manifest, cache, context, fs, toolPaths), true);
});

test('createMappingInfoFromManifest exposes merged mapping count without loading JSON', () => {
  const mappingInfo = createMappingInfoFromManifest({
    mappingCounts: {
      base: 1,
      overlay: 2,
      cursorWinCommon: 3,
      dynamic: 4,
      merged: 10,
    },
  });

  assert.equal(mappingInfo.baseMappings.length, 1);
  assert.equal(mappingInfo.overlayMappings.length, 2);
  assert.equal(mappingInfo.cursorWinCommonMappings.length, 3);
  assert.equal(mappingInfo.dynamicMappings.length, 4);
  assert.equal(mappingInfo.mergedMappings.length, 10);
});

test('collectMappingSourceSnapshots and mappingSourcesMatchManifest detect drift', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-cache-'));
  const mappingPath = path.join(tempDir, 'overlay.json');
  fs.writeFileSync(mappingPath, '[]');

  const toolPaths = { overlayMappingPath: mappingPath };
  const snapshots = collectMappingSourceSnapshots(fs, toolPaths);
  assert.ok(snapshots[mappingPath]);

  assert.equal(mappingSourcesMatchManifest({ mappingSourceSnapshots: snapshots }, fs, toolPaths), true);

  fs.writeFileSync(mappingPath, '[{"source":"changed"}]');
  assert.equal(mappingSourcesMatchManifest({ mappingSourceSnapshots: snapshots }, fs, toolPaths), false);
});

test('canReuseAppliedArtifacts returns true when installed artifacts match manifest and runtime mode', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-cache-'));
  const workbenchOriginal = path.join(tempDir, 'workbench.original.js');
  const workbenchTranslated = path.join(tempDir, 'workbench.translated.js');
  const generatedWorkbench = path.join(tempDir, 'workbench.generated.js');
  fs.writeFileSync(workbenchOriginal, 'original');
  fs.writeFileSync(workbenchTranslated, 'translated');
  fs.writeFileSync(generatedWorkbench, 'translated');

  const mappingPath = path.join(tempDir, 'overlay.json');
  fs.writeFileSync(mappingPath, '[]');
  const stat = fs.statSync(mappingPath);

  const toolPaths = {
    overlayMappingPath: mappingPath,
    generatedWorkbenchPath: generatedWorkbench,
    generatedMainPath: path.join(tempDir, 'main.generated.js'),
  };
  const context = {
    paths: {
      workbenchOriginalPath: workbenchOriginal,
      workbenchTranslatedPath: workbenchTranslated,
      mainTranslatedPath: path.join(tempDir, 'main.translated.js'),
    },
  };
  fs.writeFileSync(context.paths.mainTranslatedPath, 'main');
  fs.writeFileSync(toolPaths.generatedMainPath, 'main');

  const manifest = {
    runtimeStrategy: { mode: 'performance' },
    mappingSourceSnapshots: {
      [mappingPath]: { size: stat.size, mtimeMs: stat.mtimeMs },
    },
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

  assert.equal(
    canReuseAppliedArtifacts(manifest, cache, context, fs, toolPaths, 'performance'),
    true
  );
  assert.equal(
    canReuseAppliedArtifacts(manifest, cache, context, fs, toolPaths, 'compatibility'),
    false
  );
});
