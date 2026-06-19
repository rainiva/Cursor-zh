const fs = require('fs');
const path = require('path');
const { CRITICAL_EMBEDDED_UI_PATCHES } = require('../lib/mapping/critical-ui-targets');
const { readJsonIfExists } = require('../tool/io');
const { createToolPaths } = require('../tool/paths');
const { mergeMappings } = require('../cursor-zh-lib');
const { applyStaticSourceTranslations } = require('../lib/patcher/static');
const { createWorkbenchIndex } = require('../lib/patcher/workbench-index');

const toolPaths = createToolPaths(path.join(__dirname, '../..'));
const source = fs.readFileSync(
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js',
  'utf8'
);
const mergedMappings = mergeMappings(
  mergeMappings(
    mergeMappings(
      readJsonIfExists(toolPaths.baseMappingPath, []),
      readJsonIfExists(toolPaths.overlayMappingPath, [])
    ),
    readJsonIfExists(toolPaths.cursorWinCommonPath, [])
  ),
  readJsonIfExists(toolPaths.dynamicMappingPath, [])
);
const index = createWorkbenchIndex(source);
const translated = applyStaticSourceTranslations(source, mergedMappings, index);

const patch = CRITICAL_EMBEDDED_UI_PATCHES.find((p) =>
  p.from.includes('Whether additional debug')
);
console.log('from in source:', source.includes(patch.from));
console.log('from in translated:', translated.includes(patch.from));
console.log('to in translated:', translated.includes(patch.to));

const idx = source.indexOf('Whether additional debug');
console.log('\nSOURCE:', source.slice(idx - 50, idx + 80));
console.log('\nTRANSLATED:', translated.slice(idx - 50, idx + 80));

// count occurrences
let i = 0;
let c = 0;
while ((i = source.indexOf(patch.from, i)) !== -1) {
  c++;
  i++;
}
console.log('\nfrom occurrences in source:', c);

i = 0;
c = 0;
while ((i = translated.indexOf(patch.to, i)) !== -1) {
  c++;
  i++;
}
console.log('to occurrences in translated:', c);

i = 0;
c = 0;
while ((i = translated.indexOf(',"调试模式"),"是否应生成额外的调试信息。"', i)) !== -1) {
  console.log('alt to:', translated.slice(i - 20, i + 60));
  c++;
  i++;
}
console.log('alt to count:', c);
