# Update-Resilient Translation Safety Net Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve known Chinese translations across Cursor updates through stable translation identities, deterministic semantic relocation, transactional update admission, and bounded per-surface runtime fallbacks.

**Architecture:** Keep the existing official NLS, static replacement, runtime translator, backup, and uninstall layers. Add stable translation-unit contracts and an update capability profile ahead of them; resolve brittle hooks through semantic locators; generate all artifacts in a prepared-build directory; admit `UNCHANGED`, `KNOWN_DRIFT`, and fully covered `DEGRADED` builds; then commit or leave the installation untouched. Runtime fallback data is split into lazy surface shards so only mounted UI pays translation cost.

**Tech Stack:** Node.js >= 18, CommonJS, built-in `node:test`, JSON metadata, existing workbench literal index, generated JavaScript runtime header, PowerShell AST gate.

**Source specifications:**

- `docs/superpowers/specs/2026-07-17-update-resilient-translation-safety-net-design.md`
- `docs/superpowers/specs/2026-07-17-update-resilient-translation-safety-net-design-zh-CN/translation.md`

## Global Constraints

- Unknown Cursor-specific copy remains English and is written to a local quarantine report; no automatic online machine translation is added.
- `DEGRADED` is admitted automatically only when every failed blocking primary route has a tested runtime fallback.
- Hard performance gates are: core runtime payload `<= 80 KB`, each surface shard `<= 20 KB`, warm `verify <= 3 s`, and cold `verify <= 8 s` on the baseline machine/profile.
- `performance` remains the default runtime mode.
- No interval polling, scheduled full-document rescan, unbounded `document.body` observer, global short-word mapping, or fuzzy source mutation.
- A blocked prepare performs zero writes to the Cursor installation directory.
- `main.js` remains byte-for-byte identical to the original, and profile-directory behavior must not change.
- `apply`, `ensure`, `verify`, `start`, `uninstall`, and `verify --expect-clean` must remain supported.
- Uninstall verification still runs before state cleanup.
- No production dependency is added without separate approval.
- Every production behavior change follows a witnessed RED -> GREEN -> REFACTOR cycle.
- Before execution, create an isolated worktree or otherwise obtain a clean implementation workspace; the current checkout contains unrelated user changes that must not be overwritten.

---

## Dependency Graph

```text
Translation-unit schema
    -> update capability profile
        -> semantic locator and postconditions
            -> Product Tips vertical slice
                -> admission classifier
                    -> prepared-build transaction
                        -> surface shard compiler
                            -> surface runtime lifecycle
                                -> verify/report/performance gates
```

Each task below is a reviewable vertical slice. Do not start a dependent task until its focused test and the checkpoint suite are green.

## Phase 1: Stable Identity and Update Evidence

### Task 1: Add stable translation-unit contracts

**Files:**

- Create: `translations/meta/translation-units.json`
- Create: `scripts/lib/mapping/translation-units.js`
- Create: `scripts/tests/lib/translation-units.test.js`
- Modify: `scripts/tool/paths.js`

**Interfaces:**

- Produces: `loadTranslationUnits(filePath) -> { version, units }`
- Produces: `validateTranslationUnits(payload, surfaces) -> { units, byId, aliasesByScope }`
- Each unit has `translationId`, `changeText`, `aliases`, `owner`, `primary`, `fallback`, `severity`, and `placeholders`.

- [ ] **Step 1: Write the failing contract test**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateTranslationUnits,
} = require('../../lib/mapping/translation-units.js');

const surfaces = { composer: { defaultLayer: 'L3', runtimeScopes: ['[class*="composer"]'] } };
const unit = {
  translationId: 'composer.send_follow_up',
  changeText: '继续追问',
  aliases: ['Send follow-up', 'Add a follow-up'],
  owner: 'composer',
  primary: { kind: 'semantic', locatorId: 'composer.follow_up_action', cardinality: 1 },
  fallback: { kind: 'runtime-surface', surface: 'composer', match: 'normalizedExact' },
  severity: 'error',
  placeholders: [],
};

test('validates a stable translation unit and indexes aliases by scope', () => {
  const result = validateTranslationUnits({ version: 1, units: [unit] }, surfaces);
  assert.equal(result.byId.get(unit.translationId).changeText, '继续追问');
  assert.equal(result.aliasesByScope.get('composer\0Send follow-up'), unit.translationId);
});

test('rejects duplicate ids, conflicting aliases, and unregistered runtime surfaces', () => {
  assert.throws(
    () => validateTranslationUnits({ version: 1, units: [unit, { ...unit }] }, surfaces),
    /duplicate translationId/
  );
  assert.throws(
    () => validateTranslationUnits({ version: 1, units: [
      unit,
      { ...unit, translationId: 'composer.other', changeText: '其他' },
    ] }, surfaces),
    /conflicting alias/
  );
  assert.throws(
    () => validateTranslationUnits({ version: 1, units: [
      { ...unit, translationId: 'missing.surface', fallback: { ...unit.fallback, surface: 'missing' } },
    ] }, surfaces),
    /unregistered runtime surface/
  );
});
```

- [ ] **Step 2: Run RED and confirm the missing module is the failure**

Run: `node --test scripts/tests/lib/translation-units.test.js`

Expected: FAIL with `Cannot find module '../../lib/mapping/translation-units.js'`.

- [ ] **Step 3: Implement the validator and loader**

```js
'use strict';

const fs = require('node:fs');

function validateTranslationUnits(payload, surfaces = {}) {
  if (payload?.version !== 1 || !Array.isArray(payload.units)) {
    throw new Error('translation units must use version 1 and an units array');
  }
  const byId = new Map();
  const aliasesByScope = new Map();
  for (const unit of payload.units) {
    if (!unit?.translationId || byId.has(unit.translationId)) {
      throw new Error(`duplicate translationId: ${unit?.translationId || '<empty>'}`);
    }
    if (!unit.changeText || !Array.isArray(unit.aliases) || unit.aliases.length === 0) {
      throw new Error(`invalid translation unit: ${unit.translationId}`);
    }
    if (unit.fallback?.kind === 'runtime-surface' && !surfaces[unit.fallback.surface]) {
      throw new Error(`unregistered runtime surface: ${unit.fallback.surface}`);
    }
    byId.set(unit.translationId, unit);
    for (const alias of unit.aliases) {
      const key = `${unit.owner}\0${alias}`;
      const previous = aliasesByScope.get(key);
      if (previous && previous !== unit.translationId) {
        throw new Error(`conflicting alias: ${unit.owner}/${alias}`);
      }
      aliasesByScope.set(key, unit.translationId);
    }
  }
  return { units: payload.units, byId, aliasesByScope };
}

function loadTranslationUnits(filePath, surfaces) {
  return validateTranslationUnits(JSON.parse(fs.readFileSync(filePath, 'utf8')), surfaces);
}

module.exports = { loadTranslationUnits, validateTranslationUnits };
```

Add `translationUnitsPath: path.join(workspaceRoot, 'translations', 'meta', 'translation-units.json')` to `createToolPaths()`.

Seed `translation-units.json` with the blocking contracts from `scripts/lib/mapping/surface-contracts.js`; use stable IDs in `<surface>.<contract-id>` form, preserve existing English aliases and Chinese text, and declare `runtime-surface` fallback only for surfaces already registered in `surfaces.json`.

- [ ] **Step 4: Run GREEN and schema regression tests**

Run: `node --test scripts/tests/lib/translation-units.test.js scripts/tests/lib/surface-contracts.test.js scripts/tests/lib/surfaces.test.js`

Expected: all tests PASS.

- [ ] **Step 5: Commit the stable identity slice**

```powershell
git add translations/meta/translation-units.json scripts/lib/mapping/translation-units.js scripts/tests/lib/translation-units.test.js scripts/tool/paths.js
git commit -m "feat: add stable translation unit contracts"
```

### Task 2: Build a redistributable update capability profile

**Files:**

- Create: `scripts/lib/compatibility/update-profile.js`
- Create: `scripts/tests/lib/update-profile.test.js`
- Modify: `scripts/tool/session-cache.js`
- Modify: `scripts/tool/manifest.js`

**Interfaces:**

- Consumes: translation units from Task 1 and existing workbench/NLS hashes.
- Produces: `buildUpdateProfile(input) -> { version: 1, cursorVersion, vscodeVersion, bundles, nls, units }`
- Produces: `compareUpdateProfiles(previous, current) -> { status: 'UNCHANGED'|'KNOWN_DRIFT', changed }`

- [ ] **Step 1: Write the failing deterministic-profile test**

```js
test('classifies hash drift without storing source text', () => {
  const previous = buildUpdateProfile({
    cursorVersion: '3.12.9', vscodeVersion: '1.128.0',
    bundles: [{ capabilityId: 'workbench.desktop', hash: 'old' }],
    nls: { inventoryHash: 'nls' }, units: [{ translationId: 'composer.send_follow_up', outcome: 'resolved' }],
  });
  const current = buildUpdateProfile({
    cursorVersion: '3.12.10', vscodeVersion: '1.128.0',
    bundles: [{ capabilityId: 'workbench.desktop', hash: 'new' }],
    nls: { inventoryHash: 'nls' }, units: [{ translationId: 'composer.send_follow_up', outcome: 'resolved' }],
  });
  assert.deepEqual(compareUpdateProfiles(previous, current), {
    status: 'KNOWN_DRIFT', changed: ['bundle:workbench.desktop'],
  });
  assert.equal(JSON.stringify(current).includes('sourceText'), false);
});
```

- [ ] **Step 2: Run RED**

Run: `node --test scripts/tests/lib/update-profile.test.js`

Expected: FAIL because `update-profile.js` does not exist.

- [ ] **Step 3: Implement sorted, metadata-only profiles**

```js
function buildUpdateProfile(input) {
  return {
    version: 1,
    cursorVersion: String(input.cursorVersion),
    vscodeVersion: String(input.vscodeVersion),
    bundles: [...input.bundles].map(({ capabilityId, hash }) => ({ capabilityId, hash }))
      .sort((a, b) => a.capabilityId.localeCompare(b.capabilityId)),
    nls: { inventoryHash: input.nls.inventoryHash },
    units: [...input.units].map(({ translationId, outcome }) => ({ translationId, outcome }))
      .sort((a, b) => a.translationId.localeCompare(b.translationId)),
  };
}

function compareUpdateProfiles(previous, current) {
  const changed = [];
  const oldBundles = new Map((previous?.bundles || []).map((item) => [item.capabilityId, item.hash]));
  for (const bundle of current.bundles) {
    if (oldBundles.get(bundle.capabilityId) !== bundle.hash) changed.push(`bundle:${bundle.capabilityId}`);
  }
  if (previous?.nls?.inventoryHash !== current.nls.inventoryHash) changed.push('nls:inventory');
  return { status: changed.length === 0 ? 'UNCHANGED' : 'KNOWN_DRIFT', changed };
}

module.exports = { buildUpdateProfile, compareUpdateProfiles };
```

Add the translation-unit metadata file to `collectMappingSourceSnapshots()`. Add `updateProfile` as an optional final argument/property in `buildManifest()` without changing existing callers.

- [ ] **Step 4: Run GREEN and manifest/cache regressions**

Run: `node --test scripts/tests/lib/update-profile.test.js scripts/tests/tool/manifest.test.js scripts/tests/tool/session-cache.test.js`

Expected: all tests PASS.

- [ ] **Step 5: Commit the update evidence slice**

```powershell
git add scripts/lib/compatibility/update-profile.js scripts/tests/lib/update-profile.test.js scripts/tool/session-cache.js scripts/tool/manifest.js
git commit -m "feat: record update capability profiles"
```

## Checkpoint A: Stable Identity

- [ ] Run `node --test scripts/tests/lib/translation-units.test.js scripts/tests/lib/update-profile.test.js scripts/tests/tool/manifest.test.js scripts/tests/tool/session-cache.test.js`.
- [ ] Confirm every blocking contract has a stable `translationId` and no conflicting alias.
- [ ] Confirm the profile contains hashes and outcome metadata, not Cursor source text.

## Phase 2: Deterministic Semantic Relocation

### Task 3: Add semantic locator and postcondition engines

**Files:**

- Create: `scripts/lib/compatibility/semantic-locator.js`
- Create: `scripts/lib/compatibility/locator-postconditions.js`
- Create: `scripts/tests/lib/semantic-locator.test.js`
- Create: `scripts/tests/lib/fixtures/update-drift/product-tips.js`

**Interfaces:**

- Produces: `resolveSemanticLocator(sourceText, locator) -> { status, matches, target? }`
- Produces: `evaluateLocatorPostconditions(sourceText, postconditions) -> { ok, failures }`
- Locator evidence is a conjunction of stable literals, property names, and an expected cardinality; minified identifiers are never evidence.

- [ ] **Step 1: Write RED metamorphic and ambiguity tests**

```js
const locator = {
  locatorId: 'product_tips.render_text',
  requiredLiterals: ['tip-dismissed', 'text'],
  requiredFragments: ['?.text??""'],
  cardinality: 1,
};

test('relocates across minified identifier and harmless ordering drift', () => {
  for (const source of [fixtureV1, fixtureRenamed, fixtureReordered]) {
    const result = resolveSemanticLocator(source, locator);
    assert.equal(result.status, 'resolved');
    assert.equal(result.matches.length, 1);
  }
});

test('returns ambiguous instead of guessing', () => {
  const result = resolveSemanticLocator(`${fixtureV1};${fixtureRenamed}`, locator);
  assert.equal(result.status, 'ambiguous');
  assert.equal(result.target, undefined);
});
```

- [ ] **Step 2: Run RED**

Run: `node --test scripts/tests/lib/semantic-locator.test.js`

Expected: FAIL because the semantic locator module is missing.

- [ ] **Step 3: Implement bounded evidence-window resolution**

```js
function resolveSemanticLocator(sourceText, locator) {
  const source = String(sourceText || '');
  const windows = [];
  for (const anchor of locator.requiredFragments || []) {
    let offset = source.indexOf(anchor);
    while (offset >= 0) {
      const start = Math.max(0, offset - 512);
      const end = Math.min(source.length, offset + anchor.length + 512);
      const text = source.slice(start, end);
      if ((locator.requiredLiterals || []).every((literal) => text.includes(literal))) {
        windows.push({ start, end, anchorOffset: offset });
      }
      offset = source.indexOf(anchor, offset + anchor.length);
    }
  }
  const unique = windows.filter((item, index, all) =>
    all.findIndex((candidate) => candidate.anchorOffset === item.anchorOffset) === index
  );
  if (unique.length === locator.cardinality) return { status: 'resolved', matches: unique, target: unique[0] };
  return { status: unique.length === 0 ? 'missing' : 'ambiguous', matches: unique };
}

function evaluateLocatorPostconditions(sourceText, postconditions) {
  const failures = postconditions.filter((item) => {
    const count = sourceText.split(item.fragment).length - 1;
    return count !== item.count;
  }).map((item) => item.id);
  return { ok: failures.length === 0, failures };
}
```

Keep the initial engine parser-free and bounded. If real fixtures prove this conjunction insufficient, stop and request approval before adding a parser dependency.

- [ ] **Step 4: Run GREEN**

Run: `node --test scripts/tests/lib/semantic-locator.test.js`

Expected: all tests PASS, including ambiguity and missing-target cases.

- [ ] **Step 5: Commit the locator engine**

```powershell
git add scripts/lib/compatibility/semantic-locator.js scripts/lib/compatibility/locator-postconditions.js scripts/tests/lib/semantic-locator.test.js scripts/tests/lib/fixtures/update-drift/product-tips.js
git commit -m "feat: add deterministic semantic locators"
```

### Task 4: Migrate Product Tips as the first semantic vertical slice

**Files:**

- Modify: `scripts/lib/patcher/product-tips-hook.js`
- Modify: `scripts/lib/patcher/contracts.js`
- Modify: `scripts/tests/lib/product-tips-hook.test.js`
- Modify: `scripts/tests/lib/product-tip-runtime-fallback.test.js`

**Interfaces:**

- Consumes: locator/postcondition engine from Task 3.
- Produces: `applyProductTipsRenderHook(sourceText) -> { sourceText, outcome, locatorId, postconditions }`
- Contract result is `resolved`, `fallback`, or `blocked`; version labels are diagnostic only.

- [ ] **Step 1: Write the failing migration test**

```js
test('uses semantic relocation before version variants and proves one hook', () => {
  const result = applyProductTipsRenderHook(fixtureRenamed);
  assert.equal(result.outcome, 'resolved');
  assert.equal(result.locatorId, 'product_tips.render_text');
  assert.equal(result.postconditions.ok, true);
  assert.equal((result.sourceText.match(/__cursorZhTranslateProductTipText/g) || []).length, 1);
});

test('falls back without source mutation when the semantic target is ambiguous', () => {
  const source = `${fixtureV1};${fixtureRenamed}`;
  const result = applyProductTipsRenderHook(source);
  assert.equal(result.outcome, 'fallback');
  assert.equal(result.sourceText, source);
});
```

- [ ] **Step 2: Run RED**

Run: `node --test scripts/tests/lib/product-tips-hook.test.js scripts/tests/lib/product-tip-runtime-fallback.test.js`

Expected: FAIL because the current API returns variant-based patch results and does not expose semantic outcomes.

- [ ] **Step 3: Implement semantic-first application with existing runtime fallback**

```js
function applyProductTipsRenderHook(sourceText) {
  const located = resolveSemanticLocator(sourceText, PRODUCT_TIPS_LOCATOR);
  if (located.status !== 'resolved') {
    return { sourceText, outcome: 'fallback', locatorId: PRODUCT_TIPS_LOCATOR.locatorId,
      postconditions: { ok: false, failures: [located.status] } };
  }
  const patched = insertProductTipTranslatorAtTarget(sourceText, located.target);
  const postconditions = evaluateLocatorPostconditions(patched, [{
    id: 'single-product-tip-hook', fragment: '__cursorZhTranslateProductTipText', count: 1,
  }]);
  return { sourceText: patched, outcome: postconditions.ok ? 'resolved' : 'blocked',
    locatorId: PRODUCT_TIPS_LOCATOR.locatorId, postconditions };
}
```

Retain the existing runtime Product Tips translation as the declared fallback. Keep legacy variants for one release as diagnostics, but make a test fail if a new `glass-v*` variant is added.

- [ ] **Step 4: Run GREEN and static contract regressions**

Run: `node --test scripts/tests/lib/product-tips-hook.test.js scripts/tests/lib/product-tip-runtime-fallback.test.js scripts/tests/lib/surface-contracts.test.js scripts/tests/lib/versioned-patches.test.js`

Expected: all tests PASS.

- [ ] **Step 5: Commit the first relocated hook**

```powershell
git add scripts/lib/patcher/product-tips-hook.js scripts/lib/patcher/contracts.js scripts/tests/lib/product-tips-hook.test.js scripts/tests/lib/product-tip-runtime-fallback.test.js
git commit -m "refactor: relocate product tips hook semantically"
```

## Checkpoint B: Semantic Relocation

- [ ] Run the Task 3 and Task 4 focused suites.
- [ ] Mutate fixture identifiers, quote style, harmless order, and bundle label; all unique cases remain `resolved`.
- [ ] Duplicate the candidate; result is `fallback`, with no source mutation.
- [ ] Confirm no new version-specific Product Tips variant was added.

## Phase 3: Transactional Update Admission