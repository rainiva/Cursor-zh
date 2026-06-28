function createManifestModule({
  toolPaths,
  sha256OfFile,
  compareLanguagePackVersion,
  writeJson,
  collectMappingSourceSnapshots,
  fs: fsModule,
  resolvePatchPackId = require('../lib/mapping/versioned-patches').resolvePatchPackId,
}) {
  const fsRef = fsModule || require('fs');
  function hashFile(filePath, manifestKey, hashCache) {
    if (hashCache) {
      const cached = hashCache.sha256Cached(filePath, manifestKey);
      if (cached) {
        return cached;
      }
    }
    return sha256OfFile(filePath);
  }

  function buildManifest(
    context,
    installMetadata,
    languagePack,
    mappingInfo,
    backupDir,
    cursorWinCoverage,
    dynamicCoverage,
    productTipsCoverage,
    runtimeStrategy,
    staticPatchContracts,
    staticPatchContractEvaluation,
    hashCache = null
  ) {
    return {
      generatedAt: new Date().toISOString(),
      workspaceRoot: toolPaths.workspaceRoot,
      installDir: context.paths.installDir,
      backupDir,
      cursorVersion: installMetadata.pkg.version,
      patchPackVersion: resolvePatchPackId(installMetadata.pkg.version),
      cursorDistro: installMetadata.pkg.distro,
      vscodeVersion: installMetadata.product.vscodeVersion,
      languagePack: languagePack
        ? {
            path: languagePack.path,
            version: languagePack.version,
            compatibility: compareLanguagePackVersion(
              languagePack.version,
              installMetadata.product.vscodeVersion
            ),
          }
        : null,
      mappingCounts: {
        base: mappingInfo.baseMappings.length,
        overlay: mappingInfo.overlayMappings.length,
        cursorWinCommon: mappingInfo.cursorWinCommonMappings.length,
        dynamic: mappingInfo.dynamicMappings.length,
        merged: mappingInfo.mergedMappings.length,
        runtime: runtimeStrategy.runtimeMappingCount,
        prunedForRuntime: runtimeStrategy.prunedMappingCount,
        scopeSelectors: runtimeStrategy.scopeSelectorCount,
      },
      cursorWinCoverage,
      dynamicCoverage,
      productTipsCoverage,
      runtimeStrategy,
      staticPatchContracts,
      staticPatchContractEvaluation,
      ...(hashCache?.preflightTiming ? { preflightTiming: hashCache.preflightTiming } : {}),
      coverageDeferred: Boolean(cursorWinCoverage?.deferred),
      files: {
        packageJsonPath: context.paths.packageJsonPath,
        translatorBootstrapPath: context.paths.translatorBootstrapPath,
        mainOriginalPath: context.paths.mainOriginalPath,
        mainTranslatedPath: context.paths.mainTranslatedPath,
        nlsKeysPath: context.paths.nlsKeysPath,
        nlsMessagesPath: context.paths.nlsMessagesPath,
        workbenchOriginalPath: context.paths.workbenchOriginalPath,
        workbenchTranslatedPath: context.paths.workbenchTranslatedPath,
        workbenchGlassOriginalPath: context.paths.workbenchGlassOriginalPath,
        workbenchGlassTranslatedPath: context.paths.workbenchGlassTranslatedPath,
        argvPath: context.paths.argvPath,
        localeMirrorPath: context.paths.userLocaleMirrorPath,
        cursorWinCommonPath: toolPaths.cursorWinCommonPath,
        dynamicMappingPath: toolPaths.dynamicMappingPath,
      },
      hashes: {
        packageJson: hashFile(context.paths.packageJsonPath, 'packageJson', hashCache),
        translatorBootstrap: hashFile(
          context.paths.translatorBootstrapPath,
          'translatorBootstrap',
          hashCache
        ),
        mainOriginal: hashFile(context.paths.mainOriginalPath, 'mainOriginal', hashCache),
        mainTranslated: hashFile(context.paths.mainTranslatedPath, 'mainTranslated', hashCache),
        generatedMain: hashFile(toolPaths.generatedMainPath, 'generatedMain', hashCache),
        nlsMessages: hashFile(context.paths.nlsMessagesPath, 'nlsMessages', hashCache),
        generatedNlsMessages: hashFile(
          toolPaths.generatedNlsMessagesPath,
          'generatedNlsMessages',
          hashCache
        ),
        workbenchOriginal: hashFile(
          context.paths.workbenchOriginalPath,
          'workbenchOriginal',
          hashCache
        ),
        workbenchTranslated: hashFile(
          context.paths.workbenchTranslatedPath,
          'workbenchTranslated',
          hashCache
        ),
        generatedWorkbench: hashFile(toolPaths.generatedWorkbenchPath, 'generatedWorkbench', hashCache),
        workbenchGlassOriginal: context.paths.workbenchGlassOriginalPath
          ? hashFile(context.paths.workbenchGlassOriginalPath, 'workbenchGlassOriginal', hashCache)
          : null,
        workbenchGlassTranslated: context.paths.workbenchGlassTranslatedPath
          ? hashFile(
              context.paths.workbenchGlassTranslatedPath,
              'workbenchGlassTranslated',
              hashCache
            )
          : null,
        generatedGlassWorkbench: hashFile(
          toolPaths.generatedGlassWorkbenchPath,
          'generatedGlassWorkbench',
          hashCache
        ),
      },
      mappingSourceSnapshots: collectMappingSourceSnapshots
        ? collectMappingSourceSnapshots(fsRef, toolPaths)
        : {},
    };
  }

  function writeManifest(manifest) {
    writeJson(toolPaths.buildManifestPath, manifest);
  }

  return {
    buildManifest,
    writeManifest,
  };
}

module.exports = {
  createManifestModule,
};
