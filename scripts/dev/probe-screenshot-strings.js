const fs = require('fs');
const path = require('path');
const { createWorkbenchIndex } = require('../lib/patcher/workbench-index.js');
const { sourceHasQuotedLiteral } = require('../lib/patcher/runtime-selector.js');
const { readJsonIfExists } = require('../tool/io.js');
const { createToolPaths } = require('../tool/paths.js');
const { mergeMappings } = require('../cursor-zh-lib.js');

const STRINGS = [
  'Save File',
  'Copy Relative Path',
  'Diff View',
  'Line Numbers',
  'Word Wrap',
  'Auto Save',
  'Browse Files',
  'Search Files',
  'Cursor Account',
  'Manage your account and billing',
  'PR Preferences',
  'Preferred PR destination',
  'Warning Notifications',
  'System Tray Icon',
  'Completion Sound',
  'Queue Messages',
  'Usage Summary',
  'Agent Autocomplete',
  'Show rotating tips on the empty screen',
  'Auto-Approve Mode Transitions',
  'Subagents',
  'Explore subagent model',
  'Allow Agent to search the web for relevant information',
  'Auto-Accept Web Search',
  'Allow Agent to fetch content from URLs',
  'Hierarchical Cursor Ignore',
  'Ignore Symlinks in Cursor Ignore Search',
  'Approvals & Execution for commands, MCP and more',
  'Run Mode',
  'Browser Protection',
  'MCP Tools Protection',
  'Inline Editing & Terminal',
  'Legacy Terminal Tool',
  'Auto-Parse Links',
  'Themed Diff Backgrounds',
  'Voice Mode',
  'Submit Keywords',
  'Commit Attribution',
  'PR Attribution',
  'Branch Prefix',
  'Partial Accepts',
  'Suggestions While Commenting',
  'Whitespace-Only Suggestions',
  'Imports',
  'Auto Import for Python',
  'Ignored Files',
  'Authentication',
  'Wait for MCP Authentication',
  'Balanced quality and speed, recommended for most tasks',
  'Send',
  'Modes, skills, MCPs and more',
  'Context-aware, multi-line suggestions around your cursor based on recent edits',
  'Allow Tab to trigger while in a comment region',
  'Suggest edits like new lines and indentation that modify whitespace only',
  'Glob patterns for files where Cursor Tab will not suggest',
];

const workbenchPath =
  process.argv[2] ||
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js';
const source = fs.readFileSync(workbenchPath, 'utf8');
const index = createWorkbenchIndex(source);
const toolPaths = createToolPaths(path.join(__dirname, '../..'));
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
const lookup = new Map(merged.map((e) => [e.originalText, e]));

for (const text of STRINGS) {
  const hasQuoted = sourceHasQuotedLiteral(source, text, index);
  const mapped = lookup.has(text);
  const entry = lookup.get(text);
  console.log(
    JSON.stringify({
      text,
      hasQuoted,
      mapped,
      forceRuntime: entry?.forceRuntime === true,
      changeText: entry?.changeText,
    })
  );
}
