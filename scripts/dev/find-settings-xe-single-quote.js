const fs = require('fs');

const source = fs.readFileSync(
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js',
  'utf8'
);
const re = /Xe\('([^']{20,500})'/g;
const hits = [];
let match;
while ((match = re.exec(source))) {
  if (/cursor-settings|Choose how|Allow Agent|Manage your|Show system|Show rotating|Wait indefinitely|Balanced quality|Learn more|Web Fetch|Authentication|Preferred PR|Adjust the default|When to show|Contextual suggestions|Use themed|Glob patterns|Suggest edits|Allow Tab|deprecated/i.test(
    match[1]
  )) {
    hits.push(match[1]);
  }
}
for (const hit of hits) {
  console.log('---');
  console.log(hit.slice(0, 400));
}
