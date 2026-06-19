const fs = require('fs');
const { applyStaticSourceTranslations } = require('../lib/patcher/static.js');
const { createWorkbenchIndex } = require('../lib/patcher/workbench-index.js');
const { readJsonIfExists } = require('../tool/io.js');
const { createToolPaths } = require('../tool/paths.js');
const { mergeMappings } = require('../cursor-zh-lib.js');
const { escapeRegExp } = require('../lib/engine/substring.js');

const source = fs.readFileSync(
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js',
  'utf8'
);
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
const translated = applyStaticSourceTranslations(source, merged, createWorkbenchIndex(source));

function countQuoted(text, literal) {
  const escaped = escapeRegExp(literal);
  return (String(text).match(new RegExp(`(['"\`])${escaped}\\1`, 'g')) || []).length;
}

const checks = [
  'Thought',
  'Split Right',
  'Split Down',
  'Run in Cloud',
  'Run in background',
  'Created snapshot',
  'Created ',
  'Plan New Idea',
  'Start Multitasking',
  'Agent is waiting for a command to finish.',
  'Agent is waiting for commands to finish.',
  'label:"Run in Cloud"',
  'label:"Plan New Idea"',
];

for (const text of checks) {
  console.log(
    text,
    'quoted before/after',
    countQuoted(source, text),
    countQuoted(translated, text),
    'includes after',
    translated.includes(text)
  );
}

const idx = translated.indexOf('New Agent in');
console.log('New Agent in after', idx >= 0, idx >= 0 ? translated.slice(idx, idx + 60) : '');
