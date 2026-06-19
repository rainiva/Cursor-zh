const fs = require('fs');

const source = fs.readFileSync(
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.glass.main.js',
  'utf8'
);

// Agent tab context menu - search for menu items pattern
const markers = ['Split Down', 'Split Right', 'Pin', 'Rename', 'Archive', 'Duplicate', 'Fork', 'Export'];
const idx = source.indexOf('function aOC');
if (idx >= 0) {
  const chunk = source.slice(idx, idx + 15000);
  console.log('=== aOC chunk menu strings ===');
  for (const m of markers) {
    const i = chunk.indexOf(m);
    if (i >= 0) console.log(m, chunk.slice(Math.max(0, i - 50), i + 80));
  }
}

// Search label patterns for Fork/Export in glass UI components
for (const pattern of [
  'label:"Fork"',
  'title:"Fork"',
  'text:"Fork"',
  'label:"Export"',
  'title:"Export"',
  'text:"Export"',
  '"Fork"',
  'Fork"',
]) {
  const count = source.split(pattern).length - 1;
  if (count > 0 && count < 20) {
    console.log(`\n${pattern}: ${count}`);
    let index = 0;
    let shown = 0;
    while ((index = source.indexOf(pattern, index)) !== -1 && shown < 2) {
      shown += 1;
      console.log(source.slice(Math.max(0, index - 70), index + pattern.length + 70));
      index += pattern.length;
    }
  }
}

// No uncommitted changes UI header
for (const pattern of [
  'No Uncommitted Changes',
  'No uncommitted changes',
  'no uncommitted changes',
  'Uncommitted Changes',
]) {
  console.log(pattern, source.split(pattern).length - 1);
}

const i = source.indexOf('uncommitted:"Uncommitted"');
console.log('\n=== uncommitted enum ===');
console.log(source.slice(i - 200, i + 300));

const j = source.indexOf('Uncommitted changes in');
console.log('\n=== Uncommitted changes in ===');
console.log(source.slice(j - 100, j + 200));

// Find No + Uncommitted pattern for header
for (const pattern of [
  'No Uncommitted',
  '"No Uncommitted Changes"',
  'No Uncommitted Changes',
  'return"No Uncommitted',
  'return`No Uncommitted',
]) {
  const count = source.split(pattern).length - 1;
  if (count) console.log(pattern, count);
}
