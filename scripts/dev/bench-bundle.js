const fs = require('fs');
const path = require('path');

const workbenchPath =
  process.argv[2] ||
  process.env.CURSOR_WORKBENCH_PATH ||
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js';

const {
  buildTranslatedWorkbenchBundleParts,
  mergeMappings,
  selectRuntimeMappings,
} = require('../cursor-zh-lib.js');
const { createWorkbenchIndex } = require('../lib/patcher/workbench-index.js');
const { applyStaticSourceTranslationsDetailed } = require('../lib/patcher/contracts.js');
const { createToolPaths } = require('../tool/paths.js');
const { readJsonIfExists } = require('../tool/io.js');

const toolPaths = createToolPaths(path.join(__dirname, '../..'));

function loadMergedMappings() {
  const baseMappings = readJsonIfExists(toolPaths.baseMappingPath, []);
  const overlayMappings = readJsonIfExists(toolPaths.overlayMappingPath, []);
  const cursorWinCommonMappings = readJsonIfExists(toolPaths.cursorWinCommonPath, []);
  const dynamicMappings = readJsonIfExists(toolPaths.dynamicMappingPath, []);
  return mergeMappings(
    mergeMappings(mergeMappings(baseMappings, overlayMappings), cursorWinCommonMappings),
    dynamicMappings
  );
}

const source = fs.readFileSync(workbenchPath, 'utf8');
const mergedMappings = loadMergedMappings();
const index = createWorkbenchIndex(source);

let t0 = Date.now();
const staticResult = applyStaticSourceTranslationsDetailed(source, mergedMappings, index);
console.log('static ms', Date.now() - t0, 'search_models', staticResult.contracts.search_models?.matchCount);

const runtimeMappings = selectRuntimeMappings(source, mergedMappings, index);

t0 = Date.now();
const parts = buildTranslatedWorkbenchBundleParts({
  workbenchSource: source,
  mappings: mergedMappings,
  runtimeMappings,
  metadata: { runtimeConfig: { mode: 'performance' } },
  translatedSource: staticResult.translatedSource,
});
console.log('bundle parts ms', Date.now() - t0, 'header bytes', parts.runtimeHeader.length, 'body bytes', parts.translatedSource.length);

t0 = Date.now();
const { writeTextParts } = require('../tool/io.js');
const outPath = path.join(__dirname, '../../state/bench-bundle.js');
writeTextParts(outPath, [parts.runtimeHeader, parts.translatedSource]);
console.log('write parts ms', Date.now() - t0, 'out', outPath);
