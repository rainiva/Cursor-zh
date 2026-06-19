const fs = require('fs');
const paths = [
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.glass.main.js',
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js',
];
const needles = [
  'Exact literal passes run before embedded patches.',
  'Exact literal passes',
  'embedded patches',
  'literal passes',
];

for (const p of paths) {
  if (!fs.existsSync(p)) continue;
  const source = fs.readFileSync(p, 'utf8');
  console.log('\n===', p.split('/').pop(), '===');
  for (const n of needles) {
    const c = source.split(n).length - 1;
    if (c) console.log(`${n}: ${c}`);
  }
  for (const n of needles) {
    let idx = 0;
    while ((idx = source.indexOf(n, idx)) !== -1) {
      console.log('\n', source.slice(Math.max(0, idx - 80), idx + n.length + 120));
      idx += n.length;
      break;
    }
  }
}
