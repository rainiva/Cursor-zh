const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
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

for (const patch of CRITICAL_EMBEDDED_UI_PATCHES) {
  if (!source.includes(patch.from)) continue;
  try {
    assert.equal(translated.includes(patch.from), false, `embedded fragment remains: ${patch.from}`);
    assert.ok(translated.includes(patch.to), `embedded translation missing: ${patch.to}`);
  } catch (err) {
    console.error('FAILED PATCH:', patch);
    console.error(err.message);
    process.exit(1);
  }
}
console.log('all ok');
