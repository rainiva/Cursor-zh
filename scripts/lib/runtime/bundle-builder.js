const { applyStaticSourceTranslations } = require('../patcher/static');
const { selectRuntimeMappings } = require('../patcher/runtime-selector');
const { productTipScopedMappings } = require('../shared/product-tip-scope');
const { CRITICAL_INLINE_TEXT_TARGETS } = require('../mapping/critical-ui-targets');
const { buildRuntimeHeader } = require('./text-translator-template');

function buildInlineTextMappings() {
  return [...CRITICAL_INLINE_TEXT_TARGETS];
}

function buildTranslatedWorkbenchBundleParts({
  workbenchSource,
  mappings,
  runtimeMappings,
  metadata,
  translatedSource: preTranslatedSource,
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
  const runtimeHeader = buildRuntimeHeader({
    safeMetadata,
    generalRuntimeMappings,
    inlineTextMappings,
    scopedProductTipMappings,
    experimentalRuntimeToggleEnabled,
    runtimeDiagnosticsEnabled,
  });

  const translatedSource =
    typeof preTranslatedSource === 'string'
      ? preTranslatedSource
      : applyStaticSourceTranslations(workbenchSource, mappings);

  return {
    runtimeHeader,
    translatedSource,
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
