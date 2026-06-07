const path = require('path');
const fs = require('fs');

function createExtensionBuilderModule({ toolPaths, readJson, writeJson }) {
  function writeExtensionTranslationFiles(context) {
    const overlay = readJson(toolPaths.extensionOverlayPath);
    const writtenFiles = [];

    for (const [extensionDirName, translations] of Object.entries(overlay)) {
      const extensionDir = path.join(
        context.paths.resourcesAppDir,
        'extensions',
        extensionDirName
      );

      if (!fs.existsSync(extensionDir)) {
        continue;
      }

      const targetFile = path.join(extensionDir, 'package.nls.zh-cn.json');
      writeJson(targetFile, translations);
      writtenFiles.push(targetFile);
    }

    return writtenFiles;
  }

  return {
    writeExtensionTranslationFiles,
  };
}

module.exports = {
  createExtensionBuilderModule,
};
