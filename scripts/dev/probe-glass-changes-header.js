const fs = require('fs');

const source = fs.readFileSync(
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.glass.main.js',
  'utf8'
);

const anchor = 'children:Wm})}),U("div",{className:"diff-tab-view-panel"';
const index = source.indexOf(anchor);
console.log('anchor index', index);
if (index >= 0) {
  console.log(source.slice(index - 2000, index + 100));
}

const enumIndex = source.indexOf('var R9I={');
console.log('\n=== R9I ===');
console.log(source.slice(enumIndex, enumIndex + 500));
