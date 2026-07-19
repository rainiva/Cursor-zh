# Task 11B Critical/Important Fix Brief

Review → CHANGES_REQUESTED on `0bc67c3`.

## Critical

1. **Canary/enforced apply must not hard-fail on empty transition artifacts**
   - Transition `prepareBuild` still returns `artifacts: []` (intentional for shadow).
   - During transition: after canary path/env gates + admission, route to the same prepare→legacy writer path as shadow (zero new-engine managed writes), unless artifacts exist.
   - Enforced stays gated by `validateRolloutPromotion`; when not promotable, fail closed (no legacy).
   - Add happy-path canary test (fixture) proving apply succeeds after gates with legacy writer during transition.

## Important

2. **Release promotion gate must block incomplete evidence**
   - Do NOT seed forged one-build `rollout-evidence.json` in CI.
   - Missing/incomplete evidence, <2 builds, or no `upstreamUpdate: true` must fail the release job (align with plan Step 3).
   - `validate-rollout-promotion-cli` should block release on incomplete evidence (not soft-pass by default for release workflow).

3. **Do not default unmeasured gates to pass**
   - `buildRolloutEvidence` must not mark deterministic/privacy/recovery as `pass` when omitted/unmeasured.

Commit: `fix: harden rollout promotion and canary transition path`
Worktree only. TDD RED→GREEN.
