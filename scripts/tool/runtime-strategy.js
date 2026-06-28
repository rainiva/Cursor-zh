const { summarizeRuntimePools } = require('../lib/mapping/runtime-pools.js');

function createRuntimeStrategyModule({
  toolPaths,
  fs,
  readText,
  readJsonIfExists,
  selectRuntimeMappings,
  selectRuntimeMappingsUnion,
  buildRuntimeConfig,
  parseInstalledRuntimeArtifact,
  createWorkbenchIndex,
}) {
  const unionSelector =
    selectRuntimeMappingsUnion ||
    ((sources, mappings) => {
      const { selectRuntimeMappingsUnion: factory } = require('../lib/patcher/runtime-selector.js');
      return factory(sources, mappings);
    });
  const buildWorkbenchIndex =
    createWorkbenchIndex ||
    ((sourceText) => {
      const { createWorkbenchIndex: factory } = require('../lib/patcher/workbench-index.js');
      return factory(sourceText);
    });

  function selectRuntimeMappingsForMode(workbenchSource, mergedMappings, runtimeMode, workbenchIndex) {
    return selectRuntimeMappings(workbenchSource, mergedMappings, workbenchIndex);
  }

  function buildRuntimeMappingsInfo(context, mappingInfo, runtimeMode, options = {}) {
    if (Array.isArray(options.workbenchSources) && options.workbenchSources.length > 0) {
      const primary = options.workbenchSources[0];
      return {
        workbenchSource: primary.workbenchSource,
        workbenchIndex: primary.workbenchIndex,
        runtimeMappings: unionSelector(options.workbenchSources, mappingInfo.mergedMappings),
      };
    }

    const workbenchSource =
      typeof options.workbenchSource === 'string'
        ? options.workbenchSource
        : fs.existsSync(context.paths.workbenchOriginalPath)
          ? readText(context.paths.workbenchOriginalPath)
          : '';
    const workbenchIndex =
      options.workbenchIndex || buildWorkbenchIndex(workbenchSource);
    return {
      workbenchSource,
      workbenchIndex,
      runtimeMappings: selectRuntimeMappingsForMode(
        workbenchSource,
        mappingInfo.mergedMappings,
        runtimeMode,
        workbenchIndex
      ),
    };
  }

  function buildRuntimeStrategyReport(
    mappingInfo,
    runtimeMappings,
    runtimeFootprint,
    runtimeMode,
    options = {}
  ) {
    const fullRuntimeConfig = buildRuntimeConfig(runtimeMode);
    const actualRuntimeMappingCount = runtimeFootprint?.runtimeMappingCount ?? 0;
    const actualInjectedMappingCount = Array.isArray(runtimeMappings)
      ? runtimeMappings.length
      : actualRuntimeMappingCount;
    const hasQuotedLiteral =
      typeof options.workbenchIndex?.hasQuotedLiteral === 'function'
        ? (text) => options.workbenchIndex.hasQuotedLiteral(text)
        : () => false;
    return {
      mode: fullRuntimeConfig.mode,
      rescanDelaysMs: fullRuntimeConfig.rescanDelaysMs,
      scopeSelectorCount: fullRuntimeConfig.observeScopeSelectors.length,
      l3SurfaceCount: fullRuntimeConfig.l3SurfaceCount ?? 0,
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
      runtimePoolCounts: summarizeRuntimePools(runtimeMappings || [], hasQuotedLiteral),
    };
  }

  function detectAppliedRuntimeMode(context, options = {}) {
    if (options.installedRuntimeArtifact?.runtimeStrategy?.mode) {
      return options.installedRuntimeArtifact.runtimeStrategy.mode;
    }

    if (options.translatedWorkbenchText) {
      const translatedWorkbenchArtifact = parseInstalledRuntimeArtifact(
        options.translatedWorkbenchText
      );
      if (translatedWorkbenchArtifact?.runtimeStrategy?.mode) {
        return translatedWorkbenchArtifact.runtimeStrategy.mode;
      }
    }

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
