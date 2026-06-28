const path = require('path');
const {
  listInjectedInstallAbsolutePaths,
  listInjectedInstallRelativePaths,
  collectUninstallWarnings,
} = require('../lib/install/managed-install-artifacts.js');

function collectUninstallTargets({
  installDir,
  toolPaths,
  fs,
  readJsonIfExists,
  loadInstallMetadata,
  context,
}) {
  const resourcesAppDir = path.join(installDir, 'resources', 'app');
  const manifest = readJsonIfExists(toolPaths.buildManifestPath, null);
  const installMetadata = loadInstallMetadata(context);

  const deletePaths = new Set(
    listInjectedInstallAbsolutePaths(resourcesAppDir, fs).filter((filePath) =>
      fs.existsSync(filePath)
    )
  );

  if (Array.isArray(manifest?.injectedPaths)) {
    for (const relativePath of manifest.injectedPaths) {
      deletePaths.add(path.join(installDir, ...String(relativePath).split('/')));
    }
  }

  return {
    deletePaths: [...deletePaths].sort((left, right) => left.localeCompare(right)),
    warnings: collectUninstallWarnings(manifest, installMetadata),
  };
}

module.exports = {
  collectUninstallTargets,
};
