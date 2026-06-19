const fs = require('fs');
const { createWorkbenchIndex } = require('../lib/patcher/workbench-index.js');
const { sourceHasQuotedLiteral } = require('../lib/patcher/runtime-selector.js');
const { readJsonIfExists } = require('../tool/io.js');
const { createToolPaths } = require('../tool/paths.js');
const { mergeMappings } = require('../cursor-zh-lib.js');

const STRINGS = [
  'Split Right',
  'Split Down',
  'Created',
  'Waiting for 1 command to finish',
  'Run in background',
  '1 Queued',
  'to Send',
  'Start Multitasking',
  'Thought',
  'Plan New Idea',
  'Run in Cloud',
  'New Agent in',
];

const workbenchPath =
  process.argv[2] ||
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js';
const source = fs.readFileSync(workbenchPath, 'utf8');
const index = createWorkbenchIndex(source);
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
const lookup = new Map(merged.map((e) => [e.originalText, e]));

for (const text of STRINGS) {
  const hasQuoted = sourceHasQuotedLiteral(source, text, index);
  const mapped = lookup.has(text);
  console.log(
    JSON.stringify({
      text,
      hasQuoted,
      mapped,
      changeText: lookup.get(text)?.changeText,
      forceRuntime: lookup.get(text)?.forceRuntime === true,
    })
  );
}

// New Agent pattern
const idx = source.indexOf('New Agent in');
if (idx >= 0) {
  console.log('sample', JSON.stringify(source.slice(idx, idx + 80)));
}
