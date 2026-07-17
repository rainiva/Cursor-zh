const fs = require('fs');
const path = require('path');
const { listWorkbenchBundles } = require('../../lib/patcher/workbench-bundles.js');

const READINESS_SIDECAR_FILENAME = 'cursor-zh-readiness.json';

function evaluateReadinessProbe({
  expectedNonce,
  expectedBuildId = null,
  eventNonce,
  eventBuildId = null,
  bodyChildCount,
}) {
  if (!expectedNonce || eventNonce !== expectedNonce) {
    return false;
  }
  if (expectedBuildId != null && eventBuildId !== expectedBuildId) {
    return false;
  }
  return Number(bodyChildCount) > 0;
}

function createBootstrapHarness({ nonce, buildId = null } = {}) {
  const acknowledgements = [];
  return {
    acknowledgements,
    async didFinishLoad({ nonce: eventNonce, buildId: eventBuildId = null, bodyChildCount } = {}) {
      if (!evaluateReadinessProbe({
        expectedNonce: nonce,
        expectedBuildId: buildId,
        eventNonce,
        eventBuildId,
        bodyChildCount,
      })) {
        return;
      }
      acknowledgements.push({
        nonce: eventNonce,
        buildId: eventBuildId != null ? eventBuildId : buildId,
        observedAt: Date.now(),
      });
    },
  };
}

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
            "import { existsSync, readFileSync, writeFileSync } from 'node:fs';",
            "import { fileURLToPath } from 'node:url';",
          ]
        : [
            "const { app, session } = require('electron');",
            "const { basename, dirname, join } = require('node:path');",
            "const { existsSync, readFileSync, writeFileSync } = require('node:fs');",
          ]),
      '',
      `const WORKBENCH_REDIRECTS = ${JSON.stringify(redirects)};`,
      "const MAIN_TRANSLATED_FILENAME = 'main_translated.js';",
      "const TARGET_SCHEME = 'vscode-file';",
      `const READINESS_SIDECAR_FILENAME = ${JSON.stringify(READINESS_SIDECAR_FILENAME)};`,
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
      'function readReadinessMetadata() {',
      '  try {',
      '    const metaPath = join(BOOTSTRAP_DIR, READINESS_SIDECAR_FILENAME);',
      '    if (!existsSync(metaPath)) return null;',
      '    const meta = JSON.parse(readFileSync(metaPath, "utf8"));',
      '    if (!meta || typeof meta.nonce !== "string" || typeof meta.buildId !== "string" || !meta.markerPath) return null;',
      '    return meta;',
      '  } catch {',
      '    return null;',
      '  }',
      '}',
      '',
      'function acknowledgeReadinessMarker(meta) {',
      '  try {',
      '    const payload = JSON.stringify({',
      '      nonce: meta.nonce,',
      '      buildId: meta.buildId || null,',
      '      observedAt: Date.now(),',
      '    });',
      '    writeFileSync(meta.markerPath, `${payload}\\n`, "utf8");',
      '  } catch {',
      '    // Acknowledgement is best-effort; recovery path handles missing readiness.',
      '  }',
      '}',
      '',
      'function installReadinessProbe() {',
      '  const meta = readReadinessMetadata();',
      '  if (!meta) return;',
      '  app.on("browser-window-created", (_event, win) => {',
      '    if (!win || !win.webContents || typeof win.webContents.once !== "function") return;',
      '    win.webContents.once("did-finish-load", () => {',
      '      const probe = "(function(){ var b = document.body; return !!(b && b.children && b.children.length > 0); })()";',
      '      Promise.resolve(win.webContents.executeJavaScript(probe))',
      '        .then((ok) => { if (ok) acknowledgeReadinessMarker(meta); })',
      '        .catch(() => {});',
      '    });',
      '  });',
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
      '  installReadinessProbe();',
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
  createBootstrapHarness,
  evaluateReadinessProbe,
  READINESS_SIDECAR_FILENAME,
};
