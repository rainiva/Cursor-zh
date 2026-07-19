# Task 10 Brief — Enforce performance budgets and complete lifecycle acceptance

## Spec
English plan Task 10 in:
`docs/superpowers/plans/2026-07-17-update-resilient-translation-safety-net.md`

Files:
- Create: `scripts/tests/tool/update-safety-net-performance.test.js`
- Modify: `scripts/tool/verify.js`, `scripts/tool/session-cache.js`, `.github/workflows/release.yml`, `docs/compatibility.md`
- Implement `evaluateSafetyNetBudgets`, `evaluatePerformanceQualification`, scoped `clearVerifySessionCache`, warm/cold verify sampling, release baseline job.

## Interfaces (source of truth = English plan code blocks)
- Size budgets fail everywhere; wall-clock only when QUALIFIED.
- UNQUALIFIED cannot satisfy release proof when `CURSOR_ZH_REQUIRE_PERFORMANCE_PROOF=1`.
- Cold measurement clears only cursor-zh verify session cache.
- blocked ensure preserves managed-target hashes; degraded ensure commits current proofs.
- Release workflow: self-hosted `performance-baseline` job with `needs` before publish.

## Process
TDD RED → GREEN → commit `feat: enforce safety-net performance budgets`
Update progress.md.
Worktree only: `D:\Project\Cursor-zh\.worktrees\update-resilient-safety-net`
