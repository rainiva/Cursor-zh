'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { createWorkbenchIndex } = require('../lib/patcher/workbench-index.js');
const { selectRuntimeMappingsUnion } = require('../lib/patcher/runtime-selector.js');
const { mergeMappings } = require('../lib/mapping/merge.js');
const { CRITICAL_UI_ALL_TARGETS } = require('../lib/mapping/critical-ui-targets.js');
const { readJsonIfExists } = require('./io.js');
const { createToolPaths } = require('./paths.js');

const INSTALL_DESKTOP =
  process.env.CURSOR_INSTALL_DESKTOP ||
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js';
const INSTALL_GLASS =
  process.env.CURSOR_INSTALL_GLASS ||
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.glass.main.js';

const PROTECTED_FORCE_RUNTIME = new Set(
  CRITICAL_UI_ALL_TARGETS.filter((entry) => entry.forceRuntime === true).map(
    (entry) => entry.originalText
  )
);
PROTECTED_FORCE_RUNTIME.add('All Members');
PROTECTED_FORCE_RUNTIME.add('Marketplace Settings');

function assignBatch3Ownership(entry, runtimeSet, indexD, indexG) {
  if (!entry || entry.searchType !== 'exact') {
    return entry;
  }

  if (PROTECTED_FORCE_RUNTIME.has(entry.originalText)) {
    return { ...entry, forceRuntime: true };
  }

  if (entry.forceRuntime === true) {
    const hasQuotedLiteral =
      indexD.hasQuotedLiteral(entry.originalText) || indexG.hasQuotedLiteral(entry.originalText);
    if (hasQuotedLiteral) {
      return { ...entry, forceRuntime: false };
    }
    return entry;
  }

  if (!runtimeSet.has(entry.originalText)) {
    return entry;
  }

  if (entry.surface || (Array.isArray(entry.scopeSelectors) && entry.scopeSelectors.length > 0)) {
    return entry;
  }

  const text = String(entry.originalText || '');

  if (/MCP|Plugin|Skills?|marketplace|Subagents|Commands/i.test(text)) {
    return { ...entry, surface: 'plugins_onboarding', forceRuntime: false };
  }

  if (/Automation|automations|cloud agents|environment triggers/i.test(text)) {
    return { ...entry, surface: 'automation_ui', forceRuntime: false };
  }

  if (
    /Settings|keyboard shortcuts|Import Settings|Mode for|Auto-|Billed at|API Keys|Region|Secret Access|Text Size|Web Search|Cursor Ignore|Whitespace|Imports|Python|lint|Commit|Partial Accept|Suggestions|Hierarchical|Backspace|Completion Sound|Custom Modes|Scroll to New|machine-level|account-level|Default Mode|Editor Settings|Configure/i.test(
      text
    )
  ) {
    return { ...entry, surface: 'settings_search', forceRuntime: false };
  }

  if (text.length <= 24 && !text.includes('{') && !text.includes('...')) {
    return { ...entry, surface: 'command_palette', forceRuntime: false };
  }

  if (text.length <= 60) {
    return { ...entry, surface: 'composer_chrome', forceRuntime: false };
  }

  return { ...entry, surface: 'settings_search', forceRuntime: false };
}

function applyBatch3OwnershipToMappings(commonMappings, runtimeSet, indexD, indexG) {
  return commonMappings.map((entry) => assignBatch3Ownership(entry, runtimeSet, indexD, indexG));
}

function buildRuntimeSet(toolPaths, desktop, glass, indexD, indexG) {
  const merged = mergeMappings(
    mergeMappings(
      mergeMappings(
        readJsonIfExists(toolPaths.baseMappingPath, []),
        readJsonIfExists(toolPaths.overlayMappingPath, [])
      ),
      readJsonIfExists(toolPaths.cursorWinCommonPath, [])
    ),
    readJsonIfExists(toolPaths.dynamicMappingPath, [])
  );

  return new Set(
    selectRuntimeMappingsUnion(
      [
        { workbenchSource: desktop, workbenchIndex: indexD },
        { workbenchSource: glass, workbenchIndex: indexG },
      ],
      merged
    ).map((entry) => entry.originalText)
  );
}

function applyBatch3OwnershipFiles(workspaceRoot = path.resolve(__dirname, '../..')) {
  const toolPaths = createToolPaths(workspaceRoot);
  const desktop = fs.readFileSync(INSTALL_DESKTOP, 'utf8');
  const glass = fs.readFileSync(INSTALL_GLASS, 'utf8');
  const indexD = createWorkbenchIndex(desktop);
  const indexG = createWorkbenchIndex(glass);
  const runtimeSet = buildRuntimeSet(toolPaths, desktop, glass, indexD, indexG);

  for (const targetPath of [
    toolPaths.cursorWinCommonPath,
    path.join(workspaceRoot, 'translations/overlay/defaults/cursor-win.common.json'),
  ]) {
    const mappings = readJsonIfExists(targetPath, []);
    const updated = applyBatch3OwnershipToMappings(mappings, runtimeSet, indexD, indexG);
    fs.writeFileSync(targetPath, `${JSON.stringify(updated, null, 2)}\n`, 'utf8');
  }

  return {
    runtimeSetSize: runtimeSet.size,
    paths: [
      toolPaths.cursorWinCommonPath,
      path.join(workspaceRoot, 'translations/overlay/defaults/cursor-win.common.json'),
    ],
  };
}

module.exports = {
  assignBatch3Ownership,
  applyBatch3OwnershipToMappings,
  applyBatch3OwnershipFiles,
};
