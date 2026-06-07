function createManifestModule({ toolPaths, sha256OfFile, compareLanguagePackVersion, writeJson }) {
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
    staticPatchContractEvaluation
  ) {
    return {
      generatedAt: new Date().toISOString(),
      workspaceRoot: toolPaths.workspaceRoot,
      installDir: context.paths.installDir,
      backupDir,
      cursorVersion: installMetadata.pkg.version,
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
      files: {
        packageJsonPath: context.paths.packageJsonPath,
        translatorBootstrapPath: context.paths.translatorBootstrapPath,
        mainOriginalPath: context.paths.mainOriginalPath,
        mainTranslatedPath: context.paths.mainTranslatedPath,
        nlsKeysPath: context.paths.nlsKeysPath,
        nlsMessagesPath: context.paths.nlsMessagesPath,
        workbenchOriginalPath: context.paths.workbenchOriginalPath,
        workbenchTranslatedPath: context.paths.workbenchTranslatedPath,
        argvPath: context.paths.argvPath,
        localeMirrorPath: context.paths.userLocaleMirrorPath,
        cursorWinCommonPath: toolPaths.cursorWinCommonPath,
        dynamicMappingPath: toolPaths.dynamicMappingPath,
      },
      hashes: {
        packageJson: sha256OfFile(context.paths.packageJsonPath),
        translatorBootstrap: sha256OfFile(context.paths.translatorBootstrapPath),
        mainOriginal: sha256OfFile(context.paths.mainOriginalPath),
        mainTranslated: sha256OfFile(context.paths.mainTranslatedPath),
        generatedMain: sha256OfFile(toolPaths.generatedMainPath),
        nlsMessages: sha256OfFile(context.paths.nlsMessagesPath),
        generatedNlsMessages: sha256OfFile(toolPaths.generatedNlsMessagesPath),
        workbenchOriginal: sha256OfFile(context.paths.workbenchOriginalPath),
        workbenchTranslated: sha256OfFile(context.paths.workbenchTranslatedPath),
        generatedWorkbench: sha256OfFile(toolPaths.generatedWorkbenchPath),
      },
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
