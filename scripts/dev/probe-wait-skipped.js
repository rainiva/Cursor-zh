const fs = require('fs');
const source = fs.readFileSync('D:/Apps/cursor/resources/app/out/vs/workbench/workbench.glass.main.js', 'utf8');

for (const n of ['Wait skipped', 'Waited', 'action:"Waiting"', 'briefly']) {
  console.log(n, source.split(n).length - 1);
}

let idx = 0;
while ((idx = source.indexOf('Wait skipped', idx)) !== -1) {
  console.log('\n', source.slice(idx - 60, idx + 100));
  idx++;
}
