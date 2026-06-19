const fs = require('fs');
const { createQuotedLiteralSet } = require('../lib/patcher/workbench-index.js');

const source = fs.readFileSync(
  process.argv[2] ||
    'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js',
  'utf8'
);
const needle = '"Search models"';
const needlePos = source.indexOf(needle);
const endPos = needlePos + needle.length;

function detects(end) {
  if (end < endPos) {
    return false;
  }
  return createQuotedLiteralSet(source.slice(0, end)).has('Search models');
}

console.log('endPos', endPos, 'detects at endPos', detects(endPos));
console.log('detects full file', detects(source.length));
console.log(
  'isolated context',
  createQuotedLiteralSet(source.slice(needlePos - 80, needlePos + 20)).has('Search models')
);

// Find smallest index i in [0, endPos) where prefix 0..endPos fails AFTER including char i
// i.e. binary search first position where scanning from 0 breaks detection at endPos
let lo = 0;
let hi = endPos;
while (lo + 1 < hi) {
  const mid = (lo + hi) >> 1;
  const prefix = source.slice(0, mid);
  const combined = prefix + source.slice(needlePos, endPos);
  const ok = createQuotedLiteralSet(combined).has('Search models');
  if (ok) {
    lo = mid;
  } else {
    hi = mid;
  }
}

console.log('desync char between index', lo, 'and', hi);
console.log('char codes', [...source.slice(hi - 5, hi + 15)].map((c) => c.charCodeAt(0)));
console.log('snippet', JSON.stringify(source.slice(Math.max(0, hi - 100), hi + 120)));
