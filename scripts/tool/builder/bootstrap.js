const { listWorkbenchBundles } = require('../../lib/patcher/workbench-bundles.js');

function createBootstrapBuilderModule({ writeText }) {
  function isTranslatorBootstrapSource(text) {
    return typeof text === 'string' && text.includes('WORKBENCH_REDIRECTS');
  }

  function createBootstrapSource() {
    const redirects = listWorkbenchBundles().map((bundle) => ({
      target: bundle.targetFilename,
      translated: bundle.translatedFilename,
    }));

    return [
      "import { app, session } from 'electron';",
      "import { basename, dirname, join } from 'node:path';",
      "import { existsSync } from 'node:fs';",
      "import { fileURLToPath } from 'node:url';",
      '',
      `const WORKBENCH_REDIRECTS = ${JSON.stringify(redirects)};`,
      "const MAIN_TRANSLATED_FILENAME = 'main_translated.js';",
      "const TARGET_SCHEME = 'vscode-file';",
      'const BOOTSTRAP_DIR = dirname(fileURLToPath(import.meta.url));',
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
      'await import(MAIN_ENTRY);',
      '',
    ].join('\n');
  }

  function writeTranslatorBootstrap(context) {
    writeText(context.paths.translatorBootstrapPath, createBootstrapSource());
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
