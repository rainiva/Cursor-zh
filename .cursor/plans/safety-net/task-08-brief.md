# Task 8 Brief: Activate and dispose surface translators on demand

Work from: `D:\Project\Cursor-zh\.worktrees\update-resilient-safety-net`
Depends on: Task 7 `4141414` (runtime shards)

## Plan

Task 8 + Checkpoint D in `docs/superpowers/plans/2026-07-17-update-resilient-translation-safety-net.md`
English code blocks are interface source of truth.

## Files

- Create: `scripts/lib/runtime/surface-registry.js`
- Create: `scripts/lib/runtime/surface-translator.js`
- Create: `scripts/tests/lib/runtime-surface-lifecycle.test.js`
- Modify: `scripts/lib/runtime/text-translator-template.js`
- Modify: `scripts/tests/lib/helpers/runtime-dom-harness.js`

## Interfaces / constraints

- `createSurfaceRegistry({ document, shards, createTranslator })` with `discover`, `activate`, `deactivate`, `dispose`
- One observer per active surface; ≤30 text nodes per idle batch
- Exactly one global discovery observer: `childList + subtree` only; ≤30 added roots per idle batch; never translates
- Quarantine: raw text only for explicit chrome allowlists; deny user/editor/terminal/chat/code/dynamic; else HMAC fingerprint + count (ephemeral session key never persisted)
- No interval polling / scheduled full-document rescan in performance mode

## TDD

1. RED lifecycle tests per plan (mount/unmount, 30-node yield, discovery batch, quarantine privacy)
2. Implement registry + translator + harness extensions + template wiring
3. GREEN: runtime-surface-lifecycle + runtime-translate-perf + l3-surface-runtime + runtime-menu-flash
4. Satisfy Checkpoint D automated checks
5. Commit: `feat: activate runtime fallback per surface`
6. Update progress.md

## Constraints

- Stay in this worktree
- Consume Task 7 shards (now serialize/use in runtime header/lifecycle as needed)
- Do not add global short-word mapping or attribute/text observation on discovery observer
