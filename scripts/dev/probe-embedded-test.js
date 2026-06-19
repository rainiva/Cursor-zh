const fs = require('fs');
const path = require('path');
const {
  CRITICAL_EMBEDDED_UI_PATCHES,
} = require('../lib/mapping/critical-ui-targets');
const { readJsonIfExists } = require('../tool/io');
const { createToolPaths } = require('../tool/paths');
const { mergeMappings } = require('../cursor-zh-lib');
const { applyStaticSourceTranslations } = require('../lib/patcher/static');
const { createWorkbenchIndex } = require('../lib/patcher/workbench-index');

const toolPaths = createToolPaths(path.join(__dirname, '..'));
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

const p1 = '),"Debug Mode"),"Whether additional debug information shall be generated."';
const p1b = ',"Debug Mode"),"Whether additional debug information shall be generated."';
console.log('patch1', source.includes(p1));
console.log('patch1b', source.includes(p1b));

for (const patch of CRITICAL_EMBEDDED_UI_PATCHES) {
  if (!source.includes(patch.from)) continue;
  if (patch.from.includes('Debug Mode')) {
    console.log('from in source:', true);
    console.log('from remains:', translated.includes(patch.from));
    console.log('to present:', translated.includes(patch.to));
    const idx = translated.indexOf('Whether additional debug');
    if (idx >= 0) console.log('still english desc:', translated.slice(idx - 40, idx + 80));
    const idx2 = translated.indexOf('是否应生成额外的调试信息');
    if (idx2 >= 0) console.log('chinese desc context:', translated.slice(idx2 - 40, idx2 + 60));
    const idx3 = translated.indexOf('Debug Mode');
    if (idx3 >= 0) console.log('debug mode remains:', translated.slice(idx3 - 40, idx3 + 60));
  }
}
