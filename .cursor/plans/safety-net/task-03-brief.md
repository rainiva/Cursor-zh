# Task 3 Brief: Semantic locator and postcondition engines

Work from: `D:\Project\Cursor-zh\.worktrees\update-resilient-safety-net`
Branch: `feature/update-resilient-safety-net`
Depends on: Checkpoint A green at `e143f64` / `7119876`

## Plan

Task 3 in `docs/superpowers/plans/2026-07-17-update-resilient-translation-safety-net.md`
English code blocks are interface source of truth.

## Files

- Create: `scripts/lib/compatibility/structural-tokenizer.js`
- Create: `scripts/lib/compatibility/semantic-locator.js`
- Create: `scripts/lib/compatibility/locator-postconditions.js`
- Create: `scripts/tests/lib/semantic-locator.test.js`
- Create: `scripts/tests/lib/fixtures/update-drift/product-tips.js`

## Interfaces

- `tokenizeStructuralSource(sourceText) -> Array<{ type, value, offset }>`
- `resolveSemanticLocator(sourceText, locator) -> { status, matches, target? }`
- `evaluateLocatorPostconditions(sourceText, postconditions) -> { ok, failures }`
- Evidence = conjunction of structural tokens, stable literals, property names, relative token distance, cardinality
- Never use minified identifiers, whitespace, quote style, or optional-chain spelling as evidence
- Normalize `.text` and `?.text` to same `property:text`

## TDD

1. RED metamorphic + ambiguity tests per plan (fixtures: fixtureV1, renamed, single-quoted, without optional chain, reordered)
2. Implement tokenizer + resolver + postconditions per plan Step 3 (may split across the three modules; re-export from semantic-locator if needed)
3. GREEN: `node --test scripts/tests/lib/semantic-locator.test.js`
4. Commit: `feat: add deterministic semantic locators`
5. Update progress.md

## Constraints

- Parser-free, dependency-free tokenizer; use `iterateQuotedLiterals` from workbench-index
- If structural conjunction insufficient, STOP and report — do not add a parser dependency
- Stay in this worktree only
