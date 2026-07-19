# Task 4 Brief: Migrate Product Tips as first semantic vertical slice

Work from: `D:\Project\Cursor-zh\.worktrees\update-resilient-safety-net`
Branch: `feature/update-resilient-safety-net`
Depends on: Task 3 `01b8751` (semantic locators + product-tips fixtures)

## Plan

Task 4 + Checkpoint B in `docs/superpowers/plans/2026-07-17-update-resilient-translation-safety-net.md`
English code blocks are interface source of truth.

## Files

- Modify: `scripts/lib/patcher/product-tips-hook.js`
- Modify: `scripts/lib/patcher/contracts.js`
- Modify: `scripts/tests/lib/product-tips-hook.test.js`
- Modify: `scripts/tests/lib/product-tip-runtime-fallback.test.js`

## Interfaces

- `applyProductTipsRenderHook(sourceText) -> { sourceText, outcome, locatorId, postconditions }`
- Outcomes: `resolved` | `fallback` | `blocked`
- Semantic relocation first; retain runtime Product Tips translation as declared fallback
- Legacy variants diagnostic only for one release; fail if a new `glass-v*` variant is added

## TDD

1. RED migration tests per plan (use fixtures from `scripts/tests/lib/fixtures/update-drift/product-tips.js`)
2. Implement semantic-first application per plan Step 3
3. GREEN: product-tips-hook + product-tip-runtime-fallback + surface-contracts + versioned-patches
4. Run Checkpoint B focused suites
5. Commit: `refactor: relocate product tips hook semantically`
6. Update progress.md

## Constraints

- Stay in this worktree
- Do not add new version-specific Product Tips variants
- Preserve existing runtime fallback behavior for ambiguous/missing cases
