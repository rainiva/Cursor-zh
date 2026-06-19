const fs = require('fs');
const { applyStaticSourceTranslations } = require('../lib/patcher/static');

const source = fs.readFileSync('D:/Apps/cursor/resources/app/out/vs/workbench/workbench.glass.main.js', 'utf8');
const translated = applyStaticSourceTranslations(source, []);

for (const needle of [
  'Good response',
  'Bad response',
  'just now',
  'On workspace',
  '在工作区',
  'sectionHeaderLabel:`On ',
  'sectionHeaderLabel:`在 ',
  'Updated just now',
  'm ago',
]) {
  console.log(`${needle}: raw=${source.split(needle).length - 1} translated=${translated.split(needle).length - 1}`);
}

for (const needle of ['title:"Good response"', 'return"just now"', 'Updated just now']) {
  let idx = 0;
  let c = 0;
  while ((idx = source.indexOf(needle, idx)) !== -1 && c < 2) {
    console.log('\n', needle, source.slice(idx - 30, idx + needle.length + 80));
    c++;
    idx++;
  }
}
