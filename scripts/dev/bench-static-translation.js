const fs = require('fs');
const path = require('path');

const workbenchPath =
  process.argv[2] ||
  process.env.CURSOR_WORKBENCH_PATH ||
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js';

if (!fs.existsSync(workbenchPath)) {
  console.error('workbench not found:', workbenchPath);
  process.exit(1);
}

const { createWorkbenchIndex } = require('../lib/patcher/workbench-index.js');
const { applyStaticSourceTranslationsDetailed } = require('../lib/patcher/contracts.js');
const { mergeMappings } = require('../cursor-zh-lib.js');
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
console.log('read workbench bytes', source.length);

let t0 = Date.now();
const index = createWorkbenchIndex(source);
console.log('createWorkbenchIndex ms', Date.now() - t0, 'literals', index.quotedLiterals.size);
console.log('has Search models', index.hasQuotedLiteral('Search models'));

t0 = Date.now();
const mergedMappings = loadMergedMappings();
console.log('loadMergedMappings ms', Date.now() - t0, 'count', mergedMappings.length);

t0 = Date.now();
const result = applyStaticSourceTranslationsDetailed(source, mergedMappings, index);
console.log('applyStatic ms', Date.now() - t0);
console.log('search_models', result.contracts.search_models?.matchCount);
console.log('translated bytes', result.translatedSource.length);
