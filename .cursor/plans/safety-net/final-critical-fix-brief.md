# Final Merge Critical Fix Brief

Final branch review → CHANGES_REQUESTED (merge-readiness). Tip `4f37bab`.

## Critical (must fix for merge)

1. **Real prepare admission**
   - `prepareBuild` must load translation units + surfaces, resolve outcomes against install sources, compute `currentProofKey`, and set real admission (`RESOLVED` / `DEGRADED` / `BLOCKED`) — not hollow `UNCHANGED` via `resolvePrepareAdmission({})`.
   - BLOCKED must still prevent writes; DEGRADED requires proven current proofs.

2. **Compile and persist runtimeShards in production workbench build**
   - Pass `units`/`surfaces` into `buildTranslatedWorkbenchBundleParts` (or equivalent).
   - Return `runtimeShards` from workbench build path; persist via `persistAdmissionEvidenceForManifest` / manifest.
   - Non-empty shards must reach header so `__cursorZhInstallSurfaceRegistry` can activate.
   - Verify size evidence must not fail solely because shards were never compiled.

3. **Release rollout-evidence path must be closed**
   - `performance-baseline` must not require a file that `verify` never writes.
   - Either: verify/apply step writes `rollout-evidence.json` when appropriate, OR release job has an explicit evidence step after a real apply/canary, OR soft-document shadow transition with a non-forged path that still fails incomplete when `--require-promotable`.
   - Prefer: persist rollout evidence from apply (already partially exists) and have release baseline run a fixture/shadow evidence producer OR load existing evidence without seeding forgeries; if evidence missing on shadow-only CI, fail with clear message unless an intentional shadow artifact from prior apply is present.

## Process
Worktree only. TDD. Commit: `fix: wire production admission shards and release evidence`
Update progress.md with merge-critical fix notes.

Important items from final review (synthetic drift, canary transactional writes, validateTranslationUnits owner fields) may be deferred if clearly noted — **do not skip the three Criticals**.
