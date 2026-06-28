const fs = require('fs');
const path = require('path');

function getManagedExtensionTranslationFiles(context, { extensionOverlayPath, fs: fsModule } = {}) {
  const fsRef = fsModule || fs;
  if (!extensionOverlayPath || !fsRef.existsSync(extensionOverlayPath)) {
    return [];
  }

  const overlay = JSON.parse(fsRef.readFileSync(extensionOverlayPath, 'utf8'));
  return Object.keys(overlay)
    .map((extensionDirName) => {
      const extensionDir = path.join(
        context.paths.resourcesAppDir,
        'extensions',
        extensionDirName
      );
      if (!fsRef.existsSync(extensionDir)) {
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

function getManagedExternalFiles(context, deps = {}) {
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

  return files.concat(getManagedExtensionTranslationFiles(context, deps));
}

function unionExternalFileEntries(metadataEntries = [], registryEntries = []) {
  const byTargetPath = new Map();

  for (const entry of metadataEntries) {
    if (!entry?.targetPath) {
      continue;
    }
    byTargetPath.set(entry.targetPath, { ...entry });
  }

  for (const entry of registryEntries) {
    if (!entry?.targetPath) {
      continue;
    }
    const existing = byTargetPath.get(entry.targetPath);
    byTargetPath.set(entry.targetPath, {
      ...entry,
      ...existing,
      kind: existing?.kind || entry.kind,
      backupRelativePath: existing?.backupRelativePath || entry.backupRelativePath,
      existed: existing?.existed ?? false,
    });
  }

  return [...byTargetPath.values()].sort((left, right) =>
    left.targetPath.localeCompare(right.targetPath)
  );
}

module.exports = {
  getManagedExtensionTranslationFiles,
  getManagedExternalFiles,
  unionExternalFileEntries,
};
