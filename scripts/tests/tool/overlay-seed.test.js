const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { mergeMappings } = require('../../cursor-zh-lib.js');
const { createToolPaths } = require('../../tool/paths.js');
const { ensureDir, readJson, readJsonIfExists, writeJson } = require('../../tool/io.js');
const { createOverlaySeedModule } = require('../../tool/overlay-seed.js');

test('syncJsonArrayFileWithDefaults preserves existing overlay entries', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-overlay-'));
  const toolPaths = createToolPaths(workspaceRoot);
  const { syncJsonArrayFileWithDefaults } = createOverlaySeedModule({
    toolPaths,
    ensureDir,
    readJsonIfExists,
    writeJson,
    mergeMappings,
    readDefaultMappings: () => [
      { originalText: 'A', changeText: '甲', searchType: 'exact' },
    ],
  });

  writeJson(toolPaths.overlayMappingPath, [
    { originalText: 'B', changeText: '乙', searchType: 'exact' },
  ]);

  const merged = syncJsonArrayFileWithDefaults(toolPaths.overlayMappingPath, [
    { originalText: 'A', changeText: '甲', searchType: 'exact' },
  ]);

  // 源文件为权威：已存在的 overlay 不再合并 defaults（防复活已删除条目）。
  assert.equal(merged.length, 1);
  assert.equal(merged[0].originalText, 'B');
  assert.deepEqual(readJson(toolPaths.overlayMappingPath), merged);
});

test('seedOverlayFiles ensures overlay directory and default extension overlay', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-overlay-'));
  const toolPaths = createToolPaths(workspaceRoot);
  const { seedOverlayFiles } = createOverlaySeedModule({
    toolPaths,
    ensureDir,
    readJsonIfExists,
    writeJson,
    mergeMappings,
    readDefaultMappings: (fileName) => {
      if (fileName === 'workbench.overlay.json') {
        return [{ originalText: 'Save', changeText: '保存', searchType: 'exact' }];
      }
      return [];
    },
  });

  seedOverlayFiles();

  assert.ok(fs.existsSync(toolPaths.translationOverlayDir));
  assert.ok(fs.existsSync(toolPaths.extensionOverlayPath));
  assert.ok(Array.isArray(readJson(toolPaths.overlayMappingPath)));
});

test('syncJsonArrayFileWithDefaults skips write when merged content is unchanged', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-overlay-skip-'));
  const toolPaths = createToolPaths(workspaceRoot);
  const { syncJsonArrayFileWithDefaults } = createOverlaySeedModule({
    toolPaths,
    ensureDir,
    readJsonIfExists,
    writeJson,
    mergeMappings,
    readDefaultMappings: () => [
      { originalText: 'A', changeText: '甲', searchType: 'exact' },
    ],
  });

  const defaults = [{ originalText: 'A', changeText: '甲', searchType: 'exact' }];
  syncJsonArrayFileWithDefaults(toolPaths.overlayMappingPath, defaults);
  const firstMtime = fs.statSync(toolPaths.overlayMappingPath).mtimeMs;

  syncJsonArrayFileWithDefaults(toolPaths.overlayMappingPath, defaults);
  const secondMtime = fs.statSync(toolPaths.overlayMappingPath).mtimeMs;

  assert.equal(firstMtime, secondMtime);
});

test('syncJsonArrayFileWithDefaults never rewrites existing overlay files (no resurrection / no annotation persistence)', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-overlay-noresurrect-'));
  const toolPaths = createToolPaths(workspaceRoot);
  const { syncJsonArrayFileWithDefaults } = createOverlaySeedModule({
    toolPaths,
    ensureDir,
    readJsonIfExists,
    writeJson,
    mergeMappings,
    readDefaultMappings: () => [],
  });

  // 模拟 QA 复现场景：overlay 源文件已删除某死词条，而 defaults 快照仍残留该条目；
  // 同时含一条 forceRuntime:false 的 L3 词条（D6 staticPreferred 注记候选）。
  const existing = [
    {
      originalText: 'Ask Mode',
      changeText: '问答模式',
      searchType: 'exact',
      surface: 'command_palette',
      forceRuntime: false,
    },
  ];
  writeJson(toolPaths.cursorWinCommonPath, existing);
  const before = fs.readFileSync(toolPaths.cursorWinCommonPath, 'utf8');

  const result = syncJsonArrayFileWithDefaults(toolPaths.cursorWinCommonPath, [
    { originalText: 'Deleted Dead Entry', changeText: '已删除死词条', searchType: 'exact' },
  ]);

  // 源文件为权威：defaults 残留条目不得复活，内存态注记不得持久化回源文件。
  assert.equal(fs.readFileSync(toolPaths.cursorWinCommonPath, 'utf8'), before);
  assert.deepEqual(result, existing);
});

test('syncJsonArrayFileWithDefaults applies forceRuntime for L3 surface defaults', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-overlay-l3-'));
  const toolPaths = createToolPaths(workspaceRoot);
  const { syncJsonArrayFileWithDefaults } = createOverlaySeedModule({
    toolPaths,
    ensureDir,
    readJsonIfExists,
    writeJson,
    mergeMappings,
    readDefaultMappings: () => [],
  });

  const merged = syncJsonArrayFileWithDefaults(toolPaths.cursorWinCommonPath, [
    {
      originalText: 'Palette Entry',
      changeText: '面板项',
      searchType: 'exact',
      surface: 'command_palette',
    },
  ]);

  assert.equal(merged[0].forceRuntime, true);
});
