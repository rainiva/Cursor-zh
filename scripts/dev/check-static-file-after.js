const fs = require('fs');
const path = require('path');
const { createWorkbenchIndex } = require('../lib/patcher/workbench-index.js');
const { applyStaticSourceTranslations } = require('../lib/patcher/static.js');
const { readJsonIfExists } = require('../tool/io.js');
const { createToolPaths } = require('../tool/paths.js');
const { mergeMappings } = require('../cursor-zh-lib.js');
const { escapeRegExp } = require('../lib/engine/substring.js');

const workbenchPath =
  process.argv[2] ||
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js';
const source = fs.readFileSync(workbenchPath, 'utf8');
const toolPaths = createToolPaths(path.join(__dirname, '../..'));
const mergedMappings = mergeMappings(
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
const t0 = Date.now();
const translated = applyStaticSourceTranslations(source, mergedMappings, index);
console.log('applyStatic ms', Date.now() - t0);
function countQuoted(text, literal) {
  const escaped = escapeRegExp(literal);
  return (String(text).match(new RegExp(`(['"\`])${escaped}\\1`, 'g')) || []).length;
}
console.log('File after', countQuoted(translated, 'File'));
console.log('Edit after', countQuoted(translated, 'Edit'));
