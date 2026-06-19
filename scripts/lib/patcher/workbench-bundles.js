const path = require('path');

const DESKTOP_WORKBENCH_BUNDLE = {
  id: 'desktop',
  targetFilename: 'workbench.desktop.main.js',
  translatedFilename: 'workbench.desktop.main_translated.js',
};

const GLASS_WORKBENCH_BUNDLE = {
  id: 'glass',
  targetFilename: 'workbench.glass.main.js',
  translatedFilename: 'workbench.glass.main_translated.js',
};

function listWorkbenchBundles() {
  return [DESKTOP_WORKBENCH_BUNDLE, GLASS_WORKBENCH_BUNDLE];
}

function resolveWorkbenchBundlePaths(resourcesAppDir, bundle) {
  const workbenchDir = path.join(resourcesAppDir, 'out', 'vs', 'workbench');
  return {
    originalPath: path.join(workbenchDir, bundle.targetFilename),
    translatedPath: path.join(workbenchDir, bundle.translatedFilename),
  };
}

function resolveWorkbenchBundlePathsForContext(context, bundle) {
  return resolveWorkbenchBundlePaths(context.paths.resourcesAppDir, bundle);
}

module.exports = {
  DESKTOP_WORKBENCH_BUNDLE,
  GLASS_WORKBENCH_BUNDLE,
  listWorkbenchBundles,
  resolveWorkbenchBundlePaths,
  resolveWorkbenchBundlePathsForContext,
};
