# Task 6B Fix Brief (review CHANGES_REQUESTED)

Work from: `D:\Project\Cursor-zh\.worktrees\update-resilient-safety-net`
Base: `a5943ac`

## Critical / Important

1. **Wire `classifyUpdateAdmission` into production `prepareBuild`** — do not default to `KNOWN_DRIFT`. Real apply must be able to reach `BLOCKED` (and zero managed writes) when Task 5 classifier says so. Prefer computing drift/outcomes/proof key from available update-profile / translation-unit evidence; if outcomes are empty and drift false → UNCHANGED; if drift with unresolved blocking failures without proofs → BLOCKED.

2. **Lease-time currentSnapshot** — `acquireCommitLease` must re-snapshot managed targets from disk for `currentSnapshot`. Do not set `currentSnapshot === preparedSnapshot` by default (that disables 6A concurrent-drift preflight).

3. **Test coverage** — assert `extensionTranslation` (and other Checkpoint C managed kinds) appear in `getManagedTransactionTargets` / managed-kind enumeration test.

## TDD

- RED tests first for: production admit path can BLOCKED without options injection; lease passes distinct currentSnapshot; extensionTranslation kind present
- GREEN focused suites: commands-apply-prepared + transaction-preflight + update-admission + commands-apply
- Commit: `fix: wire admission and lease-time snapshot for prepared apply`

Do not start Task 7. Stay in the worktree only.
