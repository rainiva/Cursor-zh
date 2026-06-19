const fs = require('fs');
const { createWorkbenchIndex } = require('../lib/patcher/workbench-index.js');
const { buildReplacementOccurrenceCounts, applyQuotedLiteralReplacements } = require('../lib/patcher/static.js');
const { escapeRegExp } = require('../lib/engine/substring.js');

const source = fs.readFileSync(
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js',
  'utf8'
);
const index = createWorkbenchIndex(source);
const replacementByContent = new Map([['File', '文件']]);

function regexCount(text, literal) {
  const m = text.match(new RegExp(`(['"\`])${escapeRegExp(literal)}\\1`, 'g'));
  return m ? m.length : 0;
}

const counts = buildReplacementOccurrenceCounts(source, replacementByContent, index);
console.log('iterate count', counts.get('File'));
console.log('regex count before', regexCount(source, 'File'));
const after = applyQuotedLiteralReplacements(source, replacementByContent, counts);
console.log('remaining count', counts.get('File'));
console.log('regex count after', regexCount(after, 'File'));
