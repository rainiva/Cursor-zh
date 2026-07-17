const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createCoverageWorkbenchContext } = require('../lib/analyzer/workbench-coverage-context.js');

const VERIFY_SESSION_CACHE_RELATIVE = 'state/cache/verify-session.json';

function buildVerifyReuseKey({
  bundleHashes = {},
  nlsInventoryHash = '',
  translationUnitsSnapshot = '',
  runtimeGovernanceSnapshot = '',
  toolVersion = '',
} = {}) {
  const normalizedBundles = Object.entries(bundleHashes || {})
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([capabilityId, hash]) => `${capabilityId}=${hash}`)
    .join('\n');
  const payload = [
    normalizedBundles,
    String(nlsInventoryHash || ''),
    String(translationUnitsSnapshot || ''),
    String(runtimeGovernanceSnapshot || ''),
    String(toolVersion || ''),
  ].join('\0');
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Cold verify sampling may clear only the cursor-zh verify session cache.
 * Never touches backups, OS caches, or install-directory artifacts.
 */
async function clearVerifySessionCache(options = {}) {
  const fsRef = options.fs || fs;
  const workspaceRoot =
    typeof options === 'string'
      ? options
      : options.workspaceRoot || options.rootDir || null;
  if (!workspaceRoot) {
    return [];
  }

  const relativePath = VERIFY_SESSION_CACHE_RELATIVE;
  const absolutePath = path.join(workspaceRoot, ...relativePath.split('/'));
  if (!fsRef.existsSync(absolutePath)) {
    return [];
  }

  fsRef.unlinkSync(absolutePath);
  return [relativePath];
}

function readVerifySessionCache(workspaceRoot, { fs: fsModule } = {}) {
  const fsRef = fsModule || fs;
  if (!workspaceRoot) {
    return null;
  }
  const absolutePath = path.join(workspaceRoot, ...VERIFY_SESSION_CACHE_RELATIVE.split('/'));
  if (!fsRef.existsSync(absolutePath)) {
    return null;
  }
  try {
    return JSON.parse(fsRef.readFileSync(absolutePath, 'utf8'));
  } catch {
    return null;
  }
}

function writeVerifySessionCache(workspaceRoot, payload, { fs: fsModule } = {}) {
  const fsRef = fsModule || fs;
  if (!workspaceRoot) {
    return null;
  }
  const absolutePath = path.join(workspaceRoot, ...VERIFY_SESSION_CACHE_RELATIVE.split('/'));
  fsRef.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fsRef.writeFileSync(absolutePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return absolutePath;
}

function canReuseVerifySession(sessionCache, reuseKey) {
  if (!sessionCache || !reuseKey) {
    return false;
  }
  if (sessionCache.reuseKey !== reuseKey) {
    return false;
  }
  // Never reuse cached admission after any key component changes (enforced by reuseKey).
  return Boolean(sessionCache.coverage || sessionCache.locatorOutcomes || sessionCache.shardMeasurements);
}

function sha256OfText(text) {
  return crypto.createHash('sha256').update(String(text || '')).digest('hex');
}

function createSessionCache({ readText, sha256OfFile, fs: fsModule, manifest } = {}) {
  const fsRef = fsModule || fs;
  const readTextFn = readText || ((filePath) => fsRef.readFileSync(filePath, 'utf8'));
  const sha256Fn = sha256OfFile || null;
  const textCache = new Map();
  const hashCache = new Map();
  const coverageContextCache = new Map();
  const manifestGeneratedAtMs = manifest?.generatedAt ? Date.parse(manifest.generatedAt) : 0;

  function readTextCached(filePath) {
    if (!filePath) {
      return '';
    }
    if (textCache.has(filePath)) {
      return textCache.get(filePath);
    }
    const text = readTextFn(filePath);
    textCache.set(filePath, text);
    return text;
  }

  function readTextPrefix(filePath, maxBytes = 4096) {
    if (!filePath || !fsRef.existsSync(filePath)) {
      return '';
    }
    const fd = fsRef.openSync(filePath, 'r');
    try {
      const buffer = Buffer.alloc(maxBytes);
      const bytesRead = fsRef.readSync(fd, buffer, 0, maxBytes, 0);
      return buffer.slice(0, bytesRead).toString('utf8');
    } finally {
      fsRef.closeSync(fd);
    }
  }

  function sha256Cached(filePath, manifestHashKey) {
    if (!filePath) {
      return null;
    }
    if (hashCache.has(filePath)) {
      return hashCache.get(filePath);
    }

    if (
      manifest &&
      manifestHashKey &&
      manifest.hashes?.[manifestHashKey] &&
      manifestGeneratedAtMs > 0 &&
      fsRef.existsSync(filePath)
    ) {
      const stat = fsRef.statSync(filePath);
      if (stat.mtimeMs <= manifestGeneratedAtMs + 2000) {
        hashCache.set(filePath, manifest.hashes[manifestHashKey]);
        return manifest.hashes[manifestHashKey];
      }
    }

    if (textCache.has(filePath)) {
      const digest = sha256OfText(textCache.get(filePath));
      hashCache.set(filePath, digest);
      return digest;
    }

    if (!sha256Fn) {
      return null;
    }

    const digest = sha256Fn(filePath);
    hashCache.set(filePath, digest);
    return digest;
  }

  function filesEqualByHash(pathA, pathB, manifestKeyA, manifestKeyB) {
    if (!pathA || !pathB || !fsRef.existsSync(pathA) || !fsRef.existsSync(pathB)) {
      return false;
    }

    const statA = fsRef.statSync(pathA);
    const statB = fsRef.statSync(pathB);
    if (statA.size !== statB.size) {
      return false;
    }

    const hashA = sha256Cached(pathA, manifestKeyA);
    const hashB = sha256Cached(pathB, manifestKeyB);
    return Boolean(hashA && hashB && hashA === hashB);
  }

  function getCoverageContextCached(sourceHash, sourceText, workbenchIndex) {
    const key = String(sourceHash || sha256OfText(sourceText));
    if (coverageContextCache.has(key)) {
      return coverageContextCache.get(key);
    }
    const context = createCoverageWorkbenchContext(sourceText, workbenchIndex);
    coverageContextCache.set(key, context);
    return context;
  }

  return {
    readTextCached,
    readTextPrefix,
    sha256Cached,
    filesEqualByHash,
    getCoverageContextCached,
  };
}

function collectMappingSourceSnapshots(fsModule, toolPaths) {
  const fsRef = fsModule || fs;
  const paths = [
    toolPaths.baseMappingPath,
    toolPaths.overlayMappingPath,
    toolPaths.cursorWinCommonPath,
    toolPaths.dynamicMappingPath,
    toolPaths.runtimeConfigPath,
    toolPaths.criticalUiTargetsPath,
    toolPaths.productTipsHookPath,
    toolPaths.textTranslatorTemplatePath,
    toolPaths.translationUnitsPath,
  ];
  const snapshots = {};

  for (const filePath of paths) {
    if (!filePath || !fsRef.existsSync(filePath)) {
      continue;
    }
    const stat = fsRef.statSync(filePath);
    snapshots[filePath] = {
      size: stat.size,
      mtimeMs: stat.mtimeMs,
    };
  }

  return snapshots;
}

function mappingSourcesMatchManifest(manifest, fsModule, toolPaths) {
  const stored = manifest?.mappingSourceSnapshots;
  if (!stored || typeof stored !== 'object') {
    return false;
  }

  const fsRef = fsModule || fs;
  const current = collectMappingSourceSnapshots(fsRef, toolPaths);

  for (const [filePath, snapshot] of Object.entries(current)) {
    if (!stored[filePath]) {
      return false;
    }
    const stat = fsRef.statSync(filePath);
    if (stat.size !== stored[filePath].size || stat.mtimeMs !== stored[filePath].mtimeMs) {
      return false;
    }
  }

  for (const [filePath, snapshot] of Object.entries(stored)) {
    if (!fsRef.existsSync(filePath)) {
      return false;
    }
    const stat = fsRef.statSync(filePath);
    if (stat.size !== snapshot.size || stat.mtimeMs !== snapshot.mtimeMs) {
      return false;
    }
  }

  return true;
}

function canReuseManifestCoverage(manifest, cache, context, fsModule, toolPaths) {
  if (manifest?.coverageDeferred === true) {
    return false;
  }

  if (!manifest?.cursorWinCoverage || !manifest?.dynamicCoverage || !manifest?.productTipsCoverage) {
    return false;
  }

  if (!mappingSourcesMatchManifest(manifest, fsModule, toolPaths)) {
    return false;
  }

  const workbenchOriginalHash = cache.sha256Cached(
    context.paths.workbenchOriginalPath,
    'workbenchOriginal'
  );
  if (!workbenchOriginalHash || manifest.hashes?.workbenchOriginal !== workbenchOriginalHash) {
    return false;
  }

  if (
    context.paths.workbenchGlassOriginalPath &&
    fsModule.existsSync(context.paths.workbenchGlassOriginalPath)
  ) {
    const workbenchGlassOriginalHash = cache.sha256Cached(
      context.paths.workbenchGlassOriginalPath,
      'workbenchGlassOriginal'
    );
    if (
      !workbenchGlassOriginalHash ||
      manifest.hashes?.workbenchGlassOriginal !== workbenchGlassOriginalHash
    ) {
      return false;
    }
  }

  return true;
}

function canReuseManifestStaticContracts(manifest, cache, context) {
  if (!manifest?.staticPatchContracts || !manifest?.staticPatchContractEvaluation) {
    return false;
  }

  const workbenchTranslatedHash = cache.sha256Cached(
    context.paths.workbenchTranslatedPath,
    'workbenchTranslated'
  );
  return Boolean(
    workbenchTranslatedHash && manifest.hashes?.workbenchTranslated === workbenchTranslatedHash
  );
}

function createMappingInfoFromManifest(manifest) {
  const counts = manifest?.mappingCounts || {};
  const stubArray = (count) => Array(Math.max(Number(count) || 0, 0)).fill(null);
  return {
    baseMappings: stubArray(counts.base),
    overlayMappings: stubArray(counts.overlay),
    cursorWinCommonMappings: stubArray(counts.cursorWinCommon),
    dynamicMappings: stubArray(counts.dynamic),
    mergedMappings: stubArray(counts.merged),
  };
}

function canReuseAppliedArtifacts(manifest, cache, context, fsModule, toolPaths, runtimeMode) {
  if (!manifest?.hashes?.workbenchTranslated || !manifest?.hashes?.generatedWorkbench) {
    return false;
  }

  if ((manifest.runtimeStrategy?.mode || 'performance') !== runtimeMode) {
    return false;
  }

  if (!mappingSourcesMatchManifest(manifest, fsModule, toolPaths)) {
    return false;
  }

  const workbenchOriginalHash = cache.sha256Cached(
    context.paths.workbenchOriginalPath,
    'workbenchOriginal'
  );
  if (!workbenchOriginalHash || manifest.hashes.workbenchOriginal !== workbenchOriginalHash) {
    return false;
  }

  const desktopArtifactsMatch =
    cache.filesEqualByHash(
      context.paths.workbenchTranslatedPath,
      toolPaths.generatedWorkbenchPath,
      'workbenchTranslated',
      'generatedWorkbench'
    ) &&
    cache.filesEqualByHash(
      context.paths.mainTranslatedPath,
      toolPaths.generatedMainPath,
      'mainTranslated',
      'generatedMain'
    );

  if (!desktopArtifactsMatch) {
    return false;
  }

  if (
    context.paths.workbenchGlassOriginalPath &&
    fsModule.existsSync(context.paths.workbenchGlassOriginalPath)
  ) {
    const workbenchGlassOriginalHash = cache.sha256Cached(
      context.paths.workbenchGlassOriginalPath,
      'workbenchGlassOriginal'
    );
    if (
      !workbenchGlassOriginalHash ||
      manifest.hashes?.workbenchGlassOriginal !== workbenchGlassOriginalHash
    ) {
      return false;
    }

    return cache.filesEqualByHash(
      context.paths.workbenchGlassTranslatedPath,
      toolPaths.generatedGlassWorkbenchPath,
      'workbenchGlassTranslated',
      'generatedGlassWorkbench'
    );
  }

  return true;
}

function canReapplyStaticOnly(manifest, cache, context, fsModule, toolPaths, runtimeMode) {
  if (!manifest?.hashes?.workbenchOriginal) {
    return false;
  }

  if ((manifest.runtimeStrategy?.mode || 'performance') !== runtimeMode) {
    return false;
  }

  if (mappingSourcesMatchManifest(manifest, fsModule, toolPaths)) {
    return false;
  }

  const workbenchOriginalHash = cache.sha256Cached(
    context.paths.workbenchOriginalPath,
    'workbenchOriginal'
  );
  if (!workbenchOriginalHash || manifest.hashes.workbenchOriginal !== workbenchOriginalHash) {
    return false;
  }

  return (
    fsModule.existsSync(context.paths.workbenchTranslatedPath) &&
    fsModule.existsSync(context.paths.translatorBootstrapPath)
  );
}

module.exports = {
  createSessionCache,
  collectMappingSourceSnapshots,
  mappingSourcesMatchManifest,
  canReuseManifestCoverage,
  canReuseManifestStaticContracts,
  canReuseAppliedArtifacts,
  canReapplyStaticOnly,
  createMappingInfoFromManifest,
  buildVerifyReuseKey,
  clearVerifySessionCache,
  readVerifySessionCache,
  writeVerifySessionCache,
  canReuseVerifySession,
  VERIFY_SESSION_CACHE_RELATIVE,
};
