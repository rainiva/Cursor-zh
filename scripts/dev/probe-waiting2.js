const fs = require('fs');
const source = fs.readFileSync('D:/Apps/cursor/resources/app/out/vs/workbench/workbench.glass.main.js', 'utf8');

let idx = 0;
while ((idx = source.indexOf('Waiting for', idx)) !== -1) {
  const snippet = source.slice(idx, idx + 80);
  if (/command|finish|\$\{/.test(snippet)) {
    console.log(snippet);
  }
  idx++;
}

console.log('\nrog/sog:');
console.log(source.match(/rog="[^"]+"/)?.[0]);
console.log(source.match(/sog="[^"]+"/)?.[0]);
