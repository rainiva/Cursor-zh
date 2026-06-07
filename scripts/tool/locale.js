function createLocaleModule({ readText, writeJson, parseJsonc, withLocaleSetting }) {
  const fs = require('fs');

  function readArgvConfig(argvPath) {
    if (!fs.existsSync(argvPath)) {
      return {};
    }
    return parseJsonc(readText(argvPath));
  }

  function writeLocaleFiles(context) {
    const argvConfig = readArgvConfig(context.paths.argvPath);
    const nextArgv = withLocaleSetting(argvConfig, 'zh-cn');
    writeJson(context.paths.argvPath, nextArgv);

    if (context.paths.userLocaleMirrorPath) {
      writeJson(context.paths.userLocaleMirrorPath, {
        locale: 'zh-cn',
        source: 'cursor-zh-tool',
      });
    }

    return nextArgv;
  }

  return {
    readArgvConfig,
    writeLocaleFiles,
  };
}

module.exports = {
  createLocaleModule,
};
