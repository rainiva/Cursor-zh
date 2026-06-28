const test = require('node:test');
const assert = require('node:assert/strict');

const {
analyzeCursorWinCoverage,
analyzeDynamicRuleCoverage,
analyzeProductTipsCoverage,
cursorWinCoverageTargets,
defaultCursorWinDynamicMappings,
productTipsCoverageTargets,
} = require('../../cursor-zh-lib.js');

test('analyzeProductTipsCoverage reports missing product tip mappings', () => {
  const mappings = defaultCursorWinDynamicMappings().filter(
    (entry) => !String(entry.originalText).includes('Ask mode')
  );
  const coverage = analyzeProductTipsCoverage({
    mappings,
    targets: productTipsCoverageTargets(),
  });

  assert.equal(coverage.totalTipCount, 54);
  assert.equal(coverage.mappedTipCount, 53);
  assert.deepEqual(coverage.missingTips, [
    'Ask mode uses read-only agents to research your codebase. Use shift+tab to enable',
  ]);
});

test('analyzeCursorWinCoverage reports missing mappings against workbench source', () => {
  const workbenchSource = [
    'General',
    'Appearance',
    'Plan & Usage',
    'System Notifications',
    'Show system notifications when Agent completes or needs attention',
    'Share Data',
  ].join('\n');
  const mappings = [
    { originalText: 'General', changeText: '\u5e38\u89c4', searchType: 'exact' },
    { originalText: 'Appearance', changeText: '\u5916\u89c2', searchType: 'exact' },
    { originalText: 'Notifications', changeText: '\u901a\u77e5', searchType: 'exact' },
    {
      originalText: 'System Notifications',
      changeText: '\u7cfb\u7edf\u901a\u77e5',
      searchType: 'exact',
    },
  ];

  const coverage = analyzeCursorWinCoverage({
    workbenchSource,
    mappings,
    targets: cursorWinCoverageTargets(),
  });

  assert.equal(coverage.bundleTargetCount, 7);
  assert.equal(coverage.mappedTargetCount, 4);
  assert.deepEqual(coverage.missingTargets, [
    'Plan & Usage',
    'Show system notifications when Agent completes or needs attention',
    'Share Data',
  ]);
});

test('analyzeCursorWinCoverage resolves exact targets via mapping lookup without full-table scan', () => {
  const { buildExactMappingLookup } = require('../../lib/analyzer/coverage-helpers.js');
  const workbenchSource = 'General\nAppearance\n';
  const mappings = [
    { originalText: 'General', changeText: '常规', searchType: 'exact' },
    { originalText: 'Appearance', changeText: '外观', searchType: 'exact' },
    ...Array.from({ length: 500 }, (_, index) => ({
      originalText: `Noise ${index}`,
      changeText: `噪声 ${index}`,
      searchType: 'exact',
    })),
  ];
  const lookup = buildExactMappingLookup(mappings);

  assert.equal(lookup.get('General')?.changeText, '常规');
  assert.equal(lookup.get('Noise 0')?.changeText, '噪声 0');

  const coverage = analyzeCursorWinCoverage({
    workbenchSource,
    mappings,
    targets: ['General', 'Appearance'],
  });

  assert.equal(coverage.mappedTargetCount, 2);
  assert.deepEqual(coverage.missingTargets, []);
});

test('analyzeDynamicRuleCoverage reports missing dynamic rules in bundle', () => {
  const targets = defaultCursorWinDynamicMappings();
  const mappings = targets.filter(
    (item) => item.originalText !== '^Something went wrong:\\s*(.+)$'
  );
  const coverage = analyzeDynamicRuleCoverage({
    workbenchSource: [
      'Sign in',
      'Learn More',
      'Browser Tab: Example',
      'Something went wrong: Boom',
      'Theme',
      'System',
    ].join('\n'),
    mappings,
    targets,
  });

  assert.deepEqual(coverage.missingRules, ['Something went wrong:']);
  assert.equal(coverage.mappedRuleCount, coverage.bundleRuleCount - coverage.missingRules.length);
  assert.ok(coverage.bundleRuleCount > 0);
});

