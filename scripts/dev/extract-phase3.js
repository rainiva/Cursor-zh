const fs = require('fs');
const path = require('path');

const libPath = path.join(__dirname, '..', 'cursor-zh-lib.js');
const lines = fs.readFileSync(libPath, 'utf8').split(/\r?\n/);

function slice(startLine, endLine) {
  return lines.slice(startLine - 1, endLine).join('\n');
}

const runtimeSelectorBody = `${slice(77, 116)}

module.exports = {
  sourceHasQuotedLiteral,
  selectRuntimeMappings,
};
`;

const staticBody = `const { escapeRegExp, escapeForQuotedLiteral } = require('../engine/substring');

${slice(118, 205)}

module.exports = {
  applyStaticSourceTranslations,
};
`;

const contractsBody = `const { escapeRegExp } = require('../engine/substring');
const { applyStaticSourceTranslations } = require('./static');

${slice(45, 75)}

${slice(207, 321)}

module.exports = {
  KEY_SURFACE_PATCH_CONTRACTS,
  KEY_SURFACE_CONTRACTS_BY_ORIGINAL_TEXT,
  applyStaticSourceTranslationsDetailed,
  summarizeStaticPatchContractsFromTranslatedSource,
  evaluatePatchContracts,
};
`;

const footprintBody = `${slice(323, 334)}

module.exports = {
  summarizeRuntimeFootprint,
};
`;

const templateInner = slice(352, 1416);
const templateBody = `function serializeMappings(mappings) {
  return JSON.stringify(mappings, null, 2);
}

function buildRuntimeHeader({
  safeMetadata,
  generalRuntimeMappings,
  scopedProductTipMappings,
  experimentalRuntimeToggleEnabled,
  runtimeDiagnosticsEnabled,
}) {
  return [
${templateInner.split('\n').slice(1, -2).join('\n')}
  ].join('\\n');
}

module.exports = {
  buildRuntimeHeader,
  serializeMappings,
};
`;

const bundleBuilderBody = `const { applyStaticSourceTranslations } = require('../patcher/static');
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
  return \`\${runtimeHeader}\${translatedSource}\`;
}

module.exports = {
  buildTranslatedWorkbenchBundle,
};
`;

const defaultMappingsBody = `const {
  defaultCursorWinCommonMappings: loadDefaultCursorWinCommonMappings,
  defaultCursorWinDynamicMappings: loadDefaultCursorWinDynamicMappings,
  defaultOverlayMappings: loadDefaultOverlayMappings,
} = require('./data');

function defaultCursorWinCommonMappings() {
  return loadDefaultCursorWinCommonMappings();
}

function defaultOverlayMappings() {
  return loadDefaultOverlayMappings();
}

function defaultCursorWinDynamicMappings() {
  return loadDefaultCursorWinDynamicMappings();
}

module.exports = {
  defaultCursorWinCommonMappings,
  defaultOverlayMappings,
  defaultCursorWinDynamicMappings,
};
`;

const indexBody = `const {
  defaultCursorWinCommonMappings,
  defaultCursorWinDynamicMappings,
  defaultOverlayMappings,
  readDefaultMappings,
  resolveDefaultsDir,
} = require('./mapping/data');
const {
  createMapping,
  createExactMapping,
  createNormalizedExactMapping,
  createRegexMapping,
} = require('./mapping/factory');
const {
  LEGACY_MAPPING_PATTERN,
  stripJsonComments,
  parseJsonc,
  parseLegacyWorktreeMappings,
} = require('./mapping/parser');
const { mappingKey, mergeMappings } = require('./mapping/merge');
const {
  parseVersionParts,
  compareLanguagePackVersion,
  withLocaleSetting,
} = require('./mapping/version');
const { normalizeTextForComparison } = require('./engine/normalize');
const {
  scopeHintsMatch,
  mappingMatchesScope,
  translateTextWithMappings,
} = require('./engine/translator');
const { escapeRegExp, escapeForQuotedLiteral } = require('./engine/substring');
const {
  productTipScopeSelectors,
  isProductTipScopedMapping,
  productTipScopedMappings,
} = require('./shared/product-tip-scope');
const { describeCoverageEntry, entryAppearsInSource } = require('./analyzer/coverage-helpers');
const {
  cursorWinCoverageTargets,
  analyzeCursorWinCoverage,
} = require('./analyzer/cursor-win-coverage');
const { analyzeDynamicRuleCoverage } = require('./analyzer/dynamic-coverage');
const {
  productTipsCoverageTargets,
  analyzeProductTipsCoverage,
} = require('./analyzer/product-tips-coverage');
const { applyStaticSourceTranslations } = require('./patcher/static');
const {
  applyStaticSourceTranslationsDetailed,
  summarizeStaticPatchContractsFromTranslatedSource,
  evaluatePatchContracts,
} = require('./patcher/contracts');
const { selectRuntimeMappings } = require('./patcher/runtime-selector');
const { buildTranslatedWorkbenchBundle } = require('./runtime/bundle-builder');
const { summarizeRuntimeFootprint } = require('./runtime/footprint');

module.exports = {
  createMapping,
  createExactMapping,
  createNormalizedExactMapping,
  createRegexMapping,
  LEGACY_MAPPING_PATTERN,
  stripJsonComments,
  parseJsonc,
  parseLegacyWorktreeMappings,
  mappingKey,
  mergeMappings,
  parseVersionParts,
  compareLanguagePackVersion,
  withLocaleSetting,
  readDefaultMappings,
  resolveDefaultsDir,
  defaultCursorWinCommonMappings,
  defaultCursorWinDynamicMappings,
  defaultOverlayMappings,
  normalizeTextForComparison,
  scopeHintsMatch,
  mappingMatchesScope,
  translateTextWithMappings,
  escapeRegExp,
  escapeForQuotedLiteral,
  productTipScopeSelectors,
  isProductTipScopedMapping,
  productTipScopedMappings,
  describeCoverageEntry,
  entryAppearsInSource,
  cursorWinCoverageTargets,
  analyzeCursorWinCoverage,
  analyzeDynamicRuleCoverage,
  productTipsCoverageTargets,
  analyzeProductTipsCoverage,
  applyStaticSourceTranslations,
  applyStaticSourceTranslationsDetailed,
  analyzeCursorWinCoverage,
  analyzeProductTipsCoverage,
  analyzeDynamicRuleCoverage,
  buildTranslatedWorkbenchBundle,
  evaluatePatchContracts,
  selectRuntimeMappings,
  summarizeStaticPatchContractsFromTranslatedSource,
  summarizeRuntimeFootprint,
  withLocaleSetting,
};
`;

const write = (rel, body) => {
  const target = path.join(__dirname, '..', rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, body + '\n', 'utf8');
  console.log('wrote', rel);
};

write('lib/patcher/runtime-selector.js', runtimeSelectorBody.replace(
  /^function sourceHasQuotedLiteral/m,
  "const { escapeRegExp } = require('../engine/substring');\nconst { isProductTipScopedMapping } = require('../shared/product-tip-scope');\n\nfunction sourceHasQuotedLiteral"
));
write('lib/patcher/static.js', staticBody);
write('lib/patcher/contracts.js', contractsBody);
write('lib/runtime/footprint.js', footprintBody);
write('lib/runtime/text-translator-template.js', templateBody);
write('lib/runtime/bundle-builder.js', bundleBuilderBody);
write('lib/mapping/default-mappings.js', defaultMappingsBody);

const indexFixed = indexBody
  .replace(
    '  analyzeCursorWinCoverage,\n  analyzeDynamicRuleCoverage,\n  productTipsCoverageTargets,\n  analyzeProductTipsCoverage,\n  applyStaticSourceTranslations,\n  applyStaticSourceTranslationsDetailed,\n  analyzeCursorWinCoverage,\n  analyzeProductTipsCoverage,\n  analyzeDynamicRuleCoverage,\n  buildTranslatedWorkbenchBundle,',
    '  analyzeCursorWinCoverage,\n  analyzeDynamicRuleCoverage,\n  productTipsCoverageTargets,\n  analyzeProductTipsCoverage,\n  applyStaticSourceTranslations,\n  applyStaticSourceTranslationsDetailed,\n  buildTranslatedWorkbenchBundle,'
  );

write('lib/index.js', indexFixed);
write('cursor-zh-lib.js', "module.exports = require('./lib/index.js');\n");

console.log('Phase 3 extraction complete');
