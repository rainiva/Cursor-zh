const test = require('node:test');
const assert = require('node:assert/strict');

const {
  canReapplyStaticOnly,
  mappingSourcesMatchManifest,
} = require('../../tool/session-cache.js');

function createFsMock(snapshotByPath) {
  return {
    existsSync: (filePath) => Boolean(snapshotByPath[filePath]),
    statSync: (filePath) => snapshotByPath[filePath],
  };
}

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
