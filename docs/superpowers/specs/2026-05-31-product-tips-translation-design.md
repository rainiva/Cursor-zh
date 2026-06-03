# Product Tips Translation Design

Date: 2026-05-31
Topic: Stabilize translation coverage for bottom `product_tips_config` tips in Cursor

## Summary

Bottom empty-state tips are no longer a purely static workbench or NLS translation surface. In the current Cursor build, the tips shown in the `glass-empty-state-rotating-tips` component are fed by the remote dynamic config key `product_tips_config`. The existing translation layer still handles the DOM structure for these tips, but the text rules are mostly old `exact` matches, so upstream wording changes cause silent misses.

This design adds a dedicated dynamic-tips translation strategy:

1. Add resilient tip-specific translation rules using `normalizedExact` and `regex`.
2. Scope those rules to the empty-state tips surface to reduce false positives.
3. Keep the current runtime segmented-tip DOM handling because the relevant classes still exist in the real bundle.
4. Add explicit dynamic-tips coverage reporting so verification stops claiming full coverage based only on static workbench strings.
5. Preserve current startup and load-time performance characteristics by avoiding broader observers, polling, or document-wide rescans.

## Context

Observed facts from the current installed Cursor build:

- Real install path is `D:\Apps\cursor`.
- `workbench.desktop.main.js` contains the `glass-empty-state-rotating-tips` component and reads tip data from `product_tips_config`.
- Tip rendering still uses:
  - `glass-empty-state-rotating-tips__text`
  - `glass-empty-state-rotating-tips__chip`
- The missing translations shown by the user do not exist as static workbench or NLS strings in the current build.
- Current project coverage checks report static coverage as complete, which hides dynamic-tip misses.

## Goals

- Translate current and near-future bottom product tips more reliably.
- Reduce breakage when Cursor changes wording slightly.
- Make coverage checks aware of dynamic tip targets.
- Preserve compatibility with older Cursor builds that still use the old exact strings.
- Avoid startup and loading performance regressions while fixing dynamic-tip misses.

## Non-Goals

- Do not redesign the runtime translator architecture.
- Do not attempt to scrape or auto-sync all remote tip strings at build time.
- Do not broaden regex rules globally across unrelated UI surfaces.
- Do not remove the existing old exact rules in this pass.
- Do not add new interval polling, broad document rescans, or heavier startup-time translation passes in this pass.

## Approaches Considered

### Approach A: Stable dynamic-tip repair

Add dedicated dynamic-tip rules and dedicated coverage checks while keeping the current runtime segmented-tip translator intact.

Pros:

- Solves the current problem directly.
- Low runtime risk.
- Improves future detection of similar misses.

Cons:

- Requires maintaining a small explicit dynamic-tip target set.

Recommended.

### Approach B: Rule-only patch

Only add the new strings and regexes, without changing verification or manifest reporting.

Pros:

- Fastest implementation.

Cons:

- Future misses remain hard to detect.
- Static coverage can still falsely look complete.

Rejected.

### Approach C: Runtime rewrite

Rebuild segmented-tip DOM detection and observation strategy.

Pros:

- Could help if the DOM changes substantially later.

Cons:

- Higher risk.
- Current evidence does not justify it because the relevant classes still exist.

Rejected for this pass.

## Design

### 1. Translation rule strategy

Add product-tip-oriented rules to `translations/overlay/cursor-win.dynamic.json`.

Rule types:

- `normalizedExact` for wording variants that differ mainly in spacing, punctuation, or formatting.
- `regex` for tips where the middle clause changes but the user-facing meaning and translation intent stay the same.

Rule scoping:

- Restrict to the empty-state / rotating-tips context using scope hints so these rules do not unexpectedly rewrite unrelated UI text.

Compatibility:

- Keep existing old `exact` rules in `translations/overlay/cursor-win.common.json` as fallback compatibility coverage for older Cursor builds.

### 2. Runtime behavior

Do not replace the current segmented-tip runtime logic in `scripts/cursor-zh-lib.js`.

Reason:

- Real bundle evidence shows the existing DOM classes still exist.
- The active failure mode is rule drift, not runtime inability to see or rewrite the segmented tip node.

Allowed runtime change:

- Small clarifying support code is acceptable if needed for maintainability or to make dynamic-tip coverage explicit, but no large behavioral rewrite is planned.

Performance constraints:

- Keep the current performance-oriented runtime mode and avoid expanding observation beyond the existing scoped surfaces.
- Do not introduce new startup-time full-document translation passes.
- Do not add recurring polling or new timer-driven rescans for this fix.
- Prefer build-time coverage analysis and rule improvements over heavier runtime work.

### 3. Dynamic-tip coverage reporting

Add an explicit product-tips target set and a corresponding coverage analysis path in the tooling layer.

Expected outcomes:

- `verify` and manifest output should report dynamic-tip coverage separately from static workbench coverage.
- Future wording drift in product tips should fail or warn through tests and verification instead of hiding behind static coverage numbers.

## Files Expected To Change

- `translations/overlay/cursor-win.dynamic.json`
- `translations/overlay/cursor-win.common.json`
- `scripts/cursor-zh-lib.js`
- `scripts/cursor-zh-tool.js`
- `scripts/tests/cursor-zh-lib.test.js`
- `scripts/tests/cursor-zh-tool.integration.test.js`

## Test Plan

Follow TDD:

1. Add failing unit tests for dynamic-tip translation behavior in `scripts/tests/cursor-zh-lib.test.js`.
2. Add failing integration tests for generated bundle / coverage output in `scripts/tests/cursor-zh-tool.integration.test.js`.
3. Implement the minimum code and rule changes to make those tests pass.
4. Run the full existing project test command:

```powershell
node --test "scripts/tests/cursor-zh-config.test.js" "scripts/tests/cursor-zh-lib.test.js" "scripts/tests/cursor-zh-tool.integration.test.js"
```

Test focus:

- New `Composer` wording variant.
- New `Ask mode` wording variant.
- Existing and evolved `/canvas`, `/shell`, and `Voice mode` tip variants.
- Scope restrictions to avoid cross-surface false positives.
- Manifest / verification visibility for dynamic-tip coverage.
- No regression in the current performance-oriented runtime configuration assumptions.

## Verification Plan

Success requires all of the following:

- New dynamic-tip tests fail before implementation and pass after implementation.
- Existing tests remain green.
- Generated translated workbench bundle still includes the current segmented-tip runtime support.
- Verification output reports dynamic-tip coverage separately enough to reveal future misses.
- Generated runtime configuration remains aligned with the current performance strategy, with no newly introduced polling or broader rescans.

## Risks And Mitigations

- Risk: regex rules accidentally affect unrelated UI.
  - Mitigation: scope dynamic rules tightly to the tips surface.

- Risk: removing old exact rules could regress older Cursor builds.
  - Mitigation: keep legacy exact rules in place in this pass.

- Risk: the real failure is partly timing-related.
  - Mitigation: current runtime already observes `characterData` and segmented-tip mutations; this pass first fixes the higher-confidence rule drift problem.

- Risk: a fix for dynamic tips could quietly slow startup or load behavior.
  - Mitigation: keep the runtime path minimal, prefer scoped rules and build-time checks, and preserve the current performance-mode expectations in tests.

## Deferred Work

Consider a later improvement if upstream keeps changing product tips aggressively:

- add a more formal maintained `product_tips` target inventory
- optionally expand verification to compare maintained targets against known installed build evidence

## Implementation Exit Criteria

The work is ready for implementation planning when:

- the design above is accepted
- the written spec is reviewed by the user
- implementation is scoped to the files and tests listed here
