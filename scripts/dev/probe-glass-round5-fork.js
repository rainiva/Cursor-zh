const fs = require('fs');

const source = fs.readFileSync(
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.glass.main.js',
  'utf8'
);

function findAll(needle, max = 5) {
  let index = 0;
  let count = 0;
  while ((index = source.indexOf(needle, index)) !== -1) {
    count += 1;
    if (count <= max) {
      console.log(`\n=== ${needle} #${count} ===`);
      console.log(source.slice(Math.max(0, index - 90), index + needle.length + 90));
    }
    index += needle.length;
  }
  console.log(`${needle}: ${count} total`);
}

findAll('Split Down', 1);
findAll('Fork', 3);
findAll('Export', 3);
findAll('z5C="Search Settings"', 1);
findAll('Search Settings', 2);
findAll('No uncommitted', 2);
findAll('no uncommitted', 2);
findAll('Unified"', 3);
findAll('Unified >', 2);
findAll('On ', 0);

// layout unified label in menu
const layoutIdx = source.indexOf('children:"布局"');
console.log('\nlayout zh idx', layoutIdx);

// search for Unified near Layout
const layoutEn = source.indexOf('"Layout"');
console.log('Layout en', layoutEn >= 0 ? source.slice(layoutEn, layoutEn + 200) : 'none');
