const path = require('path');

const {
  DESKTOP_WORKBENCH_BUNDLE,
  GLASS_WORKBENCH_BUNDLE,
  AUTOMATIONS_WORKBENCH_BUNDLE,
  listPrimaryWorkbenchBundles,
  listAuxiliaryWorkbenchBundles,
  listWorkbenchBundles,
  discoverWorkbenchBundles,
  listHarvestBundleRelativePaths,
} = require('./workbench-bundle-registry');

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
  AUTOMATIONS_WORKBENCH_BUNDLE,
  listPrimaryWorkbenchBundles,
  listAuxiliaryWorkbenchBundles,
  listWorkbenchBundles,
  discoverWorkbenchBundles,
  listHarvestBundleRelativePaths,
  resolveWorkbenchBundlePaths,
  resolveWorkbenchBundlePathsForContext,
};
