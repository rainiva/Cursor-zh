# Task 5 Brief: Admission classifier with automatic safe DEGRADED

Work from: `D:\Project\Cursor-zh\.worktrees\update-resilient-safety-net`
Branch: `feature/update-resilient-safety-net`
Depends on: Task 4 `918b301`; Checkpoint B green

## Plan

Task 5 in `docs/superpowers/plans/2026-07-17-update-resilient-translation-safety-net.md`
English code blocks are interface source of truth.

## Files

- Create: `scripts/lib/compatibility/admission.js`
- Create: `scripts/tests/lib/update-admission.test.js`
- Modify: `scripts/lib/compatibility/update-profile.js`
- Modify: `translations/meta/translation-units.json`

## Interfaces

- `classifyUpdateAdmission({ drift, outcomes, currentProofKey }) -> { status, blockers, fallbacks }`
- `createFallbackProofKey({ bundleHashes, nlsInventoryHash, runtimeGovernanceHash, toolVersion })`
- Statuses: `UNCHANGED` | `KNOWN_DRIFT` | `DEGRADED` | `BLOCKED`
- `DEGRADED` only when every error-severity primary failure has a complete current-version fallback proof matching `currentProofKey`

## TDD

1. RED state-machine tests per plan Step 1
2. Implement pure classifier (+ createFallbackProofKey; wire any update-profile / translation-units fields the plan requires for proof metadata)
3. GREEN: `node --test scripts/tests/lib/update-admission.test.js scripts/tests/lib/translation-units.test.js`
4. Commit: `feat: classify safe degraded updates`
5. Update progress.md

## Constraints

- Pure classifier — no install writes
- Stay in this worktree
- Export createFallbackProofKey even if plan Step 3 snippet only shows classifyUpdateAdmission
