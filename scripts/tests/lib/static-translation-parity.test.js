const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');

function countQuoted(source, literal) {
  const escaped = literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (String(source).match(new RegExp(`(['"\`])${escaped}\\1`, 'g')) || []).length;
}

test('applyStaticSourceTranslations replaces File after regex literal desync snippet', () => {
  const source = 's.replace(/^["\']|["\']$/g,""),label:"File"';
  const mappings = [{ originalText: 'File', changeText: '文件', searchType: 'exact' }];
  const result = applyStaticSourceTranslations(source, mappings);
  assert.equal(countQuoted(result, 'File'), 0);
  assert.ok(countQuoted(result, '文件') >= 1);
});

test('applyStaticSourceTranslations reconciles all quoted menu literals on real workbench', () => {
  const workbenchPath =
    process.env.CURSOR_WORKBENCH_PATH ||
    'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js';

  if (!fs.existsSync(workbenchPath)) {
    return;
  }

  const source = fs.readFileSync(workbenchPath, 'utf8');
  const mappings = [
    { originalText: 'File', changeText: '文件', searchType: 'exact' },
    { originalText: 'Edit', changeText: '编辑', searchType: 'exact' },
    { originalText: 'View', changeText: '视图', searchType: 'exact' },
    { originalText: 'Help', changeText: '帮助', searchType: 'exact' },
    { originalText: 'Fork Chat', changeText: '分叉对话', searchType: 'exact' },
  ];

  const translated = applyStaticSourceTranslations(source, mappings);

  for (const entry of mappings) {
    const before = countQuoted(source, entry.originalText);
    const afterOriginal = countQuoted(translated, entry.originalText);
    const afterTranslated = countQuoted(translated, entry.changeText);
    assert.equal(
      afterOriginal,
      0,
      `${entry.originalText} still has ${afterOriginal} quoted literals (before ${before})`
    );
    assert.ok(
      afterTranslated >= before,
      `${entry.changeText} expected at least ${before} quoted literals, got ${afterTranslated}`
    );
  }
});

test('applyStaticSourceTranslations leaves no quoted File literals after full merged mappings on real workbench', () => {
  const fs = require('fs');
  const path = require('path');
  const { createWorkbenchIndex } = require('../../lib/patcher/workbench-index.js');
  const { readJsonIfExists } = require('../../tool/io.js');
  const { createToolPaths } = require('../../tool/paths.js');
  const { mergeMappings } = require('../../cursor-zh-lib.js');

  const workbenchPath =
    process.env.CURSOR_WORKBENCH_PATH ||
    'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js';

  if (!fs.existsSync(workbenchPath)) {
    return;
  }

  const source = fs.readFileSync(workbenchPath, 'utf8');
  const toolPaths = createToolPaths(path.join(__dirname, '../../..'));
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
  const fileMapping = mergedMappings.find((entry) => entry.originalText === 'File');

  assert.ok(fileMapping);
  assert.equal(countQuoted(translated, 'File'), 0);
  assert.ok(countQuoted(translated, fileMapping.changeText) > 0);
});
