const { applyStaticSourceTranslations } = require('./static');
const {
  listAuxiliaryWorkbenchBundles,
  resolveWorkbenchBundlePaths,
} = require('./workbench-bundles');

function generateAuxiliaryWorkbenchChunks({
  resourcesAppDir,
  mappings,
  readText,
  writeText,
  existsSync,
  fs: fsModule,
}) {
  const fsRef = fsModule || require('fs');
  const results = [];

  for (const bundle of listAuxiliaryWorkbenchBundles({
    resourcesAppDir,
    fs: fsRef,
  })) {
    const bundlePaths = resolveWorkbenchBundlePaths(resourcesAppDir, bundle);
    if (!existsSync(bundlePaths.originalPath)) {
      continue;
    }

    const source = readText(bundlePaths.originalPath);
    const translatedSource = applyStaticSourceTranslations(source, mappings);
    if (typeof writeText === 'function') {
      writeText(bundlePaths.translatedPath, translatedSource);
    }
    results.push({ bundle, bundlePaths, translatedSource });
  }

  return results;
}

module.exports = {
  generateAuxiliaryWorkbenchChunks,
};
