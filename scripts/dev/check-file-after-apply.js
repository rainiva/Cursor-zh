const fs = require('fs');
const path = require('path');
const { createWorkbenchIndex } = require('../lib/patcher/workbench-index.js');
const { applyStaticSourceTranslations } = require('../lib/patcher/static.js');
const { readJsonIfExists } = require('../tool/io.js');
const { createToolPaths } = require('../tool/paths.js');
const { mergeMappings } = require('../cursor-zh-lib.js');

const source = fs.readFileSync(
  process.argv[2] ||
    'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js',
  'utf8'
);
const toolPaths = createToolPaths(path.join(__dirname, '../..'));
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

function countQuoted(text, literal) {
  const escaped = literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (text.match(new RegExp(`(['"\`])${escaped}\\1`, 'g')) || []).length;
}

const index = createWorkbenchIndex(source);
console.log('File before', countQuoted(source, 'File'), 'index', index.hasQuotedLiteral('File'));

const translated = applyStaticSourceTranslations(source, merged, index);
const afterIndex = createWorkbenchIndex(translated);
console.log('File after', countQuoted(translated, 'File'), 'indexAfter', afterIndex.hasQuotedLiteral('File'));
console.log('文件 after', countQuoted(translated, '文件'));
