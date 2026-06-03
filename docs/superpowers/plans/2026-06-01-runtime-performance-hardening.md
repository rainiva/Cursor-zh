# Runtime Performance Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce production Cursor startup/load overhead by removing non-essential runtime code, shrinking default runtime mappings, and adding an explicit compatibility fallback mode without regressing translation reliability on key surfaces.

**Architecture:** Keep the phase-1 production runtime conservative on observation behavior while aggressively reducing default payload and general-translator work. Add explicit apply-time runtime modes, static-hook contracts, and deterministic footprint budgets so the project can keep getting faster without silent translation regressions.

**Tech Stack:** Node.js 18+, PowerShell, JSON mapping overlays, existing `cursor-zh` translation pipeline, built-in `node:test`.

---

**Repository note:** `D:/Project/Cursor-zh` currently has no `.git` directory, so each task ends with a checkpoint note instead of a commit command. If execution later happens inside a real git clone, convert each checkpoint into a normal commit.

## File Structure

- Modify `D:/Project/Cursor-zh/scripts/cursor-zh-lib.js`
  - Gate runtime diagnostics/profile code behind explicit metadata
  - Add runtime footprint helpers
  - Add static patch contract reporting
  - Keep production-default static migration logic focused on approved key surfaces
- Modify `D:/Project/Cursor-zh/scripts/cursor-zh-tool.js`
  - Parse/apply runtime modes
  - Build runtime budgets and contract reports
  - Distinguish blocking stability failures from non-blocking apply-time performance warnings
  - Emit manifest/verify/apply output for runtime footprint and contract results
- Modify `D:/Project/Cursor-zh/scripts/tests/cursor-zh-lib.test.js`
  - Lock down bundle shape, diagnostics gating, footprint helpers, and contract behavior
- Modify `D:/Project/Cursor-zh/scripts/tests/cursor-zh-tool.integration.test.js`
  - Lock down CLI/runtime-mode output, manifest data, verify failure rules, and compatibility behavior
- Modify `D:/Project/Cursor-zh/docs/superpowers/specs/2026-06-01-runtime-performance-hardening-design.md`
  - Only if wording needs to be aligned during implementation
- Modify `D:/Project/Cursor-zh/docs/superpowers/plans/2026-06-01-runtime-performance-hardening.md`
  - Only to keep the plan in sync if implementation scope changes

## Task 1: Remove production-default diagnostics and expose runtime footprint metrics

**Files:**
- Modify: `D:/Project/Cursor-zh/scripts/tests/cursor-zh-lib.test.js`
- Modify: `D:/Project/Cursor-zh/scripts/cursor-zh-lib.js`

- [ ] **Step 1: Write the failing unit tests**

```js
test('buildTranslatedWorkbenchBundle omits runtime diagnostics in production mode by default', () => {
  const bundle = buildTranslatedWorkbenchBundle({
    workbenchSource: 'console.log("workbench");',
    mappings: [{ originalText: 'General', changeText: '常规', searchType: 'exact' }],
    metadata: {
      runtimeConfig: {
        mode: 'performance',
        stageDocumentRoot: false,
        shortExactTextFallback: false,
        rescanDelaysMs: [],
        observeScopeSelectors: ['[role="dialog"]'],
        observeAttributesOnly: true,
        observeDiscoveryAttributes: false,
        skipSubtreeOnBusy: true,
        marketplaceRemoteTranslationEnabled: false,
      },
    },
  });

  assert.doesNotMatch(bundle, /window\.__cursorZhPerf/);
  assert.doesNotMatch(bundle, /console\.table/);
  assert.doesNotMatch(bundle, /snapshot\(\) \{/);
  assert.doesNotMatch(bundle, /report\(\) \{/);
  assert.doesNotMatch(bundle, /reset\(\) \{/);
});

test('buildTranslatedWorkbenchBundle can still include runtime diagnostics when explicitly requested', () => {
  const bundle = buildTranslatedWorkbenchBundle({
    workbenchSource: 'console.log("workbench");',
    mappings: [],
    metadata: {
      runtimeDiagnosticsEnabled: true,
      runtimeConfig: {
        mode: 'profile',
        stageDocumentRoot: false,
        shortExactTextFallback: false,
        rescanDelaysMs: [],
        observeScopeSelectors: ['[role="dialog"]'],
        observeAttributesOnly: true,
        observeDiscoveryAttributes: false,
        skipSubtreeOnBusy: true,
        marketplaceRemoteTranslationEnabled: false,
      },
    },
  });

  assert.match(bundle, /window\.__cursorZhPerf/);
  assert.match(bundle, /console\.table/);
});
```

- [ ] **Step 2: Run the library test file and confirm it fails**

Run:

```powershell
node --test scripts/tests/cursor-zh-lib.test.js
```

Expected: FAIL because the default bundle still contains the production diagnostics block.

- [ ] **Step 3: Implement diagnostics gating and runtime footprint helpers**

```js
function summarizeRuntimeFootprint(bundleText, translatedSourceText, runtimeMappings = []) {
  const runtimeHeaderChars = Math.max(
    String(bundleText || '').length - String(translatedSourceText || '').length,
    0
  );

  return {
    runtimeHeaderChars,
    runtimeHeaderKB: +(runtimeHeaderChars / 1024).toFixed(1),
    runtimeMappingCount: Array.isArray(runtimeMappings) ? runtimeMappings.length : 0,
  };
}

function buildTranslatedWorkbenchBundle({
  workbenchSource,
  mappings,
  runtimeMappings,
  metadata,
}) {
  const safeMetadata = metadata || {};
  const diagnosticsEnabled = safeMetadata.runtimeDiagnosticsEnabled === true;
  const generalRuntimeMappings = Array.isArray(runtimeMappings)
    ? runtimeMappings
    : selectRuntimeMappings(workbenchSource, mappings);
  const translatedSource = applyStaticSourceTranslations(workbenchSource, mappings);

  const runtimeHeader = [
    '/* Cursor ZH generated runtime: do not edit generated file directly. */',
    '(function () {',
    `  const translationMetadata = ${JSON.stringify(safeMetadata)};`,
    `  const translationMappings = ${serializeMappings(generalRuntimeMappings)};`,
    // keep the existing translator body here
    ...(diagnosticsEnabled
      ? [
          '      window.__cursorZhPerf = { /* existing implementation */ };',
          '      window.__cursorZhPerf.reset();',
        ]
      : []),
    '  new TextTranslator(translationMappings, translationMetadata.runtimeConfig || {}).install();',
    '})();',
    '',
  ].join('\n');

  return `${runtimeHeader}${translatedSource}`;
}

module.exports = {
  // keep existing exports
  summarizeRuntimeFootprint,
};
```

- [ ] **Step 4: Run the library test file again and confirm it passes**

Run:

```powershell
node --test scripts/tests/cursor-zh-lib.test.js
```

Expected: PASS, with default production bundles free of `__cursorZhPerf` and profile bundles still able to opt in.

- [ ] **Step 5: Record a checkpoint**

Checkpoint: production bundles no longer ship diagnostics by default, and the library can now measure runtime header size deterministically.

## Task 2: Add explicit runtime modes and footprint budgets to tooling

**Files:**
- Modify: `D:/Project/Cursor-zh/scripts/tests/cursor-zh-tool.integration.test.js`
- Modify: `D:/Project/Cursor-zh/scripts/cursor-zh-tool.js`
- Modify: `D:/Project/Cursor-zh/scripts/cursor-zh-lib.js`

- [ ] **Step 1: Write the failing integration assertions**

```js
assert.equal(buildManifest.runtimeStrategy.mode, 'performance');
assert.ok(buildManifest.runtimeStrategy.runtimeMappingCount <= 224);
assert.ok(buildManifest.runtimeStrategy.runtimeHeaderKB > 0);

assert.match(applyResult.stdout, /Runtime mapping count: \d+/);
assert.match(applyResult.stdout, /Runtime header KB: \d+(\.\d+)?/);

const compatibilityResult = runTool('apply', fixture, ['--runtime-mode', 'compatibility']);
assert.equal(compatibilityResult.status, 0);

const compatibilityManifest = JSON.parse(
  fs.readFileSync(path.join(fixture.workspaceRoot, 'state', 'build-manifest.json'), 'utf8')
);
assert.equal(compatibilityManifest.runtimeStrategy.mode, 'compatibility');
assert.deepEqual(compatibilityManifest.runtimeStrategy.rescanDelaysMs, [300, 1500]);
```

- [ ] **Step 2: Run the focused integration test and confirm it fails**

Run:

```powershell
node --test scripts/tests/cursor-zh-tool.integration.test.js --test-name-pattern "apply then verify succeeds|compatibility"
```

Expected: FAIL because there is no `--runtime-mode` support, no runtime header metric, and no compatibility manifest reporting.

- [ ] **Step 3: Implement runtime mode parsing, budgets, and reporting**

```js
function parseRuntimeMode(argv) {
  const index = argv.indexOf('--runtime-mode');
  if (index === -1) {
    return 'performance';
  }

  const next = argv[index + 1];
  if (next === 'performance' || next === 'compatibility') {
    return next;
  }

  throw new Error(`Unsupported runtime mode: ${next}`);
}

function buildRuntimeConfig(runtimeMode) {
  if (runtimeMode === 'compatibility') {
    return {
      mode: 'compatibility',
      stageDocumentRoot: false,
      shortExactTextFallback: false,
      rescanDelaysMs: [300, 1500],
      observeScopeSelectors: [
        '[class*="settings"]',
        '[class*="marketplace"]',
        '[class*="plugin"]',
        '[class*="skill"]',
        '[class*="subagent"]',
        '[class*="mcp"]',
        '[class*="onboarding"]',
        '[role="dialog"]',
        '[role="menu"]',
      ],
      observeAttributesOnly: true,
      observeDiscoveryAttributes: false,
      skipSubtreeOnBusy: true,
      marketplaceRemoteTranslationEnabled: false,
    };
  }

  return {
    mode: 'performance',
    stageDocumentRoot: false,
    shortExactTextFallback: false,
    rescanDelaysMs: [],
    observeScopeSelectors: [
      '[class*="settings"]',
      '[class*="marketplace"]',
      '[class*="plugin"]',
      '[class*="skill"]',
      '[class*="subagent"]',
      '[class*="mcp"]',
      '[class*="onboarding"]',
      '[role="dialog"]',
      '[role="menu"]',
    ],
    observeAttributesOnly: true,
    observeDiscoveryAttributes: false,
    skipSubtreeOnBusy: true,
    marketplaceRemoteTranslationEnabled: false,
  };
}

function buildRuntimeBudgets() {
  return {
    performance: {
      maxRuntimeMappings: 180,
      maxRuntimeHeaderKB: 58,
    },
  };
}

function buildRuntimeStrategyReport(mappingInfo, runtimeMappings, runtimeFootprint, runtimeMode) {
  const fullRuntimeConfig = buildRuntimeConfig(runtimeMode);
  return {
    mode: fullRuntimeConfig.mode,
    rescanDelaysMs: fullRuntimeConfig.rescanDelaysMs,
    scopeSelectorCount: fullRuntimeConfig.observeScopeSelectors.length,
    marketplaceRemoteTranslationEnabled:
      Boolean(fullRuntimeConfig.marketplaceRemoteTranslationEnabled),
    runtimeMappingCount: runtimeFootprint.runtimeMappingCount,
    runtimeHeaderChars: runtimeFootprint.runtimeHeaderChars,
    runtimeHeaderKB: runtimeFootprint.runtimeHeaderKB,
    prunedMappingCount: Math.max(mappingInfo.mergedMappings.length - runtimeMappings.length, 0),
  };
}
```

- [ ] **Step 4: Re-run the focused integration test and confirm it passes**

Run:

```powershell
node --test scripts/tests/cursor-zh-tool.integration.test.js --test-name-pattern "apply then verify succeeds|compatibility"
```

Expected: PASS, with both runtime modes reported through manifest/apply output and the production budget fields present.

- [ ] **Step 5: Record a checkpoint**

Checkpoint: runtime mode selection is now explicit and apply-time only, with deterministic footprint reporting wired into manifest/output.

## Task 3: Add static patch contracts and key-surface reliability gates

**Files:**
- Modify: `D:/Project/Cursor-zh/scripts/tests/cursor-zh-lib.test.js`
- Modify: `D:/Project/Cursor-zh/scripts/tests/cursor-zh-tool.integration.test.js`
- Modify: `D:/Project/Cursor-zh/scripts/cursor-zh-lib.js`
- Modify: `D:/Project/Cursor-zh/scripts/cursor-zh-tool.js`

- [ ] **Step 1: Write failing tests for contract reporting**

```js
test('applyStaticSourceTranslations reports static patch contracts for key surfaces', () => {
  const result = applyStaticSourceTranslationsDetailed(
    [
      'const search = "Search models";',
      'const followUp = "Send follow-up";',
      'const Re=z?U?"":mkE:U?"":ne?.text??"",Be=',
    ].join('\n'),
    defaultCursorWinDynamicMappings()
  );

  assert.equal(result.contracts.search_models.matchCount, 1);
  assert.equal(result.contracts.send_follow_up.matchCount, 1);
  assert.equal(result.contracts.product_tips_render_hook.matchCount, 1);
  assert.equal(result.contracts.product_tips_render_hook.fallbackMode, 'runtime');
});

test('verifyState blocks performance output when a required no-fallback contract misses', () => {
  const evaluation = evaluatePatchContracts({
    runtimeMode: 'performance',
    contracts: {
      search_models: {
        required: true,
        matchCount: 0,
        fallbackMode: 'none',
        surface: 'composer',
      },
    },
  });

  assert.deepEqual(evaluation.issues, [
    'Required static patch contract failed: search_models',
  ]);
});
```

- [ ] **Step 2: Run the library test file and confirm it fails**

Run:

```powershell
node --test scripts/tests/cursor-zh-lib.test.js
```

Expected: FAIL because detailed static patch contracts and contract evaluation do not exist yet.

- [ ] **Step 3: Implement contract-aware static translation for approved key surfaces**

```js
const KEY_SURFACE_PATCH_CONTRACTS = [
  {
    id: 'search_models',
    surface: 'model_picker',
    required: true,
    fallbackMode: 'none',
    from: '"Search models"',
    to: '"搜索模型"',
  },
  {
    id: 'send_follow_up',
    surface: 'composer',
    required: true,
    fallbackMode: 'none',
    from: '"Send follow-up"',
    to: '"继续追问"',
  },
  {
    id: 'product_tips_render_hook',
    surface: 'product_tips',
    required: true,
    fallbackMode: 'runtime',
    from: 'const Re=z?U?"":mkE:U?"":ne?.text??"",Be=',
    to: 'const Re=z?U?"":mkE:U?"":window.__cursorZhTranslateProductTipText?window.__cursorZhTranslateProductTipText(ne?.text??""):ne?.text??"",Be=',
  },
];

function applyStaticSourceTranslationsDetailed(workbenchSource, mappings = []) {
  let current = String(workbenchSource || '');
  const contracts = {};

  current = applyQuotedLiteralTranslations(current, mappings);

  for (const contract of KEY_SURFACE_PATCH_CONTRACTS) {
    let matchCount = 0;
    if (current.includes(contract.from)) {
      matchCount = current.split(contract.from).length - 1;
      current = current.split(contract.from).join(contract.to);
    }

    contracts[contract.id] = {
      surface: contract.surface,
      required: contract.required,
      fallbackMode: contract.fallbackMode,
      matchCount,
    };
  }

  return { translatedSource: current, contracts };
}

function evaluatePatchContracts({ runtimeMode, contracts }) {
  const issues = [];
  const warnings = [];

  for (const [contractId, contract] of Object.entries(contracts || {})) {
    if (contract.required !== true || contract.matchCount > 0) {
      continue;
    }

    if (contract.fallbackMode === 'runtime') {
      warnings.push(`Static patch contract missed and runtime fallback stayed active: ${contractId}`);
      continue;
    }

    if (runtimeMode === 'performance') {
      issues.push(`Required static patch contract failed: ${contractId}`);
    }
  }

  return { issues, warnings };
}
```

- [ ] **Step 4: Wire contract results into tool verification rules**

Run this implementation shape in `D:/Project/Cursor-zh/scripts/cursor-zh-tool.js`:

```js
const staticTranslationResult = applyStaticSourceTranslationsDetailed(
  workbenchSource,
  mergedMappings
);
const runtimeFootprint = summarizeRuntimeFootprint(
  generatedBundle,
  staticTranslationResult.translatedSource,
  runtimeMappings
);
const contractEvaluation = evaluatePatchContracts({
  runtimeMode,
  contracts: staticTranslationResult.contracts,
});

if (contractEvaluation.issues.length > 0) {
  throw new Error(contractEvaluation.issues.join('\n'));
}

warnings.push(...contractEvaluation.warnings);
```

- [ ] **Step 5: Re-run the library and focused integration tests**

Run:

```powershell
node --test scripts/tests/cursor-zh-lib.test.js
node --test scripts/tests/cursor-zh-tool.integration.test.js --test-name-pattern "apply then verify succeeds"
```

Expected: PASS, with contract hits reported for migrated key surfaces and performance-mode failures reserved for no-fallback misses only.

- [ ] **Step 6: Record a checkpoint**

Checkpoint: approved key-surface static hooks are now auditable, and reliability failures can block performance builds before silent regressions ship.

## Task 4: Enforce phase-1 budgets and keep compatibility narrow

**Files:**
- Modify: `D:/Project/Cursor-zh/scripts/tests/cursor-zh-tool.integration.test.js`
- Modify: `D:/Project/Cursor-zh/scripts/cursor-zh-tool.js`

- [ ] **Step 1: Add failing verify/apply budget assertions**

```js
assert.match(applyResult.stdout, /Runtime header KB: \d+(\.\d+)?/);
assert.match(verifyResult.stdout, /Runtime header KB: \d+(\.\d+)?/);

assert.equal(verifyBudgetFailure.status, 1);
assert.match(
  verifyBudgetFailure.stdout,
  /Performance budget exceeded: runtime mappings/
);
assert.equal(applyBudgetWarning.status, 0);
assert.match(
  applyBudgetWarning.stdout,
  /Warning: performance budget exceeded/
);
```

- [ ] **Step 2: Run the focused integration test and confirm it fails**

Run:

```powershell
node --test scripts/tests/cursor-zh-tool.integration.test.js --test-name-pattern "budget|apply then verify succeeds"
```

Expected: FAIL because apply/verify do not yet distinguish blocking stability failures from non-blocking budget warnings.

- [ ] **Step 3: Implement severity-split budget evaluation**

```js
function evaluateRuntimeBudgets(runtimeMode, runtimeStrategy) {
  const budgets = buildRuntimeBudgets();
  if (runtimeMode !== 'performance') {
    return { issues: [], warnings: [] };
  }

  const issues = [];
  const warnings = [];

  if (runtimeStrategy.runtimeMappingCount > budgets.performance.maxRuntimeMappings) {
    warnings.push(
      `Warning: performance budget exceeded for runtime mappings (${runtimeStrategy.runtimeMappingCount} > ${budgets.performance.maxRuntimeMappings})`
    );
    issues.push(
      `Performance budget exceeded: runtime mappings (${runtimeStrategy.runtimeMappingCount} > ${budgets.performance.maxRuntimeMappings})`
    );
  }

  if (runtimeStrategy.runtimeHeaderKB > budgets.performance.maxRuntimeHeaderKB) {
    warnings.push(
      `Warning: performance budget exceeded for runtime header KB (${runtimeStrategy.runtimeHeaderKB} > ${budgets.performance.maxRuntimeHeaderKB})`
    );
    issues.push(
      `Performance budget exceeded: runtime header KB (${runtimeStrategy.runtimeHeaderKB} > ${budgets.performance.maxRuntimeHeaderKB})`
    );
  }

  return { issues, warnings };
}

function runApply(context) {
  // existing apply logic above
  const budgetEvaluation = evaluateRuntimeBudgets(runtimeMode, runtimeStrategy);
  for (const warning of budgetEvaluation.warnings) {
    console.log(warning);
  }
  // do not fail apply on budget-only issues
}

function verifyState(context, installMetadata, languagePack) {
  // existing verification logic above
  const budgetEvaluation = evaluateRuntimeBudgets(runtimeMode, runtimeStrategy);
  warnings.push(...budgetEvaluation.warnings);
  issues.push(...budgetEvaluation.issues);
}
```

- [ ] **Step 4: Re-run the focused integration test and confirm it passes**

Run:

```powershell
node --test scripts/tests/cursor-zh-tool.integration.test.js --test-name-pattern "budget|apply then verify succeeds"
```

Expected: PASS, with budget overruns warning in `apply` but failing `verify`, while stability failures still block the generation path directly.

- [ ] **Step 5: Record a checkpoint**

Checkpoint: performance and stability now have separate severity paths, matching the accepted reliability-first policy.

## Task 5: Full regression suite and real-install verification

**Files:**
- No new code files in this task

- [ ] **Step 1: Run the full automated test suite**

Run:

```powershell
node --test "scripts/tests/cursor-zh-config.test.js" "scripts/tests/cursor-zh-lib.test.js" "scripts/tests/cursor-zh-tool.integration.test.js"
```

Expected: PASS across all three test files.

- [ ] **Step 2: Apply the new production bundle to the real install**

Run:

```powershell
node scripts/cursor-zh-tool.js apply --install-dir D:\Apps\cursor --runtime-mode performance
```

Expected:

- apply succeeds
- product tips remain fully covered
- apply output includes runtime mapping count, runtime header KB, and any contract/budget warnings

- [ ] **Step 3: Verify the real install**

Run:

```powershell
node scripts/cursor-zh-tool.js verify --install-dir D:\Apps\cursor
```

Expected:

- `Product Tips Coverage` remains `9 / 9`
- dynamic rule missing count remains `0`
- runtime mode reports `performance`
- runtime mappings are `<= 180`
- runtime header KB is `<= 58`

- [ ] **Step 4: Smoke the explicit compatibility fallback**

Run:

```powershell
node scripts/cursor-zh-tool.js apply --install-dir D:\Apps\cursor --runtime-mode compatibility
node scripts/cursor-zh-tool.js verify --install-dir D:\Apps\cursor
```

Expected:

- apply succeeds without restoring diagnostics payload
- verify reports `compatibility`
- compatibility shows bounded rescans while preserving key-surface translation coverage

- [ ] **Step 5: Record the final checkpoint**

Checkpoint: production-default runtime is smaller and stricter, compatibility is explicit and narrow, and the project now enforces both translation reliability and performance budgets through tests and verification.
