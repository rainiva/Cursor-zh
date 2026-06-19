const fs = require('fs');
const path = require('path');
const { createWorkbenchIndex } = require('../lib/patcher/workbench-index.js');
const { applyStaticSourceTranslations } = require('../lib/patcher/static.js');
const { readJsonIfExists } = require('../tool/io.js');
const { createToolPaths } = require('../tool/paths.js');
const { mergeMappings } = require('../cursor-zh-lib.js');

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

function countQuoted(text, literal) {
  const escaped = literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (text.match(new RegExp(`(['"\`])${escaped}\\1`, 'g')) || []).length;
}

const menuMappings = merged.filter((entry) =>
  ['File', 'Edit', 'View', 'Help', 'Fork Chat'].includes(entry.originalText)
);

console.log('before apply');
for (const entry of menuMappings) {
  console.log(entry.originalText, countQuoted(source, entry.originalText));
}

console.log('applying...');
const translated = applyStaticSourceTranslations(source, merged, index);

console.log('after apply');
for (const entry of menuMappings) {
  console.log(entry.originalText, {
    originalLeft: countQuoted(translated, entry.originalText),
    translated: countQuoted(translated, entry.changeText),
  });
}
