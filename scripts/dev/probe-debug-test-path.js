const fs = require('fs');
const { applyStaticSourceTranslations } = require('../lib/patcher/static');
const { createWorkbenchIndex } = require('../lib/patcher/workbench-index');
const { CRITICAL_EMBEDDED_UI_PATCHES } = require('../lib/mapping/critical-ui-targets');
const { mergeMappings, loadOverlayCommonMappings } = require('../cursor-zh-lib');
const { readJsonIfExists } = require('../tool/io');
const { createToolPaths } = require('../tool/paths');

const toolPaths = createToolPaths(require('path').join(__dirname, '../..'));
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
    loadOverlayCommonMappings()
  ),
  readJsonIfExists(toolPaths.dynamicMappingPath, [])
);
const index = createWorkbenchIndex(source);
const translated = applyStaticSourceTranslations(source, mergedMappings, index);

const patch = CRITICAL_EMBEDDED_UI_PATCHES.find((p) => p.from.includes('Debug Mode'));
console.log('patch from in source:', source.includes(patch.from));
console.log('from remains:', translated.includes(patch.from));
console.log('to present:', translated.includes(patch.to));

if (!translated.includes(patch.to)) {
  const idx = translated.indexOf('Whether additional debug');
  console.log('translated context:', translated.slice(Math.max(0, idx - 60), idx + 80));
}
