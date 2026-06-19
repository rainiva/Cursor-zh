const fs = require('fs');
const source = fs.readFileSync(
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js',
  'utf8'
);

const needles = [
  'to Send',
  '1 Queued',
  ' Queued',
  'Start Multitasking',
  'Waiting for',
  'command to finish',
  'Run in background',
  'Created snapshot',
  'Created ',
  'New Agent in',
  'Thought',
  'Split Right',
];

for (const needle of needles) {
  let index = 0;
  let count = 0;
  while ((index = source.indexOf(needle, index)) >= 0 && count < 3) {
    console.log('\n', needle, JSON.stringify(source.slice(Math.max(0, index - 35), index + needle.length + 45)));
    index += needle.length;
    count += 1;
  }
}
