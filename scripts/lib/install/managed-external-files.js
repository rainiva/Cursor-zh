const fs = require('fs');
const path = require('path');

function getManagedExtensionTranslationFiles(context, { extensionOverlayPath, fs: fsModule } = {}) {
  const fsRef = fsModule || fs;
  const extensionsDir = path.join(context.paths.resourcesAppDir, 'extensions');

  if (extensionOverlayPath && fsRef.existsSync(extensionOverlayPath)) {
    const overlay = JSON.parse(fsRef.readFileSync(extensionOverlayPath, 'utf8'));
    return Object.keys(overlay)
      .map((extensionDirName) => {
        const extensionDir = path.join(extensionsDir, extensionDirName);
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

  // Fallback: overlay missing — scan extensions dir for residual zh-cn files
  if (!fsRef.existsSync(extensionsDir)) {
    return [];
  }

  const results = [];
  for (const entry of fsRef.readdirSync(extensionsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const zhCnPath = path.join(extensionsDir, entry.name, 'package.nls.zh-cn.json');
    if (fsRef.existsSync(zhCnPath)) {
      results.push({
        kind: 'extensionTranslation',
        targetPath: zhCnPath,
        backupRelativePath: path.join(
          'external',
          'extensions',
          entry.name,
          'package.nls.zh-cn.json'
        ),
      });
    }
  }
  return results;
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
