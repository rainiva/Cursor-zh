const test = require('node:test');
const assert = require('node:assert/strict');

const { defaultCursorWinDynamicMappings } = require('../../cursor-zh-lib.js');
const { productTipScopedMappings } = require('../../lib/shared/product-tip-scope.js');
const { applyProductTipsRenderHook } = require('../../lib/patcher/product-tips-hook.js');
const { createRuntimeDomHarness } = require('./helpers/runtime-dom-harness.js');
const {
  fixtureV1,
  fixtureRenamed,
} = require('./fixtures/update-drift/product-tips.js');

const PRODUCT_TIP_SAMPLE =
  'Use /add-plugin to install a plugin from the Cursor Marketplace';

function buildProductTipHarness() {
  const productTipMappings = productTipScopedMappings(defaultCursorWinDynamicMappings());
  return createRuntimeDomHarness({
    workbenchSource: 'console.log("workbench");',
    mappings: productTipMappings,
    runtimeMappings: [],
    metadata: {
      runtimeDiagnosticsEnabled: false,
      runtimeConfig: {
        mode: 'performance',
        rescanDelaysMs: [],
        observeScopeSelectors: ['[class*="empty-state-rotating-tips"]'],
        marketplaceRemoteTranslationEnabled: false,
      },
    },
  });
}

test('semantic ambiguous product tips hook leaves runtime tip translator as fallback', () => {
  const source = `${fixtureV1};${fixtureRenamed}`;
  const result = applyProductTipsRenderHook(source);
  assert.equal(result.outcome, 'fallback');
  assert.equal(result.sourceText, source);

  const harness = buildProductTipHarness();
  const translate = harness.sandbox.globalThis.__cursorZhTranslateProductTipText;
  assert.equal(typeof translate, 'function');
  assert.match(translate(PRODUCT_TIP_SAMPLE), /使用 \/add-plugin/);
});

test('runtime product tip translator remains available when semantic hook is missing', () => {
  const result = applyProductTipsRenderHook('const search = "Search models";');
  assert.equal(result.outcome, 'fallback');
  assert.equal(result.sourceText, 'const search = "Search models";');

  const harness = buildProductTipHarness();
  const translate = harness.sandbox.globalThis.__cursorZhTranslateProductTipText;
  assert.equal(
    translate(
      'Ask Mode uses read-only agents to research your codebase - hit shift+tab to get started'
    ),
    'Ask 模式使用只读智能体研究你的代码库——按 shift+tab 开始'
  );
});
