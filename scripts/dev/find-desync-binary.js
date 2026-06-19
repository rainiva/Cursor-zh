const fs = require('fs');
const { createQuotedLiteralSet } = require('../lib/patcher/workbench-index.js');

const workbenchPath =
  process.argv[2] ||
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js';
const source = fs.readFileSync(workbenchPath, 'utf8');
const needle = '"Search models"';
const needlePos = source.indexOf(needle);
const endPos = needlePos + needle.length;

console.log('context slice has', createQuotedLiteralSet(source.slice(needlePos - 80, needlePos + 20)).has('Search models'));
console.log('prefix through needle has', createQuotedLiteralSet(source.slice(0, endPos)).has('Search models'));

function prefixDetects(end) {
  if (end < endPos) {
    return false;
  }
  return createQuotedLiteralSet(source.slice(0, end)).has('Search models');
}

let lo = endPos;
let hi = source.length;
while (lo + 1 < hi) {
  const mid = (lo + hi) >> 1;
  if (prefixDetects(mid)) {
    hi = mid;
  } else {
    lo = mid;
  }
}

console.log('min prefix length that detects Search models:', hi, 'of', source.length);
console.log('desync introduced between', lo, 'and', hi);
console.log('context at desync:', JSON.stringify(source.slice(Math.max(0, hi - 150), hi + 80)));
