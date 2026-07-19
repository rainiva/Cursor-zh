# Task 7 Brief: Compile runtime mappings into governed surface shards

Work from: `D:\Project\Cursor-zh\.worktrees\update-resilient-safety-net`
Branch: `feature/update-resilient-safety-net`
Depends on: Checkpoint C / Task 6B `a5943ac`

## Plan

Task 7 in `docs/superpowers/plans/2026-07-17-update-resilient-translation-safety-net.md`
English code blocks are interface source of truth.

## Files

- Create: `scripts/lib/mapping/runtime-shards.js`
- Create: `scripts/tests/lib/runtime-shards.test.js`
- Modify: `scripts/lib/runtime/bundle-builder.js`
- Modify: `translations/meta/runtime-governance.json`

## Interfaces

- `buildRuntimeShards(units, mappings, surfaces) -> { core, surfaces }`
- `measureRuntimeShards(shards) -> { coreKB, surfaceKB }`
- `assertRuntimeShardBudgets(shards, { coreKB, surfaceKB })`
- Core = cross-surface only; owned mappings in one lazy surface shard
- Budgets: core <= 80 KB, each surface <= 20 KB
- Each shard carries surface `quarantineSelectors` / runtimeScopes (selectors never widen translation scope)
- Register measurement protocol in runtime-governance (warmup 1, warm 5, cold 3, slowest-sample, cold scope cursor-zh-session-cache-only)
- Pass shards into `buildRuntimeHeader()` instead of one undifferentiated mapping array

## TDD

1. RED ownership + budget tests
2. Implement sharding + measurement + governance metadata + bundle-builder wiring
3. GREEN: runtime-shards + runtime-footprint-parts + runtime-pools + runtime-strategy
4. Commit: `feat: split runtime fallback by surface`
5. Update progress.md

## Constraints

- Stay in this worktree
- No production deps
- Hard-fail budget overages
