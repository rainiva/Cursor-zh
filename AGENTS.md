# AGENTS.md

This file provides guidance to Qoder (qoder.com) when working with code in this repository.

This repository is an **agent-friendly Windows Cursor Chinese enhancement toolkit**.

It is **not**:

- a Cursor Marketplace plugin
- a standalone skill
- a bundled Cursor binary

## Supported environment

- OS: Windows
- Shell: PowerShell
- Runtime: Node.js in `PATH` (>= 18)
- Target: Installed Cursor desktop app

## Development commands

Tests use the Node.js built-in test runner (no external framework).

```powershell
# Run all tests
npm test

# Or invoke the runner directly (avoids PowerShell npm.ps1 policy issues).
# Use the same file list as the "test" script in package.json — do not rely on broad globs.
node --test scripts/tests/cursor-zh-config.test.js scripts/tests/cursor-zh-lib.test.js scripts/tests/cursor-zh-tool.integration.test.js

# Run a single domain test file
node --test scripts/tests/lib/mapping.test.js

# Run the tool against a local Cursor install
node scripts/cursor-zh-tool.js apply
node scripts/cursor-zh-tool.js ensure
node scripts/cursor-zh-tool.js verify
node scripts/cursor-zh-tool.js start

# Create a release ZIP in dist/
npm run package:release
```

There is no lint or typecheck step configured. CI validates PowerShell scripts by parsing them with the PowerShell AST parser.

In some PowerShell environments, `npm test` may be blocked by local execution policy because it resolves to `npm.ps1`. Prefer `npm test` when available; otherwise copy the full file list from the `test` script in `package.json`.

## Required install flow

When an agent is asked to install this toolkit, follow this exact order:

1. Confirm Windows and PowerShell are available.
2. Confirm `node` (>= 18) is available in `PATH`.
3. Confirm the official Chinese (Simplified) language pack is available for Cursor.
4. Detect the Cursor install directory.
   - First honor a user-provided install path.
   - Then check common candidates such as `%LOCALAPPDATA%\Programs\Cursor`.
5. Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

6. Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\doctor.ps1
```

7. Report:
   - detected Cursor path
   - Cursor version
   - language pack compatibility
   - whether shortcut creation succeeded
   - primary entry: `cursor-zh-menu.cmd`; daily start: `start-cursor-zh.cmd` or desktop `Cursor 中文版.lnk`
   - after Cursor updates, prefer `ensure` (auto-rebuild) over `doctor`/`verify` (read-only)
   - that `doctor.ps1` is read-only and does not auto-repair files

## Required uninstall flow

Use:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\uninstall.ps1
```

The uninstall flow must not delete user profile data, history, or workspace state.
Use uninstall as the standard way to restore the original English interface. This project does not provide a dynamic language-switching layer.

## High-level architecture

The toolkit patches Cursor's internal Electron application files to inject Chinese translations at both build-time and runtime.

### Code layout (refactored)

```
scripts/
├── cursor-zh-lib.js       # facade → scripts/lib/index.js (27 public exports)
├── cursor-zh-tool.js      # CLI shell → scripts/tool/index.js
├── lib/                   # pure domain logic (mapping, engine, patcher, runtime, analyzer)
└── tool/                  # CLI orchestration (io, context, builder, commands, verify, …)
```

- **`lib/`** — translation engine, mapping merge/parse, static patch contracts, runtime bundle generation. Does not write to the Cursor install directory.
- **`tool/`** — install detection, backup, locale files, apply/verify/ensure commands, manifest and coverage reporting.

Tests mirror this split: `scripts/tests/lib/**` for domain units, `scripts/tests/tool/**` for CLI infrastructure, `cursor-zh-lib.test.js` for facade regression + one bundle E2E, `cursor-zh-tool.integration.test.js` for end-to-end apply/verify flows.

### Translation pipeline

Four mapping layers are merged (later layers override earlier ones):

1. **Base mappings** (`translations/base/workbench.mappings.json`) — extracted from legacy translated bundles or manually curated.
2. **Overlay mappings** (`translations/overlay/workbench.overlay.json`) — user-customizable overrides.
3. **Cursor Win Common** (`translations/overlay/cursor-win.common.json`) — Cursor-specific UI labels.
4. **Dynamic mappings** (`translations/overlay/cursor-win.dynamic.json`) — scoped, normalized, and regex rules.

Merged mappings drive both static and runtime translation.

### Patching strategy

| Strategy | Where it runs | Key file |
|----------|--------------|----------|
| **Bootstrap injection** | Main process startup | `cursorTranslatorMain.js` |
| **Static translation** | Build-time string replacement in JS bundles | `workbench.desktop.main_translated.js`, `workbench.glass.main_translated.js` |
| **Runtime translation** | DOM MutationObserver inside workbench bundles | Injected at the top of both translated workbench bundles |
| **NLS messages** | Replaces VS Code's message catalog | `nls.messages.json` |
| **Extension NLS** | Built-in Cursor extension labels | `package.nls.zh-cn.json` |

The bootstrap (`cursorTranslatorMain.js`) is registered as the new `package.json` main entry. It intercepts `vscode-file` protocol registration to redirect both `workbench.desktop.main.js` and `workbench.glass.main.js` requests to their translated counterparts, then imports the real main process entry.

### Critical safety invariant

`main.js` is kept **byte-for-byte identical** to the original. It is copied to `main_translated.js` without modification. This prevents Cursor from switching to a different profile directory (e.g. changing "User" to another name), which would make settings and history appear reset.

### Runtime configuration (`performance` mode)

The default runtime mode is **`performance`** (lightweight). An optional **`compatibility`** mode is available via `apply --runtime-mode compatibility`.

**`performance` (default):**

- No interval polling and no scheduled rescans (`rescanDelaysMs: []`).
- Scoped observation via CSS selectors (settings, marketplace, dialogs, etc.).
- Marketplace remote translation is disabled.
- Shadow DOM and iframe binding are supported but limited to scope roots.

**`compatibility`:**

- Same scoped observation and disabled marketplace remote translation.
- Adds limited timed rescans at 300 ms and 1500 ms (`rescanDelaysMs: [300, 1500]`).

`apply` and `start` both clear the extension cache to reduce “Extensions have been modified on disk” prompts. Backups are written under `state/backups/` in the workspace; uninstall uses them to roll back Cursor files but does not delete that directory.

## CI expectations

- `npm test` must pass.
- All `.ps1` scripts under `scripts/` must parse without errors (validated by the PowerShell AST parser).
- Releases are triggered by tags matching `v*`.

## Development workflow (required)

All feature work, bug fixes, refactors, and mechanical splits in this repo **must** follow Superpowers skills + TDD. See `.cursor/rules/superpowers-tdd-required.mdc`.

1. Read Superpowers `using-superpowers`, then `test-driven-development` before changing production code.
2. **RED** → write/adjust a failing test and observe the expected failure.
3. **GREEN** → minimal implementation; run `npm test`.
4. **REFACTOR** → clean up while tests stay green; run `npm test` again.
5. Before claiming done, read `verification-before-completion` and cite command output.

Do **not** use one-off extract/split scripts on production code without a failing test first. Existing tests alone are not a substitute for the RED step.

## Safety boundaries

- Do not distribute or commit `cursor/`, `state/`, backups, logs, screenshots, or user data.
- Do not upload modified Cursor binaries.
- Do not claim official affiliation with Cursor.
- Do not rewrite user rules, skill IDs, model IDs, or other behavior-critical identifiers.
