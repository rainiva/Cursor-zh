const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createToolPaths } = require('../../tool/paths.js');
const { createMappingsModule } = require('../../tool/mappings.js');
const { writeJson, readJsonIfExists } = require('../../tool/io.js');
const { mergeMappings } = require('../../cursor-zh-lib.js');

function createMapping(originalText, changeText) {
  return { originalText, changeText, searchType: 'exact' };
}

test('loadMergedMappings merges base overlay cursorWin and dynamic in order', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-mappings-'));
  const toolPaths = createToolPaths(workspaceRoot);

  writeJson(toolPaths.baseMappingPath, [createMapping('Base', '基')]);
  writeJson(toolPaths.overlayMappingPath, [createMapping('Overlay', '覆')]);
  writeJson(toolPaths.cursorWinCommonPath, [createMapping('Win', '窗')]);
  writeJson(toolPaths.dynamicMappingPath, [createMapping('Dynamic', '动')]);

  const seedOverlayFiles = () => {};
  const { loadMergedMappings } = createMappingsModule({
    toolPaths,
    fs,
    readText: () => '',
    writeJson,
    readJsonIfExists,
    mergeMappings,
    parseLegacyWorktreeMappings: () => [],
    seedOverlayFiles,
    asArray: (value) => (Array.isArray(value) ? value : []),
  });

  const context = {
    paths: {
      workbenchTranslatedPath: path.join(workspaceRoot, 'missing-workbench.js'),
    },
  };

  const result = loadMergedMappings(context, { seed: false });

  assert.equal(result.baseMappings.length, 1);
  assert.equal(result.overlayMappings.length, 1);
  assert.equal(result.cursorWinCommonMappings.length, 1);
  assert.equal(result.dynamicMappings.length, 1);
  assert.equal(result.mergedMappings.length, 4);
  assert.deepEqual(
    result.mergedMappings.map((entry) => entry.originalText),
    ['Base', 'Overlay', 'Win', 'Dynamic']
  );
});

test('loadMergedMappings calls seedOverlayFiles when seed is not false', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-mappings-'));
  const toolPaths = createToolPaths(workspaceRoot);
  let seeded = false;

  const { loadMergedMappings } = createMappingsModule({
    toolPaths,
    fs,
    readText: () => '',
    writeJson,
    readJsonIfExists,
    mergeMappings,
    parseLegacyWorktreeMappings: () => [],
    seedOverlayFiles: () => {
      seeded = true;
    },
    asArray: (value) => (Array.isArray(value) ? value : []),
  });

  loadMergedMappings(
    { paths: { workbenchTranslatedPath: path.join(workspaceRoot, 'missing.js') } },
    {}
  );

  assert.equal(seeded, true);
});
