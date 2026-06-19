const fs = require('fs');
const { applyStaticSourceTranslations } = require('../lib/patcher/static');

const source = fs.readFileSync('D:/Apps/cursor/resources/app/out/vs/workbench/workbench.glass.main.js', 'utf8');
const translated = applyStaticSourceTranslations(source, []);

const needles = [
  'Home MCP Servers',
  'Servers available from Home.',
  'Copy Messages',
  'Waiting for 1 command to finish',
  'Parallelize Build with Multitask Mode.',
  'Debug Mode',
  'm ago',
  'h ago',
  'Last updated',
];

for (const needle of needles) {
  const raw = source.split(needle).length - 1;
  const after = translated.split(needle).length - 1;
  if (raw > 0) console.log(`${needle}: raw=${raw} translated=${after}`);
}

for (const needle of [
  'Waiting for 1 command to finish',
  'Home MCP Servers',
  'Copy Messages',
]) {
  const idx = source.indexOf(needle);
  if (idx >= 0) {
    console.log(`\n=== ${needle} ===`);
    console.log(source.slice(Math.max(0, idx - 90), idx + needle.length + 120));
  }
}

for (const needle of ['m ago', 'h ago']) {
  const idx = source.indexOf(needle);
  if (idx >= 0) console.log(`\n${needle}:`, source.slice(idx - 50, idx + 40));
}

let idx = 0;
while ((idx = translated.indexOf('Debug Mode', idx)) !== -1) {
  console.log('\nDebug Mode remaining:', translated.slice(idx - 70, idx + 90));
  idx++;
}
