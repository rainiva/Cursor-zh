### Task 5: Add the admission classifier with automatic safe DEGRADED mode

**Files:**

- Create: `scripts/lib/compatibility/admission.js`
- Create: `scripts/tests/lib/update-admission.test.js`
- Modify: `translations/meta/translation-units.json`

**Interfaces:**

- Produces: `classifyUpdateAdmission({ drift, outcomes }) -> { status, blockers, fallbacks }`
- `DEGRADED` is automatic only when every error-severity primary failure has `fallbackTested === true`.

- [ ] **Step 1: Write RED state-machine tests**

```js
test('admits DEGRADED only when every blocking failure has a tested fallback', () => {
  assert.deepEqual(classifyUpdateAdmission({ drift: true, outcomes: [
    { translationId: 'product_tips.render_text', severity: 'error', primary: 'missing', fallbackTested: true },
  ] }), { status: 'DEGRADED', blockers: [], fallbacks: ['product_tips.render_text'] });

  assert.deepEqual(classifyUpdateAdmission({ drift: true, outcomes: [
    { translationId: 'composer.send_follow_up', severity: 'error', primary: 'ambiguous', fallbackTested: false },
  ] }), { status: 'BLOCKED', blockers: ['composer.send_follow_up'], fallbacks: [] });
});

test('returns UNCHANGED without drift and KNOWN_DRIFT when primaries resolve', () => {
  assert.equal(classifyUpdateAdmission({ drift: false, outcomes: [] }).status, 'UNCHANGED');
  assert.equal(classifyUpdateAdmission({ drift: true, outcomes: [
    { translationId: 'composer.send_follow_up', severity: 'error', primary: 'resolved', fallbackTested: false },
  ] }).status, 'KNOWN_DRIFT');
});
```

- [ ] **Step 2: Run RED**

Run: `node --test scripts/tests/lib/update-admission.test.js`

Expected: FAIL because `admission.js` is missing.

- [ ] **Step 3: Implement the pure classifier**

```js
function classifyUpdateAdmission({ drift, outcomes }) {
  if (!drift) return { status: 'UNCHANGED', blockers: [], fallbacks: [] };
  const blockers = outcomes.filter((item) =>
    item.severity === 'error' && item.primary !== 'resolved' && item.fallbackTested !== true
  ).map((item) => item.translationId);
  if (blockers.length > 0) return { status: 'BLOCKED', blockers, fallbacks: [] };
  const fallbacks = outcomes.filter((item) => item.primary !== 'resolved' && item.fallbackTested === true)
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
git add scripts/lib/compatibility/admission.js scripts/tests/lib/update-admission.test.js translations/meta/translation-units.json
git commit -m "feat: classify safe degraded updates"
```

### Task 6: Split apply into prepare and commit with zero-write blocking

**Files:**

- Create: `scripts/tool/prepared-build.js`
- Create: `scripts/tests/tool/commands-apply-prepared.test.js`
- Modify: `scripts/tool/commands.js`
- Modify: `scripts/tool/create-app.js`
- Modify: `scripts/tool/paths.js`

**Interfaces:**

- Produces: `createPreparedBuild({ buildId, rootDir, artifacts, admission, manifest })`
- Produces: `commitPreparedBuild(prepared, writers) -> { committedPaths }`
- `runApply()` performs no install writer call before admission is non-`BLOCKED`.

- [ ] **Step 1: Write the failing zero-write test**

```js
test('blocked prepare performs zero install writes and keeps diagnostics', async () => {
  const writes = [];
  const prepared = { admission: { status: 'BLOCKED', blockers: ['composer.send_follow_up'] } };
  const commands = createCommandsModule({
    prepareBuild: async () => prepared,
    commitPreparedBuild: async () => { writes.push('commit'); },
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
  });
}

async function commitPreparedBuild(prepared, writers) {
  if (prepared.admission.status === 'BLOCKED') {
    throw new Error(`blocked: ${prepared.admission.blockers.join(', ')}`);
  }
  const committedPaths = [];
  for (const artifact of prepared.artifacts) {
    await writers.writeArtifact(artifact);
    committedPaths.push(artifact.installPath);
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
const backupDir = ensureBackup(context);
try {
  await commitPreparedBuild(prepared);
  const report = verifyState(context, { preparedBuildId: prepared.buildId });
  if (report.issues.length > 0) throw Object.assign(new Error('post-commit verify failed'), { report });
} catch (error) {
  await rollbackCommittedBuild({ context, backupDir, prepared });
  throw error;
}
```

Add `preparedBuildRoot: path.join(generatedDir, 'prepared')` to `createToolPaths()` and wire all new dependencies through `createToolApp()`.

- [ ] **Step 4: Run GREEN and rollback regressions**

Run: `node --test scripts/tests/tool/commands-apply-prepared.test.js scripts/tests/tool/commands-apply-rollback.test.js scripts/tests/tool/commands-apply-rollback-locale.test.js scripts/tests/tool/commands-apply.test.js`

Expected: all tests PASS; the blocked fixture reports zero install writes; post-commit failure restores the backup.

- [ ] **Step 5: Commit transactional apply**

```powershell
git add scripts/tool/prepared-build.js scripts/tests/tool/commands-apply-prepared.test.js scripts/tool/commands.js scripts/tool/create-app.js scripts/tool/paths.js
git commit -m "refactor: make apply a prepared transaction"
```

## Checkpoint C: Safe Update Admission

- [ ] Run Task 5 and Task 6 suites plus `scripts/tests/tool/commands-ensure.test.js`.
- [ ] Assert `BLOCKED` causes zero install writes.
- [ ] Assert `DEGRADED` commits automatically only with tested fallbacks.
- [ ] Assert post-commit verification failure restores the prior snapshot and preserves diagnostics.

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

- [ ] **Step 1: Write RED lifecycle tests**

```js
test('loads one shard on mount, translates only inside it, and disconnects on unmount', () => {
  const harness = createRuntimeDomHarness({ surfaceShards: {
    composer: { selectors: ['[class*="composer"]'], entries: [
      { translationId: 'composer.send', aliases: ['Send'], changeText: '发送', match: 'exact' },
    ] },
  } });
  assert.equal(harness.activeObserverCount(), 0);
  const outside = harness.mountText('Send');
  const composer = harness.mountSurface('composer', 'Send');
  harness.flushMicrotasks();
  harness.runDueTimers();
  assert.equal(outside.textContent, 'Send');
  assert.equal(composer.textContent, '发送');
  assert.equal(harness.activeObserverCount(), 1);
  composer.remove();
  harness.flushMicrotasks();
  assert.equal(harness.activeObserverCount(), 0);
});

test('yields after thirty text nodes', () => {
  const harness = createRuntimeDomHarness({ surfaceBatchSize: 30 });
  harness.mountSurfaceWithItems('composer', 31, 'Send');
  harness.runOneIdleBatch();
  assert.equal(harness.translatedTextCount(), 30);
  assert.equal(harness.pendingIdleBatchCount(), 1);
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

The discovery observer may watch for surface roots, but after activation each translator observes only its registered root. It must not schedule a document-wide rescan. Extend the harness with observer counting and one-idle-batch controls used by the test.

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

- Produces: `buildQuarantineReport(records) -> { blockers, changedAliases, criticalUnknown, visibleUnknown, noise }`
- Manifest persists `updateProfile`, `admission`, `runtimeShards`, and report path.
- `verify` prints `resolved`, `fallback`, `unknown`, and `blocked` separately.

- [ ] **Step 1: Write RED priority and no-guess tests**

```js
test('prioritizes blockers and leaves unknown text untranslated', () => {
  const report = buildQuarantineReport([
    { text: 'Brand new copy', surface: 'composer', kind: 'unknown', critical: true },
    { translationId: 'composer.send', kind: 'blocked' },
    { text: 'inventory token', surface: 'unknown', kind: 'noise' },
  ]);
  assert.deepEqual(report.blockers.map((item) => item.translationId), ['composer.send']);
  assert.deepEqual(report.criticalUnknown.map((item) => item.text), ['Brand new copy']);
  assert.equal(report.criticalUnknown[0].changeText, undefined);
});
```

- [ ] **Step 2: Run RED**

Run: `node --test scripts/tests/lib/quarantine-report.test.js`

Expected: FAIL because the report module is missing.

- [ ] **Step 3: Implement deterministic buckets and verify output**

```js
function buildQuarantineReport(records) {
  const report = { blockers: [], changedAliases: [], criticalUnknown: [], visibleUnknown: [], noise: [] };
  for (const record of records) {
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

Extend manifest/report output without weakening existing issues. A `BLOCKED` unit remains an issue; a tested `fallback` in `DEGRADED` is an explicit warning; unknown text is not counted in coverage and has no synthesized `changeText`.

- [ ] **Step 4: Run GREEN and verify regressions**

Run: `node --test scripts/tests/lib/quarantine-report.test.js scripts/tests/tool/manifest.test.js scripts/tests/tool/verify.test.js scripts/tests/tool/commands-ensure.test.js`

Expected: all tests PASS.

- [ ] **Step 5: Commit observable admission**

```powershell
git add scripts/lib/compatibility/quarantine-report.js scripts/tests/lib/quarantine-report.test.js scripts/tool/manifest.js scripts/tool/verify.js scripts/tool/report.js
git commit -m "feat: report update admission and unknown copy"
```