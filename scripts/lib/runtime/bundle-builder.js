const { applyStaticSourceTranslations } = require('../patcher/static');
const { selectRuntimeMappings } = require('../patcher/runtime-selector');
const { productTipScopedMappings } = require('../shared/product-tip-scope');
const { buildRuntimeHeader } = require('./text-translator-template');

function buildTranslatedWorkbenchBundle({
  workbenchSource,
  mappings,
  runtimeMappings,
  metadata,
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
  const runtimeHeader = buildRuntimeHeader({
    safeMetadata,
    generalRuntimeMappings,
    scopedProductTipMappings,
    experimentalRuntimeToggleEnabled,
    runtimeDiagnosticsEnabled,
  });

  const translatedSource = applyStaticSourceTranslations(workbenchSource, mappings);
  return `${runtimeHeader}${translatedSource}`;
}

module.exports = {
  buildTranslatedWorkbenchBundle,
};

