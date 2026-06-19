const fs = require('fs');
const path = require('path');
const { applyStaticSourceTranslations } = require('../lib/patcher/static');
const { mergeMappings } = require('../lib/mapping/merge');
const { readJsonIfExists } = require('../tool/io');
const { createToolPaths } = require('../tool/paths');

const toolPaths = createToolPaths(path.join(__dirname, '..', '..'));
const glassPath =
  process.env.CURSOR_GLASS_WORKBENCH_PATH ||
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.glass.main.js';

if (!fs.existsSync(glassPath)) {
  console.log('glass bundle missing');
  process.exit(0);
}

const source = fs.readFileSync(glassPath, 'utf8');
const merged = mergeMappings(
  mergeMappings(
    mergeMappings(
      readJsonIfExists(toolPaths.baseMappingPath, []),
      readJsonIfExists(toolPaths.overlayMappingPath, [])
    ),
    readJsonIfExists(toolPaths.cursorWinCommonPath, [])
  ),
  readJsonIfExists(toolPaths.dynamicMappingPath, [])
);
const translated = applyStaticSourceTranslations(source, merged);

for (const needle of [
  'children:"Shortcuts"',
  'children:"Contact Us"',
  'Ft(11756,"Check for Updates...")',
  'children:"快捷键"',
  'children:"联系我们"',
  'Ft(11756,"检查更新...")',
]) {
  console.log(needle, translated.split(needle).length - 1);
}
