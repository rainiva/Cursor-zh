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
- Static harvest may retain raw Cursor source literals. Runtime raw-text quarantine is limited to explicit per-surface `quarantineSelectors`; user/editable/editor/terminal/chat/code/dynamic-value regions are always denied, and all other runtime unknowns use only an ephemeral-session HMAC fingerprint, surface, and count.
- `DEGRADED` is admitted automatically only when every failed blocking primary route has a complete current-version fallback proof bound to current source/NLS/governance/tool evidence.
- Hard performance gates are: core runtime payload `<= 80 KB`, each surface shard `<= 20 KB`, warm `verify <= 3 s`, and cold `verify <= 8 s` on the baseline machine/profile.
- Payload limits hard-fail everywhere. Wall-clock proof requires the registered dedicated baseline fingerprint: one warmup plus five warm samples and three cursor-zh-session-cache-cold samples, with the slowest sample under its limit; `UNQUALIFIED` environments cannot authorize release.
- `performance` remains the default runtime mode.
- No interval polling, scheduled full-document rescan, global translation observer, global short-word mapping, or fuzzy source mutation. Performance mode may keep exactly one bounded global discovery observer: `childList + subtree` only, no attribute/text observation, no translation or mapping parsing, and at most 30 added roots inspected per idle batch.
- A blocked prepare performs zero writes to every managed target outside workspace state: install artifacts, `argv.json`, locale mirror, extension NLS, language-pack cache, launchers, and shortcuts. Before admission, only prepared artifacts under `state/generated/<build-id>` and diagnostic reports may be written.
- Commit requires Cursor/updater stillness, one atomic per-install lock shared by `apply`/`ensure`/`uninstall`, and an exact recheck of the prepared managed-target snapshot before backup or writes.
- State migration is read-only and in-memory; legacy manifests/backups are immutable, future schema fails closed, and cross-version uninstall requires an independently valid recovery capsule.
- Rollout is `shadow -> canary -> enforced`; `BLOCKED` never auto-selects the legacy writer, unconfirmed activation restores `lastKnownGood` on the next stopped start/ensure, and legacy writing expires after one transition release.
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

### Task 2B: Version state schemas and build a stable recovery capsule

**Files:**

- Create: `scripts/lib/compatibility/state-schema.js`
- Create: `scripts/lib/install/recovery-capsule.js`
- Create: `scripts/tests/lib/state-migration-recovery.test.js`
- Modify: `scripts/tool/manifest.js`
- Modify: `scripts/lib/install/validate-backup.js`

**Interfaces:**

- Produces: `readStateManifest(raw, { readerVersion }) -> { status, sourceSchema, manifest }`.
- Produces: `buildRecoveryCapsule({ operation, buildId, installIdentity, backup, managedTargets })`.
- Produces: `validateRecoveryCapsule(capsule, context) -> { valid, issues, recovery }`.
- Supports unversioned `v0` plus the previous two formal schema versions through read-only in-memory adapters.

- [ ] **Step 1: Write RED migration, immutability, and fail-closed tests**

```js
test('adapts v0 and two prior schemas in memory without modifying source state', () => {
  for (const fixture of loadStateFixtures(['v0', 'v1', 'v2'])) {
    const before = fixture.bytes();
    const result = readStateManifest(fixture.json(), { readerVersion: 3 });
    assert.equal(result.status, 'compatible');
    assert.deepEqual(fixture.bytes(), before);
  }
});

test('future state blocks apply and only a validated capsule authorizes uninstall', () => {
  const future = readStateManifest({ schemaVersion: 99, minReaderVersion: 99 }, { readerVersion: 3 });
  assert.equal(future.status, 'future-unsupported');
  assert.equal(canRunOperation('apply', future), false);
  assert.equal(canRunOperation('ensure', future), false);
  assert.equal(canRunOperation('uninstall', future, { capsule: corruptCapsule() }), false);
  assert.equal(canRunOperation('uninstall', future, { capsule: validCapsule() }), true);
});
```

- [ ] **Step 2: Run RED**

Run: `node --test scripts/tests/lib/state-migration-recovery.test.js`

Expected: FAIL because manifests are unversioned and no stable recovery capsule validator exists.

- [ ] **Step 3: Implement read-only adapters and capsule validation**

New manifests declare `schemaVersion` and `minReaderVersion`. Treat absent schema as `v0`; adapt only in memory, preserving the original object/bytes. Support `v0` and the previous two formal versions. Reject unknown future schema, invalid JSON, or a minimum reader newer than the tool with actionable matching/newer-version guidance.

The capsule schema contains only `{ capsuleVersion, minRecoveryReaderVersion, toolVersion, operation, buildId, installIdentity, backup, managedTargets }`. Every managed target records normalized identity, pre-commit existence/hash, and restore source. Validate capsule schema, install identity, backup pointer/content, and target evidence independently of the manifest. Never rewrite, rename, prune, or upgrade legacy backup directories.

- [ ] **Step 4: Run GREEN and existing manifest/backup tests**

Run: `node --test scripts/tests/lib/state-migration-recovery.test.js scripts/tests/tool/manifest.test.js scripts/tests/lib/validate-backup.test.js scripts/tests/tool/uninstall-orchestrator.test.js`

Expected: all tests PASS; fixture byte hashes for every legacy manifest and backup remain unchanged.

- [ ] **Step 5: Commit state compatibility contracts**

```powershell
git add scripts/lib/compatibility/state-schema.js scripts/lib/install/recovery-capsule.js scripts/tests/lib/state-migration-recovery.test.js scripts/tool/manifest.js scripts/lib/install/validate-backup.js
git commit -m "feat: version state and preserve recovery compatibility"
```

## Checkpoint A: Stable Identity and State Compatibility

- [ ] Run `node --test scripts/tests/lib/translation-units.test.js scripts/tests/lib/update-profile.test.js scripts/tests/lib/state-migration-recovery.test.js scripts/tests/tool/manifest.test.js scripts/tests/tool/session-cache.test.js`.
- [ ] Confirm every blocking contract has a stable `translationId` and no conflicting alias.
- [ ] Confirm the profile contains hashes and outcome metadata, not Cursor source text.
- [ ] Confirm `v0` plus two previous schemas adapt without byte changes; future/corrupt state fails closed, and only an independently valid capsule can authorize cross-version uninstall.

## Phase 2: Deterministic Semantic Relocation

### Task 3: Add semantic locator and postcondition engines

**Files:**

- Create: `scripts/lib/compatibility/structural-tokenizer.js`
- Create: `scripts/lib/compatibility/semantic-locator.js`
- Create: `scripts/lib/compatibility/locator-postconditions.js`
- Create: `scripts/tests/lib/semantic-locator.test.js`
- Create: `scripts/tests/lib/fixtures/update-drift/product-tips.js`

**Interfaces:**

- Produces: `tokenizeStructuralSource(sourceText) -> Array<{ type, value, offset }>`
- Produces: `resolveSemanticLocator(sourceText, locator) -> { status, matches, target? }`
- Produces: `evaluateLocatorPostconditions(sourceText, postconditions) -> { ok, failures }`
- Locator evidence is a conjunction of normalized structural tokens, stable literals, property names, relative token distance, and expected cardinality. Minified identifiers, whitespace, quote style, and optional-chain spelling are never evidence.

- [ ] **Step 1: Write RED metamorphic and ambiguity tests**

```js
const locator = {
  locatorId: 'product_tips.render_text',
  anchor: { type: 'property', value: 'text' },
  required: [{ type: 'literal', value: 'tip-dismissed' }],
  maxTokenDistance: 80,
  cardinality: 1,
};

test('relocates across identifier, quote, optional-chain, and harmless ordering drift', () => {
  for (const source of [fixtureV1, fixtureRenamed, fixtureSingleQuoted, fixtureWithoutOptionalChain, fixtureReordered]) {
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

- [ ] **Step 3: Implement a dependency-free tokenizer and bounded token-distance resolution**

```js
const { iterateQuotedLiterals } = require('../patcher/workbench-index.js');

function tokenizeStructuralSource(sourceText) {
  const source = String(sourceText || '');
  const tokens = [];
  const literalSpans = [];
  iterateQuotedLiterals(source, (_quote, value, start, end) => {
    literalSpans.push({ start, end });
    tokens.push({ type: 'literal', value, offset: start });
  });
  const insideLiteral = (offset) => literalSpans.some((span) => offset >= span.start && offset < span.end);
  const pattern = /(\?\.|\.)\s*([A-Za-z_$][\w$]*)|(\?\?|[?:(),])/g;
  for (const match of source.matchAll(pattern)) {
    if (insideLiteral(match.index)) continue;
    if (match[2]) tokens.push({ type: 'property', value: match[2], offset: match.index });
    else tokens.push({ type: 'operator', value: match[3], offset: match.index });
  }
  return tokens.sort((left, right) => left.offset - right.offset);
}

function tokenMatches(token, expected) {
  return token?.type === expected.type && token?.value === expected.value;
}

function resolveSemanticLocator(sourceText, locator) {
  const tokens = tokenizeStructuralSource(sourceText);
  const matches = [];
  tokens.forEach((token, tokenIndex) => {
    if (!tokenMatches(token, locator.anchor)) return;
    const radius = locator.maxTokenDistance;
    const neighborhood = tokens.slice(Math.max(0, tokenIndex - radius), tokenIndex + radius + 1);
    if (locator.required.every((expected) => neighborhood.some((item) => tokenMatches(item, expected)))) {
      matches.push({ tokenIndex, offset: token.offset });
    }
  });
  if (matches.length === locator.cardinality) return { status: 'resolved', matches, target: matches[0] };
  return { status: matches.length === 0 ? 'missing' : 'ambiguous', matches };
}

function evaluateLocatorPostconditions(sourceText, postconditions) {
  const failures = postconditions.filter((item) => {
    const count = sourceText.split(item.fragment).length - 1;
    return count !== item.count;
  }).map((item) => item.id);
  return { ok: failures.length === 0, failures };
}
```

Keep the tokenizer parser-free and bounded. The tokenizer must ignore general identifiers and normalize `.text` and `?.text` to the same `property:text` token. If real fixtures prove the structural-token conjunction insufficient, stop and request approval before adding a parser dependency.

- [ ] **Step 4: Run GREEN**

Run: `node --test scripts/tests/lib/semantic-locator.test.js`

Expected: all tests PASS, including ambiguity and missing-target cases.

- [ ] **Step 5: Commit the locator engine**

```powershell
git add scripts/lib/compatibility/structural-tokenizer.js scripts/lib/compatibility/semantic-locator.js scripts/lib/compatibility/locator-postconditions.js scripts/tests/lib/semantic-locator.test.js scripts/tests/lib/fixtures/update-drift/product-tips.js
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

### Task 5: Add the admission classifier with automatic safe DEGRADED mode

**Files:**

- Create: `scripts/lib/compatibility/admission.js`
- Create: `scripts/tests/lib/update-admission.test.js`
- Modify: `scripts/lib/compatibility/update-profile.js`
- Modify: `translations/meta/translation-units.json`

**Interfaces:**

- Produces: `classifyUpdateAdmission({ drift, outcomes, currentProofKey }) -> { status, blockers, fallbacks }`
- Produces: `createFallbackProofKey({ bundleHashes, nlsInventoryHash, runtimeGovernanceHash, toolVersion })`.
- `DEGRADED` is automatic only when every error-severity primary failure carries a complete proof whose capability evidence is uniquely matched and whose proof key equals `currentProofKey`.

- [ ] **Step 1: Write RED state-machine tests**

```js
test('admits DEGRADED only when every blocking failure has a current-version fallback proof', () => {
  const fallbackProof = {
    testId: 'product-tip-runtime-fallback', testPassed: true, shardCompiled: true,
    contracts: { scope: true, lifecycle: true, placeholders: true, privacy: true },
    capabilityEvidence: { status: 'matched', matchCount: 1, signature: 'product-tips:v1' },
    proofKey: 'current-key',
  };
  assert.deepEqual(classifyUpdateAdmission({ drift: true, currentProofKey: 'current-key', outcomes: [
    { translationId: 'product_tips.render_text', severity: 'error', primary: 'missing', fallbackProof },
  ] }), { status: 'DEGRADED', blockers: [], fallbacks: ['product_tips.render_text'] });

  assert.deepEqual(classifyUpdateAdmission({ drift: true, currentProofKey: 'current-key', outcomes: [
    { translationId: 'composer.send_follow_up', severity: 'error', primary: 'ambiguous', fallbackProof: { ...fallbackProof, proofKey: 'stale-key' } },
  ] }), { status: 'BLOCKED', blockers: ['composer.send_follow_up'], fallbacks: [] });
});

test('returns UNCHANGED without drift and KNOWN_DRIFT when primaries resolve', () => {
  assert.equal(classifyUpdateAdmission({ drift: false, outcomes: [] }).status, 'UNCHANGED');
  assert.equal(classifyUpdateAdmission({ drift: true, outcomes: [
    { translationId: 'composer.send_follow_up', severity: 'error', primary: 'resolved' },
  ] }).status, 'KNOWN_DRIFT');
});
```

- [ ] **Step 2: Run RED**

Run: `node --test scripts/tests/lib/update-admission.test.js`

Expected: FAIL because `admission.js` is missing.

- [ ] **Step 3: Implement the pure classifier**

```js
function isCurrentFallbackProof(proof, currentProofKey) {
  const contracts = proof?.contracts || {};
  return proof?.testPassed === true && proof?.shardCompiled === true
    && ['scope', 'lifecycle', 'placeholders', 'privacy'].every((name) => contracts[name] === true)
    && proof?.capabilityEvidence?.status === 'matched'
    && proof?.capabilityEvidence?.matchCount === 1
    && proof?.proofKey === currentProofKey;
}

function classifyUpdateAdmission({ drift, outcomes, currentProofKey }) {
  if (!drift) return { status: 'UNCHANGED', blockers: [], fallbacks: [] };
  const blockers = outcomes.filter((item) =>
    item.severity === 'error' && item.primary !== 'resolved'
      && !isCurrentFallbackProof(item.fallbackProof, currentProofKey)
  ).map((item) => item.translationId);
  if (blockers.length > 0) return { status: 'BLOCKED', blockers, fallbacks: [] };
  const fallbacks = outcomes.filter((item) => item.primary !== 'resolved'
    && isCurrentFallbackProof(item.fallbackProof, currentProofKey))
    .map((item) => item.translationId);
  return { status: fallbacks.length > 0 ? 'DEGRADED' : 'KNOWN_DRIFT', blockers: [], fallbacks };
}

module.exports = { classifyUpdateAdmission };
```

- [ ] **Step 4: Run GREEN**

Run: `node --test scripts/tests/lib/update-admission.test.js scripts/tests/lib/translation-units.test.js`

Expected: all tests PASS.

- [ ] **Step 5: Commit admission policy**

```powershell
git add scripts/lib/compatibility/admission.js scripts/tests/lib/update-admission.test.js scripts/lib/compatibility/update-profile.js translations/meta/translation-units.json
git commit -m "feat: classify safe degraded updates"
```

### Task 6A: Add the exclusive commit stillness preflight

**Files:**

- Create: `scripts/tool/transaction-lock.js`
- Create: `scripts/tool/commit-preflight.js`
- Create: `scripts/tests/tool/transaction-preflight.test.js`
- Modify: `scripts/tool/create-app.js`
- Modify: `scripts/tool/uninstall-orchestrator.js`

**Interfaces:**

- Produces: `acquireTransactionLock({ installDir, operationId, operation, inspectProcess, now }) -> lease`.
- Produces: `validateCommitStillness({ installDir, processes, preparedSnapshot, currentSnapshot }) -> { status, reason, evidence }`.
- Lock identity is `sha256(normalizedInstallDir)` under `state/locks/`; `apply`, `ensure`, and `uninstall` use the same identity.

- [ ] **Step 1: Write RED busy, concurrency, drift, and stale-lock tests**

```js
test('blocks before managed writes when Cursor is running or prepared targets drift', async () => {
  const busy = await runCommitPreflightFixture({ processes: [{ name: 'Cursor.exe', pid: 42 }] });
  assert.equal(busy.status, 'BLOCKED');
  assert.equal(busy.reason, 'busy');
  assert.deepEqual(busy.managedWrites, []);

  const drift = await runCommitPreflightFixture({ preparedHash: 'old', currentHash: 'new' });
  assert.equal(drift.reason, 'concurrent-drift');
  assert.deepEqual(drift.managedWrites, []);
});

test('reclaims a stale lock only after age and PID start-time proof', async () => {
  assert.equal((await runLockFixture({ oldEnough: false, pidMissing: true })).reclaimed, false);
  assert.equal((await runLockFixture({ oldEnough: true, samePidStart: true })).reclaimed, false);
  assert.equal((await runLockFixture({ oldEnough: true, pidMissing: true })).reclaimed, true);
});

test('apply ensure and uninstall contend on one per-install lock', async () => {
  const first = await acquireFixtureLock({ operation: 'apply', installDir: 'D:/Apps/Cursor' });
  const second = await acquireFixtureLock({ operation: 'uninstall', installDir: 'd:\\apps\\cursor' });
  assert.equal(second.reason, 'transaction-active');
  await first.release();
});
```

- [ ] **Step 2: Run RED**

Run: `node --test scripts/tests/tool/transaction-preflight.test.js`

Expected: FAIL because no atomic per-install lock or commit-stillness validator exists.

- [ ] **Step 3: Implement atomic lock and stillness validation**

Create lock files with exclusive `wx` semantics. Persist `{ pid, processStartedAt, ownerToken, installIdentity, operation, operationId, acquiredAt }`. Detect `Cursor.exe`; detect updater processes when their executable path or command line belongs to the target install. If process path is unavailable, fail closed for `Cursor.exe`. Reclaim only when the configured minimum stale interval has elapsed and `inspectProcess(pid)` proves the PID is absent or its start time differs.

After acquiring the lock, recompute existence/content hashes for the complete managed-target registry and compare them exactly with the prepared snapshot. Return `BLOCKED` with `busy`, `transaction-active`, or `concurrent-drift` evidence before backup or any managed writer. Keep the lease until post-commit verification or rollback completes. Wire uninstall through the same lease and Task 2B state reader: a future manifest requires an independently valid recovery capsule, otherwise uninstall blocks without guessing. `ensure` inherits the apply path.

- [ ] **Step 4: Run GREEN and uninstall regressions**

Run: `node --test scripts/tests/tool/transaction-preflight.test.js scripts/tests/tool/uninstall-orchestrator.test.js scripts/tests/tool/commands-apply.test.js scripts/tests/tool/commands-ensure.test.js`

Expected: all tests PASS; every busy/concurrent fixture records zero managed writes, and every terminal path releases the lease.

- [ ] **Step 5: Commit stillness preflight**

```powershell
git add scripts/tool/transaction-lock.js scripts/tool/commit-preflight.js scripts/tests/tool/transaction-preflight.test.js scripts/tool/create-app.js scripts/tool/uninstall-orchestrator.js
git commit -m "feat: lock and revalidate managed commits"
```

### Task 6B: Split apply into prepare and commit with zero-write blocking

**Files:**

- Create: `scripts/tool/prepared-build.js`
- Create: `scripts/tests/tool/commands-apply-prepared.test.js`
- Modify: `scripts/tool/commands.js`
- Modify: `scripts/tool/create-app.js`
- Modify: `scripts/lib/install/managed-external-files.js`

**Interfaces:**

- Produces: `createPreparedBuild({ buildId, rootDir, artifacts, admission, manifest, recoveryCapsule, managedTargetSnapshot })`
- Produces: `commitPreparedBuild(prepared, writers) -> { committedPaths }`
- Every prepared artifact declares `{ kind, targetPath, preparedPath, rollbackEntry }`.
- `runApply()` performs no managed-target writer call before admission is non-`BLOCKED`.

- [ ] **Step 1: Write the failing zero-write test**

```js
test('blocked prepare performs zero managed-target writes and keeps workspace diagnostics', async () => {
  const writes = [];
  const prepared = { admission: { status: 'BLOCKED', blockers: ['composer.send_follow_up'] } };
  const commands = createCommandsModule({
    prepareBuild: async () => prepared,
    commitPreparedBuild: async () => { writes.push({ kind: 'commit' }); },
    printPreparedBuildReport: () => {},
  });
  await assert.rejects(
    () => commands.runApply({ options: { force: false }, paths: {} }),
    /blocked: composer.send_follow_up/
  );
  assert.deepEqual(writes, []);
});
```

- [ ] **Step 2: Run RED**

Run: `node --test scripts/tests/tool/commands-apply-prepared.test.js`

Expected: FAIL because `runApply()` does not accept prepare/commit dependencies and currently writes bootstrap before complete admission.

- [ ] **Step 3: Implement prepared-build boundaries**

```js
function createPreparedBuild(input) {
  return Object.freeze({
    buildId: input.buildId,
    rootDir: input.rootDir,
    artifacts: Object.freeze([...input.artifacts]),
    admission: Object.freeze({ ...input.admission }),
    manifest: Object.freeze({ ...input.manifest }),
    recoveryCapsule: Object.freeze({ ...input.recoveryCapsule }),
    managedTargetSnapshot: Object.freeze([...input.managedTargetSnapshot]),
  });
}

async function commitPreparedBuild(prepared, writers) {
  if (prepared.admission.status === 'BLOCKED') {
    throw new Error(`blocked: ${prepared.admission.blockers.join(', ')}`);
  }
  const committedPaths = [];
  for (const artifact of prepared.artifacts) {
    await writers.writeArtifact(artifact.preparedPath, artifact.targetPath);
    committedPaths.push(artifact.targetPath);
  }
  return { committedPaths };
}
```

Refactor `runApply()` into these ordered operations:

```js
const prepared = await prepareBuild(context);
printPreparedBuildReport(prepared);
if (prepared.admission.status === 'BLOCKED') {
  throw new Error(`blocked: ${prepared.admission.blockers.join(', ')}`);
}
const lease = await acquireCommitLease({ context, prepared });
try {
  const backupDir = ensureBackup(context);
  try {
    await commitPreparedBuild(prepared);
    const report = verifyState(context, { preparedBuildId: prepared.buildId });
    if (report.issues.length > 0) throw Object.assign(new Error('post-commit verify failed'), { report });
    await publishAcceptedState({ manifest: prepared.manifest, recoveryCapsule: prepared.recoveryCapsule });
  } catch (error) {
    await rollbackCommittedBuild({ context, backupDir, prepared });
    throw error;
  }
} finally {
  await lease.release();
}
```

Use `toolPaths.generatedDir/<build-id>` as the workspace-only preparation root; no new path configuration field is required. Extend `managed-external-files.js` so the transaction enumerates install artifacts plus registered external targets, language-pack cache entries, launchers, and shortcuts. Each entry records whether the target existed and the restore source; rollback runs committed entries in reverse order, restoring prior bytes/metadata or removing newly created targets. Keep the current `writeLocaleFiles()` no-op: registering the locale mirror for compatibility and recovery must not re-enable locale forcing.

Prepare the candidate recovery capsule beside the generated artifacts before managed writes. Publish the accepted manifest only after post-commit verification, with an atomic file replacement that references the validated capsule. Any manifest/capsule publication failure remains inside the commit try/catch and triggers managed-target rollback; the previous manifest stays authoritative. Orphan candidate capsules are diagnostic workspace state and may be pruned only by a later explicit retention policy, never by migration.

During the single transition release, extract the existing writer as an explicit `runLegacyApply()` dependency so Task 11B can run shadow comparisons without mixing writer ownership. It is never selected from a new-engine `BLOCKED` outcome and carries a mandatory expiry version.

- [ ] **Step 4: Run GREEN and rollback regressions**

Run: `node --test scripts/tests/tool/commands-apply-prepared.test.js scripts/tests/tool/commands-apply-rollback.test.js scripts/tests/tool/commands-apply-rollback-locale.test.js scripts/tests/tool/commands-apply.test.js`

Expected: all tests PASS; the blocked fixture reports zero writes across every managed target class; post-commit failure restores install files and every committed external target.

- [ ] **Step 5: Commit transactional apply**

```powershell
git add scripts/tool/prepared-build.js scripts/tests/tool/commands-apply-prepared.test.js scripts/tool/commands.js scripts/tool/create-app.js scripts/lib/install/managed-external-files.js
git commit -m "refactor: make apply a prepared transaction"
```

## Checkpoint C: Safe Update Admission

- [ ] Run Task 5, Task 6A, and Task 6B suites plus `scripts/tests/tool/commands-ensure.test.js`.
- [ ] Assert `BLOCKED` causes zero writes to install artifacts, `argv.json`, locale mirror, extension NLS, language-pack cache, launchers, and shortcuts; workspace prepared artifacts and diagnostics remain allowed.
- [ ] Assert busy Cursor/updater processes, active lock contention, and exact snapshot drift all block before backup or managed writes.
- [ ] Assert stale-lock reclamation requires minimum age plus PID absence/start-time mismatch, and the lease covers verification or rollback.
- [ ] Assert `DEGRADED` commits automatically only with complete, uniquely matched current-version fallback proofs; stale/missing/ambiguous evidence blocks.
- [ ] Assert post-commit verification failure restores every committed managed target to its prior existence/content state and preserves diagnostics.

## Phase 4: Lazy Per-Surface Runtime Safety Net

### Task 7: Compile runtime mappings into governed surface shards

**Files:**

- Create: `scripts/lib/mapping/runtime-shards.js`
- Create: `scripts/tests/lib/runtime-shards.test.js`
- Modify: `scripts/lib/runtime/bundle-builder.js`
- Modify: `translations/meta/runtime-governance.json`

**Interfaces:**

- Produces: `buildRuntimeShards(units, mappings, surfaces) -> { core, surfaces }`
- Produces: `measureRuntimeShards(shards) -> { coreKB, surfaceKB }`
- Core contains only cross-surface rules; owned mappings belong to one lazy surface shard.
- Each shard carries its surface's explicit UI-chrome `quarantineSelectors`; these selectors never widen translation scope.

- [ ] **Step 1: Write RED ownership and budget tests**

```js
test('keeps owned mappings out of core and enforces per-shard budgets', () => {
  const shards = buildRuntimeShards([
    { translationId: 'composer.send', owner: 'composer', aliases: ['Send'], changeText: '发送',
      fallback: { kind: 'runtime-surface', surface: 'composer', match: 'exact' } },
  ], [], { composer: { runtimeScopes: ['[class*="composer"]'] } });
  assert.deepEqual(shards.core, []);
  assert.equal(shards.surfaces.composer.entries[0].translationId, 'composer.send');
  assert.doesNotThrow(() => assertRuntimeShardBudgets(shards, { coreKB: 80, surfaceKB: 20 }));
});
```

- [ ] **Step 2: Run RED**

Run: `node --test scripts/tests/lib/runtime-shards.test.js`

Expected: FAIL because `runtime-shards.js` is missing.

- [ ] **Step 3: Implement deterministic sharding and measurement**

```js
function buildRuntimeShards(units, mappings, surfaces) {
  const result = { core: [], surfaces: {} };
  for (const [surfaceId, def] of Object.entries(surfaces)) {
    result.surfaces[surfaceId] = { selectors: [...(def.runtimeScopes || [])], entries: [] };
  }
  for (const unit of units) {
    const surfaceId = unit.fallback?.kind === 'runtime-surface' ? unit.fallback.surface : null;
    const entry = { translationId: unit.translationId, aliases: unit.aliases,
      changeText: unit.changeText, match: unit.fallback?.match || 'exact' };
    if (surfaceId) result.surfaces[surfaceId].entries.push(entry); else result.core.push(entry);
  }
  return result;
}

function measureRuntimeShards(shards) {
  const kb = (value) => Number((Buffer.byteLength(JSON.stringify(value), 'utf8') / 1024).toFixed(1));
  return { coreKB: kb(shards.core), surfaceKB: Object.fromEntries(
    Object.entries(shards.surfaces).map(([id, shard]) => [id, kb(shard)])
  ) };
}
```

Add `maxCoreRuntimeKB: 80` and `maxSurfaceShardKB: 20` to runtime governance metadata. Pass shards, not one undifferentiated mapping array, into `buildRuntimeHeader()`.

Also register the measurement protocol in runtime governance: warmup count `1`, warm samples `5`, cold samples `3`, slowest-sample aggregation, and cold scope `cursor-zh-session-cache-only`. The expected baseline machine/profile fingerprint is supplied by the protected release environment, not committed into the repository.

- [ ] **Step 4: Run GREEN and footprint regressions**

Run: `node --test scripts/tests/lib/runtime-shards.test.js scripts/tests/lib/runtime-footprint-parts.test.js scripts/tests/lib/runtime-pools.test.js scripts/tests/tool/runtime-strategy.test.js`

Expected: all tests PASS and budgets report the owning shard.

- [ ] **Step 5: Commit shard compilation**

```powershell
git add scripts/lib/mapping/runtime-shards.js scripts/tests/lib/runtime-shards.test.js scripts/lib/runtime/bundle-builder.js translations/meta/runtime-governance.json
git commit -m "feat: split runtime fallback by surface"
```

### Task 8: Activate and dispose surface translators on demand

**Files:**

- Create: `scripts/lib/runtime/surface-registry.js`
- Create: `scripts/lib/runtime/surface-translator.js`
- Create: `scripts/tests/lib/runtime-surface-lifecycle.test.js`
- Modify: `scripts/lib/runtime/text-translator-template.js`
- Modify: `scripts/tests/lib/helpers/runtime-dom-harness.js`

**Interfaces:**

- Produces: `createSurfaceRegistry({ document, shards, createTranslator })`
- Produces: registry methods `discover(root)`, `activate(surfaceId, root)`, `deactivate(surfaceId)`, `dispose()`.
- Each active surface owns one observer and processes at most 30 text nodes per idle batch.
- Performance mode owns exactly one global discovery observer; it inspects at most 30 added roots per idle batch and never translates them itself.
- Runtime unknown capture emits raw text only from explicit UI-chrome allowlists; denied content is never captured, and other unknowns emit only privacy-safe fingerprints/counts.

- [ ] **Step 1: Write RED lifecycle tests**

```js
test('loads one shard on mount, translates only inside it, and disconnects on unmount', () => {
  const harness = createRuntimeDomHarness({ surfaceShards: {
    composer: { selectors: ['[class*="composer"]'], entries: [
      { translationId: 'composer.send', aliases: ['Send'], changeText: '发送', match: 'exact' },
    ] },
  } });
  assert.equal(harness.discoveryObserverCount(), 1);
  assert.equal(harness.activeSurfaceObserverCount(), 0);
  const outside = harness.mountText('Send');
  const composer = harness.mountSurface('composer', 'Send');
  harness.flushMicrotasks();
  harness.runDueTimers();
  assert.equal(outside.textContent, 'Send');
  assert.equal(composer.textContent, '发送');
  assert.equal(harness.activeSurfaceObserverCount(), 1);
  composer.remove();
  harness.flushMicrotasks();
  assert.equal(harness.activeSurfaceObserverCount(), 0);
});

test('yields after thirty text nodes', () => {
  const harness = createRuntimeDomHarness({ surfaceBatchSize: 30 });
  harness.mountSurfaceWithItems('composer', 31, 'Send');
  harness.runOneIdleBatch();
  assert.equal(harness.translatedTextCount(), 30);
  assert.equal(harness.pendingIdleBatchCount(), 1);
});

test('global discovery is child-list-only, non-translating, and yields after thirty added roots', () => {
  const harness = createRuntimeDomHarness({ discoveryBatchSize: 30 });
  assert.deepEqual(harness.discoveryObserverOptions(), { childList: true, subtree: true });
  harness.mountAddedRoots(31);
  harness.runOneDiscoveryIdleBatch();
  assert.equal(harness.inspectedAddedRootCount(), 30);
  assert.equal(harness.pendingDiscoveryBatchCount(), 1);
  assert.equal(harness.globalTranslationAttemptCount(), 0);
});

test('runtime quarantine never persists user content and raw text requires an explicit chrome allowlist', async () => {
  const harness = createRuntimeDomHarness({
    quarantineSelectors: ['[data-ui-chrome]'],
    quarantineDenySelectors: ['input', 'textarea', '[contenteditable]', '[data-editor]', '[data-terminal]', '[data-chat-body]', 'code', '[data-dynamic-value]'],
  });
  harness.mountUnknowns({ chrome: 'New toolbar label', input: 'secret token', chat: 'private prompt', other: 'dynamic value' });
  await harness.flushQuarantine();
  assert.deepEqual(harness.rawQuarantineTexts(), ['New toolbar label']);
  assert.equal(harness.reportContains('secret token'), false);
  assert.equal(harness.reportContains('private prompt'), false);
  assert.deepEqual(harness.fingerprintRecords().map(({ fingerprint, ...record }) => record), [
    { surface: 'composer', count: 1, algorithm: 'HMAC-SHA-256', keyScope: 'ephemeral-session' },
  ]);
});
```

- [ ] **Step 2: Run RED**

Run: `node --test scripts/tests/lib/runtime-surface-lifecycle.test.js`

Expected: FAIL because the harness/runtime do not expose surface lifecycle APIs.

- [ ] **Step 3: Implement one-observer-per-surface lifecycle**

```js
function createSurfaceRegistry({ document, shards, createTranslator }) {
  const active = new Map();
  function activate(surfaceId, root) {
    if (active.has(surfaceId)) return active.get(surfaceId);
    const translator = createTranslator({ root, shard: shards[surfaceId], batchSize: 30 });
    translator.start();
    active.set(surfaceId, translator);
    return translator;
  }
  function deactivate(surfaceId) {
    const translator = active.get(surfaceId);
    if (translator) translator.dispose();
    active.delete(surfaceId);
  }
  function discover(root = document) {
    for (const [surfaceId, shard] of Object.entries(shards)) {
      const match = shard.selectors.map((selector) => root.querySelector?.(selector)).find(Boolean);
      if (match) activate(surfaceId, match); else deactivate(surfaceId);
    }
  }
  function dispose() { for (const id of [...active.keys()]) deactivate(id); }
  return { activate, deactivate, discover, dispose, activeCount: () => active.size };
}
```

Install exactly one discovery `MutationObserver` on `document.body || document.documentElement` with `{ childList: true, subtree: true }`. Its callback only queues `addedNodes`; an idle worker inspects at most 30 queued roots using the registered surface selectors against each added root and its descendants. It performs no translation, text walk, attribute handling, or shard parsing. On any child-list notification it may also dispose active surface translators whose roots are no longer connected. After activation each translator observes only its registered root. Never query the whole document from the discovery callback or schedule a document-wide rescan. Extend the harness with separate discovery/surface observer counts and deterministic idle-batch controls.

In `surface-translator.js`, emit raw runtime quarantine text only for nodes matching the shard's `quarantineSelectors` and not matching or descending from the immutable deny selectors (`input`, `textarea`, `[contenteditable]`, editor, terminal, chat/message body, code, and dynamic-value regions). For every other runtime unknown, generate HMAC-SHA-256 with a random ephemeral session key, then retain only `{ fingerprint, surface, count, algorithm, keyScope }`. Never persist or report the key. If Web Crypto is unavailable, increment only a per-surface aggregate count; raw text is never a fallback.

- [ ] **Step 4: Run GREEN and runtime performance regressions**

Run: `node --test scripts/tests/lib/runtime-surface-lifecycle.test.js scripts/tests/lib/runtime-translate-perf.test.js scripts/tests/lib/l3-surface-runtime.test.js scripts/tests/lib/runtime-menu-flash.test.js`

Expected: all tests PASS; no interval timer is installed in performance mode.

- [ ] **Step 5: Commit lazy surface lifecycle**

```powershell
git add scripts/lib/runtime/surface-registry.js scripts/lib/runtime/surface-translator.js scripts/tests/lib/runtime-surface-lifecycle.test.js scripts/lib/runtime/text-translator-template.js scripts/tests/lib/helpers/runtime-dom-harness.js
git commit -m "feat: activate runtime fallback per surface"
```

## Checkpoint D: Runtime Safety Net

- [ ] Run Task 7 and Task 8 suites.
- [ ] Confirm core payload `<= 80 KB` and every shard `<= 20 KB`.
- [ ] Confirm a non-mounted surface creates no translator and parses no shard entries.
- [ ] Confirm one observer per mounted surface, 30-node yield, and disposal on unmount.
- [ ] Confirm exactly one global discovery observer with `childList + subtree` only, a 30-added-root idle budget, zero translation attempts, and no whole-document query.
- [ ] Confirm runtime reports retain raw text only for explicit UI-chrome allowlists, exclude every deny-listed user-content region, and otherwise contain only per-session HMAC fingerprints/counts.
- [ ] Confirm no polling or scheduled document-wide rescan in `performance` mode.

## Phase 5: Quarantine, Verification, and Release Gates

### Task 9: Report unknown text and persist admission evidence

**Files:**

- Create: `scripts/lib/compatibility/quarantine-report.js`
- Create: `scripts/tests/lib/quarantine-report.test.js`
- Modify: `scripts/tool/manifest.js`
- Modify: `scripts/tool/verify.js`
- Modify: `scripts/tool/report.js`

**Interfaces:**

- Produces: `buildQuarantineReport(records) -> { blockers, changedAliases, criticalUnknown, visibleUnknown, noise, privacyDrops }`
- Manifest persists `updateProfile`, `admission`, `runtimeShards`, and report path.
- `verify` prints `resolved`, `fallback`, `unknown`, and `blocked` separately.

- [ ] **Step 1: Write RED priority and no-guess tests**

```js
test('prioritizes blockers, preserves static copy, and strips unauthorized runtime raw text', () => {
  const report = buildQuarantineReport([
    { source: 'static', text: 'Brand new copy', surface: 'composer', kind: 'unknown', critical: true },
    { source: 'runtime', text: 'private prompt', surface: 'composer', kind: 'unknown', capturePolicy: 'fingerprint-only' },
    { source: 'runtime', fingerprint: 'abc', surface: 'composer', count: 2, kind: 'unknown', capturePolicy: 'fingerprint-only' },
    { translationId: 'composer.send', kind: 'blocked' },
    { text: 'inventory token', surface: 'unknown', kind: 'noise' },
  ]);
  assert.deepEqual(report.blockers.map((item) => item.translationId), ['composer.send']);
  assert.deepEqual(report.criticalUnknown.map((item) => item.text), ['Brand new copy']);
  assert.equal(report.criticalUnknown[0].changeText, undefined);
  assert.equal(JSON.stringify(report).includes('private prompt'), false);
  assert.equal(report.privacyDrops, 1);
});
```

- [ ] **Step 2: Run RED**

Run: `node --test scripts/tests/lib/quarantine-report.test.js`

Expected: FAIL because the report module is missing.

- [ ] **Step 3: Implement deterministic buckets and verify output**

```js
function buildQuarantineReport(records) {
  const report = { blockers: [], changedAliases: [], criticalUnknown: [], visibleUnknown: [], noise: [], privacyDrops: 0 };
  for (const input of records) {
    if (input.source === 'runtime' && input.text && input.capturePolicy !== 'allowlisted-chrome') {
      report.privacyDrops += 1;
      continue;
    }
    const record = input;
    if (record.kind === 'blocked') report.blockers.push(record);
    else if (record.kind === 'changed-alias') report.changedAliases.push(record);
    else if (record.kind === 'unknown' && record.critical) report.criticalUnknown.push(record);
    else if (record.kind === 'unknown') report.visibleUnknown.push(record);
    else report.noise.push(record);
  }
  return report;
}

module.exports = { buildQuarantineReport };
```

Extend manifest/report output without weakening existing issues. A `BLOCKED` unit remains an issue; a current-version-proven `fallback` in `DEGRADED` is an explicit warning with its proof key/evidence signature; unknown text is not counted in coverage and has no synthesized `changeText`. The report writer applies the privacy filter again before serialization, records `privacyDrops`, and never writes an ephemeral HMAC key.

- [ ] **Step 4: Run GREEN and verify regressions**

Run: `node --test scripts/tests/lib/quarantine-report.test.js scripts/tests/tool/manifest.test.js scripts/tests/tool/verify.test.js scripts/tests/tool/commands-ensure.test.js`

Expected: all tests PASS.

- [ ] **Step 5: Commit observable admission**

```powershell
git add scripts/lib/compatibility/quarantine-report.js scripts/tests/lib/quarantine-report.test.js scripts/tool/manifest.js scripts/tool/verify.js scripts/tool/report.js
git commit -m "feat: report update admission and unknown copy"
```

### Task 10: Enforce performance budgets and complete lifecycle acceptance

**Files:**

- Create: `scripts/tests/tool/update-safety-net-performance.test.js`
- Modify: `scripts/tool/verify.js`
- Modify: `scripts/tool/session-cache.js`
- Modify: `.github/workflows/release.yml`
- Modify: `docs/compatibility.md`

**Interfaces:**

- `verify` emits machine-readable stage timings, samples, computed machine/profile fingerprint, and qualification state.
- Warm verification reuses source-hash-keyed coverage and locator outcomes; cold verification recomputes them.
- Size budgets fail in every environment. Wall-clock budgets fail only in a matching `QUALIFIED` baseline; generic machines report `UNQUALIFIED`, and release-required mode rejects that state.
- Release workflow requires a self-hosted `cursor-zh-baseline` job before the existing publish job.

- [ ] **Step 1: Write RED budget and lifecycle tests**

```js
test('enforces core, shard, warm verify, and cold verify budgets', () => {
  const result = evaluateSafetyNetBudgets({
    coreRuntimeKB: 80.1,
    surfaceShardKB: { composer: 19.5 },
    warmVerifySamplesMs: [2700, 2750, 2800, 2900, 2950],
    coldVerifySamplesMs: [7600, 7800, 7900],
    qualification: 'QUALIFIED',
  }, { maxCoreKB: 80, maxSurfaceKB: 20, maxWarmVerifyMs: 3000, maxColdVerifyMs: 8000 });
  assert.deepEqual(result.issues, ['core runtime payload (80.1 KB > 80 KB)']);
});

test('unregistered timing is UNQUALIFIED and cannot satisfy release proof', () => {
  const result = evaluatePerformanceQualification({
    computedFingerprint: 'machine-a', registeredFingerprint: 'machine-b', requireReleaseProof: true,
  });
  assert.deepEqual(result, { status: 'UNQUALIFIED', releaseAllowed: false, reason: 'fingerprint-mismatch' });
});

test('cold measurement clears only cursor-zh verify session cache', async () => {
  const cleared = await clearVerifySessionCache(createScopedCacheFixture());
  assert.deepEqual(cleared, ['state/cache/verify-session.json']);
  assert.equal(await fixtureBackupStillExists(), true);
});

test('blocked ensure preserves every managed-target hash while degraded ensure commits current proofs', async () => {
  const blocked = await runFixtureEnsure({ admission: 'BLOCKED' });
  assert.deepEqual(blocked.beforeManagedTargetHashes, blocked.afterManagedTargetHashes);
  const degraded = await runFixtureEnsure({ admission: 'DEGRADED', fallbackProof: createCurrentFixtureProof() });
  assert.equal(degraded.verifyIssues.length, 0);
});
```

- [ ] **Step 2: Run RED**

Run: `node --test scripts/tests/tool/update-safety-net-performance.test.js scripts/tests/cursor-zh-tool.integration.test.js`

Expected: FAIL because the budget evaluator and fixture admission flow are not wired.

- [ ] **Step 3: Implement budget evaluation and hash-keyed warm reuse**

```js
function evaluateSafetyNetBudgets(actual, limits) {
  const issues = [];
  if (actual.coreRuntimeKB > limits.maxCoreKB) {
    issues.push(`core runtime payload (${actual.coreRuntimeKB} KB > ${limits.maxCoreKB} KB)`);
  }
  for (const [surface, size] of Object.entries(actual.surfaceShardKB)) {
    if (size > limits.maxSurfaceKB) issues.push(`surface shard ${surface} (${size} KB > ${limits.maxSurfaceKB} KB)`);
  }
  if (actual.qualification === 'QUALIFIED'
      && Math.max(...actual.warmVerifySamplesMs) > limits.maxWarmVerifyMs) issues.push('warm verify budget exceeded');
  if (actual.qualification === 'QUALIFIED'
      && Math.max(...actual.coldVerifySamplesMs) > limits.maxColdVerifyMs) issues.push('cold verify budget exceeded');
  return { issues, withinBudget: issues.length === 0 };
}
```

Cache coverage, locator, and shard measurements only under a composite key of original bundle hashes, NLS inventory hash, translation-unit metadata snapshot, runtime-governance snapshot, and tool version. Never reuse cached admission after any key component changes.

Compute the baseline fingerprint from normalized Windows build, CPU model/logical count, RAM bucket, Node major, Cursor fixture version/install identity, runtime mode, and measurement-profile ID. Compare its hash with protected `CURSOR_ZH_BASELINE_FINGERPRINT`. Run one unmeasured warmup, five warm samples, then three cold samples; before each cold sample call the narrowly scoped session-cache clearer and do not attempt to flush OS caches. In generic environments print `UNQUALIFIED` without failing wall-clock thresholds. When `CURSOR_ZH_REQUIRE_PERFORMANCE_PROOF=1`, missing/mismatched registration, incomplete samples, or any slowest-sample overrun exits nonzero.

Add a required `performance-baseline` job to `.github/workflows/release.yml` using `[self-hosted, Windows, cursor-zh-baseline]`, the protected fingerprint/install-directory values, and `CURSOR_ZH_REQUIRE_PERFORMANCE_PROOF=1`. Upload the machine-readable performance evidence artifact and make the existing `release` job depend on it with `needs: performance-baseline`. The GitHub-hosted release job must not substitute its own timing.

Document the update state machine, quarantine behavior, automatic safe `DEGRADED`, baseline sampling protocol, `UNQUALIFIED` meaning, and recovery commands in `docs/compatibility.md`.

- [ ] **Step 4: Run GREEN focused and full gates**

Run in order:

```powershell
node --test scripts/tests/tool/update-safety-net-performance.test.js scripts/tests/cursor-zh-tool.integration.test.js
node scripts/run-tests.js
```

Expected: focused tests PASS; full suite exits `0` with `0` failed tests.

- [ ] **Step 5: Run PowerShell AST gate**

Run:

```powershell
$errors = @()
Get-ChildItem -Path .\scripts -Filter *.ps1 -Recurse | ForEach-Object {
  $tokens = $null
  $parseErrors = $null
  [void][System.Management.Automation.Language.Parser]::ParseFile($_.FullName, [ref]$tokens, [ref]$parseErrors)
  $errors += $parseErrors
}
if ($errors.Count -gt 0) { $errors | Format-List; exit 1 }
```

Expected: exit `0` with no parse errors.

- [ ] **Step 6: Run live prepared apply/verify/user-operation/uninstall acceptance**

Run against the dedicated disposable test installation at `D:\Apps\cursor-test`. Do not point this acceptance sequence at the user's daily installation:

```powershell
node scripts/cursor-zh-tool.js ensure --install-dir "D:\Apps\cursor-test"
node scripts/cursor-zh-tool.js verify --install-dir "D:\Apps\cursor-test"
```

Manually verify normal workspace startup, composer follow-up, model picker search, settings search, one dialog fallback, and Marketplace opening. Then fully quit Cursor and run:

```powershell
node scripts/cursor-zh-tool.js uninstall --install-dir "D:\Apps\cursor-test"
node scripts/cursor-zh-tool.js verify --expect-clean --install-dir "D:\Apps\cursor-test"
```

Expected: no white screen or profile drift; declared UI operations are Chinese; Marketplace opens without a global scan; uninstall and clean verification succeed.

- [ ] **Step 7: Commit final gates and documentation**

```powershell
git add scripts/tests/tool/update-safety-net-performance.test.js scripts/tool/verify.js scripts/tool/session-cache.js .github/workflows/release.yml docs/compatibility.md
git commit -m "test: gate update resilient translation safety net"
```

### Task 11A: Record last-known-good activation and recover on the next stopped launch

**Files:**

- Create: `scripts/tool/rollout-state.js`
- Create: `scripts/tests/tool/rollout-state.test.js`
- Modify: `scripts/tool/commands.js`
- Modify: `scripts/tool/builder/bootstrap.js`
- Modify: `scripts/tests/tool/commands-start.test.js`

**Interfaces:**

- Produces: `recordPendingActivation({ acceptedManifest, recoveryCapsule, snapshot, nonce })`.
- Produces: `acknowledgeReadiness({ nonce, buildId, observedAt })`.
- Produces: `planNextLaunchRecovery({ rolloutState, cursorProcesses }) -> { action, reason }`.
- A readiness acknowledgement is valid only for the exact pending nonce/build ID.

- [ ] **Step 1: Write RED last-known-good and readiness tests**

```js
test('accepted canary records lastKnownGood and a one-use activation nonce', () => {
  const state = recordPendingActivation(createAcceptedFixture({ buildId: 'b2', previousBuildId: 'b1' }));
  assert.equal(state.lastKnownGood.buildId, 'b1');
  assert.equal(state.pendingActivation.buildId, 'b2');
  assert.ok(state.pendingActivation.nonce);
});

test('missing readiness never kills Cursor and restores before the next stopped launch', async () => {
  assert.deepEqual(planNextLaunchRecovery({ rolloutState: pendingFixture(), cursorProcesses: [{ pid: 42 }] }), {
    action: 'wait-for-stop', reason: 'pending-activation-unconfirmed',
  });
  const stopped = await runStartFixture({ rolloutState: pendingFixture(), cursorProcesses: [] });
  assert.deepEqual(stopped.events, ['lock', 'restore-last-known-good', 'verify-restored', 'release', 'spawn']);
});

test('readiness requires matching nonce, finished workbench load, and nonempty DOM', async () => {
  const bootstrap = createBootstrapHarness({ nonce: 'n1' });
  await bootstrap.didFinishLoad({ nonce: 'wrong', bodyChildCount: 1 });
  await bootstrap.didFinishLoad({ nonce: 'n1', bodyChildCount: 0 });
  assert.equal(bootstrap.acknowledgements.length, 0);
  await bootstrap.didFinishLoad({ nonce: 'n1', bodyChildCount: 1 });
  assert.equal(bootstrap.acknowledgements.length, 1);
});
```

- [ ] **Step 2: Run RED**

Run: `node --test scripts/tests/tool/rollout-state.test.js scripts/tests/tool/commands-start.test.js`

Expected: FAIL because accepted activation, bootstrap readiness, and next-launch recovery state do not exist.

- [ ] **Step 3: Implement one-shot readiness and stopped-start recovery**

After an accepted canary/enforced commit, preserve the prior accepted manifest/snapshot/capsule as `lastKnownGood` and atomically write a pending activation record with random nonce/build ID. Generate bootstrap metadata containing only the marker path, nonce, and build ID. On `browser-window-created`, listen once for the workbench `did-finish-load`, run one bounded DOM probe (`document.body` exists and has at least one child), then atomically acknowledge the matching nonce from the main process. Do not poll or scan the document.

At the start of `runStart()` and the mutation portion of `ensure`, inspect pending activation before spawning/writing. If Cursor is running, report `wait-for-stop` and do not terminate it. If stopped, acquire the Task 6A lock, restore and verify `lastKnownGood` through its validated capsule, clear the pending state only after verification, release, then launch. Failed recovery blocks launch and preserves all evidence.

- [ ] **Step 4: Run GREEN and bootstrap/start regressions**

Run: `node --test scripts/tests/tool/rollout-state.test.js scripts/tests/tool/commands-start.test.js scripts/tests/tool/bootstrap-redirect-cache.test.js scripts/tests/tool/bootstrap-glass.test.js scripts/tests/tool/transaction-preflight.test.js`

Expected: all tests PASS; no fixture kills Cursor, mismatched readiness never acknowledges, and restore completes under the install lock before spawn.

- [ ] **Step 5: Commit readiness recovery**

```powershell
git add scripts/tool/rollout-state.js scripts/tests/tool/rollout-state.test.js scripts/tool/commands.js scripts/tool/builder/bootstrap.js scripts/tests/tool/commands-start.test.js
git commit -m "feat: recover unconfirmed safety net activations"
```

### Task 11B: Gate shadow, canary, enforced promotion, and legacy retirement

**Files:**

- Modify: `scripts/tool/index.js`
- Modify: `scripts/tests/cursor-zh-tool.integration.test.js`
- Modify: `translations/meta/runtime-governance.json`
- Modify: `.github/workflows/release.yml`
- Modify: `docs/compatibility.md`

**Interfaces:**

- Rollout mode is one of `shadow`, `canary`, `enforced` and is persisted in manifest/evidence.
- Explicit transition options: `--safety-net-canary` and maintenance-only `--legacy-apply` with a declared expiry version.
- Produces: `validateRolloutPromotion(evidence) -> { promotable, issues }`.

- [ ] **Step 1: Write RED rollout and promotion integration tests**

The integration matrix must prove:

- `shadow` runs new prepare/admission/proof comparison but records zero new-engine managed writes, then uses the transition legacy writer;
- `canary` rejects missing flag, missing `CURSOR_ZH_CANARY_INSTALL_DIR`, path mismatch, or a non-disposable/daily install;
- `BLOCKED` never calls the legacy writer automatically;
- `enforced` is unavailable until all gates pass and evidence contains two distinct Cursor builds with at least one `upstreamUpdate: true`;
- `--legacy-apply` emits a maintenance warning during exactly one transition release and fails at/after `legacyWriterExpiresAt`.

Run: `node --test scripts/tests/cursor-zh-tool.integration.test.js scripts/tests/tool/rollout-state.test.js`

Expected: FAIL because rollout modes, guarded CLI options, evidence promotion, and expiry enforcement are not wired.

- [ ] **Step 2: Implement guarded rollout modes**

Default the transition release to `shadow`. Preserve the pre-refactor writer as an explicitly named `runLegacyApply()` only for that release; shadow may call it after the new engine produces comparison evidence, but a new-engine `BLOCKED` must stop rather than select legacy. Canary requires both the explicit CLI flag and exact normalized equality with protected `CURSOR_ZH_CANARY_INSTALL_DIR`; reject an install identity that matches the detected daily install. Enforced removes the legacy choice from normal routing.

Persist rollout mode, gate results, Cursor build identity, `upstreamUpdate` provenance, live-operation result, qualified performance evidence ID, and legacy expiry in `rollout-evidence.json`. Promotion requires every gate green plus two distinct builds including one real upstream update. Keep the maintenance-only legacy option for one declared package version and make expiry a failing contract test; delete the legacy writer in the enforced promotion change.

- [ ] **Step 3: Wire release promotion gate and documentation**

Extend the required release workflow so `validateRolloutPromotion` runs after the qualified performance job and before packaging. Missing/incomplete evidence, a failed live operation, fewer than two builds, no real upstream update, or expired legacy dependency blocks release. Upload rollout evidence with the performance evidence. Document exact shadow/canary/enforced commands, readiness recovery, and legacy expiry in `docs/compatibility.md`.

- [ ] **Step 4: Run GREEN, full suite, and release-workflow contract tests**

Run:

```powershell
node --test scripts/tests/cursor-zh-tool.integration.test.js scripts/tests/tool/rollout-state.test.js
node scripts/run-tests.js
```

Expected: all tests exit `0`; rollout promotion remains blocked until the fixture contains complete two-build evidence with one real upstream update.

- [ ] **Step 5: Commit staged rollout gates**

```powershell
git add scripts/tool/index.js scripts/tests/cursor-zh-tool.integration.test.js translations/meta/runtime-governance.json .github/workflows/release.yml docs/compatibility.md
git commit -m "feat: stage safety net rollout and retirement"
```

## Final Acceptance Checklist

- [ ] Every blocking translation unit has a stable ID, owner, primary route, and declared fallback policy.
- [ ] Synthetic drift preserves `100%` of blocking translations without adding minified version fragments.
- [ ] Ambiguous locators return `fallback` or `blocked` and never mutate source.
- [ ] Unknown copy remains English, is quarantined locally, and is excluded from covered counts; runtime reports contain raw text only from explicit UI-chrome allowlists and never contain user/editable/editor/terminal/chat/code/dynamic-value content.
- [ ] `BLOCKED` prepare performs zero writes to every managed target outside workspace state; only prepared artifacts and diagnostics are created before admission.
- [ ] Legacy manifests/backups remain byte-identical; accepted state is published only after verification, and future/corrupt state never authorizes guessed recovery.
- [ ] Busy processes, a live transaction, or prepare-to-commit drift blocks before backup/write; lock ownership spans post-commit verification or full rollback, and stale locks are never reclaimed by age alone.
- [ ] Safe `DEGRADED` commits automatically only when every blocking failure has a complete current-version fallback proof; any missing, ambiguous, failed, or stale proof yields `BLOCKED`.
- [ ] Core runtime payload is `<= 80 KB`; every lazy surface shard is `<= 20 KB`.
- [ ] Registered baseline evidence contains one warmup, five warm samples, and three cursor-zh-cache-cold samples; the slowest warm `verify <= 3 s` and slowest cold `verify <= 8 s`.
- [ ] Generic environments report `UNQUALIFIED`; missing/mismatched/incomplete baseline evidence blocks the release workflow.
- [ ] Shadow produces full comparison evidence with zero new-engine writes; canary is restricted to the registered disposable install; enforced evidence covers two builds including a real upstream update.
- [ ] Accepted activation records `lastKnownGood`; unconfirmed readiness never kills Cursor and restores under lock before the next stopped launch.
- [ ] `BLOCKED` never auto-falls back to legacy, and the maintenance-only legacy writer fails after one transition release and is removed on enforced promotion.
- [ ] Runtime translation is surface-scoped and disposed on unmount; the sole global discovery observer is child-list-only, non-translating, and limited to 30 added roots per idle batch.
- [ ] No polling, global rescan, eager parsing of unmounted surface mappings, online translation, or fuzzy source mutation.
- [ ] Full Node suite and PowerShell AST gate pass.
- [ ] Live startup, key UI operations, Marketplace, uninstall, and clean verification pass.

## Rollback and Stop Conditions

- Stop immediately on white screen, startup failure, profile-directory drift, clean-state regression, or wrong-target source mutation.
- Stop if a parser dependency becomes necessary; request explicit approval rather than adding it implicitly.
- Stop if a hard budget can only pass by weakening coverage or verification.
- Roll back each task through its isolated commit; never use destructive reset in a dirty user worktree.
- Roll back the complete managed-target set in reverse commit order after any failed commit verification, while preserving prepared diagnostics and backup snapshots.
- For an unconfirmed activation, defer recovery while Cursor runs; on the next stopped start/ensure restore and verify `lastKnownGood` under the install lock before launching.

## Plan Self-Review

- Spec coverage: stable identity and state compatibility (Tasks 1-2B), semantic relocation (Tasks 3-4), update admission and transaction (Tasks 5-6B), runtime safety net (Tasks 7-8), quarantine/verification/performance/lifecycle (Tasks 9-10), staged rollout/readiness/recovery/retirement (Tasks 11A-11B).
- Task size: every task changes 3-5 files and produces one independently reviewable behavior.
- Dependency order: metadata precedes resolution; resolution precedes admission; admission precedes commit; sharding precedes runtime lifecycle; reporting and performance gates come last.
- TDD: every production slice begins with a focused failing test, records the expected failure, then adds the minimum implementation and reruns focused regressions.
- Placeholder scan: every implementation step contains a concrete API, command, expected result, and bounded error behavior.
