# Task 11A Brief — Record last-known-good activation and recover on next stopped launch

## Spec
English plan Task 11A in:
`docs/superpowers/plans/2026-07-17-update-resilient-translation-safety-net.md`

Files:
- Create: `scripts/tool/rollout-state.js`, `scripts/tests/tool/rollout-state.test.js`
- Modify: `scripts/tool/commands.js`, `scripts/tool/builder/bootstrap.js`, `scripts/tests/tool/commands-start.test.js`

## Interfaces
- `recordPendingActivation({ acceptedManifest, recoveryCapsule, snapshot, nonce })`
- `acknowledgeReadiness({ nonce, buildId, observedAt })`
- `planNextLaunchRecovery({ rolloutState, cursorProcesses }) -> { action, reason }`
- Readiness valid only for exact pending nonce/build ID
- Never kill Cursor on missing readiness; restore only when stopped, under Task 6A lock

## Process
TDD RED→GREEN. Commit: `feat: recover unconfirmed safety net activations`
Verify plan Step 4 suites. Update progress.md.
Worktree only.
