# Task 1 Brief: Add stable translation-unit contracts

Work from: `D:\Project\Cursor-zh\.worktrees\update-resilient-safety-net`
Branch: `feature/update-resilient-safety-net`

## Plan sources (in this worktree)

- `docs/superpowers/plans/2026-07-17-update-resilient-translation-safety-net.md` (Task 1 section)
- Chinese companion: `docs/superpowers/plans/2026-07-17-update-resilient-translation-safety-net-zh-CN/translation.md`
- Spec: `docs/superpowers/specs/2026-07-17-update-resilient-translation-safety-net-design.md`

English plan code blocks are the interface source of truth.

## Files

- Create: `translations/meta/translation-units.json`
- Create: `scripts/lib/mapping/translation-units.js`
- Create: `scripts/tests/lib/translation-units.test.js`
- Modify: `scripts/tool/paths.js`

## Interfaces

- `loadTranslationUnits(filePath) -> { version, units }` (plan also shows `loadTranslationUnits(filePath, surfaces)` wrapping validate)
- `validateTranslationUnits(payload, surfaces) -> { units, byId, aliasesByScope }`
- Each unit: `translationId`, `changeText`, `aliases`, `owner`, `primary`, `fallback`, `severity`, `placeholders`

## TDD steps (mandatory)

1. Write failing test exactly as in the English plan Task 1 Step 1
2. Run RED: `node --test scripts/tests/lib/translation-units.test.js` — expect missing module
3. Implement validator/loader as in plan Step 3
4. Add `translationUnitsPath` to `createToolPaths()`
5. Seed `translation-units.json` from blocking contracts in `scripts/lib/mapping/surface-contracts.js`; IDs `<surface>.<contract-id>`; preserve English aliases + Chinese text; `runtime-surface` fallback only for surfaces in `translations/meta/surfaces.json`
6. GREEN: `node --test scripts/tests/lib/translation-units.test.js scripts/tests/lib/surface-contracts.test.js scripts/tests/lib/surfaces.test.js`
7. Commit: `feat: add stable translation unit contracts` (only Task 1 files)

## Constraints

- No production deps
- Do not touch unrelated files
- Stay inside this worktree
- Follow witnessed RED → GREEN → REFACTOR
