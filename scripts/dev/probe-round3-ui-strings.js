const fs = require('fs');
const { createWorkbenchIndex } = require('../lib/patcher/workbench-index.js');
const { sourceHasQuotedLiteral } = require('../lib/patcher/runtime-selector.js');
const { readJsonIfExists } = require('../tool/io.js');
const { createToolPaths } = require('../tool/paths.js');
const { mergeMappings } = require('../cursor-zh-lib.js');

const STRINGS = [
  'Set Up Workspace',
  'Connect SSH',
  '1 Terminal',
  'Terminal',
  'Run On',
  'Repos',
  'No projects',
  'Submit from a previous message?',
  "Don't Ask Again",
  "Don't revert",
  'Revert',
  'Probe quoted strings for agent UI',
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
    })
  );
}

for (const needle of ['Run On', 'No projects', 'Set Up Workspace', 'Connect SSH', '{0} Terminal', ' Terminal']) {
  let i = 0;
  let n = 0;
  while ((i = source.indexOf(needle, i)) >= 0 && n < 2) {
    console.log('ctx', needle, JSON.stringify(source.slice(Math.max(0, i - 40), i + needle.length + 60)));
    i += needle.length;
    n += 1;
  }
}
