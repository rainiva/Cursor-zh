# Runtime Performance Hardening Design

Date: 2026-06-01
Topic: Deepen Cursor startup and load-time performance optimization without sacrificing translation stability

## Summary

This design formalizes a new production/runtime split for the Cursor ZH workbench bundle.

The current production bundle is already in `performance` mode, but it still carries three classes of avoidable cost:

1. Production-default runtime diagnostics code (`window.__cursorZhPerf`, `snapshot`, `report`, `reset`).
2. A remaining runtime mapping set of 224 entries, including 160 global `exact` rules.
3. Translation paths that are fast but not yet governed by explicit reliability contracts.

The first phase of hardening keeps the existing stable observation model in place, then removes low-risk runtime baggage, shrinks production-default runtime mappings further, and adds an explicit `compatibility` mode that can be selected at `apply` time when a Cursor update temporarily needs a more conservative translation bundle.

## Context

Observed baseline in the current installed build (`D:\Apps\cursor`, Cursor 3.6.31):

- Merged mappings: 833
- Runtime mappings injected into the general translator: 224
- Runtime mapping breakdown:
  - `exact`: 160
  - non-`exact`: 64
- Runtime header size: about 69.9 KB
- Runtime scope selector count: 9
- Product tips coverage: 9 / 9
- Dynamic rule coverage misses: 0

Important current implementation facts:

- Production workbench generation happens in `D:/Project/Cursor-zh/scripts/cursor-zh-lib.js`.
- Runtime config is assembled in `D:/Project/Cursor-zh/scripts/cursor-zh-tool.js`.
- The default runtime still injects `window.__cursorZhPerf` and related reporting helpers.
- The project already proved that render-path hooks plus scoped fallback rules can stabilize dynamic bottom tips without broadening runtime observation.

## Goals

- Reduce startup-time and load-time JS parse/init work in the generated production bundle.
- Lower production-default runtime mapping count below the current 224 entry baseline.
- Lower runtime header size below the current ~69.9 KB baseline.
- Preserve or improve translation stability for key user-facing surfaces.
- Make fallback behavior explicit and operable through `apply`, not through hot runtime toggles.
- Make performance regressions and static-hook failures visible in tests and verification output.

## Non-Goals

- Do not require automated real-world cold-start timing as a blocking gate in this phase.
- Do not restore the old always-on hot runtime toggle path.
- Do not broaden short-text fallback, polling, or generic rescans in production default mode.
- Do not migrate deep settings/Marketplace/MCP/plug-in long-form explanatory surfaces in phase 1.
- Do not make automatic mode switching decisions at runtime.
- Do not make "remove document-wide discovery observer entirely" a production-default requirement in this phase.

## Accepted Design Constraints

The user-approved constraints for this phase are:

1. Production and diagnostic/profile concerns must be separated.
2. `performance` remains the default mode.
3. `compatibility` is selected explicitly by re-running `apply`, not by runtime hot toggle.
4. `compatibility` is a narrow fallback mode, not a return to the old heavy runtime.
5. Translation stability and reliability outrank pure performance wins.
6. Production static optimizations should prefer:
   - verified quoted literal rewrites
   - semantic render-path hooks
7. Fragile minified-source anchors must not expand as the default optimization strategy.
8. Newly migrated key surfaces should retain a narrow runtime fallback until they survive at least one Cursor update cycle.
9. Static-hook success/failure must become auditable.
10. Stability failures should block `apply`; performance-budget failures should warn at `apply` time and fail `verify`.

## Key Surfaces For Phase 1

Production-default migration work is limited to surfaces that are already well understood and heavily exercised:

- Chat activity timeline and status copy
- Composer / input / follow-up copy
- Model picker copy
- Bottom rotating product tips

Deferred from phase 1:

- Deep settings explanations
- Marketplace long-form descriptions
- MCP nested configuration copy
- Plug-in and onboarding deep empty states

## Design

### 1. Production runtime must stop shipping diagnostics by default

Production-default bundles should no longer inject:

- `window.__cursorZhPerf`
- `snapshot()`
- `report()`
- `reset()`

These are useful for deep profiling, but they add parse/initialization cost to every production launch. They should move behind an explicit diagnostics/profile path rather than remain in the default bundle.

This change is low-risk because it does not change translation semantics; it only removes observability code from production output.

### 2. Introduce explicit runtime modes at apply time

Add a runtime-mode selection that is resolved when the translated workbench is generated.

#### `performance` mode

Production default.

Requirements:

- No runtime diagnostics payload
- No hot runtime toggle machinery
- No broad short exact fallback
- No widened selector set
- Preserve the current stable observation model for phase 1
- Continue shrinking runtime mappings via static migration on approved key surfaces

#### `compatibility` mode

Explicit manual fallback chosen via `apply`.

Requirements:

- Still no runtime diagnostics payload
- Still no hot runtime toggle machinery
- Keep runtime behavior conservative for migrated key surfaces
- Allow small bounded delayed rescans where needed
- Preserve broader fallback behavior only where it protects key-surface reliability

Phase-1 note:

- Document-wide discovery removal is not a default production requirement yet.
- If a later phase narrows that path in `performance`, only `compatibility` may restore it.

### 3. Shrink runtime mappings through stable key-surface migration

The project should continue removing work from the general translator by moving stable copy off the default runtime path.

Approved migration patterns:

- Quoted literal rewrites that can be verified directly against source
- Semantic render-path hooks with explicit test coverage

Not approved as the default strategy:

- expanding brittle raw minified-source patch anchors without contract coverage

For phase 1, the migration target is not "all remaining runtime exact rules." The target is:

- stable, high-frequency key-surface text
- paths that can be guarded with tests and explicit patch contracts

Long settings descriptions and other low-frequency explanatory text may remain in runtime for now if removing them would require fragile anchors.

### 4. Add patch contracts for production static hooks

Every production-grade static hook should produce an auditable result:

- hook id
- target surface
- match count
- fallback availability
- severity on miss

Required behavior:

- If a required static hook misses and a narrow runtime fallback exists:
  - keep the fallback active
  - emit a warning in `apply`/`verify`
- If a required static hook misses and no fallback exists:
  - block `performance` bundle generation

This ensures performance work cannot silently trade away translation reliability.

### 5. Add explicit performance budgets and reporting

Phase-1 hard targets:

- Production runtime mappings: `<= 180`
- Runtime header size: `<= 58 KB`
- Product tips coverage: `9 / 9`
- Dynamic coverage missing rules: `0`

Reporting rules:

- `apply` may complete with warnings when budgets are exceeded.
- `verify` must fail when budgets are exceeded.
- Stability/contract failures block `apply`.

### 6. Verification and profiling must be separated

`verify` should own deterministic artifact-level checks:

- runtime mapping count
- runtime header bytes / KB
- mode name
- coverage and contract summaries

Deep profiling should move to a dedicated `bench`/`profile` command or profile-only generation path rather than stay embedded in the production runtime.

## Files Expected To Change

- `D:/Project/Cursor-zh/scripts/cursor-zh-lib.js`
- `D:/Project/Cursor-zh/scripts/cursor-zh-tool.js`
- `D:/Project/Cursor-zh/scripts/tests/cursor-zh-lib.test.js`
- `D:/Project/Cursor-zh/scripts/tests/cursor-zh-tool.integration.test.js`
- `D:/Project/Cursor-zh/docs/superpowers/specs/2026-06-01-runtime-performance-hardening-design.md`
- `D:/Project/Cursor-zh/docs/superpowers/plans/2026-06-01-runtime-performance-hardening.md`

Optional later additions, if needed:

- `D:/Project/Cursor-zh/translations/overlay/cursor-win.dynamic.json`
- `D:/Project/Cursor-zh/scripts/tests/cursor-zh-bench.test.js` or a dedicated profile command surface

## Risks And Mitigations

- Risk: shrinking runtime mappings causes key-surface regressions after a Cursor update.
  - Mitigation: migrate only approved key surfaces, require patch contracts, and keep narrow runtime fallbacks until update stability is proven.

- Risk: removing production diagnostics hides future performance investigation paths.
  - Mitigation: move diagnostics behind explicit profile/debug paths instead of deleting them entirely.

- Risk: a `compatibility` mode grows into a second heavy runtime.
  - Mitigation: keep `compatibility` narrow, explicit, and still free of diagnostics/hot toggle baggage.

- Risk: performance budget goals are met by adding fragile source anchors.
  - Mitigation: disallow broad expansion of brittle minified-source anchors as the default optimization method.

## Implementation Exit Criteria

This design is ready for implementation once:

- the short spec is accepted
- the implementation plan is written against the files above
- the plan preserves the approved stability and fallback boundaries
