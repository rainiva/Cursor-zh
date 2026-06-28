const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  AUTOMATIONS_WORKBENCH_BUNDLE,
  listAuxiliaryWorkbenchBundles,
  listWorkbenchBundles,
  resolveWorkbenchBundlePaths,
} = require('../../lib/patcher/workbench-bundles.js');
const { generateAuxiliaryWorkbenchChunks } = require('../../lib/patcher/auxiliary-chunks.js');

test('listAuxiliaryWorkbenchBundles includes automations lazy chunk', () => {
  const bundles = listAuxiliaryWorkbenchBundles();
  assert.deepEqual(
    bundles.map((entry) => entry.id),
    ['automations']
  );
  assert.equal(
    AUTOMATIONS_WORKBENCH_BUNDLE.targetFilename,
    'workbench.anysphere-ui-automations.js'
  );
});

test('listWorkbenchBundles includes auxiliary chunks for bootstrap redirect', () => {
  const ids = listWorkbenchBundles().map((entry) => entry.id);
  assert.deepEqual(ids, ['desktop', 'glass', 'automations']);
});

test('generateAuxiliaryWorkbenchChunks writes static translated auxiliary bundles', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-aux-'));
  const workbenchDir = path.join(tempDir, 'resources', 'app', 'out', 'vs', 'workbench');
  fs.mkdirSync(workbenchDir, { recursive: true });

  const bundlePaths = resolveWorkbenchBundlePaths(path.join(tempDir, 'resources', 'app'), {
    ...AUTOMATIONS_WORKBENCH_BUNDLE,
  });
  fs.writeFileSync(
    bundlePaths.originalPath,
    'const hub={label:"Total Automations",empty:"No Automations Yet"};',
    'utf8'
  );

  const generated = generateAuxiliaryWorkbenchChunks({
    resourcesAppDir: path.join(tempDir, 'resources', 'app'),
    mappings: [
      { searchType: 'exact', originalText: 'Total Automations', changeText: '自动化总数' },
      { searchType: 'exact', originalText: 'No Automations Yet', changeText: '暂无自动化' },
    ],
    readText: (filePath) => fs.readFileSync(filePath, 'utf8'),
    writeText: (filePath, contents) => fs.writeFileSync(filePath, contents, 'utf8'),
    existsSync: (filePath) => fs.existsSync(filePath),
  });

  assert.equal(generated.length, 1);
  assert.equal(generated[0].bundle.id, 'automations');
  const translated = fs.readFileSync(bundlePaths.translatedPath, 'utf8');
  assert.match(translated, /自动化总数/);
  assert.match(translated, /暂无自动化/);
  assert.doesNotMatch(translated, /Total Automations/);
});

test('generateAuxiliaryWorkbenchChunks auto-discovers new lazy chunks from install dir', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-aux-discover-'));
  const resourcesAppDir = path.join(tempDir, 'resources', 'app');
  const workbenchDir = path.join(resourcesAppDir, 'out', 'vs', 'workbench');
  fs.mkdirSync(workbenchDir, { recursive: true });

  const originalPath = path.join(workbenchDir, 'workbench.anysphere-ui-foo.js');
  const translatedPath = path.join(workbenchDir, 'workbench.anysphere-ui-foo_translated.js');
  fs.writeFileSync(originalPath, 'const card={title:"Extend Cursor with Plugins"};', 'utf8');

  const generated = generateAuxiliaryWorkbenchChunks({
    resourcesAppDir,
    mappings: [
      {
        searchType: 'exact',
        originalText: 'Extend Cursor with Plugins',
        changeText: '用插件扩展 Cursor',
      },
    ],
    readText: (filePath) => fs.readFileSync(filePath, 'utf8'),
    writeText: (filePath, contents) => fs.writeFileSync(filePath, contents, 'utf8'),
    existsSync: (filePath) => fs.existsSync(filePath),
    fs,
  });

  assert.equal(generated.length, 1);
  assert.equal(generated[0].bundle.id, 'anysphere-ui-foo');
  const translated = fs.readFileSync(translatedPath, 'utf8');
  assert.match(translated, /用插件扩展 Cursor/);
});
