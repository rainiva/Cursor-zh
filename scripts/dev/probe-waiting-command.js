const fs = require('fs');
const source = fs.readFileSync('D:/Apps/cursor/resources/app/out/vs/workbench/workbench.glass.main.js', 'utf8');

for (const needle of ['command to finish', 'commands to finish']) {
  let idx = 0;
  while ((idx = source.indexOf(needle, idx)) !== -1) {
    console.log(source.slice(Math.max(0, idx - 120), idx + needle.length + 80));
    console.log('---');
    idx++;
  }
}
