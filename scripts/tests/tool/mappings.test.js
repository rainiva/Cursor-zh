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

// 任务 12 批次 A：用户截图确认的 12 个设置分区标题欠账（3.13.21 双 bundle 逐条 Buffer 实测）。
// 10 条整字面量出现点均为同一分区的渲染 title + 注册 label（或同类分支/远程控制 UI 语义），
// 无第三方同名误伤，走 exact 静态；"Startup"（glass 有扩展激活列同名字面量）改走
// cursor-3.13 embedded-ui 上下文补丁；"LSP" 纯缩写且裸 exact 会破坏 ["lsp","LSP"]
// 大小写规范映射代码，按「宁缺毋滥」跳过。
test('cursor-win.common.json guards render-layer exact mappings for task12 batch A section titles', () => {
  const overlayPath = path.join(__dirname, '../../../translations/overlay/cursor-win.common.json');
  const mappings = JSON.parse(fs.readFileSync(overlayPath, 'utf8'));
  const expected = [
    { originalText: 'Agent Conversations', changeText: 'Agent 会话' },
    { originalText: 'Context and Tools', changeText: '上下文与工具' },
    { originalText: 'Execution and Approvals', changeText: '执行与审批' },
    { originalText: 'Terminal and Editing', changeText: '终端与编辑' },
    { originalText: 'Browser & Network', changeText: '浏览器与网络' },
    { originalText: 'Branches', changeText: '分支' },
    { originalText: 'Third-Party Imports', changeText: '第三方导入' },
    { originalText: 'Remote Control', changeText: '远程控制' },
    { originalText: 'Ignore Files', changeText: '忽略文件' },
    { originalText: 'Task Models', changeText: '任务模型' },
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

// 任务12 批次B：设置项标题/描述（3.13.21 双 bundle 逐条 Buffer 实测）。
// 普通引号字面量走渲染层 exact（整字面量唯一或全部同一设置项语义）；
// 模板字面量（Ctrl+Enter submits chat / MCP tools / 提交署名 / .cursorignore 等含 ${} 表达式）
// exact 触达不到，改走 cursor-3.13 embedded 上下文补丁，见 versioned-patches.test.js。
// Choose GitHub/Graphite 原文在 3.13.21 双 bundle 均 0 处，按宁缺毋滥跳过。
test('cursor-win.common.json guards render-layer exact mappings for task12 batch B settings', () => {
  const overlayPath = path.join(__dirname, '../../../translations/overlay/cursor-win.common.json');
  const mappings = JSON.parse(fs.readFileSync(overlayPath, 'utf8'));
  const expected = [
    { originalText: 'Code Block Word Wrap', changeText: '代码块自动换行' },
    { originalText: 'Wrap long lines in Agent conversation code blocks', changeText: '在 Agent 会话代码块中对长行自动换行' },
    { originalText: 'Default Environment', changeText: '默认环境' },
    { originalText: 'Where new agents start by default', changeText: '新 Agent 默认的启动位置' },
    { originalText: 'Voice Submit Keywords', changeText: '语音提交关键词' },
    { originalText: 'Custom words that submit a voice prompt. Spaces and punctuation are ignored.', changeText: '用于提交语音提示的自定义词语。空格和标点会被忽略。' },
    { originalText: 'Enable LSPs', changeText: '启用 LSP' },
    { originalText: 'Enable LSPs for Worktrees', changeText: '为工作树启用 LSP' },
    { originalText: 'Enable LSPs to change this setting', changeText: '启用 LSP 以更改此设置' },
    { originalText: 'Maximum Local LSP Workspaces', changeText: '本地 LSP 工作区上限' },
    { originalText: 'Maximum Remote LSP Workspaces', changeText: '远程 LSP 工作区上限' },
    { originalText: 'Enable language server by default to provide code intelligence in workspaces', changeText: '默认启用语言服务器，为工作区提供代码智能' },
    { originalText: 'Enable language server by default to provide code intelligence in agent worktree workspaces', changeText: '默认启用语言服务器，为 Agent 工作树工作区提供代码智能' },
    { originalText: 'Maximum local workspaces that can run language servers at the same time', changeText: '可同时运行语言服务器的本地工作区数量上限' },
    { originalText: 'Maximum remote workspaces that can run language servers at the same time', changeText: '可同时运行语言服务器的远程工作区数量上限' },
    { originalText: 'Keep This Computer Awake', changeText: '保持此计算机唤醒' },
    { originalText: 'Prevent sleep when this computer is plugged in and Remote Control is enabled', changeText: '在此计算机接通电源且启用远程控制时阻止睡眠' },
    { originalText: 'Import Claude Code Conversations', changeText: '导入 Claude Code 会话' },
    { originalText: 'Sync chats and continue them in Cursor. Sending a follow-up forks the chat.', changeText: '同步对话并在 Cursor 中继续。发送后续消息会派生该对话。' },
    { originalText: 'Play a sound when agents finish or need attention', changeText: '当 Agent 完成任务或需要关注时播放提示音' },
    { originalText: 'Controls which windows Cursor restores on startup', changeText: '控制 Cursor 启动时恢复哪些窗口' },
    { originalText: 'Allow agents on this machine to be controlled remotely from mobile and web', changeText: '允许通过移动端和网页远程控制此机器上的 Agent' },
    { originalText: 'Choose the model used by the Explore subagent for initial research', changeText: '选择 Explore 子智能体用于初步研究的模型' },
    { originalText: 'Skip symlinks during discovery', changeText: '发现过程中跳过符号链接' },
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

// 任务12 批次C：非设置页短词（3.13.21 双 bundle 逐处语境审计）。
// Copy ID（desktop 3/glass 5 处）、Add to Side Chat（3/4 处）全部为同一功能的按钮/菜单/命令 title，安全；
// Format on Save、Last Used 各 1 处；No results found. 仅 glass 1 处（desktop 0 处，无副作用）。
// Default（desktop 26/glass 29 处，枚举值/主题名/内部标识为主）无安全定位方式，按宁缺毋滥跳过；
// Send After Current Message 已由既有映射覆盖，不重复。
test('cursor-win.common.json guards render-layer exact mappings for task12 batch C non-settings terms', () => {
  const overlayPath = path.join(__dirname, '../../../translations/overlay/cursor-win.common.json');
  const mappings = JSON.parse(fs.readFileSync(overlayPath, 'utf8'));
  const expected = [
    { originalText: 'Copy ID', changeText: '复制 ID' },
    { originalText: 'Add to Side Chat', changeText: '添加到侧边对话' },
    { originalText: 'Format on Save', changeText: '保存时格式化' },
    { originalText: 'Last Used', changeText: '最近使用' },
    { originalText: 'No results found.', changeText: '未找到结果。' },
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
  const defaultHits = mappings.filter((entry) => entry && entry.originalText === 'Default' && entry.searchType === 'exact');
  assert.equal(defaultHits.length, 0, 'Default 裸 exact 会误伤枚举值/主题名，禁止收录');
});

// 任务 12 批次 D：task11 锚点欠账按渲染层 exact 补课（3.13.21 双 bundle Buffer 实测：
// Open Canvas desktop 3/glass 4 处、Toggle Full Screen desktop 1/glass 2 处，均为同一
// 功能语义的显示字面量；nls.messages.json 无三词数字索引，nls 路径不通）。
// Developer desktop 7/glass 67 处多语境且 glassCategory:"Developer" 与分类数组存在
// 字符串匹配耦合，按欠账文档「有歧义则放弃」不新增锚点/映射；存量单条 exact 属
// critical-ui-coverage 既有合同（CRITICAL_INLINE_TEXT_TARGETS）管辖，保持原样不扩不删。
test('cursor-win.common.json guards render-layer exact mappings for task12 batch D anchor-debt terms', () => {
  const overlayPath = path.join(__dirname, '../../../translations/overlay/cursor-win.common.json');
  const mappings = JSON.parse(fs.readFileSync(overlayPath, 'utf8'));
  const expected = [
    { originalText: 'Open Canvas', changeText: '打开画布' },
    { originalText: 'Toggle Full Screen', changeText: '切换全屏' },
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
  const developerHits = mappings.filter((entry) => entry && entry.originalText === 'Developer' && entry.searchType === 'exact');
  assert.equal(developerHits.length, 1, 'Developer 保持既有合同的单条 exact，禁止重复收录或扩散（glassCategory/分类数组匹配耦合高误伤）');
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
