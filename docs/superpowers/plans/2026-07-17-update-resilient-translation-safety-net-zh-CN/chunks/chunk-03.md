### Task 10: Enforce performance budgets and complete lifecycle acceptance

**Files:**

- Create: `scripts/tests/tool/update-safety-net-performance.test.js`
- Modify: `scripts/tool/verify.js`
- Modify: `scripts/tool/session-cache.js`
- Modify: `scripts/tests/cursor-zh-tool.integration.test.js`
- Modify: `docs/compatibility.md`

**Interfaces:**

- `verify` emits machine-readable stage timings and fails hard budgets on the baseline machine/profile.
- Warm verification reuses source-hash-keyed coverage and locator outcomes; cold verification recomputes them.

- [ ] **Step 1: Write RED budget and lifecycle tests**

```js
test('enforces core, shard, warm verify, and cold verify budgets', () => {
  const result = evaluateSafetyNetBudgets({
    coreRuntimeKB: 80.1,
    surfaceShardKB: { composer: 19.5 },
    warmVerifyMs: 2800,
    coldVerifyMs: 7900,
  }, { maxCoreKB: 80, maxSurfaceKB: 20, maxWarmVerifyMs: 3000, maxColdVerifyMs: 8000 });
  assert.deepEqual(result.issues, ['core runtime payload (80.1 KB > 80 KB)']);
});

test('blocked ensure preserves install hashes while degraded ensure commits tested fallbacks', async () => {
  const blocked = await runFixtureEnsure({ admission: 'BLOCKED' });
  assert.deepEqual(blocked.beforeInstallHashes, blocked.afterInstallHashes);
  const degraded = await runFixtureEnsure({ admission: 'DEGRADED', fallbackTested: true });
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
  if (actual.warmVerifyMs > limits.maxWarmVerifyMs) issues.push('warm verify budget exceeded');
  if (actual.coldVerifyMs > limits.maxColdVerifyMs) issues.push('cold verify budget exceeded');
  return { issues, withinBudget: issues.length === 0 };
}
```

Cache coverage, locator, and shard measurements only under a composite key of original bundle hashes, NLS inventory hash, translation-unit metadata snapshot, runtime-governance snapshot, and tool version. Never reuse cached admission after any key component changes.

Document the update state machine, quarantine behavior, automatic safe `DEGRADED`, and recovery commands in `docs/compatibility.md`.

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
git add scripts/tests/tool/update-safety-net-performance.test.js scripts/tool/verify.js scripts/tool/session-cache.js scripts/tests/cursor-zh-tool.integration.test.js docs/compatibility.md
git commit -m "test: gate update resilient translation safety net"
```

## Final Acceptance Checklist

- [ ] Every blocking translation unit has a stable ID, owner, primary route, and declared fallback policy.
- [ ] Synthetic drift preserves `100%` of blocking translations without adding minified version fragments.
- [ ] Ambiguous locators return `fallback` or `blocked` and never mutate source.
- [ ] Unknown copy remains English, is quarantined locally, and is excluded from covered counts.
- [ ] `BLOCKED` prepare performs zero installation writes.
- [ ] Safe `DEGRADED` commits automatically only when every blocking failure has a tested fallback.
- [ ] Core runtime payload is `<= 80 KB`; every lazy surface shard is `<= 20 KB`.
- [ ] Warm `verify <= 3 s`; cold `verify <= 8 s` on the baseline machine/profile.
- [ ] Runtime work is surface-scoped, event-driven, limited to 30 nodes per idle batch, and disposed on unmount.
- [ ] No polling, global rescan, eager parsing of unmounted surface mappings, online translation, or fuzzy source mutation.
- [ ] Full Node suite and PowerShell AST gate pass.
- [ ] Live startup, key UI operations, Marketplace, uninstall, and clean verification pass.

## Rollback and Stop Conditions

- Stop immediately on white screen, startup failure, profile-directory drift, clean-state regression, or wrong-target source mutation.
- Stop if a parser dependency becomes necessary; request explicit approval rather than adding it implicitly.
- Stop if a hard budget can only pass by weakening coverage or verification.
- Roll back each task through its isolated commit; never use destructive reset in a dirty user worktree.
- Preserve prepared diagnostics and backup snapshots after any failed commit verification.

## Plan Self-Review

- Spec coverage: stable identity (Tasks 1-2), semantic relocation (Tasks 3-4), update admission and transaction (Tasks 5-6), runtime safety net (Tasks 7-8), quarantine/verification/performance/lifecycle (Tasks 9-10).
- Task size: every task changes 3-5 files and produces one independently reviewable behavior.
- Dependency order: metadata precedes resolution; resolution precedes admission; admission precedes commit; sharding precedes runtime lifecycle; reporting and performance gates come last.
- TDD: every production slice begins with a focused failing test, records the expected failure, then adds the minimum implementation and reruns focused regressions.
- Placeholder scan: every implementation step contains a concrete API, command, expected result, and bounded error behavior.