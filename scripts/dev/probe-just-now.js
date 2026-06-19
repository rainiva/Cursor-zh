const fs = require('fs');
const source = fs.readFileSync('D:/Apps/cursor/resources/app/out/vs/workbench/workbench.glass.main.js', 'utf8');

let idx = 0;
while ((idx = source.indexOf('just now', idx)) !== -1) {
  console.log(source.slice(Math.max(0, idx - 50), idx + 50));
  console.log('---');
  idx++;
}
