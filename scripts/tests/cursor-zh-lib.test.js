const test = require('node:test');
const assert = require('node:assert/strict');

const lib = require('../cursor-zh-lib.js');
const { buildTranslatedWorkbenchBundle } = lib;

const EXPECTED_EXPORTS = [
  'analyzeCursorWinCoverage',
  'analyzeDynamicRuleCoverage',
  'analyzeProductTipsCoverage',
  'applyStaticSourceTranslations',
  'applyStaticSourceTranslationsDetailed',
  'buildTranslatedWorkbenchBundle',
  'compareLanguagePackVersion',
  'cursorWinCoverageTargets',
  'defaultCursorWinCommonMappings',
  'defaultCursorWinDynamicMappings',
  'defaultOverlayMappings',
  'evaluatePatchContracts',
  'mergeMappings',
  'normalizeTextForComparison',
  'parseJsonc',
  'parseLegacyWorktreeMappings',
  'productTipsCoverageTargets',
  'selectRuntimeMappings',
  'summarizeRuntimeFootprint',
  'summarizeStaticPatchContractsFromTranslatedSource',
  'translateTextWithMappings',
  'withLocaleSetting',
];

test('cursor-zh-lib facade exports all public symbols', () => {
  assert.deepEqual(Object.keys(lib).sort(), EXPECTED_EXPORTS);
});

test('buildTranslatedWorkbenchBundle end-to-end generates runtime bundle with workbench source', () => {
  const bundle = buildTranslatedWorkbenchBundle({
    workbenchSource: 'console.log("workbench");',
    mappings: [{ originalText: 'General', changeText: '\u5e38\u89c4', searchType: 'exact' }],
    metadata: {
      version: '3.0.12',
      distro: 'abc123',
      runtimeConfig: {
        mode: 'performance',
        rescanDelaysMs: [],
        observeScopeSelectors: ['[role="dialog"]'],
        marketplaceRemoteTranslationEnabled: false,
      },
    },
  });

  assert.match(bundle, /Cursor ZH generated runtime/);
  assert.match(bundle, /console\.log\("workbench"\);/);
});
