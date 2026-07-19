# Task 2B Brief: Version state schemas and stable recovery capsule

Work from: `D:\Project\Cursor-zh\.worktrees\update-resilient-safety-net`
Branch: `feature/update-resilient-safety-net`
Depends on: Task 2 at `c6aac94`

## Plan

Full Task 2B in `docs/superpowers/plans/2026-07-17-update-resilient-translation-safety-net.md` (through Checkpoint A, before Task 3).
English code blocks are interface source of truth.

## Files

- Create: `scripts/lib/compatibility/state-schema.js`
- Create: `scripts/lib/install/recovery-capsule.js`
- Create: `scripts/tests/lib/state-migration-recovery.test.js`
- Modify: `scripts/tool/manifest.js`
- Modify: `scripts/lib/install/validate-backup.js`

## Interfaces

- `readStateManifest(raw, { readerVersion }) -> { status, sourceSchema, manifest }`
- `buildRecoveryCapsule({ operation, buildId, installIdentity, backup, managedTargets })`
- `validateRecoveryCapsule(capsule, context) -> { valid, issues, recovery }`
- `canRunOperation(op, stateResult, options?)` as used by the plan tests
- Support unversioned `v0` + previous two formal schemas via read-only in-memory adapters
- Future/corrupt fail closed; uninstall across future state only with independently valid capsule

## TDD

1. RED tests as in plan Step 1 (adapt fixtures without mutating bytes; future blocks apply/ensure; uninstall needs valid capsule)
2. Implement adapters + capsule validation per Step 3
3. GREEN: `node --test scripts/tests/lib/state-migration-recovery.test.js scripts/tests/tool/manifest.test.js scripts/tests/lib/validate-backup.test.js scripts/tests/tool/uninstall-orchestrator.test.js`
4. After GREEN, also run Checkpoint A suite from the plan
5. Commit: `feat: version state and preserve recovery compatibility`

## Constraints

- Never rewrite/rename/prune/upgrade legacy backup directories
- Adapt only in memory; preserve original object/bytes
- Stay in this worktree; no production deps
- Update `.cursor/plans/safety-net/progress.md` when done
