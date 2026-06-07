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

  assert.equal(merged.length, 2);
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
