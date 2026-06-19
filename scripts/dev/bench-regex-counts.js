const fs = require('fs');
const { escapeRegExp } = require('../lib/engine/substring.js');
const { createWorkbenchIndex } = require('../lib/patcher/workbench-index.js');
const { readJsonIfExists } = require('../tool/io.js');
const { createToolPaths } = require('../tool/paths.js');
const { mergeMappings } = require('../cursor-zh-lib.js');
const { sourceHasQuotedLiteral } = require('../lib/patcher/runtime-selector.js');

function countQuotedLiteralMatches(sourceText, literalText) {
  const escapedLiteral = escapeRegExp(literalText);
  const matches = String(sourceText || '').match(
    new RegExp(`(['"\`])${escapedLiteral}\\1`, 'g')
  );
  return Array.isArray(matches) ? matches.length : 0;
}

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
const index = createWorkbenchIndex(source);
const keys = merged.filter(
  (entry) =>
    entry?.searchType === 'exact' &&
    typeof entry.originalText === 'string' &&
    !/[.*+?^${}()|[\]\\]/.test(entry.originalText) &&
    sourceHasQuotedLiteral(source, entry.originalText, index)
);

const t0 = Date.now();
let total = 0;
for (const entry of keys) {
  total += countQuotedLiteralMatches(source, entry.originalText);
}
console.log('keys', keys.length, 'total matches', total, 'ms', Date.now() - t0);
