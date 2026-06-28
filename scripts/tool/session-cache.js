const fs = require('fs');
const crypto = require('crypto');

function sha256OfText(text) {
  return crypto.createHash('sha256').update(String(text || '')).digest('hex');
}

function createSessionCache({ readText, sha256OfFile, fs: fsModule, manifest } = {}) {
  const fsRef = fsModule || fs;
  const readTextFn = readText || ((filePath) => fsRef.readFileSync(filePath, 'utf8'));
  const sha256Fn = sha256OfFile || null;
  const textCache = new Map();
  const hashCache = new Map();
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

  return {
    readTextCached,
    readTextPrefix,
    sha256Cached,
    filesEqualByHash,
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
};
