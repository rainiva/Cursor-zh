const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createToolPaths } = require('../../tool/paths.js');
const { createMappingsModule } = require('../../tool/mappings.js');
const { writeJson, readJsonIfExists } = require('../../tool/io.js');
const { mergeMappings } = require('../../cursor-zh-lib.js');

function createMapping(originalText, changeText) {
  return { originalText, changeText, searchType: 'exact' };
}

test('loadMergedMappings merges base overlay cursorWin and dynamic in order', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-mappings-'));
  const toolPaths = createToolPaths(workspaceRoot);

  writeJson(toolPaths.baseMappingPath, [createMapping('Base', '基')]);
  writeJson(toolPaths.overlayMappingPath, [createMapping('Overlay', '覆')]);
  writeJson(toolPaths.cursorWinCommonPath, [createMapping('Win', '窗')]);
  writeJson(toolPaths.dynamicMappingPath, [createMapping('Dynamic', '动')]);

  const seedOverlayFiles = () => {};
  const { loadMergedMappings } = createMappingsModule({
    toolPaths,
    fs,
    readText: () => '',
    writeJson,
    readJsonIfExists,
    mergeMappings,
    parseLegacyWorktreeMappings: () => [],
    seedOverlayFiles,
    asArray: (value) => (Array.isArray(value) ? value : []),
  });

  const context = {
    paths: {
      workbenchTranslatedPath: path.join(workspaceRoot, 'missing-workbench.js'),
    },
  };

  const result = loadMergedMappings(context, { seed: false });

  assert.equal(result.baseMappings.length, 1);
  assert.equal(result.overlayMappings.length, 1);
  assert.equal(result.cursorWinCommonMappings.length, 1);
  assert.equal(result.dynamicMappings.length, 1);
  assert.equal(result.mergedMappings.length, 4);
  assert.deepEqual(
    result.mergedMappings.map((entry) => entry.originalText),
    ['Base', 'Overlay', 'Win', 'Dynamic']
  );
});

test('loadMergedMappings calls seedOverlayFiles only when seed is true', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-mappings-'));
  const toolPaths = createToolPaths(workspaceRoot);
  let seeded = false;

  const { loadMergedMappings } = createMappingsModule({
    toolPaths,
    fs,
    readText: () => '',
    writeJson,
    readJsonIfExists,
    mergeMappings,
    parseLegacyWorktreeMappings: () => [],
    seedOverlayFiles: () => {
      seeded = true;
    },
    asArray: (value) => (Array.isArray(value) ? value : []),
  });

  loadMergedMappings(
    { paths: { workbenchTranslatedPath: path.join(workspaceRoot, 'missing.js') } },
    {}
  );

  assert.equal(seeded, false);

  loadMergedMappings(
    { paths: { workbenchTranslatedPath: path.join(workspaceRoot, 'missing.js') } },
    { seed: true }
  );

  assert.equal(seeded, true);
});

// 任务 13 回合二：设置页为「注册-渲染」双轨架构，锚点只覆盖 nu() 注册层；
// 渲染层 Y()/J() 组件的 label 靠 common.json exact 静态替换触达（先例：状态栏、系统通知）。
// 守护两条微试点词条的渲染层映射存在且 schema 合法（静态路径，不入运行时头部）。
test('cursor-win.common.json guards render-layer exact mappings for micro-pilot settings labels', () => {
  const overlayPath = path.join(__dirname, '../../../translations/overlay/cursor-win.common.json');
  const mappings = JSON.parse(fs.readFileSync(overlayPath, 'utf8'));
  const expected = [
    { originalText: 'Window Restoration', changeText: '窗口恢复' },
    { originalText: 'Auto-Hide Editor When Empty', changeText: '编辑器为空时自动隐藏' },
  ];
  for (const { originalText, changeText } of expected) {
    const hits = mappings.filter((entry) => entry && entry.originalText === originalText);
    assert.equal(hits.length, 1, `渲染层映射 ${originalText} 应存在且唯一，实际 ${hits.length} 条`);
    const entry = hits[0];
    assert.equal(entry.changeText, changeText);
    assert.equal(entry.searchType, 'exact');
    assert.equal(entry.forceRuntime, false, 'exact 走静态替换，不得吸入运行时头部');
    assert.equal(typeof entry.surface, 'string');
  }
});

// 任务 11 批次 3（双轨补课）：阶段三迁移的 settingsSlug/glassCommand 锚点词条按微试点
// 先例补齐渲染层 exact 映射（3.13.21 双 bundle 逐条 Buffer 实测：原文在场、形态一致、
// 出现点均为同一设置项/菜单项的渲染+注册结构，无第三方同名误伤）。
// new-project 已有 exact 映射（新建项目）不重复；continueWorking 为 i18nKey 静态锚点不在此列。
test('cursor-win.common.json guards render-layer exact mappings for stage3 anchor terms', () => {
  const overlayPath = path.join(__dirname, '../../../translations/overlay/cursor-win.common.json');
  const mappings = JSON.parse(fs.readFileSync(overlayPath, 'utf8'));
  const expected = [
    { originalText: 'Copy Transcript', changeText: '复制会话记录' },
    { originalText: 'Send After Current Message', changeText: '在当前消息后发送' },
    { originalText: 'Include Third-Party Plugins, Skills, and Other Configs', changeText: '包含第三方插件、技能和其他配置' },
    { originalText: 'Max Worktrees', changeText: '最大工作树数量' },
    { originalText: 'Max Total Size (GB)', changeText: '最大总大小（GB）' },
    { originalText: 'Cursor-Managed Worktrees', changeText: 'Cursor 托管的工作树' },
    { originalText: 'Open Chat as Editor Tabs', changeText: '将对话作为编辑器标签页打开' },
    { originalText: 'Explore Subagent Model', changeText: 'Explore 子智能体模型' },
    { originalText: 'Default Browser', changeText: '默认浏览器' },
  ];
  for (const { originalText, changeText } of expected) {
    const hits = mappings.filter((entry) => entry && entry.originalText === originalText);
    assert.equal(hits.length, 1, `渲染层映射 ${originalText} 应存在且唯一，实际 ${hits.length} 条`);
    const entry = hits[0];
    assert.equal(entry.changeText, changeText);
    assert.equal(entry.searchType, 'exact');
    assert.equal(entry.forceRuntime, false, 'exact 走静态替换，不得吸入运行时头部');
    assert.equal(typeof entry.surface, 'string');
  }
});
