# Task 6B Brief: Split apply into prepare and commit with zero-write blocking

Work from: `D:\Project\Cursor-zh\.worktrees\update-resilient-safety-net`
Branch: `feature/update-resilient-safety-net`
Depends on: Task 6A `7fa3e16` (locks/stillness); Task 5 admission; Task 2B capsule

## Plan

Task 6B + Checkpoint C in `docs/superpowers/plans/2026-07-17-update-resilient-translation-safety-net.md`
English code blocks are interface source of truth.

## Files

- Create: `scripts/tool/prepared-build.js`
- Create: `scripts/tests/tool/commands-apply-prepared.test.js`
- Modify: `scripts/tool/commands.js`
- Modify: `scripts/tool/create-app.js`
- Modify: `scripts/lib/install/managed-external-files.js`

## Interfaces

- `createPreparedBuild({ buildId, rootDir, artifacts, admission, manifest, recoveryCapsule, managedTargetSnapshot })`
- `commitPreparedBuild(prepared, writers) -> { committedPaths }`
- `runApply()` must perform no managed-target writer call before admission is non-`BLOCKED`
- Prep root: `toolPaths.generatedDir/<build-id>`
- Reuse Task 6A `acquireTransactionLock` / `validateCommitStillness` around commit only
- Extract `runLegacyApply()` for one transition release (never selected from new-engine BLOCKED)

## TDD

1. RED zero-write blocked prepare test per plan
2. Implement prepared-build + refactor runApply order: prepare → report → admit → lease → backup → commit → verify → publish; rollback on failure
3. Extend managed-external-files enumeration for full managed target set; keep writeLocaleFiles no-op
4. GREEN: commands-apply-prepared + rollback suites + commands-apply (substitute missing rollback files if needed and note it)
5. Run Checkpoint C assertions as focused tests or document coverage via existing suites
6. Commit: `refactor: make apply a prepared transaction`
7. Update progress.md

## Constraints

- BLOCKED → zero managed writes (install + argv + locale + extension NLS + clp cache + launchers + shortcuts)
- Workspace prepared artifacts + diagnostics allowed before admission
- Stay in this worktree only
