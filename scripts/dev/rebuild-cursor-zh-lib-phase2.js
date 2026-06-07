const fs = require('fs');
const path = require('path');

const libPath = path.join(__dirname, '..', 'cursor-zh-lib.js');
const lines = fs.readFileSync(libPath, 'utf8').split(/\r?\n/);

const header = `const {
  defaultCursorWinCommonMappings: loadDefaultCursorWinCommonMappings,
  defaultCursorWinDynamicMappings: loadDefaultCursorWinDynamicMappings,
  defaultOverlayMappings: loadDefaultOverlayMappings,
} = require('./lib/mapping/data.js');

const { mergeMappings } = require('./lib/mapping/merge');
const { compareLanguagePackVersion, withLocaleSetting } = require('./lib/mapping/version');
const { parseJsonc, parseLegacyWorktreeMappings } = require('./lib/mapping/parser');
const { normalizeTextForComparison } = require('./lib/engine/normalize');
const { translateTextWithMappings } = require('./lib/engine/translator');
const { escapeRegExp, escapeForQuotedLiteral } = require('./lib/engine/substring');
const { isProductTipScopedMapping, productTipScopedMappings } = require('./lib/shared/product-tip-scope');
const { analyzeCursorWinCoverage, cursorWinCoverageTargets } = require('./lib/analyzer/cursor-win-coverage');
const { analyzeDynamicRuleCoverage } = require('./lib/analyzer/dynamic-coverage');
const { analyzeProductTipsCoverage, productTipsCoverageTargets } = require('./lib/analyzer/product-tips-coverage');

function defaultCursorWinCommonMappings() {
  return loadDefaultCursorWinCommonMappings();
}

function defaultOverlayMappings() {
  return loadDefaultOverlayMappings();
}

function defaultCursorWinDynamicMappings() {
  return loadDefaultCursorWinDynamicMappings();
}
`;

const serializeMappingsBlock = lines.slice(213, 216).join('\n');
const constantsBlock = lines.slice(218, 259).join('\n');
const runtimeSelectorBlock = lines.slice(268, 308).join('\n');
const patcherRuntimeBlock = lines.slice(467, 1769).join('\n');

const exportsBlock = `module.exports = {
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
`;

const output = [
  header,
  serializeMappingsBlock,
  constantsBlock,
  runtimeSelectorBlock,
  patcherRuntimeBlock,
  exportsBlock,
].join('\n\n');

fs.writeFileSync(libPath, output, 'utf8');
console.log('Rebuilt', libPath, 'lines:', output.split(/\r?\n/).length);
