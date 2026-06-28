const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  DESKTOP_WORKBENCH_BUNDLE,
  GLASS_WORKBENCH_BUNDLE,
  resolveWorkbenchBundlePaths,
  listWorkbenchBundles,
} = require('../../lib/patcher/workbench-bundles.js');

test('listWorkbenchBundles includes desktop, glass, and auxiliary bundle specs', () => {
  const bundles = listWorkbenchBundles();
  assert.deepEqual(
    bundles.map((entry) => entry.id),
    ['desktop', 'glass', 'automations']
  );
  assert.equal(DESKTOP_WORKBENCH_BUNDLE.targetFilename, 'workbench.desktop.main.js');
  assert.equal(GLASS_WORKBENCH_BUNDLE.targetFilename, 'workbench.glass.main.js');
});

test('resolveWorkbenchBundlePaths maps bundle filenames under workbench dir', () => {
  const resourcesAppDir = path.join('C:', 'cursor', 'resources', 'app');
  const paths = resolveWorkbenchBundlePaths(resourcesAppDir, GLASS_WORKBENCH_BUNDLE);

  assert.equal(
    paths.originalPath,
    path.join(resourcesAppDir, 'out', 'vs', 'workbench', 'workbench.glass.main.js')
  );
  assert.equal(
    paths.translatedPath,
    path.join(
      resourcesAppDir,
      'out',
      'vs',
      'workbench',
      'workbench.glass.main_translated.js'
    )
  );
});
