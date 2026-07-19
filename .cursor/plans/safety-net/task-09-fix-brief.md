# Task 9 Important Fix Brief

Review [Review Task 9](c6370305-6acb-4459-b79e-f15fe5ea730a) → CHANGES_REQUESTED.

## Important

1. **Production path never persists admission evidence**
   - `writeQuarantineReport` has no tool caller.
   - `buildManifest(...)` in apply/ensure (`runLegacyApply` / commands.js ~699) omits `updateProfile` / `safetyNet`.
   - Wire: on successful apply/ensure (and prepared publish if that is the write path), call `writeQuarantineReport`, then pass `updateProfile` + `safetyNet: { admission, runtimeShards, quarantineReportPath, quarantineReport }` into `buildManifest`.

2. **`buildManifest` must sanitize quarantineReport**
   - Before embedding `safetyNet.quarantineReport`, re-run privacy sanitize / serialize so runtime raw / hmac keys cannot land in `build-manifest.json` even if a caller bypasses `writeQuarantineReport`.

## Constraints

- TDD: add/adjust failing tests first (manifest sanitize + apply/ensure persistence).
- Do not weaken verify severity rules.
- Worktree only: `D:\Project\Cursor-zh\.worktrees\update-resilient-safety-net`
- Commit: `fix: persist admission evidence on apply path`
