const fs = require('fs');
const path = require('path');
const { listWorkbenchBundles } = require('../../lib/patcher/workbench-bundles.js');

function createBootstrapBuilderModule({ writeText }) {
  function isTranslatorBootstrapSource(text) {
    return typeof text === 'string' && text.includes('WORKBENCH_REDIRECTS');
  }

  function resolvePackageType(resourcesAppDir, explicitPackageType) {
    if (typeof explicitPackageType === 'string' && explicitPackageType.length > 0) {
      return explicitPackageType;
    }

    if (!resourcesAppDir || !fs.existsSync(resourcesAppDir)) {
      return null;
    }

    const packageJsonPath = path.join(resourcesAppDir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return null;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      return typeof packageJson.type === 'string' ? packageJson.type : null;
    } catch {
      return null;
    }
  }

  function createBootstrapSource(options = {}) {
    const { resourcesAppDir, packageType } = options;
    const bundleOptions =
      resourcesAppDir && fs.existsSync(resourcesAppDir)
        ? { resourcesAppDir, fs }
        : {};
    const redirects = listWorkbenchBundles(bundleOptions).map((bundle) => ({
      target: bundle.targetFilename,
      translated: bundle.translatedFilename,
    }));
    const useEsmBootstrap = resolvePackageType(resourcesAppDir, packageType) === 'module';

    return [
      ...(useEsmBootstrap
        ? [
            "import { app, session } from 'electron';",
            "import { basename, dirname, join } from 'node:path';",
            "import { existsSync } from 'node:fs';",
            "import { fileURLToPath } from 'node:url';",
          ]
        : [
            "const { app, session } = require('electron');",
            "const { basename, dirname, join } = require('node:path');",
            "const { existsSync } = require('node:fs');",
          ]),
      '',
      `const WORKBENCH_REDIRECTS = ${JSON.stringify(redirects)};`,
      "const MAIN_TRANSLATED_FILENAME = 'main_translated.js';",
      "const TARGET_SCHEME = 'vscode-file';",
      useEsmBootstrap
        ? 'const BOOTSTRAP_DIR = dirname(fileURLToPath(import.meta.url));'
        : 'const BOOTSTRAP_DIR = __dirname;',
      'const MAIN_ENTRY = existsSync(join(BOOTSTRAP_DIR, MAIN_TRANSLATED_FILENAME))',
      "  ? './main_translated.js'",
      "  : './main.js';",
      '',
      'function toVscodePath(url) {',
      '  try {',
      '    if (typeof url !== "string") return null;',
      '    const parsed = new URL(url);',
      '    if (parsed.protocol !== `${TARGET_SCHEME}:`) return null;',
      '    let pathname = decodeURIComponent(parsed.pathname);',
      "    if (process.platform === 'win32' && pathname.startsWith('/') && pathname[2] === ':') {",
      '      pathname = pathname.slice(1);',
      '    }',
      '    return pathname;',
      '  } catch {',
      '    return null;',
      '  }',
      '}',
      '',
      'function findRedirect(filePath) {',
      '  if (!filePath) return null;',
      '  const filename = basename(filePath);',
      '  return WORKBENCH_REDIRECTS.find((entry) => entry.target === filename) || null;',
      '}',
      '',
      'function translatedUrl(url, redirect) {',
      '  try {',
      '    const parsed = new URL(url);',
      '    const nextPath = join(dirname(parsed.pathname), redirect.translated).replace(/\\\\/g, "/");',
      '    parsed.pathname = nextPath;',
      '    return parsed.toString();',
      '  } catch {',
      '    return url;',
      '  }',
      '}',
      '',
      'function shouldRedirect(filePath) {',
      '  const redirect = findRedirect(filePath);',
      '  if (!redirect) return false;',
      '  return existsSync(join(dirname(filePath), redirect.translated));',
      '}',
      '',
      'function installRedirect() {',
      '  const original = session.defaultSession.protocol.registerFileProtocol;',
      '  session.defaultSession.protocol.registerFileProtocol = function patchedRegister(scheme, handler) {',
      '    if (scheme !== TARGET_SCHEME) {',
      '      return original.call(this, scheme, handler);',
      '    }',
      '',
      '    return original.call(this, scheme, (request, callback) => {',
      '      const filePath = toVscodePath(request.url);',
      '      const redirect = findRedirect(filePath);',
      '      if (!redirect || !shouldRedirect(filePath)) {',
      '        return handler(request, callback);',
      '      }',
      '',
      '      return handler({ ...request, url: translatedUrl(request.url, redirect) }, callback);',
      '    });',
      '  };',
      '}',
      '',
      'function installRuntimeHandlers() {',
      '  installRedirect();',
      '}',
      '',
      'if (app.isReady()) installRuntimeHandlers();',
      'else app.whenReady().then(installRuntimeHandlers);',
      '',
      useEsmBootstrap ? 'await import(MAIN_ENTRY);' : 'require(MAIN_ENTRY);',
      '',
    ].join('\n');
  }

  function writeTranslatorBootstrap(context) {
    writeText(
      context.paths.translatorBootstrapPath,
      createBootstrapSource({ resourcesAppDir: context.paths.resourcesAppDir })
    );
  }

  return {
    isTranslatorBootstrapSource,
    createBootstrapSource,
    writeTranslatorBootstrap,
  };
}

module.exports = {
  createBootstrapBuilderModule,
};
