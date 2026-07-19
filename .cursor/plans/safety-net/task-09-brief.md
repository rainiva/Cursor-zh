# Task 9 Brief: Report unknown text and persist admission evidence

Work from: `D:\Project\Cursor-zh\.worktrees\update-resilient-safety-net`
Depends on: Task 8 `61b8ea7`; Task 5 admission; Task 2 update profile

## Plan

Task 9 in `docs/superpowers/plans/2026-07-17-update-resilient-translation-safety-net.md`
English code blocks are interface source of truth.

## Files

- Create: `scripts/lib/compatibility/quarantine-report.js`
- Create: `scripts/tests/lib/quarantine-report.test.js`
- Modify: `scripts/tool/manifest.js`
- Modify: `scripts/tool/verify.js`
- Modify: `scripts/tool/report.js`

## Interfaces

- `buildQuarantineReport(records) -> { blockers, changedAliases, criticalUnknown, visibleUnknown, noise, privacyDrops }`
- Manifest persists `updateProfile`, `admission`, `runtimeShards`, and report path
- `verify` prints `resolved`, `fallback`, `unknown`, and `blocked` separately
- Privacy filter again before serialization; never write ephemeral HMAC key
- Unknown text has no synthesized `changeText`

## TDD

1. RED priority/no-guess tests per plan
2. Implement report + wire manifest/verify/report
3. GREEN: quarantine-report + manifest + verify + commands-ensure
4. Commit: `feat: report update admission and unknown copy`
5. Update progress.md

## Constraints

- Stay in this worktree
- BLOCKED units remain issues; proven DEGRADED fallbacks are warnings with proof evidence
