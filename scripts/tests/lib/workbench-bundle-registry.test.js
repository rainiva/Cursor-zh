const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  discoverWorkbenchBundles,
  listHarvestBundleRelativePaths,
  bundleEntryFromFilename,
} = require('../../lib/patcher/workbench-bundle-registry.js');
const {
  DESKTOP_WORKBENCH_BUNDLE,
  GLASS_WORKBENCH_BUNDLE,
} = require('../../lib/patcher/workbench-bundle-registry.js');

function createRegistryFixture(tempRoot, filenames) {
  const resourcesAppDir = path.join(tempRoot, 'resources', 'app');
  const workbenchDir = path.join(resourcesAppDir, 'out', 'vs', 'workbench');
  fs.mkdirSync(workbenchDir, { recursive: true });
  for (const filename of filenames) {
    fs.writeFileSync(path.join(workbenchDir, filename), `label:"${filename}"`, 'utf8');
  }
  return resourcesAppDir;
}

test('discoverWorkbenchBundles always includes desktop and glass primary bundles', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-registry-'));
  const resourcesAppDir = createRegistryFixture(tempRoot, [
    'workbench.desktop.main.js',
    'workbench.glass.main.js',
  ]);

  const bundles = discoverWorkbenchBundles(resourcesAppDir, { fs });
  const ids = bundles.map((entry) => entry.id);

  assert.ok(ids.includes('desktop'));
  assert.ok(ids.includes('glass'));
  assert.equal(bundles.find((entry) => entry.id === 'desktop').targetFilename, DESKTOP_WORKBENCH_BUNDLE.targetFilename);
  assert.equal(bundles.find((entry) => entry.id === 'glass').targetFilename, GLASS_WORKBENCH_BUNDLE.targetFilename);
});

test('discoverWorkbenchBundles discovers automations and mock lazy chunks', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-registry-'));
  const resourcesAppDir = createRegistryFixture(tempRoot, [
    'workbench.desktop.main.js',
    'workbench.glass.main.js',
    'workbench.anysphere-ui-automations.js',
    'workbench.anysphere-ui-foo.js',
    'workbench.desktop.main_translated.js',
    'vendor.js',
  ]);

  const bundles = discoverWorkbenchBundles(resourcesAppDir, { fs });
  const filenames = bundles.map((entry) => entry.targetFilename);

  assert.ok(filenames.includes('workbench.anysphere-ui-automations.js'));
  assert.ok(filenames.includes('workbench.anysphere-ui-foo.js'));
  assert.ok(!filenames.includes('workbench.desktop.main_translated.js'));
  assert.ok(!filenames.includes('vendor.js'));
});

test('listHarvestBundleRelativePaths matches discovered bundle originals', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-registry-harvest-'));
  const resourcesAppDir = createRegistryFixture(tempRoot, [
    'workbench.desktop.main.js',
    'workbench.glass.main.js',
    'workbench.anysphere-ui-automations.js',
  ]);

  const harvestPaths = listHarvestBundleRelativePaths(resourcesAppDir, { fs });
  assert.deepEqual(harvestPaths.sort(), [
    'workbench.anysphere-ui-automations.js',
    'workbench.desktop.main.js',
    'workbench.glass.main.js',
  ]);
});

test('bundleEntryFromFilename builds translated filename and stable id', () => {
  assert.deepEqual(bundleEntryFromFilename('workbench.anysphere-ui-foo.js'), {
    id: 'anysphere-ui-foo',
    targetFilename: 'workbench.anysphere-ui-foo.js',
    translatedFilename: 'workbench.anysphere-ui-foo_translated.js',
    optional: true,
    discovered: true,
  });
  assert.equal(bundleEntryFromFilename('workbench.anysphere-ui-automations.js').id, 'automations');
});
