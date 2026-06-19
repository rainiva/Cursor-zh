const fs = require('fs');
const { createQuotedLiteralSet } = require('../lib/patcher/workbench-index.js');

const source = fs.readFileSync(process.argv[2], 'utf8');
const quotePos = source.indexOf('"Search models"');
const contextStart = Math.max(0, quotePos - 80);
const context = source.slice(contextStart, quotePos + 20);
console.log('context', JSON.stringify(context));
console.log('context set', createQuotedLiteralSet(context).has('Search models'));

// find unclosed quote before quotePos
let inString = false;
let stringQuote = null;
for (let i = 0; i < quotePos; i++) {
  const ch = source[i];
  if (!inString && (ch === '"' || ch === "'" || ch === '`')) {
    inString = true;
    stringQuote = ch;
    continue;
  }
  if (inString && ch === '\\') {
    i += 1;
    continue;
  }
  if (inString && ch === stringQuote) {
    inString = false;
    stringQuote = null;
  }
}
console.log('naive scanner inString at quotePos', inString, 'quote', stringQuote);
