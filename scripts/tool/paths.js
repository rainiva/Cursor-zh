const path = require('path');

const { resolveWorkspaceRoot } = require('../cursor-zh-config.js');

function createToolPaths(workspaceRoot) {
  const stateDir = path.join(workspaceRoot, 'state');
  const translationBaseDir = path.join(workspaceRoot, 'translations', 'base');
  const translationOverlayDir = path.join(workspaceRoot, 'translations', 'overlay');
  const generatedDir = path.join(stateDir, 'generated');

  return {
    workspaceRoot,
    defaultInstallDir: path.join(workspaceRoot, 'cursor'),
    stateDir,
    backupRoot: path.join(stateDir, 'backups'),
    generatedDir,
    startCursorPathFile: path.join(stateDir, 'start-cursor-path.txt'),
    translationBaseDir,
    translationOverlayDir,
    buildManifestPath: path.join(stateDir, 'build-manifest.json'),
    baseMappingPath: path.join(translationBaseDir, 'workbench.mappings.json'),
    overlayMappingPath: path.join(translationOverlayDir, 'workbench.overlay.json'),
    cursorWinCommonPath: path.join(translationOverlayDir, 'cursor-win.common.json'),
    cursorWinAnchorsPath: path.join(translationOverlayDir, 'cursor-win.anchors.json'),
    dynamicMappingPath: path.join(translationOverlayDir, 'cursor-win.dynamic.json'),
    runtimeConfigPath: path.join(workspaceRoot, 'scripts', 'tool', 'runtime-config.js'),
    criticalUiTargetsPath: path.join(
      workspaceRoot,
      'scripts',
      'lib',
      'mapping',
      'critical-ui-targets.js'
    ),
    productTipsHookPath: path.join(
      workspaceRoot,
      'scripts',
      'lib',
      'patcher',
      'product-tips-hook.js'
    ),
    textTranslatorTemplatePath: path.join(
      workspaceRoot,
      'scripts',
      'lib',
      'runtime',
      'text-translator-template.js'
    ),
    extensionOverlayPath: path.join(
      translationOverlayDir,
      'extensions.package.nls.zh-cn.json'
    ),
    generatedWorkbenchPath: path.join(
      generatedDir,
      'workbench.desktop.main_translated.generated.js'
    ),
    generatedGlassWorkbenchPath: path.join(
      generatedDir,
      'workbench.glass.main_translated.generated.js'
    ),
    generatedMainPath: path.join(generatedDir, 'main_translated.generated.js'),
    generatedNlsMessagesPath: path.join(generatedDir, 'nls.messages.generated.json'),
    desktopShortcutName: 'Cursor 中文版.lnk',
    toggleSignalPath: path.join(stateDir, 'runtime-toggle.json'),
    harvestSnapshotsDir: path.join(stateDir, 'harvest-snapshots'),
    harvestReportsDir: path.join(stateDir, 'reports'),
    surfacesMetaPath: path.join(workspaceRoot, 'translations', 'meta', 'surfaces.json'),
  };
}

function resolveToolPaths({ scriptDir, env }) {
  return createToolPaths(resolveWorkspaceRoot({ scriptDir, env }));
}

module.exports = {
  createToolPaths,
  resolveToolPaths,
};
