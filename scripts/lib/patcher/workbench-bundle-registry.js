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

const AUTOMATIONS_WORKBENCH_BUNDLE = {
  id: 'automations',
  targetFilename: 'workbench.anysphere-ui-automations.js',
  translatedFilename: 'workbench.anysphere-ui-automations_translated.js',
  optional: true,
};

const TRANSLATED_SUFFIX = '_translated.js';
const WORKBENCH_FILENAME_PATTERN = /^workbench.*\.js$/i;

function listPrimaryWorkbenchBundles() {
  return [DESKTOP_WORKBENCH_BUNDLE, GLASS_WORKBENCH_BUNDLE];
}

const KNOWN_BUNDLE_IDS = {
  'workbench.anysphere-ui-automations.js': 'automations',
};

function bundleEntryFromFilename(filename) {
  const baseName = filename.replace(/\.js$/i, '');
  const derivedId = baseName.replace(/^workbench\.?/i, '').replace(/\./g, '-') || 'workbench';
  const id = KNOWN_BUNDLE_IDS[filename] || derivedId;

  return {
    id,
    targetFilename: filename,
    translatedFilename: `${baseName}${TRANSLATED_SUFFIX}`,
    optional: true,
    discovered: true,
  };
}

function isDiscoverableWorkbenchFilename(filename) {
  if (typeof filename !== 'string' || !WORKBENCH_FILENAME_PATTERN.test(filename)) {
    return false;
  }

  if (filename.endsWith(TRANSLATED_SUFFIX)) {
    return false;
  }

  return true;
}

function walkWorkbenchFiles(workbenchDir, fs) {
  const files = [];

  function walk(currentDir) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(absolutePath);
        continue;
      }

      if (!isDiscoverableWorkbenchFilename(entry.name)) {
        continue;
      }

      files.push({
        filename: entry.name,
        absolutePath,
        relativePath: path.relative(workbenchDir, absolutePath).replace(/\\/g, '/'),
      });
    }
  }

  walk(workbenchDir);
  return files;
}

function discoverWorkbenchBundles(resourcesAppDir, { fs } = {}) {
  const primaryBundles = listPrimaryWorkbenchBundles();
  const byFilename = new Map(primaryBundles.map((bundle) => [bundle.targetFilename, bundle]));
  const workbenchDir = path.join(resourcesAppDir, 'out', 'vs', 'workbench');

  if (!fs?.existsSync(workbenchDir)) {
    return [...primaryBundles];
  }

  for (const file of walkWorkbenchFiles(workbenchDir, fs)) {
    if (byFilename.has(file.filename)) {
      continue;
    }

    byFilename.set(file.filename, {
      ...bundleEntryFromFilename(file.filename),
      relativePath: file.relativePath,
    });
  }

  const primaryOrder = primaryBundles.map((bundle) => bundle.targetFilename);
  const discoveredOrder = walkWorkbenchFiles(workbenchDir, fs)
    .map((file) => file.filename)
    .filter((filename) => !primaryOrder.includes(filename));

  return [
    ...primaryBundles,
    ...discoveredOrder.map((filename) => byFilename.get(filename)).filter(Boolean),
  ];
}

function listDiscoveredAuxiliaryBundles(resourcesAppDir, deps = {}) {
  const primaryIds = new Set(listPrimaryWorkbenchBundles().map((bundle) => bundle.id));
  return discoverWorkbenchBundles(resourcesAppDir, deps).filter(
    (bundle) => !primaryIds.has(bundle.id)
  );
}

function listAuxiliaryWorkbenchBundles(options = {}) {
  const { resourcesAppDir, fs } = options;
  if (resourcesAppDir && fs) {
    return listDiscoveredAuxiliaryBundles(resourcesAppDir, { fs });
  }

  return [AUTOMATIONS_WORKBENCH_BUNDLE];
}

function listWorkbenchBundles(options = {}) {
  const { resourcesAppDir, fs } = options;
  if (resourcesAppDir && fs) {
    return discoverWorkbenchBundles(resourcesAppDir, { fs });
  }

  return [...listPrimaryWorkbenchBundles(), ...listAuxiliaryWorkbenchBundles()];
}

function listHarvestBundleRelativePaths(resourcesAppDir, deps = {}) {
  return discoverWorkbenchBundles(resourcesAppDir, deps).map((bundle) => {
    if (bundle.relativePath) {
      return bundle.relativePath;
    }
    return bundle.targetFilename;
  });
}

module.exports = {
  DESKTOP_WORKBENCH_BUNDLE,
  GLASS_WORKBENCH_BUNDLE,
  AUTOMATIONS_WORKBENCH_BUNDLE,
  WORKBENCH_FILENAME_PATTERN,
  listPrimaryWorkbenchBundles,
  bundleEntryFromFilename,
  isDiscoverableWorkbenchFilename,
  discoverWorkbenchBundles,
  listDiscoveredAuxiliaryBundles,
  listAuxiliaryWorkbenchBundles,
  listWorkbenchBundles,
  listHarvestBundleRelativePaths,
};
