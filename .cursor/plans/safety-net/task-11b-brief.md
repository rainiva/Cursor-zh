# Task 11B Brief — Gate shadow, canary, enforced promotion, and legacy retirement

## Spec
English plan Task 11B in:
`docs/superpowers/plans/2026-07-17-update-resilient-translation-safety-net.md`

Files:
- Modify: `scripts/tool/index.js`, `scripts/tests/cursor-zh-tool.integration.test.js`, `translations/meta/runtime-governance.json`, `.github/workflows/release.yml`, `docs/compatibility.md`
- Likely also: rollout-state / commands for CLI flags and evidence (as needed for interfaces)

## Interfaces
- Rollout modes: `shadow` | `canary` | `enforced` persisted in manifest/evidence
- CLI: `--safety-net-canary`, maintenance `--legacy-apply` with declared expiry
- `validateRolloutPromotion(evidence) -> { promotable, issues }`
- Default transition release: `shadow`
- BLOCKED never auto-calls legacy writer
- Canary: CLI flag + exact `CURSOR_ZH_CANARY_INSTALL_DIR` match; reject daily install
- Enforced: unavailable until gates pass + two distinct builds with one `upstreamUpdate: true`
- Release workflow runs `validateRolloutPromotion` after performance-baseline

## Process
TDD RED→GREEN. Commit: `feat: stage safety net rollout and retirement`
Run plan Step 4 focused tests; full suite if feasible.
Update progress.md. Worktree only.
Prior tip includes Task 11A fix `7951a31`.
