const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  CURSOR_EXTENSION_CACHE_DIR_NAMES,
  getCursorExtensionCachePaths,
  clearCursorExtensionCache,
} = require('../../tool/extension-cache.js');

test('CURSOR_EXTENSION_CACHE_DIR_NAMES lists extension cache folders', () => {
  assert.deepEqual(CURSOR_EXTENSION_CACHE_DIR_NAMES, [
    'CachedProfilesData',
    'CachedExtensionVSIXs',
  ]);
});

test('getCursorExtensionCachePaths resolves under APPDATA/Cursor', () => {
  const paths = getCursorExtensionCachePaths({ APPDATA: 'C:\\Users\\test\\AppData\\Roaming' });
  assert.equal(paths.length, 2);
  assert.equal(
    paths[0],
    path.join('C:\\Users\\test\\AppData\\Roaming', 'Cursor', 'CachedProfilesData')
  );
  assert.equal(
    paths[1],
    path.join('C:\\Users\\test\\AppData\\Roaming', 'Cursor', 'CachedExtensionVSIXs')
  );
});

test('getCursorExtensionCachePaths returns empty list when APPDATA is missing', () => {
  assert.deepEqual(getCursorExtensionCachePaths({}), []);
});

test('clearCursorExtensionCache removes existing cache directories', () => {
  const tempAppData = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-cache-'));
  const cursorDir = path.join(tempAppData, 'Cursor');

  for (const name of CURSOR_EXTENSION_CACHE_DIR_NAMES) {
    const dir = path.join(cursorDir, name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'probe.txt'), 'x');
  }

  const result = clearCursorExtensionCache({ env: { APPDATA: tempAppData }, fs });

  assert.equal(result.removed.length, 2);
  assert.equal(result.missing.length, 0);
  assert.equal(fs.existsSync(path.join(cursorDir, 'CachedProfilesData')), false);
  assert.equal(fs.existsSync(path.join(cursorDir, 'CachedExtensionVSIXs')), false);
});

test('clearCursorExtensionCache reports missing directories without error', () => {
  const tempAppData = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-cache-'));
  const result = clearCursorExtensionCache({ env: { APPDATA: tempAppData }, fs });

  assert.equal(result.removed.length, 0);
  assert.equal(result.missing.length, 2);
});
