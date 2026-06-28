const fs = require('fs');

const { loadSurfaceDefinitions, applySurfaceRuntimeDefaults } = require('../lib/mapping/surfaces.js');

function createOverlaySeedModule({
  toolPaths,
  ensureDir,
  readJsonIfExists,
  writeJson,
  mergeMappings,
  readDefaultMappings,
}) {
  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function syncJsonArrayFileWithDefaults(filePath, defaults) {
    const existing = asArray(readJsonIfExists(filePath, []));
    const surfaces = loadSurfaceDefinitions();
    const merged = mergeMappings(defaults, existing).map((entry) =>
      applySurfaceRuntimeDefaults(entry, surfaces)
    );
    writeJson(filePath, merged);
    return merged;
  }

  function seedOverlayFiles() {
    ensureDir(toolPaths.translationOverlayDir);

    syncJsonArrayFileWithDefaults(
      toolPaths.overlayMappingPath,
      readDefaultMappings('workbench.overlay.json')
    );
    syncJsonArrayFileWithDefaults(
      toolPaths.cursorWinCommonPath,
      readDefaultMappings('cursor-win.common.json')
    );
    syncJsonArrayFileWithDefaults(
      toolPaths.dynamicMappingPath,
      readDefaultMappings('cursor-win.dynamic.json')
    );
    syncJsonArrayFileWithDefaults(
      toolPaths.cursorWinAnchorsPath,
      readDefaultMappings('cursor-win.anchors.json')
    );

    if (!fs.existsSync(toolPaths.extensionOverlayPath)) {
      writeJson(toolPaths.extensionOverlayPath, {
        'cursor-always-local': {
          displayName: 'Cursor 本地优先',
          description: 'Cursor 的实验功能',
        },
        'cursor-retrieval': {
          displayName: 'AI 补全',
          description: '从代码语言模型获取补全。',
        },
        'cursor-shadow-workspace': {
          displayName: 'Cursor 隐藏工作区',
          description:
            '管理一个隐藏的本地窗口，供 AI 智能体在把代码展示给你之前先在本地整理和完善。',
        },
      });
    }
  }

  return {
    asArray,
    seedOverlayFiles,
    syncJsonArrayFileWithDefaults,
  };
}

module.exports = {
  createOverlaySeedModule,
};
