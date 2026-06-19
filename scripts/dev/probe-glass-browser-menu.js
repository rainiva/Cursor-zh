const fs = require('fs');
const { createWorkbenchIndex } = require('../lib/patcher/workbench-index.js');
const { sourceHasQuotedLiteral } = require('../lib/patcher/runtime-selector.js');
const { readJsonIfExists } = require('../tool/io.js');
const { createToolPaths } = require('../tool/paths.js');
const { mergeMappings } = require('../cursor-zh-lib.js');

const STRINGS = [
  'Take Screenshot',
  'Hard Reload',
  'Copy Current URL',
  'Show Bookmark Bar',
  'Clear Browsing History',
  'Clear Cookies',
  'Clear Cache',
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
  console.log(
    JSON.stringify({
      text,
      hasQuoted: sourceHasQuotedLiteral(source, text, index),
      mapped: lookup.has(text),
      changeText: lookup.get(text)?.changeText,
    })
  );
}

for (const needle of STRINGS) {
  let i = 0;
  let n = 0;
  while ((i = source.indexOf(needle, i)) >= 0 && n < 2) {
    console.log('ctx', needle, JSON.stringify(source.slice(Math.max(0, i - 45), i + needle.length + 55)));
    i += needle.length;
    n += 1;
  }
}
