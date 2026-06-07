const {
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

const core = require('../cursor-zh-lib.js');

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
  applyStaticSourceTranslations: core.applyStaticSourceTranslations,
  applyStaticSourceTranslationsDetailed: core.applyStaticSourceTranslationsDetailed,
  buildTranslatedWorkbenchBundle: core.buildTranslatedWorkbenchBundle,
  evaluatePatchContracts: core.evaluatePatchContracts,
  selectRuntimeMappings: core.selectRuntimeMappings,
  summarizeStaticPatchContractsFromTranslatedSource:
    core.summarizeStaticPatchContractsFromTranslatedSource,
  summarizeRuntimeFootprint: core.summarizeRuntimeFootprint,
};
