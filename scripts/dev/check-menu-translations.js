const fs = require('fs');
const { createWorkbenchIndex } = require('../lib/patcher/workbench-index.js');
const { sourceHasQuotedLiteral } = require('../lib/patcher/runtime-selector.js');
const { applyStaticSourceTranslations } = require('../lib/patcher/static.js');
const { readJsonIfExists } = require('../tool/io.js');
const { createToolPaths } = require('../tool/paths.js');
const { mergeMappings } = require('../cursor-zh-lib.js');
const path = require('path');

const workbenchPath =
  process.argv[2] ||
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js';

if (!fs.existsSync(workbenchPath)) {
  console.error('missing', workbenchPath);
  process.exit(1);
}

const source = fs.readFileSync(workbenchPath, 'utf8');
const index = createWorkbenchIndex(source);
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

const targets = [
  'File',
  'Edit',
  'View',
  'Help',
  'Pin',
  'Rename',
  'Mark as Unread',
  'Archive',
  'Split',
  'Fork Chat',
  'Export Chat',
  '复制',
];

console.log('=== detection ===');
for (const t of targets) {
  const mapping = merged.find((entry) => entry.originalText === t);
  console.log(JSON.stringify({
    target: t,
    hasMapping: Boolean(mapping),
    changeText: mapping?.changeText,
    index: index.hasQuotedLiteral(t),
    sourceHas: sourceHasQuotedLiteral(source, t, index),
  }));
}

console.log('=== static apply sample ===');
const translated = applyStaticSourceTranslations(source, merged, index);
for (const t of ['File', 'Edit', 'View', 'Help', 'Fork Chat']) {
  const mapping = merged.find((entry) => entry.originalText === t);
  if (!mapping) continue;
  const quoted = new RegExp(`(['"\`])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\1`);
  const before = (source.match(quoted) || []).length;
  const after = (translated.match(new RegExp(`(['"\`])${mapping.changeText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\1`, 'g')) || []).length;
  console.log(t, 'before', before, 'afterTranslated', after);
}
