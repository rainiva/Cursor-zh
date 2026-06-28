const fs = require('fs');
const path = require('path');

const CORE_INJECTED_RELATIVE_PATHS = [
  'resources/app/out/cursorTranslatorMain.js',
  'resources/app/out/main_translated.js',
];

const RESTORE_FROM_BACKUP_RELATIVE_PATHS = [
  'resources/app/package.json',
  'resources/app/out/nls.messages.json',
];

const TRANSLATED_SUFFIX = '_translated.js';

function installDirFromResourcesAppDir(resourcesAppDir) {
  return path.dirname(path.dirname(resourcesAppDir));
}

function toInstallRelativePath(installDir, absolutePath) {
  return path.relative(installDir, absolutePath).replace(/\\/g, '/');
}

function walkWorkbenchTranslatedAbsolutePaths(workbenchDir, fsRef) {
  const files = [];

  function walk(currentDir) {
    for (const entry of fsRef.readdirSync(currentDir, { withFileTypes: true })) {
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(absolutePath);
        continue;
      }

      if (!entry.name.endsWith(TRANSLATED_SUFFIX)) {
        continue;
      }

      files.push(absolutePath);
    }
  }

  if (fsRef.existsSync(workbenchDir)) {
    walk(workbenchDir);
  }

  return files.sort((left, right) => left.localeCompare(right));
}

function walkWorkbenchTranslatedRelativePaths(resourcesAppDir, fsRef = fs) {
  const installDir = installDirFromResourcesAppDir(resourcesAppDir);
  const workbenchDir = path.join(resourcesAppDir, 'out', 'vs', 'workbench');

  return walkWorkbenchTranslatedAbsolutePaths(workbenchDir, fsRef).map((absolutePath) =>
    toInstallRelativePath(installDir, absolutePath)
  );
}

function listInjectedInstallRelativePaths(resourcesAppDir, fsRef = fs) {
  const installDir = installDirFromResourcesAppDir(resourcesAppDir);
  const relativePaths = new Set(CORE_INJECTED_RELATIVE_PATHS);

  for (const absolutePath of walkWorkbenchTranslatedAbsolutePaths(
    path.join(resourcesAppDir, 'out', 'vs', 'workbench'),
    fsRef
  )) {
    relativePaths.add(toInstallRelativePath(installDir, absolutePath));
  }

  return [...relativePaths].sort((left, right) => left.localeCompare(right));
}

function listInjectedInstallAbsolutePaths(resourcesAppDir, fsRef = fs) {
  const installDir = installDirFromResourcesAppDir(resourcesAppDir);
  return listInjectedInstallRelativePaths(resourcesAppDir, fsRef).map((relativePath) =>
    path.join(installDir, ...relativePath.split('/'))
  );
}

function listBackupInstallAbsolutePaths(context, fsRef = fs) {
  const { installDir, resourcesAppDir, packageJsonPath, nlsMessagesPath } = context.paths;
  const absolutePaths = new Set();

  for (const relativePath of RESTORE_FROM_BACKUP_RELATIVE_PATHS) {
    absolutePaths.add(path.join(installDir, ...relativePath.split('/')));
  }

  if (packageJsonPath) {
    absolutePaths.add(packageJsonPath);
  }
  if (nlsMessagesPath) {
    absolutePaths.add(nlsMessagesPath);
  }

  for (const absolutePath of listInjectedInstallAbsolutePaths(resourcesAppDir, fsRef)) {
    if (fsRef.existsSync(absolutePath)) {
      absolutePaths.add(absolutePath);
    }
  }

  return [...absolutePaths].sort((left, right) => left.localeCompare(right));
}

function collectUninstallWarnings(manifest, installMetadata) {
  const manifestVersion = manifest?.cursorVersion;
  const installedVersion = installMetadata?.pkg?.version;

  if (
    typeof manifestVersion === 'string' &&
    typeof installedVersion === 'string' &&
    manifestVersion !== installedVersion
  ) {
    return [
      `Cursor version changed since last apply (manifest ${manifestVersion}, installed ${installedVersion}). ` +
        'Uninstall will restore nls.messages.json from backup, which may not match the current install.',
    ];
  }

  return [];
}

function hasExistingInjectedArtifacts(deletePaths, fsRef = fs) {
  return (
    Array.isArray(deletePaths) &&
    deletePaths.some(
      (filePath) =>
        typeof filePath === 'string' && filePath.length > 0 && fsRef.existsSync(filePath)
    )
  );
}

module.exports = {
  CORE_INJECTED_RELATIVE_PATHS,
  RESTORE_FROM_BACKUP_RELATIVE_PATHS,
  TRANSLATED_SUFFIX,
  walkWorkbenchTranslatedRelativePaths,
  listInjectedInstallRelativePaths,
  listInjectedInstallAbsolutePaths,
  listBackupInstallAbsolutePaths,
  collectUninstallWarnings,
  hasExistingInjectedArtifacts,
};
