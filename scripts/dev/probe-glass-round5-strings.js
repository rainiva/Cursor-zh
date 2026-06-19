const fs = require('fs');

const source = fs.readFileSync(
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.glass.main.js',
  'utf8'
);

const needles = [
  'Search Settings',
  'Fork',
  'Export',
  'No Uncommitted Changes',
  'Unified',
  'Find in Changes',
  'Open any file, URL, ...',
  'Canvas',
  'Balanced quality and speed, recommended for most tasks',
  'Open Tabs',
  'On Cursor-zh',
];

for (const needle of needles) {
  const count = source.split(needle).length - 1;
  if (count === 0) {
    console.log(`${needle}: 0`);
    continue;
  }
  let index = 0;
  let shown = 0;
  while ((index = source.indexOf(needle, index)) !== -1 && shown < 2) {
    shown += 1;
    console.log(`\n=== ${needle} #${shown} (${count} total) ===`);
    console.log(source.slice(Math.max(0, index - 70), index + needle.length + 70));
    index += needle.length;
  }
}
