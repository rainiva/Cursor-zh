const path = require('path');

const CURSOR_EXTENSION_CACHE_DIR_NAMES = ['CachedProfilesData', 'CachedExtensionVSIXs'];

function getCursorExtensionCachePaths(env = process.env) {
  if (!env.APPDATA) {
    return [];
  }

  const cursorAppDataDir = path.join(env.APPDATA, 'Cursor');
  return CURSOR_EXTENSION_CACHE_DIR_NAMES.map((name) => path.join(cursorAppDataDir, name));
}

function clearCursorExtensionCache({ env = process.env, fs: fsModule = require('fs') } = {}) {
  const removed = [];
  const missing = [];

  for (const cachePath of getCursorExtensionCachePaths(env)) {
    if (!fsModule.existsSync(cachePath)) {
      missing.push(cachePath);
      continue;
    }

    fsModule.rmSync(cachePath, { recursive: true, force: true });
    removed.push(cachePath);
  }

  return { removed, missing };
}

module.exports = {
  CURSOR_EXTENSION_CACHE_DIR_NAMES,
  getCursorExtensionCachePaths,
  clearCursorExtensionCache,
};
