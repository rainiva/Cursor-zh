const { summarizeRuntimePools } = require('../lib/mapping/runtime-pools.js');

const DEFAULT_RUNTIME_GOVERNANCE = {
  version: 1,
  activePhase: 'phase1',
  phases: {
    phase1: {
      maxRuntimeMappings: 1090,
      maxRuntimeHeaderKB: 184.7,
      maxLegacyGlobalExact: 906,
      maxForceRuntime: 228,
    },
    phase2: {
      maxRuntimeMappings: 800,
      maxRuntimeHeaderKB: 135,
      maxLegacyGlobalExact: 450,
      maxForceRuntime: 228,
    },
    final: {
      maxRuntimeMappings: 750,
      maxRuntimeHeaderKB: 125,
      maxLegacyGlobalExact: 250,
      maxForceRuntime: 180,
    },
  },
};

function resolveRuntimeGovernancePhase(policy, options = {}) {
  if (options.governancePhase && policy?.phases?.[options.governancePhase]) {
    return options.governancePhase;
  }
  if (policy?.activePhase && policy?.phases?.[policy.activePhase]) {
    return policy.activePhase;
  }
  return 'phase1';
}

function loadRuntimeGovernancePolicy(toolPaths, readJsonIfExists) {
  if (!toolPaths?.runtimeGovernancePath || typeof readJsonIfExists !== 'function') {
    return DEFAULT_RUNTIME_GOVERNANCE;
  }
  return readJsonIfExists(toolPaths.runtimeGovernancePath, DEFAULT_RUNTIME_GOVERNANCE);
}

function assertRuntimeFootprintBudget(runtimeStrategy, options = {}) {
  const strict = options.strict === true;
  const warnings = [];
  const issues = [];
  const mode = runtimeStrategy?.mode || 'performance';
  const governance = options.governancePolicy || DEFAULT_RUNTIME_GOVERNANCE;
  const governancePhase = resolveRuntimeGovernancePhase(governance, options);
  const budget = governance?.phases?.[governancePhase] || {};

  if (mode !== 'performance') {
    return {
      warnings,
      issues,
      withinBudget: true,
      budget,
      baselineMappingCount: options.baselineMappingCount ?? null,
      maxMappingCount: budget.maxRuntimeMappings ?? null,
      governancePhase,
    };
  }

  const headerKB = Number(runtimeStrategy.runtimeHeaderKB) || 0;
  const mappingCount = Number(runtimeStrategy.runtimeMappingCount) || 0;
  const legacyGlobalExactCount = Number(
    runtimeStrategy?.runtimePoolCounts?.['legacy-global-exact']
  ) || 0;
  const forceRuntimeCount = Number(runtimeStrategy?.runtimePoolCounts?.['runtime-force']) || 0;
  const maxMappingCount = Number(budget.maxRuntimeMappings);
  const maxHeaderKB = Number(budget.maxRuntimeHeaderKB);
  const maxLegacyGlobalExact = Number(budget.maxLegacyGlobalExact);
  const maxForceRuntime = Number(budget.maxForceRuntime);

  if (Number.isFinite(maxHeaderKB) && headerKB > maxHeaderKB) {
    const message = `Performance budget exceeded: runtime header KB (${headerKB} > ${maxHeaderKB})`;
    warnings.push(`Warning: ${message}`);
    if (strict) {
      issues.push(message);
    }
  }

  if (Number.isFinite(maxMappingCount) && mappingCount > maxMappingCount) {
    const message = `Performance budget exceeded: runtime mappings (${mappingCount} > ${maxMappingCount})`;
    warnings.push(`Warning: ${message}`);
    if (strict) {
      issues.push(message);
    }
  }

  if (Number.isFinite(maxLegacyGlobalExact) && legacyGlobalExactCount > maxLegacyGlobalExact) {
    const message = `Performance budget exceeded: legacy global exact runtime entries (${legacyGlobalExactCount} > ${maxLegacyGlobalExact})`;
    warnings.push(`Warning: ${message}`);
    if (strict) {
      issues.push(message);
    }
  }

  if (Number.isFinite(maxForceRuntime) && forceRuntimeCount > maxForceRuntime) {
    const message = `Performance budget exceeded: forceRuntime entries (${forceRuntimeCount} > ${maxForceRuntime})`;
    warnings.push(`Warning: ${message}`);
    if (strict) {
      issues.push(message);
    }
  }

  return {
    warnings,
    issues,
    withinBudget: issues.length === 0,
    budget,
    baselineMappingCount: options.baselineMappingCount ?? null,
    maxMappingCount,
    governancePhase,
  };
}

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
  const runtimeGovernancePolicy = loadRuntimeGovernancePolicy(toolPaths, readJsonIfExists);
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
    const fullRuntimeConfig = options.runtimeConfig || buildRuntimeConfig(runtimeMode);
    const governancePhase = resolveRuntimeGovernancePhase(runtimeGovernancePolicy, options);
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
      marketplaceLazyTranslationEnabled: Boolean(
        fullRuntimeConfig.marketplaceLazyTranslationEnabled
      ),
      marketplaceMappingCount: Number(options.marketplaceMappingCount) || 0,
      marketplaceDescriptionsVersion: Number(options.marketplaceDescriptionsVersion) || 0,
      runtimeGovernancePhase: governancePhase,
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
    RUNTIME_FOOTPRINT_BUDGET: DEFAULT_RUNTIME_GOVERNANCE,
    assertRuntimeFootprintBudget: (runtimeStrategy, options = {}) =>
      assertRuntimeFootprintBudget(runtimeStrategy, {
        ...options,
        governancePolicy: options.governancePolicy || runtimeGovernancePolicy,
      }),
    selectRuntimeMappingsForMode,
    buildRuntimeMappingsInfo,
    buildRuntimeStrategyReport,
    detectAppliedRuntimeMode,
    loadRuntimeGovernancePolicy: () => runtimeGovernancePolicy,
  };
}

module.exports = {
  RUNTIME_FOOTPRINT_BUDGET: DEFAULT_RUNTIME_GOVERNANCE,
  DEFAULT_RUNTIME_GOVERNANCE,
  assertRuntimeFootprintBudget,
  loadRuntimeGovernancePolicy,
  createRuntimeStrategyModule,
};
