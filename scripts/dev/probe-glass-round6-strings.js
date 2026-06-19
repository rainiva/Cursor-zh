const fs = require('fs');

const source = fs.readFileSync(
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.glass.main.js',
  'utf8'
);

const needles = [
  'Add agents, context, tools...',
  'Plan Mode',
  'Debug Mode',
  'Multitask Mode',
  'Ask Mode',
  'Generates a robust implementation plan',
  'Pinpoints the root cause of an issue',
  'Uses a fleet of subagents to parallelize',
  'Explores the codebase and answer questions without making edits',
  'Manage View',
  'Tools',
];

for (const needle of needles) {
  const count = source.split(needle).length - 1;
  console.log(`${needle}: ${count}`);
  if (count > 0 && count <= 5) {
    let index = 0;
    while ((index = source.indexOf(needle, index)) !== -1) {
      console.log(' ', source.slice(Math.max(0, index - 70), index + needle.length + 90));
      index += needle.length;
    }
  }
}

const modeBlock = source.indexOf('description:"Generates a robust implementation plan');
if (modeBlock >= 0) {
  console.log('\n=== mode block ===');
  console.log(source.slice(modeBlock - 250, modeBlock + 1200));
}

for (const pattern of [
  'placeholder:"Add agents, context, tools..."',
  'children:"Manage View"',
  'title:"Tools"',
  'Explores the codebase',
  'answer questions without making edits',
  'Ask Mode',
]) {
  console.log(pattern, source.split(pattern).length - 1);
}
