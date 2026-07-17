const { applyStaticSourceTranslations } = require('../patcher/static');
const { selectRuntimeMappings } = require('../patcher/runtime-selector');
const { productTipScopedMappings } = require('../shared/product-tip-scope');
const { CRITICAL_INLINE_TEXT_TARGETS } = require('../mapping/critical-ui-targets');
const {
  buildRuntimeShards,
  assertRuntimeShardBudgets,
} = require('../mapping/runtime-shards');
const { buildRuntimeHeader } = require('./text-translator-template');

function buildInlineTextMappings() {
  return [...CRITICAL_INLINE_TEXT_TARGETS];
}

function resolveRuntimeShards({ units, mappings, surfaces, runtimeShards }) {
  if (runtimeShards && typeof runtimeShards === 'object') {
    return runtimeShards;
  }
  if (Array.isArray(units) && surfaces && typeof surfaces === 'object') {
    const shards = buildRuntimeShards(units, mappings, surfaces);
    assertRuntimeShardBudgets(shards, { coreKB: 80, surfaceKB: 20 });
    return shards;
  }
  return { core: [], surfaces: {} };
}

function buildTranslatedWorkbenchBundleParts({
  workbenchSource,
  mappings,
  runtimeMappings,
  metadata,
  translatedSource: preTranslatedSource,
  units,
  surfaces,
  runtimeShards: providedShards,
}) {
  const safeMetadata = metadata || {};
  const experimentalRuntimeToggleEnabled =
    safeMetadata.experimentalRuntimeToggleEnabled === true &&
    typeof safeMetadata.toggleSignalPath === 'string' &&
    safeMetadata.toggleSignalPath.length > 0;
  const runtimeDiagnosticsEnabled = safeMetadata.runtimeDiagnosticsEnabled === true;
  const generalRuntimeMappings = Array.isArray(runtimeMappings)
    ? runtimeMappings
    : selectRuntimeMappings(workbenchSource, mappings);
  const scopedProductTipMappings = productTipScopedMappings(mappings);
  const inlineTextMappings = buildInlineTextMappings();
  const runtimeShards = resolveRuntimeShards({
    units,
    mappings,
    surfaces,
    runtimeShards: providedShards,
  });
  const runtimeHeader = buildRuntimeHeader({
    safeMetadata,
    generalRuntimeMappings,
    inlineTextMappings,
    scopedProductTipMappings,
    experimentalRuntimeToggleEnabled,
    runtimeDiagnosticsEnabled,
    runtimeShards,
  });

  const translatedSource =
    typeof preTranslatedSource === 'string'
      ? preTranslatedSource
      : applyStaticSourceTranslations(workbenchSource, mappings);

  return {
    runtimeHeader,
    translatedSource,
    runtimeShards,
  };
}

function buildTranslatedWorkbenchBundle(options) {
  const { runtimeHeader, translatedSource } = buildTranslatedWorkbenchBundleParts(options);
  return `${runtimeHeader}${translatedSource}`;
}

module.exports = {
  buildTranslatedWorkbenchBundle,
  buildTranslatedWorkbenchBundleParts,
};
