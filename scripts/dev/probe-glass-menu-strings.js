const fs = require('fs');

const source = fs.readFileSync(
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.glass.main.js',
  'utf8'
);

for (const needle of ['Contact Us', 'Check for Updates...', 'Documentation', 'Log out']) {
  let index = 0;
  let count = 0;
  while ((index = source.indexOf(needle, index)) !== -1) {
    count += 1;
    console.log(`\n=== ${needle} #${count} ===`);
    console.log(source.slice(Math.max(0, index - 90), index + needle.length + 90));
    index += needle.length;
  }
}

for (const pattern of [
  'children:"Shortcuts"',
  'children:"Contact Us"',
  'Ft(11756,"Check for Updates...")',
]) {
  console.log(pattern, source.split(pattern).length - 1);
}
