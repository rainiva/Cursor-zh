# Product Tips Translation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add resilient translation and verification for dynamic bottom `product_tips_config` tips without regressing Cursor startup or load performance.

**Architecture:** Keep the existing segmented-tip runtime and scoped observer model unchanged. Add scoped dynamic rules for product-tip wording drift, introduce a maintained product-tip coverage inventory analyzed against merged mappings, and surface that coverage in verification and manifest output so dynamic misses stop hiding behind static coverage.

**Tech Stack:** Node.js 18+, PowerShell, JSON mapping overlays, built-in `node:test`, existing `cursor-zh` translation pipeline.

---

**Repository note:** `D:/Project/Cursor-zh` currently has no `.git` directory, so each task ends with a checkpoint note instead of a commit command. If execution later happens inside a real git clone, convert each checkpoint into a normal commit.

## File Structure

- Modify `D:/Project/Cursor-zh/scripts/cursor-zh-lib.js`
  - Add `productTipsCoverageTargets()`
  - Add `analyzeProductTipsCoverage()`
  - Extend `defaultCursorWinDynamicMappings()` with scoped tip rules
  - Export the new helpers
- Modify `D:/Project/Cursor-zh/translations/overlay/cursor-win.dynamic.json`
  - Mirror the new product-tip dynamic rules used by the library defaults
- Modify `D:/Project/Cursor-zh/scripts/cursor-zh-tool.js`
  - Build product-tip coverage from merged mappings
  - Add manifest/report output for product-tip coverage
  - Keep `buildRuntimeConfig()` unchanged to preserve performance mode
- Modify `D:/Project/Cursor-zh/scripts/tests/cursor-zh-lib.test.js`
  - Lock down new rule behavior and product-tip coverage analysis
- Modify `D:/Project/Cursor-zh/scripts/tests/cursor-zh-tool.integration.test.js`
  - Feed current tip variants into the fixture bundle
  - Assert translated output, manifest reporting, and unchanged runtime-performance markers
- Leave `D:/Project/Cursor-zh/translations/overlay/cursor-win.common.json` unchanged unless a failing compatibility test proves an existing legacy exact mapping is missing

### Task 1: Lock down library behavior with failing unit tests

**Files:**
- Modify: `D:/Project/Cursor-zh/scripts/tests/cursor-zh-lib.test.js`
- Modify: `D:/Project/Cursor-zh/scripts/cursor-zh-lib.js`

- [ ] **Step 1: Write the failing unit tests**

```js
const {
  analyzeCursorWinCoverage,
  analyzeDynamicRuleCoverage,
  analyzeProductTipsCoverage,
  parseLegacyWorktreeMappings,
  mergeMappings,
  compareLanguagePackVersion,
  buildTranslatedWorkbenchBundle,
  cursorWinCoverageTargets,
  defaultCursorWinCommonMappings,
  defaultCursorWinDynamicMappings,
  defaultOverlayMappings,
  normalizeTextForComparison,
  productTipsCoverageTargets,
  translateTextWithMappings,
  parseJsonc,
  withLocaleSetting,
} = require('../cursor-zh-lib.js');

test('defaultCursorWinDynamicMappings translate current product tip variants', () => {
  const mappings = defaultCursorWinDynamicMappings();

  assert.equal(
    translateTextWithMappings(
      'Composer offers a great balance of intelligence and cost. Try it out from the model picker',
      mappings,
      { scopeMatched: true }
    ),
    '使用 /model 为你的任务选择最合适的模型。Composer 在智能与成本之间取得了很好的平衡。可在模型选择器中试用。'
  );

  assert.equal(
    translateTextWithMappings(
      'Ask mode uses read-only agents to research your codebase. Use shift+tab to enable',
      mappings,
      { scopeMatched: true }
    ),
    'Ask 模式会使用只读智能体研究你的代码库。使用 shift+tab 启用。'
  );

  assert.equal(
    translateTextWithMappings(
      'Ask mode uses read-only agents to research your codebase. Use shift+tab to enable',
      mappings,
      { scopeMatched: false }
    ),
    'Ask mode uses read-only agents to research your codebase. Use shift+tab to enable'
  );
});

test('analyzeProductTipsCoverage reports missing product tip mappings', () => {
  const mappings = defaultCursorWinDynamicMappings().filter(
    (entry) => !String(entry.originalText).includes('Ask mode')
  );

  const coverage = analyzeProductTipsCoverage({
    mappings,
    targets: productTipsCoverageTargets(),
  });

  assert.equal(coverage.totalTipCount, 5);
  assert.equal(coverage.mappedTipCount, 4);
  assert.deepEqual(coverage.missingTips, [
    'Ask mode uses read-only agents to research your codebase. Use shift+tab to enable',
  ]);
});
```

- [ ] **Step 2: Run the unit test file and confirm it fails**

Run:

```powershell
node --test scripts/tests/cursor-zh-lib.test.js
```

Expected: FAIL because `analyzeProductTipsCoverage` and `productTipsCoverageTargets` do not exist yet, and the current default dynamic mappings do not translate the new `Composer` and `Ask mode` variants.

- [ ] **Step 3: Add the minimal library implementation**

```js
function productTipsCoverageTargets() {
  return [
    { sampleText: 'Use /canvas to get interactive visualizations like dashboards from Cursor', scopeMatched: true },
    { sampleText: 'Use /shell to run commands in the terminal', scopeMatched: true },
    { sampleText: 'Voice mode lets you dictate better prompts. Click or hold ctrl+M to enable', scopeMatched: true },
    { sampleText: 'Composer offers a great balance of intelligence and cost. Try it out from the model picker', scopeMatched: true },
    { sampleText: 'Ask mode uses read-only agents to research your codebase. Use shift+tab to enable', scopeMatched: true },
  ];
}

function analyzeProductTipsCoverage({ mappings = [], targets = [] }) {
  const mappedTips = targets.filter((entry) => {
    const translated = translateTextWithMappings(entry.sampleText, mappings, {
      scopeMatched: entry.scopeMatched,
      scopeText: entry.scopeText || '',
    });
    return translated !== entry.sampleText;
  });

  return {
    totalTipCount: targets.length,
    mappedTipCount: mappedTips.length,
    missingTips: targets
      .filter((entry) => !mappedTips.some((mapped) => mapped.sampleText === entry.sampleText))
      .map((entry) => entry.sampleText),
  };
}

// Insert this constant immediately above `function defaultCursorWinDynamicMappings()`.
const productTipScopeSelectors = ['[class*="empty-state-rotating-tips"]'];

function defaultCursorWinDynamicMappings() {
  return [
    // Insert these five entries after `createNormalizedExactMapping('Repositories', '\u4ed3\u5e93'),`
    // and before the first theme-scoped `createNormalizedExactMapping('System', ...)` entry.
    createNormalizedExactMapping(
      'Use /canvas to get interactive visualizations like dashboards from Cursor',
      '使用 /canvas 从 Cursor 获取仪表盘等交互式可视化',
      { scopeSelectors: productTipScopeSelectors }
    ),
    createNormalizedExactMapping(
      'Use /shell to run commands in the terminal',
      '使用 /shell 在终端中运行命令',
      { scopeSelectors: productTipScopeSelectors }
    ),
    createNormalizedExactMapping(
      'Voice mode lets you dictate better prompts. Click or hold ctrl+M to enable',
      '语音模式可帮助你口述出更好的提示词。点击或按住 ctrl+M 启用。',
      { scopeSelectors: productTipScopeSelectors }
    ),
    createRegexMapping(
      '^(?:Use /model to pick the best model for your task\\.\\s*)?Composer offers a great balance (?:of intelligence and cost|for cost vs\\. capability)\\.(?:\\s*Try it out from the model picker)?$',
      '使用 /model 为你的任务选择最合适的模型。Composer 在智能与成本之间取得了很好的平衡。可在模型选择器中试用。',
      {
        flags: 'i',
        scopeSelectors: productTipScopeSelectors,
        coverageHints: [
          'Composer offers a great balance of intelligence and cost',
          'Use /model to pick the best model for your task. Composer offers a great balance for cost vs. capability',
        ],
      }
    ),
    createNormalizedExactMapping(
      'Ask mode uses read-only agents to research your codebase. Use shift+tab to enable',
      'Ask 模式会使用只读智能体研究你的代码库。使用 shift+tab 启用。',
      { scopeSelectors: productTipScopeSelectors }
    ),
  ];
}

module.exports = {
  analyzeCursorWinCoverage,
  analyzeDynamicRuleCoverage,
  analyzeProductTipsCoverage,
  buildTranslatedWorkbenchBundle,
  compareLanguagePackVersion,
  cursorWinCoverageTargets,
  defaultCursorWinCommonMappings,
  defaultCursorWinDynamicMappings,
  defaultOverlayMappings,
  mergeMappings,
  normalizeTextForComparison,
  parseJsonc,
  parseLegacyWorktreeMappings,
  productTipsCoverageTargets,
  translateTextWithMappings,
  withLocaleSetting,
};
```

- [ ] **Step 4: Run the unit test file again and confirm it passes**

Run:

```powershell
node --test scripts/tests/cursor-zh-lib.test.js
```

Expected: PASS, including the two new product-tip tests.

- [ ] **Step 5: Record a checkpoint**

Checkpoint: note that `scripts/cursor-zh-lib.js` now owns the maintained product-tip inventory and the scoped default rules, with no change to runtime observation strategy.

### Task 2: Make the runtime overlay file match the new tip rules

**Files:**
- Modify: `D:/Project/Cursor-zh/scripts/tests/cursor-zh-tool.integration.test.js`
- Modify: `D:/Project/Cursor-zh/translations/overlay/cursor-win.dynamic.json`

- [ ] **Step 1: Extend the integration fixture and add failing assertions**

```js
      "  'Use /model to pick the best model for your task. Composer offers a great balance for cost vs. capability',",
      "  'Composer offers a great balance of intelligence and cost. Try it out from the model picker',",
      "  'Ask mode uses read-only agents to research your codebase. Use shift+tab to enable',",

  assert.match(
    translatedWorkbenchText,
    /使用 \/model 为你的任务选择最合适的模型。Composer 在智能与成本之间取得了很好的平衡。可在模型选择器中试用。/
  );
  assert.match(
    translatedWorkbenchText,
    /Ask 模式会使用只读智能体研究你的代码库。使用 shift\+tab 启用。/
  );
```

- [ ] **Step 2: Run the isolated integration test and confirm it fails**

Run:

```powershell
node --test scripts/tests/cursor-zh-tool.integration.test.js --test-name-pattern "apply then verify succeeds"
```

Expected: FAIL because `translations/overlay/cursor-win.dynamic.json` does not yet include the new scoped product-tip rules, so the generated fixture bundle still contains the new English variants.

- [ ] **Step 3: Add the matching runtime JSON rules**

```jsonc
// Insert these objects before the final `^Show all\\s*\\((.+) more\\)$` regex entry.
{
  "originalText": "Use /canvas to get interactive visualizations like dashboards from Cursor",
  "changeText": "使用 /canvas 从 Cursor 获取仪表盘等交互式可视化",
  "searchType": "normalizedExact",
  "scopeSelectors": ["[class*=\"empty-state-rotating-tips\"]"]
},
{
  "originalText": "Use /shell to run commands in the terminal",
  "changeText": "使用 /shell 在终端中运行命令",
  "searchType": "normalizedExact",
  "scopeSelectors": ["[class*=\"empty-state-rotating-tips\"]"]
},
{
  "originalText": "Voice mode lets you dictate better prompts. Click or hold ctrl+M to enable",
  "changeText": "语音模式可帮助你口述出更好的提示词。点击或按住 ctrl+M 启用。",
  "searchType": "normalizedExact",
  "scopeSelectors": ["[class*=\"empty-state-rotating-tips\"]"]
},
{
  "originalText": "^(?:Use /model to pick the best model for your task\\.\\s*)?Composer offers a great balance (?:of intelligence and cost|for cost vs\\. capability)\\.(?:\\s*Try it out from the model picker)?$",
  "changeText": "使用 /model 为你的任务选择最合适的模型。Composer 在智能与成本之间取得了很好的平衡。可在模型选择器中试用。",
  "searchType": "regex",
  "flags": "i",
  "scopeSelectors": ["[class*=\"empty-state-rotating-tips\"]"],
  "coverageHints": [
    "Composer offers a great balance of intelligence and cost",
    "Use /model to pick the best model for your task. Composer offers a great balance for cost vs. capability"
  ]
},
{
  "originalText": "Ask mode uses read-only agents to research your codebase. Use shift+tab to enable",
  "changeText": "Ask 模式会使用只读智能体研究你的代码库。使用 shift+tab 启用。",
  "searchType": "normalizedExact",
  "scopeSelectors": ["[class*=\"empty-state-rotating-tips\"]"]
}
```

Keep the existing legacy exact rules in `D:/Project/Cursor-zh/translations/overlay/cursor-win.common.json` untouched.

- [ ] **Step 4: Run the isolated integration test again and confirm it passes**

Run:

```powershell
node --test scripts/tests/cursor-zh-tool.integration.test.js --test-name-pattern "apply then verify succeeds"
```

Expected: PASS, and the generated workbench bundle now contains Chinese translations for both the old and new Composer tip variants plus the new Ask tip.

- [ ] **Step 5: Record a checkpoint**

Checkpoint: the runtime overlay file and the library default generator now describe the same product-tip rules.

### Task 3: Surface product-tip coverage in the tool manifest and verify output

**Files:**
- Modify: `D:/Project/Cursor-zh/scripts/tests/cursor-zh-tool.integration.test.js`
- Modify: `D:/Project/Cursor-zh/scripts/cursor-zh-tool.js`
- Modify: `D:/Project/Cursor-zh/scripts/cursor-zh-lib.js`

- [ ] **Step 1: Add failing manifest and reporting assertions**

```js
  const buildManifestPath = path.join(
    fixture.workspaceRoot,
    'state',
    'build-manifest.json'
  );
  const buildManifest = JSON.parse(fs.readFileSync(buildManifestPath, 'utf8'));

  assert.deepEqual(buildManifest.productTipsCoverage, {
    totalTipCount: 5,
    mappedTipCount: 5,
    missingTips: [],
  });

  assert.match(verifyResult.stdout, /\[Product Tips Coverage\]/);
  assert.match(verifyResult.stdout, /Total tips: 5/);
  assert.match(verifyResult.stdout, /Missing tips: 0/);
```

- [ ] **Step 2: Run the isolated integration test and confirm it fails**

Run:

```powershell
node --test scripts/tests/cursor-zh-tool.integration.test.js --test-name-pattern "apply then verify succeeds"
```

Expected: FAIL because `build-manifest.json` does not yet include `productTipsCoverage`, and `verify` does not yet print a dedicated product-tip coverage section.

- [ ] **Step 3: Implement product-tip coverage reporting without touching runtime config**

```js
function buildProductTipsCoverage(mappings) {
  return analyzeProductTipsCoverage({
    mappings,
    targets: productTipsCoverageTargets(),
  });
}

function printProductTipsCoverage(coverage) {
  console.log('\n[Product Tips Coverage]');
  console.log(`  - Total tips: ${coverage.totalTipCount}`);
  console.log(`  - Mapped tips: ${coverage.mappedTipCount}`);
  console.log(`  - Missing tips: ${coverage.missingTips.length}`);

  for (const tip of coverage.missingTips) {
    console.log(`    * ${tip}`);
  }
}

function verifyState(context, installMetadata, languagePack) {
  // existing validation stays in place above
  const productTipsCoverage = buildProductTipsCoverage(mappingInfo.mergedMappings);

  if (productTipsCoverage.missingTips.length > 0) {
    warnings.push('Product tips coverage is missing maintained targets.');
  }

  return {
    issues,
    info,
    warnings,
    cursorWinCoverage,
    dynamicCoverage,
    productTipsCoverage,
    runtimeStrategy,
    mappingInfo,
  };
}

function buildManifest(
  context,
  installMetadata,
  languagePack,
  mappingInfo,
  backupDir,
  cursorWinCoverage,
  dynamicCoverage,
  productTipsCoverage,
  runtimeStrategy
) {
  return {
    // existing fields stay in place
    cursorWinCoverage,
    dynamicCoverage,
    productTipsCoverage,
    runtimeStrategy,
  };
}

function runApply(context) {
  // existing work stays in place above
  const productTipsCoverage = buildProductTipsCoverage(mappingInfo.mergedMappings);

  const manifest = buildManifest(
    context,
    { pkg: nextPackage, product: installMetadata.product },
    languagePack,
    mappingInfo,
    backupDir,
    cursorWinCoverage,
    dynamicCoverage,
    productTipsCoverage,
    runtimeStrategy
  );

  console.log(`Product tips maintained targets: ${productTipsCoverage.totalTipCount}`);
  console.log(`Product tips missing targets: ${productTipsCoverage.missingTips.length}`);
}

function runVerify(context) {
  const result = verifyState(context, installMetadata, languagePack);
  printReport('Cursor 汉化状态', result);
  printCursorWinCoverage(result.cursorWinCoverage);
  printDynamicCoverage(result.dynamicCoverage);
  printProductTipsCoverage(result.productTipsCoverage);
  printRuntimeStrategy(result.runtimeStrategy);
}
```

Do not change `buildRuntimeConfig()`, `observeScopeSelectors`, `rescanDelaysMs`, `stageDocumentRoot`, or any polling behavior in this task.

- [ ] **Step 4: Run the isolated integration test again and confirm it passes**

Run:

```powershell
node --test scripts/tests/cursor-zh-tool.integration.test.js --test-name-pattern "apply then verify succeeds"
```

Expected: PASS, with the manifest containing `productTipsCoverage` and `verify` printing a dedicated ASCII section that is stable under PowerShell output rendering.

- [ ] **Step 5: Record a checkpoint**

Checkpoint: product tips now have separate maintained coverage reporting, while the runtime remains in the same performance-oriented mode.

### Task 4: Run the full regression suite and performance guardrails

**Files:**
- No new code files in this task

- [ ] **Step 1: Run the full automated test suite**

Run:

```powershell
node --test "scripts/tests/cursor-zh-config.test.js" "scripts/tests/cursor-zh-lib.test.js" "scripts/tests/cursor-zh-tool.integration.test.js"
```

Expected: PASS across all three test files.

- [ ] **Step 2: Re-run the main integration scenario as a focused performance guardrail**

Run:

```powershell
node --test scripts/tests/cursor-zh-tool.integration.test.js --test-name-pattern "apply then verify succeeds"
```

Expected: PASS, with the existing assertions for `"mode":"performance"`, `"stageDocumentRoot":false`, `"shortExactTextFallback":true`, `"rescanDelaysMs":[]`, and the absence of `setInterval(periodicScan, 2000)` still green.

- [ ] **Step 3: Run the local read-only verification command**

Run:

```powershell
node scripts/cursor-zh-tool.js verify
```

Expected: the report still shows the existing Cursor Win coverage and runtime strategy sections, plus a new `[Product Tips Coverage]` section with zero missing maintained tips on a fully updated workspace.

- [ ] **Step 4: Record the final checkpoint**

Checkpoint: all tests pass, the dynamic product-tip surface has dedicated coverage visibility, and no startup/load-performance regression was introduced by the fix.
