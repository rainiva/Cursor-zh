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
node --test "scripts/tests/cursor-zh-config.test.js" "scripts/tests/cursor-zh-lib.test.js" "scripts/tests/cursor-zh-tool.integration.test.js"

# Run a single test file
node --test scripts/tests/cursor-zh-lib.test.js

# Run the tool against a local Cursor install
node scripts/cursor-zh-tool.js apply
node scripts/cursor-zh-tool.js ensure
node scripts/cursor-zh-tool.js verify
node scripts/cursor-zh-tool.js start

# Create a release ZIP in dist/
npm run package:release
```

There is no lint or typecheck step configured. CI validates PowerShell scripts by parsing them with the PowerShell AST parser.

In some PowerShell environments, `npm test` may be blocked by local execution policy because it resolves to `npm.ps1`. Prefer invoking `node --test ...` directly.

## Required install flow

When an agent is asked to install this toolkit, follow this exact order:

1. Confirm Windows and PowerShell are available.
2. Confirm `node` is available in `PATH`.
3. Detect the Cursor install directory.
   - First honor a user-provided install path.
   - Then check common candidates such as `%LOCALAPPDATA%\Programs\Cursor`.
4. Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

5. Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\doctor.ps1
```

6. Report:
   - detected Cursor path
   - Cursor version
   - language pack compatibility
   - whether shortcut creation succeeded
   - how to start Cursor with the Chinese wrapper
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
| **Static translation** | Build-time string replacement in JS bundles | `workbench.desktop.main_translated.js` |
| **Runtime translation** | DOM MutationObserver inside the workbench bundle | Injected at the top of `workbench.desktop.main_translated.js` |
| **NLS messages** | Replaces VS Code's message catalog | `nls.messages.json` |
| **Extension NLS** | Built-in Cursor extension labels | `package.nls.zh-cn.json` |

The bootstrap (`cursorTranslatorMain.js`) is registered as the new `package.json` main entry. It intercepts `vscode-file` protocol registration to redirect `workbench.desktop.main.js` requests to the translated `workbench.desktop.main_translated.js`, then imports the real main process entry.

### Critical safety invariant

`main.js` is kept **byte-for-byte identical** to the original. It is copied to `main_translated.js` without modification. This prevents Cursor from switching to a different profile directory (e.g. changing "User" to another name), which would make settings and history appear reset.

### Runtime configuration (balanced mode)

Since v0.1.2 the default is **balanced mode**:

- No interval polling; only a limited number of timed rescans.
- Scoped observation via CSS selectors (settings, marketplace, dialogs, etc.).
- Marketplace remote translation is disabled.
- Shadow DOM and iframe binding are supported but limited to scope roots.

## CI expectations

- `npm test` must pass.
- All `.ps1` scripts under `scripts/` must parse without errors (validated by the PowerShell AST parser).
- Releases are triggered by tags matching `v*`.

## Safety boundaries

- Do not distribute or commit `cursor/`, `state/`, backups, logs, screenshots, or user data.
- Do not upload modified Cursor binaries.
- Do not claim official affiliation with Cursor.
- Do not rewrite user rules, skill IDs, model IDs, or other behavior-critical identifiers.
