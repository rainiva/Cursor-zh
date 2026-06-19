const fs = require('fs');
const t = fs.readFileSync(
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main_translated.js',
  'utf8'
);
const checks = [
  'title:"Queue Messages"',
  'title:"消息排队"',
  'title:"PR Preferences"',
  'children:"Save File"',
  'title:"Browse Files"',
  'Xe("<div>Web Search Tool"',
  'subtitle:"Balanced quality',
  'title:"Cursor Account"',
  'title:"Cursor 账户"',
];
for (const s of checks) {
  console.log(s, t.includes(s));
}
