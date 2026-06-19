const fs = require('fs');
const path = require('path');
const { escapeRegExp } = require('../lib/engine/substring.js');
const { createWorkbenchIndex, iterateQuotedLiterals } = require('../lib/patcher/workbench-index.js');
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
const replacementByContent = new Map();
for (const entry of merged) {
  if (
    entry?.searchType === 'exact' &&
    typeof entry.originalText === 'string' &&
    !/[.*+?^${}()|[\]\\]/.test(entry.originalText) &&
    sourceHasQuotedLiteral(source, entry.originalText, index)
  ) {
    replacementByContent.set(entry.originalText, entry.changeText);
  }
}

const iterateCounts = new Map();
iterateQuotedLiterals(source, (_quote, content) => {
  if (replacementByContent.has(content)) {
    iterateCounts.set(content, (iterateCounts.get(content) || 0) + 1);
  }
});

let mismatches = 0;
const samples = [];
const t0 = Date.now();
for (const key of replacementByContent.keys()) {
  const iterate = iterateCounts.get(key) || 0;
  const regex = countQuotedLiteralMatches(source, key);
  if (iterate !== regex) {
    mismatches += 1;
    if (samples.length < 15) {
      samples.push({ key, iterate, regex });
    }
  }
}
console.log('keys', replacementByContent.size, 'mismatches', mismatches, 'ms', Date.now() - t0);
console.log('samples', samples);
