function createBootstrapBuilderModule({ writeText }) {
  function isTranslatorBootstrapSource(text) {
    return typeof text === 'string' && text.includes('TARGET_FILENAME');
  }

  function createBootstrapSource() {
    return [
      "import { app, session } from 'electron';",
      "import { basename, dirname, join } from 'node:path';",
      "import { existsSync } from 'node:fs';",
      "import { fileURLToPath } from 'node:url';",
      '',
      "const TARGET_FILENAME = 'workbench.desktop.main.js';",
      "const TRANSLATED_FILENAME = 'workbench.desktop.main_translated.js';",
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
      'function translatedUrl(url) {',
      '  try {',
      '    const parsed = new URL(url);',
      '    const nextPath = join(dirname(parsed.pathname), TRANSLATED_FILENAME).replace(/\\\\/g, "/");',
      '    parsed.pathname = nextPath;',
      '    return parsed.toString();',
      '  } catch {',
      '    return url;',
      '  }',
      '}',
      '',
      'function shouldRedirect(filePath) {',
      '  if (!filePath) return false;',
      '  if (basename(filePath) !== TARGET_FILENAME) return false;',
      '  return existsSync(join(dirname(filePath), TRANSLATED_FILENAME));',
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
      '      if (!shouldRedirect(filePath)) {',
      '        return handler(request, callback);',
      '      }',
      '',
      '      return handler({ ...request, url: translatedUrl(request.url) }, callback);',
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
