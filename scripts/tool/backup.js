const fs = require('fs');
const path = require('path');
const { listBackupInstallAbsolutePaths } = require('../lib/install/managed-install-artifacts.js');
const {
  getManagedExtensionTranslationFiles,
  getManagedExternalFiles: getManagedExternalFilesFromRegistry,
} = require('../lib/install/managed-external-files.js');

function createBackupModule({
  toolPaths,
  ensureDir,
  readJson,
  writeJson,
  timestampLabel,
  sha256OfFile,
}) {
  function buildPackageJsonBackup(packageJsonPath) {
    const backupPackage = { ...readJson(packageJsonPath) };

    if (backupPackage.main === './out/cursorTranslatorMain.js') {
      backupPackage.main = backupPackage.main_original || './out/main.js';
    }

    if (Object.prototype.hasOwnProperty.call(backupPackage, 'main_original')) {
      delete backupPackage.main_original;
    }

    return backupPackage;
  }

  function getManagedExternalFiles(context) {
    return getManagedExternalFilesFromRegistry(context, {
      extensionOverlayPath: toolPaths.extensionOverlayPath,
      fs,
    });
  }

  function ensureBackup(context, options = {}) {
    const seedOverlayFiles = options.seedOverlayFiles || (() => {});
    const backupDir = path.join(toolPaths.backupRoot, timestampLabel());
    ensureDir(backupDir);
    seedOverlayFiles();

    const filesToBackup = listBackupInstallAbsolutePaths(context, fs).filter(
      (filePath) => filePath && fs.existsSync(filePath)
    );

    for (const filePath of filesToBackup) {
      const relativePath = path.relative(context.paths.installDir, filePath);
      const targetPath = path.join(backupDir, relativePath);
      ensureDir(path.dirname(targetPath));

      if (filePath === context.paths.packageJsonPath) {
        writeJson(targetPath, buildPackageJsonBackup(filePath));
        continue;
      }

      fs.copyFileSync(filePath, targetPath);
    }

    const externalFiles = getManagedExternalFiles(context).map((entry) => {
      const nextEntry = {
        kind: entry.kind,
        targetPath: entry.targetPath,
        backupRelativePath: entry.backupRelativePath,
        existed: fs.existsSync(entry.targetPath),
      };

      if (nextEntry.existed) {
        const backupTargetPath = path.join(backupDir, entry.backupRelativePath);
        ensureDir(path.dirname(backupTargetPath));
        fs.copyFileSync(entry.targetPath, backupTargetPath);
      }

      return nextEntry;
    });

    const packageBackupPath = path.join(backupDir, 'resources', 'app', 'package.json');
    const nlsBackupPath = path.join(backupDir, 'resources', 'app', 'out', 'nls.messages.json');
    const installedPackageVersion = fs.existsSync(context.paths.packageJsonPath)
      ? readJson(context.paths.packageJsonPath).version
      : null;
    const snapshot = {
      installDir: context.paths.installDir,
      cursorVersion: options.cursorVersion ?? installedPackageVersion ?? null,
      createdAt: new Date().toISOString(),
      hashes: {},
    };

    if (fs.existsSync(packageBackupPath) && sha256OfFile) {
      snapshot.hashes.packageJson = sha256OfFile(packageBackupPath);
    }
    if (fs.existsSync(nlsBackupPath) && sha256OfFile) {
      snapshot.hashes.nlsMessages = sha256OfFile(nlsBackupPath);
    }

    writeJson(path.join(backupDir, 'backup-metadata.json'), {
      externalFiles,
      snapshot,
    });

    return backupDir;
  }

  return {
    getManagedExtensionTranslationFiles: (context) =>
      getManagedExtensionTranslationFiles(context, {
        extensionOverlayPath: toolPaths.extensionOverlayPath,
        fs,
      }),
    getManagedExternalFiles,
    ensureBackup,
  };
}

module.exports = {
  createBackupModule,
};
