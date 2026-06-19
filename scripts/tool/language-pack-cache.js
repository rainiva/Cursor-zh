const path = require('path');

function findLanguagePackCacheMessagePaths(env = process.env, fsModule = require('fs')) {
  if (!env.APPDATA) {
    return [];
  }

  const clpRoot = path.join(env.APPDATA, 'Cursor', 'clp');
  if (!fsModule.existsSync(clpRoot)) {
    return [];
  }

  const messagePaths = [];
  for (const localeEntry of fsModule.readdirSync(clpRoot, { withFileTypes: true })) {
    if (!localeEntry.isDirectory() || !localeEntry.name.endsWith('.zh-cn')) {
      continue;
    }

    const localeDir = path.join(clpRoot, localeEntry.name);
    for (const cacheEntry of fsModule.readdirSync(localeDir, { withFileTypes: true })) {
      if (!cacheEntry.isDirectory()) {
        continue;
      }

      const messagePath = path.join(localeDir, cacheEntry.name, 'nls.messages.json');
      if (fsModule.existsSync(messagePath)) {
        messagePaths.push(messagePath);
      }
    }
  }

  return messagePaths;
}

function syncLanguagePackCacheMessages({
  env = process.env,
  messages,
  fs: fsModule = require('fs'),
  writeJson = (filePath, payload) => {
    fsModule.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  },
} = {}) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { updated: [], missing: [] };
  }

  const updated = [];
  for (const messagePath of findLanguagePackCacheMessagePaths(env, fsModule)) {
    writeJson(messagePath, messages);
    updated.push(messagePath);
  }

  return { updated, missing: [] };
}

function clearLanguagePackCache({ env = process.env, fs: fsModule = require('fs') } = {}) {
  if (!env.APPDATA) {
    return { removed: [], missing: [] };
  }

  const clpRoot = path.join(env.APPDATA, 'Cursor', 'clp');
  if (!fsModule.existsSync(clpRoot)) {
    return { removed: [], missing: [clpRoot] };
  }

  const removed = [];
  const missing = [];
  for (const localeEntry of fsModule.readdirSync(clpRoot, { withFileTypes: true })) {
    if (!localeEntry.isDirectory() || !localeEntry.name.endsWith('.zh-cn')) {
      continue;
    }

    const localeDir = path.join(clpRoot, localeEntry.name);
    fsModule.rmSync(localeDir, { recursive: true, force: true });
    removed.push(localeDir);
  }

  if (removed.length === 0) {
    missing.push(clpRoot);
  }

  return { removed, missing };
}

module.exports = {
  findLanguagePackCacheMessagePaths,
  syncLanguagePackCacheMessages,
  clearLanguagePackCache,
};
