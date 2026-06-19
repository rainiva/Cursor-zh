const fs = require('fs');
const path = require('path');
const { createWorkbenchIndex } = require('../lib/patcher/workbench-index.js');
const { applyQuotedLiteralReplacements } = require('../lib/patcher/static.js');
const { readJsonIfExists } = require('../tool/io.js');
const { createToolPaths } = require('../tool/paths.js');
const { mergeMappings } = require('../cursor-zh-lib.js');
const { sourceHasQuotedLiteral } = require('../lib/patcher/runtime-selector.js');

const source = fs.readFileSync(
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js',
  'utf8'
);
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
const exact = merged.filter(
  (entry) =>
    entry?.searchType === 'exact' &&
    typeof entry.originalText === 'string' &&
    sourceHasQuotedLiteral(source, entry.originalText, index)
);
const replacementByContent = new Map();
for (const entry of exact) {
  if (!/[.*+?^${}()|[\]\\]/.test(entry.originalText)) {
    replacementByContent.set(entry.originalText, entry.changeText);
  }
}

const afterSinglePass = applyQuotedLiteralReplacements(source, replacementByContent);
const pendingIndex = createWorkbenchIndex(afterSinglePass);
const pending = new Set();
for (const literal of pendingIndex.quotedLiterals) {
  if (replacementByContent.has(literal) && index.hasQuotedLiteral(literal)) {
    pending.add(literal);
  }
}
function countQuoted(text, literal) {
  const escaped = literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (text.match(new RegExp(`(['"\`])${escaped}\\1`, 'g')) || []).length;
}
console.log('File after single pass', countQuoted(afterSinglePass, 'File'));
console.log('singlePassKeys', replacementByContent.size, 'pendingAfterSinglePass', pending.size);
console.log('sample', [...pending].slice(0, 20));
