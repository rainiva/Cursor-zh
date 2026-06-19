const fs = require('fs');

const source = fs.readFileSync(
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.glass.main.js',
  'utf8'
);

const patterns = [
  'children:"Fork"',
  'children:"Export"',
  'placeholder:"Search Settings"',
  'children:"Find in Changes"',
  'placeholder:"Open any file, URL, ..."',
  'children:"Canvas"',
  'children:"Open Tabs"',
  'No Uncommitted Changes',
  'Uncommitted Changes',
  'subtitle:"Balanced quality and speed, recommended for most tasks"',
  'Unified >',
  'children:"Unified"',
  'title:"Unified"',
];

for (const pattern of patterns) {
  const count = source.split(pattern).length - 1;
  console.log(`${pattern}: ${count}`);
  if (count > 0 && count <= 3) {
    let index = 0;
    while ((index = source.indexOf(pattern, index)) !== -1) {
      console.log(' ', source.slice(Math.max(0, index - 60), index + pattern.length + 60));
      index += pattern.length;
    }
  }
}

// Fork/Export menu near Split Down context
const splitIdx = source.indexOf('Split Down');
if (splitIdx >= 0) {
  console.log('\n=== near Split Down ===');
  console.log(source.slice(splitIdx - 200, splitIdx + 800));
}
