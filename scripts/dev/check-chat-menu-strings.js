const fs = require('fs');
const path = require('path');
const { readJsonIfExists } = require('../tool/io.js');
const { createToolPaths } = require('../tool/paths.js');
const { mergeMappings } = require('../cursor-zh-lib.js');

const workbenchPath =
  process.argv[2] ||
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js';

const targets = [
  'Pin',
  'Rename',
  'Mark as Unread',
  'Archive',
  'Split',
  'Export Chat',
  'Copy',
];

const source = fs.readFileSync(workbenchPath, 'utf8');
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

for (const t of targets) {
  const mapping = merged.find((entry) => entry.originalText === t);
  const double = (source.match(new RegExp(`"${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g')) || []).length;
  const single = (source.match(new RegExp(`'${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`, 'g')) || []).length;
  console.log(JSON.stringify({ target: t, hasMapping: Boolean(mapping), changeText: mapping?.changeText, double, single }));
}
