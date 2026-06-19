const fs = require('fs');
const source = fs.readFileSync('D:/Apps/cursor/resources/app/out/vs/workbench/workbench.glass.main.js', 'utf8');

for (const fn of ['function Onh(n){', 'function iAC(n){']) {
  const i = source.indexOf(fn);
  console.log('\n===', fn, '===');
  console.log(source.slice(i, i + 150));
}

const thhIdx = source.indexOf('thh=[{id:"plan"');
console.log('\n=== thh array ===');
console.log(source.slice(thhIdx, thhIdx + 900));

const mtIdx = source.indexOf('description:"Uses a fleet of subagents');
console.log('\n=== multitask menu item ===');
console.log(source.slice(mtIdx - 250, mtIdx + 200));

for (const p of [
  'title:"Tools"',
  'children:"Manage View"',
  'placeholder:"Add agents, context, tools..."',
  'title:"Plan Mode"',
  'title:"Debug Mode"',
  'title:"Multitask Mode"',
  'title:"Ask Mode"',
]) {
  let idx = 0;
  let c = 0;
  while ((idx = source.indexOf(p, idx)) !== -1 && c < 2) {
    console.log(`\n${p} @ ${idx}:`);
    console.log(source.slice(Math.max(0, idx - 80), idx + p.length + 80));
    c++;
    idx++;
  }
  if (c === 0) console.log(`${p}: 0`);
}
