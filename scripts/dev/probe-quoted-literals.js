const fs = require('fs');
const { createQuotedLiteralSet } = require('../lib/patcher/workbench-index');

const snippets = [
  'U(li.Item,{leftSection:b,onSelect:()=>a(oXP),children:"Contact Us"})',
  'title:Ft(11756,"Check for Updates...")',
  'children:"Shortcuts"',
  'title:"About Cursor"',
];

for (const snippet of snippets) {
  console.log(snippet, [...createQuotedLiteralSet(snippet)]);
}

const source = fs.readFileSync(
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.glass.main.js',
  'utf8'
);
const contactIndex = source.indexOf('children:"Contact Us"');
console.log('\ncontact slice in bundle:', [...createQuotedLiteralSet(source.slice(contactIndex - 5, contactIndex + 40))]);
