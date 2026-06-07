const {
  defaultCursorWinCommonMappings,
  defaultCursorWinDynamicMappings,
  defaultOverlayMappings,
} = require('./mapping/data');
const { mergeMappings } = require('./mapping/merge');
const { compareLanguagePackVersion, withLocaleSetting } = require('./mapping/version');
const { parseJsonc, parseLegacyWorktreeMappings } = require('./mapping/parser');
const { normalizeTextForComparison } = require('./engine/normalize');
const { translateTextWithMappings } = require('./engine/translator');
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
  applyStaticSourceTranslations,
  applyStaticSourceTranslationsDetailed,
  analyzeCursorWinCoverage,
  analyzeProductTipsCoverage,
  analyzeDynamicRuleCoverage,
  buildTranslatedWorkbenchBundle,
  compareLanguagePackVersion,
  cursorWinCoverageTargets,
  defaultCursorWinCommonMappings,
  defaultCursorWinDynamicMappings,
  defaultOverlayMappings,
  evaluatePatchContracts,
  mergeMappings,
  normalizeTextForComparison,
  productTipsCoverageTargets,
  parseJsonc,
  parseLegacyWorktreeMappings,
  selectRuntimeMappings,
  summarizeStaticPatchContractsFromTranslatedSource,
  summarizeRuntimeFootprint,
  translateTextWithMappings,
  withLocaleSetting,
};
