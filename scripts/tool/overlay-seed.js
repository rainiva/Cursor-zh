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
    // 源文件为权威（QA 回归修复）：文件已存在且非空时不合并 defaults、不回写——
    // 旧的 merge 回写会复活 defaults 快照中已被删除的死词条，并把
    // applySurfaceRuntimeDefaults 的内存态注记（staticPreferred 等）持久化污染源文件。
    if (fs.existsSync(filePath) && existing.length > 0) {
      return existing;
    }
    // 首次引导：仅在文件缺失或为空时用打包 defaults 落盘（归一化后写入）。
    const surfaces = loadSurfaceDefinitions();
    const seeded = asArray(defaults).map((entry) =>
      applySurfaceRuntimeDefaults(entry, surfaces)
    );
    writeJson(filePath, seeded);
    return seeded;
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
