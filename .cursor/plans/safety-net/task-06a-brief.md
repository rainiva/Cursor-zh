# Task 6A Brief: Exclusive commit stillness preflight

Work from: `D:\Project\Cursor-zh\.worktrees\update-resilient-safety-net`
Branch: `feature/update-resilient-safety-net`
Depends on: Task 5 `53c6e4a`; Task 2B recovery capsule / state reader

## Plan

Task 6A in `docs/superpowers/plans/2026-07-17-update-resilient-translation-safety-net.md`
English code blocks are interface source of truth.

## Files

- Create: `scripts/tool/transaction-lock.js`
- Create: `scripts/tool/commit-preflight.js`
- Create: `scripts/tests/tool/transaction-preflight.test.js`
- Modify: `scripts/tool/create-app.js`
- Modify: `scripts/tool/uninstall-orchestrator.js`

## Interfaces

- `acquireTransactionLock({ installDir, operationId, operation, inspectProcess, now }) -> lease`
- `validateCommitStillness({ installDir, processes, preparedSnapshot, currentSnapshot }) -> { status, reason, evidence }`
- Lock identity: `sha256(normalizedInstallDir)` under `state/locks/`
- Shared by `apply` / `ensure` / `uninstall`

## TDD

1. RED busy/concurrency/drift/stale-lock tests per plan
2. Implement atomic `wx` lock + stillness validation + wire create-app / uninstall-orchestrator
3. GREEN: transaction-preflight + uninstall regressions + commands-apply + commands-ensure
   - If `uninstall-orchestrator.test.js` is missing, use the closest existing uninstall test files and note the substitution
4. Commit: `feat: lock and revalidate managed commits`
5. Update progress.md

## Constraints

- Fail closed when Cursor.exe path unavailable
- Reclaim stale locks only with age + PID start-time proof
- Zero managed writes on BLOCKED
- Future manifest uninstall requires independently valid recovery capsule (Task 2B)
- Stay in this worktree
