const test = require('node:test');
const assert = require('node:assert/strict');

const { analyzeDynamicRuleCoverage } = require('../../lib/analyzer/dynamic-coverage.js');
const { normalizeTextForComparison } = require('../../lib/engine/normalize.js');

test('analyzeDynamicRuleCoverage normalizes workbench source only once', () => {
  let normalizeCalls = 0;
  const originalNormalize = normalizeTextForComparison;
  const normalizeProxy = (text) => {
    normalizeCalls += 1;
    return originalNormalize(text);
  };

  const workbenchSource = 'Agent panel with Sign In and Search models text';
  const targets = [
    { originalText: 'Agent', changeText: '智能体', searchType: 'regex', flags: 'g' },
    { originalText: 'Sign In', changeText: '登录', searchType: 'exact' },
    { originalText: 'Search models', changeText: '搜索模型', searchType: 'exact' },
  ];

  const result = analyzeDynamicRuleCoverage({
    workbenchSource,
    mappings: targets,
    targets,
    normalizeTextForComparison: normalizeProxy,
  });

  assert.ok(result.bundleRuleCount >= 1);
  assert.equal(normalizeCalls, 1);
});
