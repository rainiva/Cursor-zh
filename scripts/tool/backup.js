const fs = require('fs');
const path = require('path');

function createBackupModule({ toolPaths, ensureDir, readJson, writeJson, timestampLabel }) {
  function getManagedExtensionTranslationFiles(context) {
    if (!fs.existsSync(toolPaths.extensionOverlayPath)) {
      return [];
    }

    const overlay = readJson(toolPaths.extensionOverlayPath);
    return Object.keys(overlay)
      .map((extensionDirName) => {
        const extensionDir = path.join(
          context.paths.resourcesAppDir,
          'extensions',
          extensionDirName
        );
        if (!fs.existsSync(extensionDir)) {
          return null;
        }

        return {
          kind: 'extensionTranslation',
          targetPath: path.join(extensionDir, 'package.nls.zh-cn.json'),
          backupRelativePath: path.join(
            'external',
            'extensions',
            extensionDirName,
            'package.nls.zh-cn.json'
          ),
        };
      })
      .filter(Boolean);
  }

  function getManagedExternalFiles(context) {
    const files = [
      {
        kind: 'argv',
        targetPath: context.paths.argvPath,
        backupRelativePath: path.join('external', 'argv.json'),
      },
    ];

    if (context.paths.userLocaleMirrorPath) {
      files.push({
        kind: 'localeMirror',
        targetPath: context.paths.userLocaleMirrorPath,
        backupRelativePath: path.join('external', 'locale.json'),
      });
    }

    return files.concat(getManagedExtensionTranslationFiles(context));
  }

  function ensureBackup(context, options = {}) {
    const seedOverlayFiles = options.seedOverlayFiles || (() => {});
    const backupDir = path.join(toolPaths.backupRoot, timestampLabel());
    ensureDir(backupDir);
    seedOverlayFiles();

    const filesToBackup = [
      context.paths.mainTranslatedPath,
      context.paths.nlsMessagesPath,
      context.paths.packageJsonPath,
      context.paths.translatorBootstrapPath,
      context.paths.workbenchTranslatedPath,
    ].filter((filePath) => fs.existsSync(filePath));

    for (const filePath of filesToBackup) {
      const relativePath = path.relative(context.paths.installDir, filePath);
      const targetPath = path.join(backupDir, relativePath);
      ensureDir(path.dirname(targetPath));
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

    writeJson(path.join(backupDir, 'backup-metadata.json'), {
      externalFiles,
    });

    return backupDir;
  }

  return {
    getManagedExtensionTranslationFiles,
    getManagedExternalFiles,
    ensureBackup,
  };
}

module.exports = {
  createBackupModule,
};
