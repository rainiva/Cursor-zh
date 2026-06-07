function createRuntimeStrategyModule({
  toolPaths,
  fs,
  readText,
  readJsonIfExists,
  selectRuntimeMappings,
  buildRuntimeConfig,
  parseInstalledRuntimeArtifact,
}) {
  function selectRuntimeMappingsForMode(workbenchSource, mergedMappings, runtimeMode) {
    return selectRuntimeMappings(workbenchSource, mergedMappings);
  }

  function buildRuntimeMappingsInfo(context, mappingInfo, runtimeMode) {
    const workbenchSource = fs.existsSync(context.paths.workbenchOriginalPath)
      ? readText(context.paths.workbenchOriginalPath)
      : '';
    return {
      workbenchSource,
      runtimeMappings: selectRuntimeMappingsForMode(
        workbenchSource,
        mappingInfo.mergedMappings,
        runtimeMode
      ),
    };
  }

  function buildRuntimeStrategyReport(
    mappingInfo,
    runtimeMappings,
    runtimeFootprint,
    runtimeMode
  ) {
    const fullRuntimeConfig = buildRuntimeConfig(runtimeMode);
    const actualRuntimeMappingCount = runtimeFootprint?.runtimeMappingCount ?? 0;
    const actualInjectedMappingCount = Array.isArray(runtimeMappings)
      ? runtimeMappings.length
      : actualRuntimeMappingCount;
    return {
      mode: fullRuntimeConfig.mode,
      rescanDelaysMs: fullRuntimeConfig.rescanDelaysMs,
      scopeSelectorCount: fullRuntimeConfig.observeScopeSelectors.length,
      marketplaceRemoteTranslationEnabled: Boolean(
        fullRuntimeConfig.marketplaceRemoteTranslationEnabled
      ),
      runtimeMappingCount: actualRuntimeMappingCount,
      runtimeHeaderChars: runtimeFootprint?.runtimeHeaderChars ?? 0,
      runtimeHeaderKB: runtimeFootprint?.runtimeHeaderKB ?? 0,
      prunedMappingCount: Math.max(
        mappingInfo.mergedMappings.length - actualInjectedMappingCount,
        0
      ),
    };
  }

  function detectAppliedRuntimeMode(context) {
    if (fs.existsSync(context.paths.workbenchTranslatedPath)) {
      const translatedWorkbenchArtifact = parseInstalledRuntimeArtifact(
        readText(context.paths.workbenchTranslatedPath)
      );
      if (translatedWorkbenchArtifact?.runtimeStrategy?.mode) {
        return translatedWorkbenchArtifact.runtimeStrategy.mode;
      }
    }

    if (fs.existsSync(toolPaths.buildManifestPath)) {
      const manifestRuntimeMode = readJsonIfExists(toolPaths.buildManifestPath, null)?.runtimeStrategy
        ?.mode;
      if (manifestRuntimeMode === 'performance' || manifestRuntimeMode === 'compatibility') {
        return manifestRuntimeMode;
      }
    }

    return 'performance';
  }

  return {
    selectRuntimeMappingsForMode,
    buildRuntimeMappingsInfo,
    buildRuntimeStrategyReport,
    detectAppliedRuntimeMode,
  };
}

module.exports = {
  createRuntimeStrategyModule,
};
