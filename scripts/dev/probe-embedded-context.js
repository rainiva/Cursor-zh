const fs = require('fs');

const source = fs.readFileSync(
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js',
  'utf8'
);

const needles = [
  'Save File',
  'Copy Relative Path',
  'Diff View',
  'Browse Files',
  'Search Files',
  'Subagents',
  'Web Search Tool',
  'Authentication',
  'Voice Mode',
  'PR Preferences',
  'Inline Editing & Terminal',
  'Modes, skills, MCPs and more',
  'Send',
  'Balanced quality and speed',
];

for (const needle of needles) {
  let index = 0;
  const samples = [];
  while (samples.length < 3 && (index = source.indexOf(needle, index)) >= 0) {
    samples.push(JSON.stringify(source.slice(Math.max(0, index - 25), index + needle.length + 25)));
    index += needle.length;
  }
  console.log('\n===', needle, '===');
  for (const sample of samples) {
    console.log(sample);
  }
}
