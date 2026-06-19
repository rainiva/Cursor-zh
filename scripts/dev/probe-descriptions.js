const fs = require('fs');
const { createWorkbenchIndex } = require('../lib/patcher/workbench-index.js');
const { applyStaticSourceTranslations } = require('../lib/patcher/static.js');
const { readJsonIfExists } = require('../tool/io.js');
const { createToolPaths } = require('../tool/paths.js');
const { mergeMappings } = require('../cursor-zh-lib.js');
const { escapeRegExp } = require('../lib/engine/substring.js');

const DESCS = [
  'Show rotating tips on the empty screen',
  'Allow Agent to search the web for relevant information',
  'Allow Agent to fetch content from URLs',
  'Manage your account and billing',
  'Choose where PR links open across web, the desktop app and IDE.',
  'Show system notifications when Agent completes or needs attention',
  'Adjust the default behavior of sending a message while Agent is running',
  'When to show the usage summary at the bottom of the chat pane',
  'Contextual suggestions while promoting Agent',
  'Choose how Agents run tools like command execution, MCP, and file writes.',
  'Use themed background colors for inline code diffs',
  'Wait indefinitely to authenticate when prompted. When off, skip authentication prompts after 30 seconds.',
  'Balanced quality and speed, recommended for most tasks',
];

const workbenchPath =
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js';
const source = fs.readFileSync(workbenchPath, 'utf8');
const toolPaths = createToolPaths(require('path').join(__dirname, '../..'));
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
const index = createWorkbenchIndex(source);
const translated = applyStaticSourceTranslations(source, merged, index);
const lookup = new Map(merged.map((e) => [e.originalText, e]));

function countQuoted(text, literal) {
  const escaped = escapeRegExp(literal);
  return (String(text).match(new RegExp(`(['"\`])${escaped}\\1`, 'g')) || []).length;
}

for (const text of DESCS) {
  const entry = lookup.get(text);
  console.log(
    text.slice(0, 50),
    'before',
    countQuoted(source, text),
    'after',
    countQuoted(translated, text),
    'mapped',
    Boolean(entry)
  );
}
