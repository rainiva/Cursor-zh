const fs = require('fs');
const { createQuotedLiteralSet } = require('../lib/patcher/workbench-index.js');

const workbenchPath =
  process.argv[2] ||
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js';
const source = fs.readFileSync(workbenchPath, 'utf8');
const needle = '"Search models"';
const pos = source.indexOf(needle);
console.log('workbench bytes', source.length, 'needle pos', pos);

if (pos < 0) {
  console.log('needle not found');
  process.exit(1);
}

for (const end of [pos, pos + 100, pos + 1000, pos + 10000, pos + 50000, pos + 100000, source.length]) {
  const sub = source.slice(0, end);
  const set = createQuotedLiteralSet(sub);
  console.log('end', end, 'has', set.has('Search models'), 'literals', set.size);
}
