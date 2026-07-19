# Task 11A Critical Fix Brief

Review → CHANGES_REQUESTED on `16ed88e`.

## Critical

1. **Consume readiness marker into acknowledgeReadiness before recovery**
   - Before `recoverUnconfirmedActivationIfNeeded`: read `readiness-ack.json`, call `acknowledgeReadiness({ nonce, buildId })`, atomically `saveRolloutState` on match (clear pending).
   - Mismatched marker leaves pending intact.
   - TDD: matching marker → start spawns without restore; wrong nonce → still restores when stopped.

2. **Resolve lastKnownGood recovery capsule from path/ref**
   - When recording or restoring, load full capsule JSON from `recoveryCapsuleRef`/`path` before `validateRecoveryCapsule`.
   - Path stubs `{ path, buildId }` must not be passed as full capsules.

## Important

3. Align generated bootstrap nonce/build checks with harness (or prove end-to-end via marker consumption + acknowledge). Prefer consuming marker chain + tests over diverging harness.

Commit: `fix: consume readiness ack and resolve recovery capsules`
Worktree only.
