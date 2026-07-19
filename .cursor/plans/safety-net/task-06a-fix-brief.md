# Task 6A Fix Brief (review CHANGES_REQUESTED)

Work from: `D:\Project\Cursor-zh\.worktrees\update-resilient-safety-net`
Branch: `feature/update-resilient-safety-net`
Base commit: `7fa3e16` (feat: lock and revalidate managed commits)

## Important findings to fix

1. **Fail-closed on tasklist failure** — `listBusyProcessesForCommit()` / apply/ensure must BLOCK when `checkCursorRunning()` returns `{ warning }` or cannot confirm Cursor is absent (not fail-open).
2. **Real inspectProcess + OS processStartedAt** — stop using `inspectProcess: () => ({ exists: false })` and `processStartedAt = now()` in production paths. Implement a Windows-capable inspector (PID exists + start time) and pass it into `acquireTransactionLock` from create-app and uninstall-orchestrator. Stale reclaim must require age AND (PID missing OR start-time mismatch).
3. **Install-scoped updater enumeration** — `listBusyProcessesForCommit(installDir)` must include updater processes whose path/cmdline belongs to the install (reuse commit-preflight helpers if present).
4. **Integration tests** — cover `withCommitStillnessLease` / createToolApp path: fail-closed warning, lock contention, and future-manifest capsule gate for uninstall. Ensure uninstall mocks include `locksDir`.
5. **Uninstall post-lock stillness recheck** — after acquiring lease, re-run stillness validation before destructive work (mirror apply/ensure / runCommitPreflight).

## TDD

- Extend `scripts/tests/tool/transaction-preflight.test.js` and/or add focused create-app / uninstall integration tests
- Witness RED for each Important behavior before production fixes
- GREEN the Task 6A suite + uninstall-preflight + commands-apply + commands-ensure

## Commit

`fix: harden commit stillness production wiring`

Do not start Task 6B. Stay in the worktree only.
