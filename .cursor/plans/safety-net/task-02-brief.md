# Task 2 Brief: Build a redistributable update capability profile

Work from: `D:\Project\Cursor-zh\.worktrees\update-resilient-safety-net`
Branch: `feature/update-resilient-safety-net`
Depends on: Task 1 complete (`02dc3f6`)

## Plan sources

- English plan Task 2 in `docs/superpowers/plans/2026-07-17-update-resilient-translation-safety-net.md`
- Chinese: `docs/superpowers/plans/2026-07-17-update-resilient-translation-safety-net-zh-CN/translation.md`

English plan code blocks are the interface source of truth.

## Files

- Create: `scripts/lib/compatibility/update-profile.js`
- Create: `scripts/tests/lib/update-profile.test.js`
- Modify: `scripts/tool/session-cache.js`
- Modify: `scripts/tool/manifest.js`

## Interfaces

- `buildUpdateProfile(input) -> { version: 1, cursorVersion, vscodeVersion, bundles, nls, units }`
- `compareUpdateProfiles(previous, current) -> { status: 'UNCHANGED'|'KNOWN_DRIFT', changed }`
- Metadata-only: no `sourceText` in profile JSON
- Sorted bundles by capabilityId; sorted units by translationId

## TDD steps (mandatory)

1. Write failing test as in plan Step 1 (classify hash drift without storing source text)
2. RED: `node --test scripts/tests/lib/update-profile.test.js`
3. Implement `buildUpdateProfile` / `compareUpdateProfiles` as in plan Step 3
4. Add translation-unit metadata file to `collectMappingSourceSnapshots()` in session-cache
5. Add `updateProfile` as optional final argument/property in `buildManifest()` without breaking existing callers
6. GREEN: `node --test scripts/tests/lib/update-profile.test.js scripts/tests/tool/manifest.test.js scripts/tests/tool/session-cache.test.js`
7. Commit: `feat: record update capability profiles` (only Task 2 files)

## Constraints

- Stay in this worktree
- No production deps
- Do not modify unrelated files or Task 1 code unless required for integration
- Witnessed RED → GREEN before commit
