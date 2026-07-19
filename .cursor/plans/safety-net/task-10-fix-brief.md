# Task 10 Important Fix Brief

Review → CHANGES_REQUESTED on `6d67091`.

## Important

1. **Warm/cold hash-keyed reuse must actually work**
   - Before expensive coverage/locator work, `canReuseVerifySession` / matching reuse key must short-circuit warm path.
   - Warm samples must persist verify session (`persistVerifySession: true` or equivalent).
   - Cold path: `clearVerifySessionCache` then full recompute.
   - Add/adjust tests proving warm reuse vs cold recompute difference.

2. **Missing runtimeShards must fail size budgets (not 0 KB pass)**
   - `collectRuntimeSizeActual` returning 0 when shards/manifest absent lets size gates pass silently.
   - Treat missing size evidence as an issue (especially always for hard size budgets; at minimum when evidence required / REQUIRE_PERFORMANCE_PROOF).
   - RED: missing runtimeShards → budget issues, not withinBudget.

Commit: `fix: make warm reuse and size evidence real`
Worktree only.
