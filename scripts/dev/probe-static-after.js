const fs = require('fs');
const path = require('path');
const { createWorkbenchIndex } = require('../lib/patcher/workbench-index.js');
const { applyStaticSourceTranslations } = require('../lib/patcher/static.js');
const { readJsonIfExists } = require('../tool/io.js');
const { createToolPaths } = require('../tool/paths.js');
const { mergeMappings } = require('../cursor-zh-lib.js');
const { escapeRegExp } = require('../lib/engine/substring.js');

const CHECK = [
  'Save File',
  'Queue Messages',
  'Cursor Account',
  'Warning Notifications',
  'Partial Accepts',
  'Send',
  'Modes, skills, MCPs and more',
  'Browse Files',
];

const workbenchPath =
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js';
const source = fs.readFileSync(workbenchPath, 'utf8');
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
const index = createWorkbenchIndex(source);
const translated = applyStaticSourceTranslations(source, merged, index);
const lookup = new Map(merged.map((e) => [e.originalText, e]));

function countQuoted(text, literal) {
  const escaped = escapeRegExp(literal);
  return (String(text).match(new RegExp(`(['"\`])${escaped}\\1`, 'g')) || []).length;
}

for (const text of CHECK) {
  const entry = lookup.get(text);
  console.log(
    text,
    'before',
    countQuoted(source, text),
    'after',
    countQuoted(translated, text),
    'mapped',
    Boolean(entry),
    entry?.changeText
  );
}
