const path = require('path');

const CACHE_VERSION = 1;

function createWorkbenchIndexCacheModule({
  cacheDir,
  sha256OfFile,
  createWorkbenchIndex,
  enrichWorkbenchIndexWithEmbeddedPatches,
  fs: fsModule,
}) {
  const fs = fsModule || require('fs');
  const memoryCache = new Map();

  function cacheFilePath(sourceHash, cursorVersion) {
    const versionLabel = String(cursorVersion || 'unknown').replace(/[^\w.-]+/g, '_');
    return path.join(cacheDir, `${sourceHash}.${versionLabel}.json`);
  }

  function deserializeIndex(payload, sourceText) {
    const quotedLiterals = new Set(payload.quotedLiterals || []);
    const text = String(sourceText || '');

    return {
      sourceText: text,
      quotedLiterals,
      isAuthoritative: payload.isAuthoritative === true,
      applicableEmbeddedPatches: payload.applicableEmbeddedPatches || null,
      includes(fragment) {
        return text.includes(String(fragment || ''));
      },
      hasQuotedLiteral(originalText) {
        if (typeof originalText !== 'string' || originalText.length === 0) {
          return false;
        }
        return quotedLiterals.has(originalText);
      },
    };
  }

  function serializeIndex(index) {
    return {
      version: CACHE_VERSION,
      quotedLiterals: index.quotedLiterals ? [...index.quotedLiterals] : [],
      isAuthoritative: index.isAuthoritative === true,
      applicableEmbeddedPatches: index.applicableEmbeddedPatches || null,
    };
  }

  function loadOrBuildWorkbenchIndex(sourcePath, sourceText, cursorVersion, options = {}) {
    const sourceHash =
      options.sourceHash ||
      (typeof sha256OfFile === 'function' ? sha256OfFile(sourcePath) : null) ||
      require('crypto').createHash('sha256').update(String(sourceText || '')).digest('hex');
    const memoryKey = `${sourceHash}:${cursorVersion || ''}`;

    if (memoryCache.has(memoryKey)) {
      return memoryCache.get(memoryKey);
    }

    const cachePath = cacheFilePath(sourceHash, cursorVersion);
    if (fs.existsSync(cachePath)) {
      const payload = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      if (payload.version === CACHE_VERSION && payload.sourceHash === sourceHash) {
        const cachedIndex = deserializeIndex(payload, sourceText);
        memoryCache.set(memoryKey, cachedIndex);
        return cachedIndex;
      }
    }

    let index = createWorkbenchIndex(sourceText);
    if (typeof enrichWorkbenchIndexWithEmbeddedPatches === 'function') {
      index = enrichWorkbenchIndexWithEmbeddedPatches(index, sourceText, cursorVersion);
    }

    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(
      cachePath,
      JSON.stringify(
        {
          sourceHash,
          ...serializeIndex(index),
        },
        null,
        0
      ),
      'utf8'
    );

    memoryCache.set(memoryKey, index);
    return index;
  }

  return {
    loadOrBuildWorkbenchIndex,
  };
}

module.exports = {
  CACHE_VERSION,
  createWorkbenchIndexCacheModule,
};
