const LEGACY_MAPPING_PATTERN =
  /const translationMappings = (\[.*?\]); \/\/ don't modify string/s;

function createMapping(originalText, changeText, extra = {}) {
  return {
    originalText,
    changeText,
    searchType: 'exact',
    ...extra,
  };
}

function createExactMapping(originalText, changeText, extra = {}) {
  return createMapping(originalText, changeText, {
    ...extra,
    searchType: 'exact',
  });
}

function createNormalizedExactMapping(originalText, changeText, extra = {}) {
  return createMapping(originalText, changeText, {
    ...extra,
    searchType: 'normalizedExact',
  });
}

function createRegexMapping(originalText, changeText, extra = {}) {
  return createMapping(originalText, changeText, {
    ...extra,
    searchType: 'regex',
  });
}

function normalizeTextForComparison(text) {
  return String(text || '')
    .replace(/\u2026/g, '...')
    .replace(/\.{3,}/g, '...')
    .replace(/&&/g, '')
    .replace(/&/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function stripJsonComments(source) {
  return source
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

function parseJsonc(source) {
  if (typeof source !== 'string' || source.trim() === '') {
    return {};
  }

  return JSON.parse(stripJsonComments(source));
}

function parseLegacyWorktreeMappings(source) {
  if (typeof source !== 'string' || source.length === 0) {
    return [];
  }

  const match = source.match(LEGACY_MAPPING_PATTERN);
  if (!match) {
    return [];
  }

  const parsed = new Function(`return (${match[1]})`)();
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      originalText: item.originalText,
      changeText: item.changeText,
      searchType: item.searchType || 'exact',
      ...(item.flags ? { flags: item.flags } : {}),
      ...(item.scopeSelectors ? { scopeSelectors: item.scopeSelectors } : {}),
      ...(item.scopeContainsText ? { scopeContainsText: item.scopeContainsText } : {}),
      ...(item.coverageHints ? { coverageHints: item.coverageHints } : {}),
    }));
}

function mappingKey(mapping) {
  return [
    mapping.originalText || '',
    mapping.searchType || 'exact',
    mapping.flags || '',
    Array.isArray(mapping.scopeSelectors) ? mapping.scopeSelectors.join('|') : '',
    Array.isArray(mapping.scopeContainsText) ? mapping.scopeContainsText.join('|') : '',
  ].join('::');
}

function mergeMappings(baseMappings = [], overlayMappings = []) {
  const merged = new Map();

  for (const mapping of baseMappings) {
    merged.set(mappingKey(mapping), { ...mapping });
  }

  for (const mapping of overlayMappings) {
    merged.set(mappingKey(mapping), { ...mapping });
  }

  return Array.from(merged.values());
}

function parseVersionParts(version) {
  const [major = '0', minor = '0', patch = '0'] = String(version)
    .split('.')
    .map((part) => part.replace(/[^\d].*$/, ''));

  return [Number(major), Number(minor), Number(patch)];
}

function compareLanguagePackVersion(languagePackVersion, vscodeVersion) {
  const [lpMajor, lpMinor] = parseVersionParts(languagePackVersion);
  const [vsMajor, vsMinor] = parseVersionParts(vscodeVersion);

  if (lpMajor === vsMajor && lpMinor === vsMinor) {
    return { compatible: true, reason: 'major-minor-match' };
  }

  return { compatible: false, reason: 'major-minor-mismatch' };
}

function withLocaleSetting(config, locale) {
  return {
    ...(config || {}),
    locale,
  };
}

function defaultCursorWinCommonMappings() {
  return [
    createExactMapping('Back', '返回'),
    createExactMapping('General', '常规'),
    createExactMapping('Appearance', '外观'),
    createExactMapping('Plan & Usage', '套餐与用量'),
    createExactMapping('Agents', '智能体'),
    createExactMapping('Models', '模型'),
    createExactMapping('Cloud Agents', '云端智能体'),
    createExactMapping('Plugins', '插件'),
    createExactMapping('Plugin MCP Servers', '插件 MCP 服务器'),
    createExactMapping('Rules, Skills, Subagents', '规则、技能、子智能体'),
    createExactMapping('Rules, Subagents, Commands', '规则、子智能体、命令'),
    createExactMapping('Rules & Commands', '规则与命令'),
    createExactMapping('Skills', '技能'),
    createExactMapping('Loading Skills...', '正在加载技能...'),
    createExactMapping('Loading skills...', '正在加载技能...'),
    createExactMapping('Could Not Load Skills', '无法加载技能'),
    createExactMapping('No Skills Yet', '暂无技能'),
    createExactMapping('No skills available', '暂无可用技能'),
    createExactMapping('Delete Skill', '删除技能'),
    createExactMapping('Add skills, MCPs and more', '添加技能、MCP 等'),
    createExactMapping('Tools & MCPs', '工具与 MCP'),
    createExactMapping('MCPs', 'MCP'),
    createExactMapping('MCP Servers', 'MCP 服务器'),
    createExactMapping('No MCP servers', '暂无 MCP 服务器'),
    createExactMapping('Connect', '连接'),
    createExactMapping('No servers match your search', '没有服务器匹配你的搜索'),
    createExactMapping('No MCP servers available', '暂无可用 MCP 服务器'),
    createExactMapping('Open MCP Settings', '打开 MCP 设置'),
    createExactMapping('New MCP Configuration', '新建 MCP 配置'),
    createExactMapping(
      'Creates a new MCP configuration with example servers',
      '使用示例服务器创建新的 MCP 配置'
    ),
    createExactMapping('Installed MCP Servers', '已安装的 MCP 服务器'),
    createExactMapping('No MCP Tools', '暂无 MCP 工具'),
    createExactMapping('Cloud MCP Servers', '云端 MCP 服务器'),
    createExactMapping('Sign In to View Cloud MCP Servers', '登录以查看云端 MCP 服务器'),
    createExactMapping('Could Not Load Cloud MCP Servers', '无法加载云端 MCP 服务器'),
    createExactMapping('User MCP Servers', '用户 MCP 服务器'),
    createExactMapping('No User MCP Servers', '暂无用户 MCP 服务器'),
    createExactMapping('Team MCP Servers', '团队 MCP 服务器'),
    createExactMapping('No Team MCP Servers', '暂无团队 MCP 服务器'),
    createExactMapping('Could Not Load Workspace MCP Servers', '无法加载工作区 MCP 服务器'),
    createExactMapping('No User MCP Tools', '暂无用户 MCP 工具'),
    createExactMapping('Team', '团队'),
    createExactMapping('User', '用户'),
    createExactMapping('Workspace', '工作区'),
    createExactMapping('Extensions', '扩展'),
    createExactMapping('Errored', '出错'),
    createExactMapping('Remove local plugin', '移除本地插件'),
    createExactMapping('Plugins give your agents important context', '插件能为你的智能体提供重要上下文'),
    createExactMapping(
      'Provide domain-specific knowledge and workflows for the agent',
      '为智能体提供特定领域的知识和工作流'
    ),
    createExactMapping(
      'Include third-party Plugins, Skills, and other configs',
      '包含第三方插件、技能和其他配置'
    ),
    createExactMapping(
      'Automatically import agent configs from other tools',
      '自动从其他工具导入智能体配置'
    ),
    createExactMapping('Loading plugins...', '正在加载插件...'),
    createExactMapping('Add Plugin', '添加插件'),
    createExactMapping('Remove Plugin', '移除插件'),
    createExactMapping('Search the marketplace', '搜索市场'),
    createExactMapping('No result', '无结果'),
    createExactMapping('Try changing your search query', '试试更换搜索关键词'),
    createExactMapping('Import Marketplace...', '导入市场...'),
    createExactMapping('Browse Marketplace', '浏览市场'),
    createExactMapping('Manage plugins', '管理插件'),
    createExactMapping('Featured', '精选'),
    createExactMapping('Infrastructure', '基础设施'),
    createExactMapping('Data & Analytics', '数据与分析'),
    createExactMapping('Productivity', '效率工具'),
    createExactMapping('Payments', '支付'),
    createExactMapping('Agent Orchestration', '智能体编排'),
    createExactMapping('All Plugins', '全部插件'),
    createExactMapping('Documentation', '文档'),
    createExactMapping('Added', '已添加'),
    createExactMapping('Add', '添加'),
    createExactMapping('Start Building', '开始构建'),
    createExactMapping('Continue', '继续'),
    createExactMapping('Skip', '跳过'),
    createExactMapping('Add agents, context, tools', '添加智能体、上下文和工具'),
    createExactMapping('Add agents, context, tools...', '添加智能体、上下文和工具...'),
    createExactMapping('Image', '图片'),
    createExactMapping('Loading...', '正在加载...'),
    createExactMapping('No results found', '未找到结果'),
    createExactMapping('Hooks', '钩子'),
    createExactMapping('Indexing', '索引'),
    createExactMapping('Indexing & Docs', '索引与文档'),
    createExactMapping('Automations', '自动化'),
    createExactMapping('Beta', '测试版'),
    createExactMapping('Network', '网络'),
    createExactMapping('Cursor Account', 'Cursor 账户'),
    createExactMapping('Manage your account and billing', '管理你的账户和计费'),
    createExactMapping(
      'Automate repetitive tasks with always-on cloud agents that respond to environment triggers.',
      '\u501f\u52a9\u59cb\u7ec8\u5728\u7ebf\u7684\u4e91\u7aef\u667a\u80fd\u4f53\u81ea\u52a8\u6267\u884c\u91cd\u590d\u4efb\u52a1\uff0c\u5e76\u54cd\u5e94\u73af\u5883\u89e6\u53d1\u5668\u3002'
    ),
    createExactMapping('Total Automations', '\u81ea\u52a8\u5316\u603b\u6570'),
    createExactMapping('Successful · 7d', '\u6210\u529f \u00b7 7\u5929'),
    createExactMapping('Failed · 7d', '\u5931\u8d25 \u00b7 7\u5929'),
    createExactMapping('Run History', '\u8fd0\u884c\u5386\u53f2'),
    createExactMapping('Mine', '\u6211\u7684'),
    createExactMapping('New Automation', '\u65b0\u5efa\u81ea\u52a8\u5316'),
    createExactMapping('No Automations Yet', '\u6682\u65e0\u81ea\u52a8\u5316'),
    createExactMapping(
      'Run agents on a schedule or automatically in response to events. Billed at plan rates.',
      '\u6309\u8ba1\u5212\u8fd0\u884c\u667a\u80fd\u4f53\uff0c\u6216\u5728\u4e8b\u4ef6\u89e6\u53d1\u65f6\u81ea\u52a8\u8fd0\u884c\u3002\u6309\u5957\u9910\u6807\u51c6\u8ba1\u8d39\u3002'
    ),
    createExactMapping('Popular', '\u70ed\u95e8'),
    createExactMapping('Code Review', '\u4ee3\u7801\u5ba1\u67e5'),
    createExactMapping('Security', '\u5b89\u5168'),
    createExactMapping('Incidents & Triage', '\u4e8b\u4ef6\u4e0e\u5206\u8bca'),
    createExactMapping('Data & Research', '\u6570\u636e\u4e0e\u7814\u7a76'),
    createExactMapping('Find critical bugs', '\u67e5\u627e\u4e25\u91cd\u7f3a\u9677'),
    createExactMapping(
      'Analyze recent commits for high-severity correctness bugs and submit safe fixes',
      '\u5206\u6790\u6700\u8fd1\u63d0\u4ea4\u4e2d\u7684\u9ad8\u4e25\u91cd\u6027\u6b63\u786e\u6027\u7f3a\u9677\uff0c\u5e76\u63d0\u4ea4\u5b89\u5168\u4fee\u590d\u65b9\u6848'
    ),
    createExactMapping('Summarize changes daily', '\u6bcf\u65e5\u6c47\u603b\u53d8\u66f4'),
    createExactMapping(
      'Post a daily Slack digest summarizing notable repository changes and risks from the previous day',
      '\u5728 Slack \u4e2d\u53d1\u5e03\u6bcf\u65e5\u6458\u8981\uff0c\u603b\u7ed3\u524d\u4e00\u5929\u4ed3\u5e93\u7684\u91cd\u8981\u53d8\u66f4\u4e0e\u98ce\u9669'
    ),
    createExactMapping('Notifications', '通知'),
    createExactMapping('System Notifications', '系统通知'),
    createExactMapping(
      'Show system notifications when Agent completes or needs attention',
      '在智能体完成任务或需要你处理时显示系统通知'
    ),
    createExactMapping('Warning Notifications', '警告通知'),
    createExactMapping('Show warning-level in-app toasts', '显示应用内警告级提示'),
    createExactMapping('System Tray Icon', '系统托盘图标'),
    createExactMapping('Show Cursor in system tray', '在系统托盘中显示 Cursor'),
    createExactMapping('Menu Bar Icon', '菜单栏图标'),
    createExactMapping('Show Cursor in menu bar', '在菜单栏中显示 Cursor'),
    createExactMapping('Privacy', '隐私'),
    createExactMapping('Hide Email Address', '隐藏邮箱地址'),
    createExactMapping(
      'Partially mask your email address in the Cursor user interface',
      '在 Cursor 界面中部分隐藏你的邮箱地址'
    ),
    createExactMapping('Data Sharing Enabled', '已启用数据共享'),
    createExactMapping('Share Data', '共享数据'),
    createExactMapping('Worktrees', '\u5de5\u4f5c\u6811'),
    createExactMapping('Cleanup', '\u6e05\u7406'),
    createExactMapping(
      'Cursor periodically removes old worktrees to free disk space. Tune how aggressively cleanup runs.',
      'Cursor \u4f1a\u5b9a\u671f\u79fb\u9664\u65e7\u5de5\u4f5c\u6811\u4ee5\u91ca\u653e\u78c1\u76d8\u7a7a\u95f4\u3002\u53ef\u8c03\u6574\u6e05\u7406\u7684\u79ef\u6781\u7a0b\u5ea6\u3002'
    ),
    createExactMapping('Max worktrees', '\u6700\u5927\u5de5\u4f5c\u6811\u6570\u91cf'),
    createExactMapping(
      'Maximum number of Cursor-managed worktrees to retain across all workspaces. Older worktrees are removed first.',
      '\u8de8\u6240\u6709\u5de5\u4f5c\u533a\u4fdd\u7559\u7684 Cursor \u6258\u7ba1\u5de5\u4f5c\u6811\u6700\u5927\u6570\u91cf\u3002\u8f83\u65e7\u7684\u5de5\u4f5c\u6811\u4f1a\u4f18\u5148\u79fb\u9664\u3002'
    ),
    createExactMapping('Max total size (GB)', '\u6700\u5927\u603b\u5927\u5c0f\uff08GB\uff09'),
    createExactMapping(
      'Maximum total size in GB across all Cursor-managed worktrees. Set to 0 to disable the size limit.',
      '\u6240\u6709 Cursor \u6258\u7ba1\u5de5\u4f5c\u6811\u7684\u603b\u5927\u5c0f\u4e0a\u9650\uff08GB\uff09\u3002\u8bbe\u4e3a 0 \u53ef\u7981\u7528\u5927\u5c0f\u9650\u5236\u3002'
    ),
    createExactMapping('Cursor-managed worktrees', 'Cursor \u6258\u7ba1\u7684\u5de5\u4f5c\u6811'),
    createExactMapping(
      'No Cursor-managed worktrees on this machine.',
      '\u6b64\u673a\u5668\u4e0a\u6682\u65e0 Cursor \u6258\u7ba1\u7684\u5de5\u4f5c\u6811\u3002'
    ),
    createExactMapping('Improve Cursor for everyone', '帮助改进 Cursor'),
    createExactMapping(
      'Your codebase, prompts, edits and other usage data will be stored and trained on by Cursor to improve the product.',
      '你的代码库、提示词、编辑内容和其他使用数据会被 Cursor 存储并用于训练，以改进产品。'
    ),
    createExactMapping(
      'Your prompts, edits and other usage data will be stored and trained on by Cursor to improve the product.',
      '你的提示词、编辑内容和其他使用数据会被 Cursor 存储并用于训练，以改进产品。'
    ),
    createExactMapping(
      '. Prompts and limited telemetry may also be shared with model providers when you explicitly select their models',
      '。当你明确选择某个模型时，提示词和少量遥测数据也可能会共享给对应的模型提供方'
    ),
    createExactMapping('Controlled by Admin, cannot change', '由管理员控制，无法更改'),
    createExactMapping('Privacy Mode', '隐私模式'),
    createExactMapping(
      'No training. Code may be stored for Background Agent and other features.',
      '不用于训练。代码可能会因后台 Agent 和其他功能而被存储。'
    ),
    createExactMapping('Data Sharing is paused for your first day of usage.', '数据共享在你使用的第一天会暂停。'),
    createExactMapping('Sharing will activate in', '共享将在'),
    createExactMapping('hour', '小时'),
    createExactMapping('Share Now', '立即共享'),
    createExactMapping('Switch to Privacy Mode', '切换到隐私模式'),
    createExactMapping('Privacy Mode (Legacy)', '隐私模式（旧版）'),
    createExactMapping(
      'No training and no storage. Background Agent and other features that require code storage will be disabled.',
      '不训练也不存储。后台 Agent 和其他需要存储代码的功能将被禁用。'
    ),
    createExactMapping('Theme', '主题'),
    createExactMapping(
      'Choose between light, dark, or high contrast themes',
      '在浅色、深色和高对比主题之间选择'
    ),
    createExactMapping('Colors', '颜色'),
    createExactMapping('Reduce Transparency', '减少透明效果'),
    createExactMapping(
      'Replace translucent surfaces with opaque backgrounds',
      '用不透明背景替代半透明界面'
    ),
    createExactMapping('Typography', '字体排版'),
    createExactMapping('Light Theme', '浅色主题'),
    createExactMapping('Dark Theme', '深色主题'),
    createExactMapping('System Theme', '跟随系统主题'),
    createExactMapping('UI Font Size', '界面字体大小'),
    createExactMapping('Font size for the Cursor user interface', 'Cursor 界面的字体大小'),
    createExactMapping('Code Font Size', '代码字体大小'),
    createExactMapping('Font size for code editors and diffs', '代码编辑器和差异视图的字体大小'),
    createExactMapping('UI Font Family', '界面字体'),
    createExactMapping('Override the Cursor user interface typeface', '覆盖 Cursor 界面字体'),
    createExactMapping('System font', '系统字体'),
    createExactMapping('Code Font Family', '代码字体'),
    createExactMapping('Override the font for code editors and diffs', '覆盖代码编辑器和差异视图字体'),
    createExactMapping('System monospace', '系统等宽字体'),
    createExactMapping('Max Tab Count', '最大标签页数量'),
    createExactMapping('Limit how many chat tabs can be open at once', '限制可同时打开的对话标签页数量'),
    createExactMapping('Usage Summary', '用量摘要'),
    createExactMapping(
      'When to show the usage summary at the bottom of the chat pane',
      '何时在对话面板底部显示用量摘要'
    ),
    createExactMapping('Toolbar on Selection', '选中时显示工具栏'),
    createExactMapping(
      'Show Add to Chat & Quick Edit buttons when selecting code',
      '选中代码时显示“添加到对话”和“快速编辑”按钮'
    ),
    createExactMapping('Themed Diff Backgrounds', '主题化差异背景'),
    createExactMapping(
      'Use themed background colors for inline code diffs',
      '为行内代码差异使用主题背景色'
    ),
    createExactMapping('Auto-hide editor when empty', '编辑器为空时自动隐藏'),
    createExactMapping(
      'When all editors are closed, hide the editor area and maximize chat',
      '关闭所有编辑器后，隐藏编辑器区域并最大化对话区'
    ),
    createExactMapping('Open chat as editor tabs', '将对话作为编辑器标签页打开'),
    createExactMapping('Browser Tab', '浏览器标签页'),
    createExactMapping('Show Localhost Links in Browser', '在浏览器中显示 Localhost 链接'),
    createExactMapping(
      'Automatically open localhost links in the Browser Tab',
      '自动在浏览器标签页中打开 localhost 链接'
    ),
    createExactMapping('Changes Sidebar', '变更侧边栏'),
    createExactMapping('Show Sidebar', '显示侧边栏'),
    createExactMapping('Customize Sidebar', '自定义侧边栏'),
    createExactMapping('Hide Sidebar', '隐藏侧边栏'),
    createExactMapping('Resize sidebar', '调整侧边栏大小'),
    createExactMapping('Resize changes sidebar', '调整变更侧边栏大小'),
    createExactMapping('Agent Layout', '智能体布局'),
    createExactMapping('Focus on Agent chats', '聚焦智能体对话'),
    createExactMapping('Chat Messages', '对话消息'),
    createExactMapping('New Chat', '新建对话'),
    createExactMapping('Start New Chat', '开始新对话'),
    createExactMapping('Replace Chat', '替换对话'),
    createExactMapping('Past Chats', '历史对话'),
    createExactMapping('Send to Chat', '发送到对话'),
    createExactMapping('Add to Chat', '添加到对话'),
    createExactMapping('Fork Chat', '分叉对话'),
    createExactMapping('Open in New Tab', '在新标签页中打开'),
    createExactMapping('Delete chat', '删除对话'),
    createExactMapping('Rename Chat', '重命名对话'),
    createExactMapping('Close Chat', '关闭对话'),
    createExactMapping('Close Other Chats', '关闭其他对话'),
    createExactMapping('Archive Prior Chats', '归档旧对话'),
    createExactMapping('New project', '新建项目'),
    createExactMapping('Open project', '打开项目'),
    createExactMapping('Recent projects', '最近项目'),
    createExactMapping('View all', '查看全部'),
    createExactMapping('Try a new window for running parallel agents', '试试新开一个窗口运行并行智能体'),
    createExactMapping('Clone repo', '克隆仓库'),
    createExactMapping('Connect via SSH', '通过 SSH 连接'),
    createExactMapping('New Window', '新建窗口'),
    createExactMapping('Open Folder...', '打开文件夹...'),
    createExactMapping('Open Workspace from File...', '从文件打开工作区...'),
    createExactMapping('Open Recent...', '打开最近使用...'),
    createExactMapping('Add Folder to Workspace...', '将文件夹添加到工作区...'),
    createExactMapping('Add files, folders, docs...', '添加文件、文件夹、文档...'),
    createExactMapping('No files found', '未找到文件'),
    createExactMapping('No matches found', '未找到匹配项'),
    createExactMapping('No messages yet', '还没有消息'),
    createExactMapping('Show Chat History', '显示聊天记录'),
    createExactMapping('Try Again', '重试'),
    createExactMapping('Open in New Window', '在新窗口中打开'),
    createExactMapping('Waiting to be applied', '等待应用'),
    createExactMapping('Listing resources', '正在列出资源'),
    createExactMapping('No MCP resources available', '没有可用的 MCP 资源'),
    createExactMapping('Error loading plugin', '加载插件失败'),
    createExactMapping('Copy error details', '复制错误详情'),
    createExactMapping('View Details', '查看详情'),
    createExactMapping('Try in Chat', '在对话中试用'),
    createExactMapping('Open in Chat', '在对话中打开'),
    createExactMapping('Remove from Cursor', '从 Cursor 中移除'),
    createExactMapping(
      'Enter a GitHub repository URL containing a plugin marketplace',
      '输入一个包含插件市场的 GitHub 仓库 URL'
    ),
    createExactMapping('GitHub Repository URL', 'GitHub 仓库 URL'),
    createExactMapping('Please enter a GitHub URL', '请输入 GitHub URL'),
    createExactMapping('Import from GitHub', '从 GitHub 导入'),
    createExactMapping('Failed to import from GitHub', '从 GitHub 导入失败'),
    createExactMapping(
      'This marketplace has already been imported. The plugins should already be available.',
      '该市场已导入，相关插件应该已经可用'
    ),
    createExactMapping(
      'Only extensions that are available in the Cursor Marketplace can be imported.',
      '只有 Cursor 插件市场中可用的扩展才能被导入'
    ),
    createExactMapping('Try a different search term or browse by category', '试试其他搜索词，或按分类浏览'),
    createExactMapping('Suggested', '推荐'),
    createExactMapping('Imported', '已导入'),
    createExactMapping('Local', '本地'),
    createExactMapping('Cancel', '取消'),
    createExactMapping('Close', '关闭'),
    createExactMapping('Import', '导入'),
    createExactMapping('Importing...', '正在导入...'),
    createExactMapping('Verified by Cursor', '由 Cursor 验证'),
    createExactMapping('More Options', '更多选项'),
    createExactMapping('Open', '打开'),
    createExactMapping('Log Out', '退出登录'),
    createExactMapping('Quick Chat', '\u5feb\u901f\u5bf9\u8bdd'),
    createExactMapping('Settings...', '\u8bbe\u7f6e...'),
    createExactMapping('Close Window', '\u5173\u95ed\u7a97\u53e3'),
    createNormalizedExactMapping('Close Window', '\u5173\u95ed\u7a97\u53e3'),
    createExactMapping('Exit', '\u9000\u51fa'),
    createNormalizedExactMapping('Exit', '\u9000\u51fa'),
    createExactMapping('New Terminal', '\u65b0\u5efa\u7ec8\u7aef'),
    createExactMapping('New Browser', '\u65b0\u5efa\u6d4f\u89c8\u5668'),
    createExactMapping('New Browser Tab', '\u65b0\u5efa\u6d4f\u89c8\u5668\u6807\u7b7e\u9875'),
    createExactMapping('Command Palette', '\u547d\u4ee4\u9762\u677f'),
    createExactMapping('View License', '\u67e5\u770b\u8bb8\u53ef'),
    createExactMapping('Upgrade to Pro', '\u5347\u7ea7\u5230 Pro'),
    createExactMapping('Upgrade to unlock premium models', '\u5347\u7ea7\u4ee5\u89e3\u9501\u9ad8\u7ea7\u6a21\u578b'),
    createExactMapping(
      'Premium models are only available on paid plans.',
      '\u9ad8\u7ea7\u6a21\u578b\u4ec5\u5728\u4ed8\u8d39\u5957\u9910\u4e2d\u53ef\u7528\u3002'
    ),
    createExactMapping('Upgrade to a Pro account', '\u5347\u7ea7\u5230 Pro \u8d26\u6237'),
    createExactMapping('Connect GitHub', '\u8fde\u63a5 GitHub'),
    createExactMapping(
      'Connect GitHub to create, update, and merge pull requests directly in Cursor.',
      '\u8fde\u63a5 GitHub\uff0c\u5373\u53ef\u76f4\u63a5\u5728 Cursor \u4e2d\u521b\u5efa\u3001\u66f4\u65b0\u548c\u5408\u5e76\u62c9\u53d6\u8bf7\u6c42\u3002'
    ),
    createExactMapping('Free Plan', '\u514d\u8d39\u7248'),
    createExactMapping('Update', '\u66f4\u65b0'),
    createExactMapping(
      'Entry-level plan with access to premium models, unlimited Tab completions, and more.',
      '\u5165\u95e8\u7248\u8ba1\u5212\uff0c\u652f\u6301\u9ad8\u7ea7\u6a21\u578b\u3001\u65e0\u9650 Tab \u8865\u5168\u7b49\u66f4\u591a\u529f\u80fd\u3002'
    ),
    createExactMapping('Quit Cursor?', '\u9000\u51fa Cursor\uff1f'),
    createExactMapping('Close this window?', '\u5173\u95ed\u6b64\u7a97\u53e3\uff1f'),
    createExactMapping('Are you sure you want to quit?', '\u4f60\u786e\u5b9a\u8981\u9000\u51fa\u5417\uff1f'),
    createExactMapping(
      'Are you sure you want to close this window?',
      '\u4f60\u786e\u5b9a\u8981\u5173\u95ed\u6b64\u7a97\u53e3\u5417\uff1f'
    ),
    createExactMapping('Quit', '\u9000\u51fa'),
    createExactMapping('Zoom In', '\u653e\u5927'),
    createNormalizedExactMapping('Zoom In', '\u653e\u5927'),
    createExactMapping('Set Zoom Level', '\u8bbe\u7f6e\u7f29\u653e\u7ea7\u522b'),
    createNormalizedExactMapping('Set Zoom Level', '\u8bbe\u7f6e\u7f29\u653e\u7ea7\u522b'),
    createExactMapping('Zoom Out', '\u7f29\u5c0f'),
    createNormalizedExactMapping('Zoom Out', '\u7f29\u5c0f'),
    createExactMapping('Reset Zoom', '\u91cd\u7f6e\u7f29\u653e'),
    createNormalizedExactMapping('Reset Zoom', '\u91cd\u7f6e\u7f29\u653e'),
    createExactMapping('Current Window', '\u5f53\u524d\u7a97\u53e3'),
    createExactMapping(
      'Select a window to switch to',
      '\u9009\u62e9\u8981\u5207\u6362\u5230\u7684\u7a97\u53e3'
    ),
    createExactMapping('Switch Window...', '\u5207\u6362\u7a97\u53e3...'),
    createExactMapping('Quick Switch Window...', '\u5feb\u901f\u5207\u6362\u7a97\u53e3...'),
    createExactMapping('Open Cursor Settings', '\u6253\u5f00 Cursor \u8bbe\u7f6e'),
    createExactMapping('Cursor Settings', 'Cursor \u8bbe\u7f6e'),
    createExactMapping('Split Right', '\u5411\u53f3\u62c6\u5206'),
    createExactMapping('Split Down', '\u5411\u4e0b\u62c6\u5206'),
    createExactMapping('About Cursor', '\u5173\u4e8e Cursor'),
    createExactMapping('Check for Updates...', '\u68c0\u67e5\u66f4\u65b0...'),
    createExactMapping('Open Files', '\u6253\u5f00\u6587\u4ef6'),
    createExactMapping(
      'Open Layout Settings Menu',
      '\u6253\u5f00\u5e03\u5c40\u8bbe\u7f6e\u83dc\u5355'
    ),
    createExactMapping('Switch Layout', '\u5207\u6362\u5e03\u5c40'),
    createExactMapping('Maximize Chat Size', '\u6700\u5927\u5316\u5bf9\u8bdd\u533a\u57df'),
    createExactMapping('Minimize Chat', '\u6700\u5c0f\u5316\u5bf9\u8bdd'),
    createExactMapping('Toggle Inline Diffs', '\u5207\u6362\u5185\u8054\u5dee\u5f02'),
    createExactMapping('Toggle Agents Side Bar', '\u5207\u6362\u667a\u80fd\u4f53\u4fa7\u8fb9\u680f'),
    createExactMapping('Move Side Bar Right', '\u5c06\u4fa7\u8fb9\u680f\u79fb\u5230\u53f3\u4fa7'),
    createExactMapping('Move Side Bar Left', '\u5c06\u4fa7\u8fb9\u680f\u79fb\u5230\u5de6\u4fa7'),
    createExactMapping('Restart to Update', '\u91cd\u542f\u4ee5\u66f4\u65b0'),
    createExactMapping('Chat History', '\u804a\u5929\u8bb0\u5f55'),
    createExactMapping('Open Agents Window', '\u6253\u5f00\u667a\u80fd\u4f53\u7a97\u53e3'),
    createExactMapping('More Actions', '\u66f4\u591a\u64cd\u4f5c'),
    createExactMapping('Toggle Primary Side Bar', '\u5207\u6362\u4e3b\u4fa7\u8fb9\u680f'),
    createExactMapping('Toggle Agents', '\u5207\u6362\u667a\u80fd\u4f53'),
    createExactMapping('Go Back', '\u540e\u9000'),
    createExactMapping('Go Forward', '\u524d\u8fdb'),
    createExactMapping('Left title actions', '\u5de6\u4fa7\u6807\u9898\u680f\u64cd\u4f5c'),
    createExactMapping('Navigation actions', '\u5bfc\u822a\u64cd\u4f5c'),
    createExactMapping('Open Settings (UI)', '\u6253\u5f00\u8bbe\u7f6e\uff08UI\uff09'),
    createExactMapping('Open Settings (JSON)', '\u6253\u5f00\u8bbe\u7f6e\uff08JSON\uff09'),
    createExactMapping('Open User Settings', '\u6253\u5f00\u7528\u6237\u8bbe\u7f6e'),
    createExactMapping(
      'Open User Settings (JSON)',
      '\u6253\u5f00\u7528\u6237\u8bbe\u7f6e\uff08JSON\uff09'
    ),
    createExactMapping('Open Workspace Settings', '\u6253\u5f00\u5de5\u4f5c\u533a\u8bbe\u7f6e'),
    createExactMapping(
      'Open Workspace Settings (JSON)',
      '\u6253\u5f00\u5de5\u4f5c\u533a\u8bbe\u7f6e\uff08JSON\uff09'
    ),
    createExactMapping(
      'Open Application Settings (JSON)',
      '\u6253\u5f00\u5e94\u7528\u8bbe\u7f6e\uff08JSON\uff09'
    ),
    createExactMapping('Open Folder Settings', '\u6253\u5f00\u6587\u4ef6\u5939\u8bbe\u7f6e'),
    createExactMapping(
      'Open Folder Settings (JSON)',
      '\u6253\u5f00\u6587\u4ef6\u5939\u8bbe\u7f6e\uff08JSON\uff09'
    ),
    createExactMapping('Show Settings', '\u663e\u793a\u8bbe\u7f6e'),
    createExactMapping('Focus Settings Search', '\u805a\u7126\u8bbe\u7f6e\u641c\u7d22'),
    createExactMapping(
      'Focus Settings Table of Contents',
      '\u805a\u7126\u8bbe\u7f6e\u76ee\u5f55'
    ),
    createExactMapping(
      'Clear Settings Search Results',
      '\u6e05\u9664\u8bbe\u7f6e\u641c\u7d22\u7ed3\u679c'
    ),
    createExactMapping('Settings Sync', '\u8bbe\u7f6e\u540c\u6b65'),
    createExactMapping('VS Code Settings', 'VS Code \u8bbe\u7f6e'),
    createNormalizedExactMapping('VS Code Settings', 'VS Code \u8bbe\u7f6e'),
    createExactMapping('Agent Review', '\u667a\u80fd\u4f53\u5ba1\u67e5'),
    createExactMapping('Agent Review Settings', '\u667a\u80fd\u4f53\u5ba1\u67e5\u8bbe\u7f6e'),
    createExactMapping('Start Agent Review', '\u5f00\u59cb\u667a\u80fd\u4f53\u5ba1\u67e5'),
    createExactMapping('New Agent', '\u65b0\u5efa\u667a\u80fd\u4f53'),
    createExactMapping('Marketplace', '\u5e02\u573a'),
    createExactMapping('Home', '\u9996\u9875'),
    createExactMapping('Customize', '\u81ea\u5b9a\u4e49'),
    createExactMapping('Open Workspace', '\u6253\u5f00\u5de5\u4f5c\u533a'),
    createExactMapping(
      'Ask questions without making changes...',
      '\u63d0\u95ee\u4f46\u4e0d\u4fee\u6539\u5185\u5bb9...'
    ),
    createExactMapping(
      'Plan, Build, / for skills, @ for context',
      '\u89c4\u5212\u3001\u6784\u5efa\uff0c/ \u7528\u4e8e\u6280\u80fd\uff0c@ \u7528\u4e8e\u4e0a\u4e0b\u6587'
    ),
    createExactMapping('Plan New Idea', '\u89c4\u5212\u65b0\u60f3\u6cd5'),
    createExactMapping('Auto', '\u81ea\u52a8'),
    createExactMapping(
      'Plan and design before coding...',
      '\u7f16\u7801\u524d\u5148\u89c4\u5212\u548c\u8bbe\u8ba1...'
    ),
    createExactMapping(
      'Coordinate parallel tasks...',
      '\u534f\u8c03\u5e76\u884c\u4efb\u52a1...'
    ),
    createExactMapping(
      'Debug and troubleshoot issues...',
      '\u8c03\u8bd5\u5e76\u6392\u67e5\u95ee\u9898...'
    ),
    createExactMapping('Ask', '\u63d0\u95ee'),
    createExactMapping(
      'Build a plan before starting code to improve agent execution. Use /plan to get started',
      '\u5728\u5f00\u59cb\u7f16\u5199\u4ee3\u7801\u524d\u5148\u5236\u5b9a\u8ba1\u5212\uff0c\u4ee5\u63d0\u5347\u667a\u80fd\u4f53\u6267\u884c\u6548\u679c\u3002\u4f7f\u7528 /plan \u5f00\u59cb\u3002'
    ),
    createExactMapping(
      'Use /multi-model-review to get an adversarial code review from several models',
      '\u4f7f\u7528 /multi-model-review \u53ef\u4ece\u591a\u4e2a\u6a21\u578b\u83b7\u5f97\u5bf9\u6297\u5f0f\u4ee3\u7801\u5ba1\u67e5'
    ),
    createExactMapping(
      'After long sessions, use /split-to-prs to turn your work into small, reviewable PRs',
      '\u957f\u65f6\u95f4\u4f1a\u8bdd\u540e\uff0c\u4f7f\u7528 /split-to-prs \u5c06\u4f60\u7684\u5de5\u4f5c\u62c6\u5206\u4e3a\u5c0f\u578b\u3001\u6613\u4e8e\u5ba1\u67e5\u7684 PR'
    ),
    createExactMapping(
      'Plugins help you customize Cursor for your workflows. Use /add-plugin to get started',
      '\u63d2\u4ef6\u53ef\u5e2e\u52a9\u4f60\u6309\u5de5\u4f5c\u6d41\u81ea\u5b9a\u4e49 Cursor\u3002\u4f7f\u7528 /add-plugin \u5f00\u59cb\u3002'
    ),
    createExactMapping(
      'Skills extend Cursor with specialized knowledge. Use /create-skill to get started',
      '\u6280\u80fd\u53ef\u4e3a Cursor \u6269\u5c55\u4e13\u4e1a\u5316\u77e5\u8bc6\u3002\u4f7f\u7528 /create-skill \u5f00\u59cb\u3002'
    ),
    createExactMapping(
      'Use /create-skill to customize Cursor for your workflows',
      '\u4f7f\u7528 /create-skill \u6309\u4f60\u7684\u5de5\u4f5c\u6d41\u81ea\u5b9a\u4e49 Cursor'
    ),
    createExactMapping(
      'Use /canvas to get interactive visualizations like dashboards from Cursor',
      '\u4f7f\u7528 /canvas \u4ece Cursor \u83b7\u53d6\u4eea\u8868\u76d8\u7b49\u4ea4\u4e92\u5f0f\u53ef\u89c6\u5316'
    ),
    createExactMapping(
      'Cursor can respond with interactive visualizations alongside text. Use /canvas to get started',
      'Cursor \u53ef\u4ee5\u5728\u6587\u672c\u65c1\u751f\u6210\u4ea4\u4e92\u5f0f\u53ef\u89c6\u5316\u3002\u4f7f\u7528 /canvas \u5f00\u59cb\u3002'
    ),
    createExactMapping(
      'Plan Mode improves agent outcomes and accuracy. Use shift+tab to enable',
      '\u89c4\u5212\u6a21\u5f0f\u53ef\u63d0\u5347\u667a\u80fd\u4f53\u7ed3\u679c\u4e0e\u51c6\u786e\u6027\u3002\u4f7f\u7528 shift+tab \u542f\u7528'
    ),
    createExactMapping(
      'Use MCPs to give Cursor access to tools and data. Configure MCPs in your Cursor Settings',
      '\u4f7f\u7528 MCP \u8ba9 Cursor \u8bbf\u95ee\u5de5\u5177\u548c\u6570\u636e\u3002\u8bf7\u5728 Cursor \u8bbe\u7f6e\u4e2d\u914d\u7f6e MCP'
    ),
    createExactMapping(
      'Use /shell to run commands in the terminal',
      '\u4f7f\u7528 /shell \u5728\u7ec8\u7aef\u4e2d\u8fd0\u884c\u547d\u4ee4'
    ),
    createExactMapping(
      'Drag and drop agent chats to split your view into tiled panes',
      '\u62d6\u653e\u667a\u80fd\u4f53\u5bf9\u8bdd\u5373\u53ef\u5c06\u89c6\u56fe\u62c6\u5206\u4e3a\u5e73\u94fa\u7a97\u683c'
    ),
    createExactMapping(
      'Use /multitask to run subagents to parallelize your requests instead of queuing them',
      '\u4f7f\u7528 /multitask \u8fd0\u884c\u5b50\u667a\u80fd\u4f53\uff0c\u4ee5\u5e76\u884c\u5904\u7406\u4f60\u7684\u8bf7\u6c42\uff0c\u800c\u4e0d\u662f\u5c06\u5b83\u4eec\u6392\u961f\u7b49\u5f85'
    ),
    createExactMapping(
      'Use /in-cloud for cloud subagents',
      '\u4f7f\u7528 /in-cloud \u542f\u7528\u4e91\u7aef\u5b50\u667a\u80fd\u4f53'
    ),
    createExactMapping(
      'Voice mode lets you dictate better prompts. Click or hold ctrl+M to enable',
      '\u8bed\u97f3\u6a21\u5f0f\u53ef\u5e2e\u52a9\u4f60\u53e3\u8ff0\u51fa\u66f4\u597d\u7684\u63d0\u793a\u8bcd\u3002\u70b9\u51fb\u6216\u6309\u4f4f ctrl+M \u542f\u7528'
    ),
    createExactMapping(
      'Use ctrl + D to split your view into tiled panes',
      '\u4f7f\u7528 ctrl + D \u5c06\u89c6\u56fe\u62c6\u5206\u4e3a\u5e73\u94fa\u7a97\u683c'
    ),
    createExactMapping(
      'Use /create-rule to control agent behavior through system-level instructions',
      '\u4f7f\u7528 /create-rule \u901a\u8fc7\u7cfb\u7edf\u7ea7\u6307\u4ee4\u63a7\u5236\u667a\u80fd\u4f53\u884c\u4e3a'
    ),
    createExactMapping(
      'Use /debug to solve bugs that are hard to reproduce or understand',
      '\u4f7f\u7528 /debug \u89e3\u51b3\u96be\u4ee5\u590d\u73b0\u6216\u7406\u89e3\u7684 Bug'
    ),
    createExactMapping(
      'Use /bisect to find the exact commit that introduced a certain bug',
      '\u4f7f\u7528 /bisect \u627e\u5230\u5f15\u5165\u67d0\u4e2a\u7f3a\u9677\u7684\u51c6\u786e\u63d0\u4ea4'
    ),
    createExactMapping(
      'Use /create-subagent to set up specialized agents that Cursor can use to parallelize work',
      '\u4f7f\u7528 /create-subagent \u8bbe\u7f6e Cursor \u53ef\u7528\u4e8e\u5e76\u884c\u5de5\u4f5c\u7684\u4e13\u7528\u667a\u80fd\u4f53'
    ),
    createExactMapping(
      'Create a multi-root workspace so Cursor can work across many repos at once',
      '\u521b\u5efa\u591a\u6839\u5de5\u4f5c\u533a\uff0c\u8ba9 Cursor \u53ef\u4ee5\u4e00\u6b21\u5904\u7406\u591a\u4e2a\u4ed3\u5e93'
    ),
    createExactMapping(
      'Use /model to pick the best model for your task. Composer offers a great balance for cost vs. capability',
      '\u4f7f\u7528 /model \u4e3a\u4f60\u7684\u4efb\u52a1\u9009\u62e9\u6700\u5408\u9002\u7684\u6a21\u578b\u3002Composer \u5728\u6210\u672c\u4e0e\u80fd\u529b\u4e4b\u95f4\u63d0\u4f9b\u4e86\u5f88\u597d\u7684\u5e73\u8861'
    ),
    createExactMapping(
      'Use cloud agents for better parallelization and durable execution. Go to cursor.com/agents',
      '\u4f7f\u7528\u4e91\u7aef\u667a\u80fd\u4f53\u53ef\u83b7\u5f97\u66f4\u597d\u7684\u5e76\u884c\u5316\u4e0e\u6301\u4e45\u6267\u884c\u80fd\u529b\u3002\u524d\u5f80 cursor.com/agents'
    ),
    createExactMapping(
      'Debug Mode reproduces and solves hard bugs. Use shift+tab to enable',
      '\u8c03\u8bd5\u6a21\u5f0f\u53ef\u590d\u73b0\u5e76\u89e3\u51b3\u68d8\u624b\u7684 Bug\u3002\u4f7f\u7528 shift+tab \u542f\u7528'
    ),
    createExactMapping('Run Cursor anywhere...', '\u968f\u5904\u8fd0\u884c Cursor...'),
    createExactMapping('Recents', '\u6700\u8fd1'),
    createExactMapping('Run On', '\u8fd0\u884c\u4f4d\u7f6e'),
    createExactMapping('This PC', '\u6b64\u7535\u8111'),
    createExactMapping('Repos', '\u4ed3\u5e93'),
    createExactMapping('Set Up Workspace', '\u8bbe\u7f6e\u5de5\u4f5c\u533a'),
    createExactMapping('Connect SSH', '\u8fde\u63a5 SSH'),
    createExactMapping('Open Folder', '\u6253\u5f00\u6587\u4ef6\u5939'),
    createExactMapping('Open File', '\u6253\u5f00\u6587\u4ef6'),
    createExactMapping('Open File...', '\u6253\u5f00\u6587\u4ef6...'),
    createExactMapping('Search files', '\u641c\u7d22\u6587\u4ef6'),
    createExactMapping('Add to Team', '\u6dfb\u52a0\u5230\u56e2\u961f'),
    createExactMapping('Show Less', '\u663e\u793a\u66f4\u5c11'),
    createExactMapping('Sign Up', '\u6ce8\u518c'),
    createExactMapping('Log In', '\u767b\u5f55'),
    createExactMapping('More Themes', '\u66f4\u591a\u4e3b\u9898'),
    createExactMapping('Preview', '\u9884\u89c8'),
    createExactMapping('Save to Workspace', '\u4fdd\u5b58\u5230\u5de5\u4f5c\u533a'),
    createExactMapping('Skip For Now', '\u6682\u65f6\u8df3\u8fc7'),
    createExactMapping('Skip this step', '\u8df3\u8fc7\u8fd9\u4e00\u6b65'),
    createExactMapping(
      'The best way to code with AI',
      '\u7528 AI \u7f16\u7801\u7684\u6700\u4f73\u65b9\u5f0f'
    ),
    createExactMapping('Add for Myself', '\u4e3a\u6211\u6dfb\u52a0'),
    createExactMapping('Add to Project', '\u6dfb\u52a0\u5230\u9879\u76ee'),
    createExactMapping('Removing...', '\u6b63\u5728\u79fb\u9664...'),
    createExactMapping('Installing...', '\u6b63\u5728\u5b89\u88c5...'),
    createExactMapping('Show More', '\u663e\u793a\u66f4\u591a'),
    createExactMapping('More actions', '\u66f4\u591a\u64cd\u4f5c'),
    createExactMapping('Collapse All', '\u5168\u90e8\u6298\u53e0'),
    createExactMapping('Expand All', '\u5168\u90e8\u5c55\u5f00'),
    createExactMapping(
      'Drag to adjust opacity',
      '\u62d6\u52a8\u4ee5\u8c03\u6574\u4e0d\u900f\u660e\u5ea6'
    ),
    createExactMapping(
      'Drag to adjust stroke weight',
      '\u62d6\u52a8\u4ee5\u8c03\u6574\u63cf\u8fb9\u7c97\u7ec6'
    ),
    createExactMapping(
      'Browser view not found',
      '\u672a\u627e\u5230\u6d4f\u89c8\u5668\u89c6\u56fe'
    ),
    createExactMapping('Unknown error', '\u672a\u77e5\u9519\u8bef'),
    createExactMapping('Copy Request ID', '\u590d\u5236\u8bf7\u6c42 ID'),
    createExactMapping(
      'Open in Prompt Quality',
      '\u5728 Prompt Quality \u4e2d\u6253\u5f00'
    ),
    createExactMapping('File', '文件'),
    createExactMapping('Edit', '\u7f16\u8f91'),
    createExactMapping('View', '视图'),
    createExactMapping('Window', '\u7a97\u53e3'),
    createExactMapping('Help', '帮助'),
    createExactMapping('Show Panel', '显示面板'),
    createExactMapping('Subagents', '子智能体'),
    createExactMapping('Show all (<!> more)', '显示全部（还有 <!> 项）'),
    createExactMapping('Show less', '收起'),
    createExactMapping('Hue', '色相'),
    createExactMapping('Choose a tint color', '选择强调色'),
    createExactMapping('Intensity', '强度'),
    createExactMapping('Control how strongly the tint is applied', '控制强调色应用强度'),
    createExactMapping('Reset to default font size', '恢复默认字体大小'),
    createExactMapping('Decrease font size', '减小字体大小'),
    createExactMapping('Increase font size', '增大字体大小'),
    createExactMapping('MCP Servers', 'MCP 服务器'),
    createExactMapping('Browser Automation', '浏览器自动化'),
    createExactMapping('Browser automation disabled', '浏览器自动化已关闭'),
    createExactMapping(
      'Add a custom MCP tool in your user MCP config.',
      '在你的用户 MCP 配置中添加自定义 MCP 工具。'
    ),
    createExactMapping('Add Custom MCP', '添加自定义 MCP'),
    createExactMapping('Configured in the dashboard', '已在控制台中配置'),
    createExactMapping(
      'Configure MCP servers in the dashboard to make them available in Cursor on desktop and in the cloud.',
      '在控制台中配置 MCP 服务器，使其可在桌面端和云端的 Cursor 中使用。'
    ),
    createExactMapping('Configure Team MCP Servers', '配置团队 MCP 服务器'),
    createExactMapping('Required Domains', '必需域名'),
    createExactMapping('Copy Domains', '复制域名'),
    createExactMapping('Extension RPC Tracer', '扩展 RPC 跟踪器'),
    createExactMapping('Tool Call Density', '\u5de5\u5177\u8c03\u7528\u5bc6\u5ea6'),
    createExactMapping(
      'Adjust how much detail is shown for tool calls',
      '\u8c03\u6574\u5de5\u5177\u8c03\u7528\u663e\u793a\u7684\u7ec6\u8282\u7a0b\u5ea6'
    ),
    createExactMapping('Queue Messages', '\u6d88\u606f\u6392\u961f'),
    createExactMapping(
      'Adjust the default behavior of sending a message while Agent is running',
      '\u8c03\u6574 Agent \u8fd0\u884c\u65f6\u53d1\u9001\u6d88\u606f\u7684\u9ed8\u8ba4\u884c\u4e3a'
    ),
    createExactMapping(
      'Send after current message',
      '\u5728\u5f53\u524d\u6d88\u606f\u540e\u53d1\u9001'
    ),
    createExactMapping('Agent Autocomplete', 'Agent \u81ea\u52a8\u8865\u5168'),
    createExactMapping(
      'Contextual suggestions while prompting Agent',
      '\u5728\u63d0\u793a Agent \u65f6\u63d0\u4f9b\u4e0a\u4e0b\u6587\u5efa\u8bae'
    ),
    createExactMapping(
      'Show rotating tips on the empty screen',
      '\u5728\u7a7a\u767d\u754c\u9762\u8f6e\u6362\u663e\u793a\u63d0\u793a'
    ),
    createExactMapping(
      'Auto-Approve Mode Transitions',
      '\u81ea\u52a8\u6279\u51c6\u6a21\u5f0f\u5207\u6362'
    ),
    createExactMapping(
      'Allow Agent to switch modes without asking first, such as Agent to Plan or Agent to Debug. When off, Cursor asks before switching.',
      '\u5141\u8bb8 Agent \u65e0\u9700\u4e8b\u5148\u8be2\u95ee\u5373\u53ef\u5207\u6362\u6a21\u5f0f\uff0c\u4f8b\u5982\u4ece Agent \u5207\u6362\u5230 Plan \u6216\u4ece Agent \u5207\u6362\u5230 Debug\u3002\u5173\u95ed\u540e\uff0cCursor \u4f1a\u5728\u5207\u6362\u524d\u8be2\u95ee\u3002'
    ),
    createExactMapping(
      'Explore subagent model',
      'Explore \u5b50\u667a\u80fd\u4f53\u6a21\u578b'
    ),
    createExactMapping(
      'The Explore subagent is used to do initial research for the main agent',
      'Explore \u5b50\u667a\u80fd\u4f53\u7528\u4e8e\u4e3a\u4e3b\u667a\u80fd\u4f53\u6267\u884c\u521d\u6b65\u7814\u7a76'
    ),
    createExactMapping(
      'Auto-Accept Web Search',
      '\u81ea\u52a8\u63a5\u53d7\u7f51\u9875\u641c\u7d22'
    ),
    createExactMapping(
      'Skip approval dialog; Agent may run web searches automatically',
      '\u8df3\u8fc7\u6279\u51c6\u5bf9\u8bdd\u6846\uff1bAgent \u53ef\u81ea\u52a8\u6267\u884c\u7f51\u9875\u641c\u7d22'
    ),
    createExactMapping('Ignored Files', '\u5ffd\u7565\u7684\u6587\u4ef6'),
    createExactMapping(
      'Glob patterns for files where Cursor Tab will not suggest',
      '\u7528\u4e8e\u6307\u5b9a Cursor Tab \u4e0d\u63d0\u4f9b\u5efa\u8bae\u7684\u6587\u4ef6\u5339\u914d\u6a21\u5f0f'
    ),
    createExactMapping(
      'Connected to Browser Tab',
      '\u5df2\u8fde\u63a5\u5230\u6d4f\u89c8\u5668\u6807\u7b7e\u9875'
    ),
    createExactMapping(
      'Open Web Links in Browser',
      '\u5728\u6d4f\u89c8\u5668\u4e2d\u6253\u5f00\u7f51\u9875\u94fe\u63a5'
    ),
    createExactMapping(
      'Automatically open http and https links in the Browser Tab',
      '\u81ea\u52a8\u5728\u6d4f\u89c8\u5668\u6807\u7b7e\u9875\u4e2d\u6253\u5f00 http \u548c https \u94fe\u63a5'
    ),
    createExactMapping(
      'Servers available in this workspace.',
      '\u6b64\u5de5\u4f5c\u533a\u4e2d\u53ef\u7528\u7684\u670d\u52a1\u5668\u3002'
    ),
    createExactMapping(
      'Hooks let you run custom scripts at specific points during the agent\'s execution to modify behavior, enforce policies, or add custom logging.',
      'Hooks \u5141\u8bb8\u4f60\u5728\u667a\u80fd\u4f53\u6267\u884c\u8fc7\u7a0b\u4e2d\u7684\u7279\u5b9a\u65f6\u673a\u8fd0\u884c\u81ea\u5b9a\u4e49\u811a\u672c\uff0c\u4ee5\u4fee\u6539\u884c\u4e3a\u3001\u5f3a\u5236\u6267\u884c\u7b56\u7565\u6216\u6dfb\u52a0\u81ea\u5b9a\u4e49\u65e5\u5fd7\u3002'
    ),
    createExactMapping('Execution Log', '\u6267\u884c\u65e5\u5fd7'),
    createExactMapping('Clear log', '\u6e05\u7a7a\u65e5\u5fd7'),
    createExactMapping('No hook executions yet', '\u6682\u65e0 Hook \u6267\u884c\u8bb0\u5f55'),
    createExactMapping('Index New Folders', '\u7d22\u5f15\u65b0\u6587\u4ef6\u5939'),
    createExactMapping(
      'Index Repositories for Instant Grep',
      '\u4e3a Instant Grep \u7d22\u5f15\u4ed3\u5e93'
    ),
    createExactMapping(
      'Automatically index repositories to speed up Grep searches. All data is stored locally.',
      '\u81ea\u52a8\u7d22\u5f15\u4ed3\u5e93\u4ee5\u52a0\u5feb Grep \u641c\u7d22\u3002\u6240\u6709\u6570\u636e\u5747\u5b58\u50a8\u5728\u672c\u5730\u3002'
    ),
    createExactMapping(
      'These domains must be accessible for Cursor to function. Add them to your firewall or proxy allowlist.',
      '\u8fd9\u4e9b\u57df\u540d\u5fc5\u987b\u53ef\u8bbf\u95ee\uff0cCursor \u624d\u80fd\u6b63\u5e38\u8fd0\u884c\u3002\u8bf7\u5c06\u5b83\u4eec\u6dfb\u52a0\u5230\u9632\u706b\u5899\u6216\u4ee3\u7406\u7684\u5141\u8bb8\u5217\u8868\u4e2d\u3002'
    ),
    createExactMapping(
      'Check network connectivity to all Cursor services',
      '\u68c0\u67e5\u4e0e\u6240\u6709 Cursor \u670d\u52a1\u7684\u7f51\u7edc\u8fde\u63a5\u60c5\u51b5'
    ),
    createExactMapping(
      'Log extension host RPC messages to JSON files viewable in Perfetto for performance analysis. Requires a restart to take effect.',
      '\u5c06\u6269\u5c55\u5bbf\u4e3b RPC \u6d88\u606f\u8bb0\u5f55\u4e3a\u53ef\u5728 Perfetto \u4e2d\u67e5\u770b\u7684 JSON \u6587\u4ef6\u4ee5\u8fdb\u884c\u6027\u80fd\u5206\u6790\u3002\u9700\u8981\u91cd\u542f\u540e\u751f\u6548\u3002'
    ),
    createExactMapping(
      'Use /loop to run a prompt on a schedule or keep a local agent running continuously',
      '\u4f7f\u7528 /loop \u53ef\u6309\u8ba1\u5212\u8fd0\u884c\u63d0\u793a\u8bcd\uff0c\u6216\u8ba9\u672c\u5730\u667a\u80fd\u4f53\u6301\u7eed\u8fd0\u884c'
    ),
    createExactMapping('Editor Window', '\u7f16\u8f91\u5668\u7a97\u53e3'),
    createExactMapping('Motion', '\u52a8\u6548'),
    createExactMapping('Reduce Motion', '\u51cf\u5c11\u52a8\u6548'),
    createExactMapping(
      'Minimize interface animations. System follows your OS preference.',
      '\u5c3d\u91cf\u51cf\u5c11\u754c\u9762\u52a8\u753b\u3002\u8ddf\u968f\u7cfb\u7edf\u65f6\u4f1a\u9075\u5faa\u4f60\u7684\u64cd\u4f5c\u7cfb\u7edf\u504f\u597d\u3002'
    ),
    createExactMapping('Web Fetch Tool', '\u7f51\u9875\u6293\u53d6\u5de5\u5177'),
    createExactMapping(
      'Allow Agent to fetch content from URLs',
      '\u5141\u8bb8 Agent \u4ece URL \u6293\u53d6\u5185\u5bb9'
    ),
    createExactMapping(
      'Hierarchical Cursor Ignore',
      '\u5206\u5c42 Cursor Ignore'
    ),
    createExactMapping(
      'Apply .cursorignore files to all subdirectories. Changing this setting will require a restart of Cursor.',
      '\u5c06 .cursorignore \u6587\u4ef6\u5e94\u7528\u5230\u6240\u6709\u5b50\u76ee\u5f55\u3002\u66f4\u6539\u6b64\u8bbe\u7f6e\u9700\u8981\u91cd\u542f Cursor\u3002'
    ),
    createExactMapping(
      '\u26A0\uFE0F Use with caution. Skip symlinks during .cursorignore file discovery. Only enable if your repository has many symlinks and all .cursorignore files are reachable without them. Changing this setting will require a restart of Cursor.',
      '\u26A0\uFE0F \u8bf7\u8c28\u614e\u4f7f\u7528\u3002\u5728 .cursorignore \u6587\u4ef6\u53d1\u73b0\u8fc7\u7a0b\u4e2d\u8df3\u8fc7\u7b26\u53f7\u94fe\u63a5\u3002\u53ea\u6709\u5728\u4f60\u7684\u4ed3\u5e93\u5305\u542b\u5927\u91cf\u7b26\u53f7\u94fe\u63a5\uff0c\u4e14\u4e0d\u4f9d\u8d56\u5b83\u4eec\u4e5f\u80fd\u8bbf\u95ee\u5230\u6240\u6709 .cursorignore \u6587\u4ef6\u65f6\uff0c\u624d\u5efa\u8bae\u542f\u7528\u3002\u66f4\u6539\u6b64\u8bbe\u7f6e\u9700\u8981\u91cd\u542f Cursor\u3002'
    ),
    createExactMapping(
      'Approvals & Execution for commands, MCP and more',
      '\u547d\u4ee4\u3001MCP \u7b49\u7684\u5ba1\u6279\u4e0e\u6267\u884c'
    ),
    createExactMapping('Run Mode', '\u8fd0\u884c\u6a21\u5f0f'),
    createExactMapping(
      'Choose how Agents run tools like command execution, MCP, and file writes.',
      '\u9009\u62e9 Agent \u5982\u4f55\u8fd0\u884c\u547d\u4ee4\u6267\u884c\u3001MCP \u548c\u6587\u4ef6\u5199\u5165\u7b49\u5de5\u5177\u3002'
    ),
    createExactMapping(
      'Many commands will run automatically inside the sandbox, and you can also allowlist other actions.',
      '\u8bb8\u591a\u547d\u4ee4\u4f1a\u5728\u6c99\u7bb1\u5185\u81ea\u52a8\u8fd0\u884c\uff0c\u4f60\u4e5f\u53ef\u4ee5\u5c06\u5176\u4ed6\u64cd\u4f5c\u52a0\u5165\u5141\u8bb8\u5217\u8868\u3002'
    ),
    createExactMapping(
      'Allowlist (with Sandbox)',
      '\u5141\u8bb8\u5217\u8868\uff08\u542b\u6c99\u7bb1\uff09'
    ),
    createExactMapping('Ask Every Time', '\u6bcf\u6b21\u90fd\u8be2\u95ee'),
    createExactMapping('Allowlist', '\u5141\u8bb8\u5217\u8868'),
    createExactMapping('Auto-review', '\u81ea\u52a8\u5ba1\u67e5'),
    createExactMapping(
      'Auto-review (with Sandbox)',
      '\u81ea\u52a8\u5ba1\u67e5\uff08\u542b\u6c99\u7bb1\uff09'
    ),
    createExactMapping('Run Everything', '\u5168\u90e8\u8fd0\u884c'),
    createExactMapping(
      'Run Everything (Unsandboxed)',
      '\u5168\u90e8\u8fd0\u884c\uff08\u65e0\u6c99\u7bb1\uff09'
    ),
    createExactMapping(
      'Ask for permission before running each operation',
      '\u5728\u8fd0\u884c\u6bcf\u4e2a\u64cd\u4f5c\u524d\u8bf7\u6c42\u8bb8\u53ef'
    ),
    createExactMapping(
      'Tools will auto-run in a sandbox if possible, otherwise respect the allowlist or ask for approval',
      '\u5de5\u5177\u4f1a\u5c3d\u53ef\u80fd\u5728\u6c99\u7bb1\u4e2d\u81ea\u52a8\u8fd0\u884c\uff0c\u5426\u5219\u9075\u5faa\u5141\u8bb8\u5217\u8868\u6216\u8bf7\u6c42\u6279\u51c6'
    ),
    createExactMapping(
      'Automatically run operations after you approve them once',
      '\u5728\u4f60\u6279\u51c6\u4e00\u6b21\u540e\u81ea\u52a8\u8fd0\u884c\u8fd9\u4e9b\u64cd\u4f5c'
    ),
    createExactMapping('Auto-Run Network Access', '\u81ea\u52a8\u8fd0\u884c\u7f51\u7edc\u8bbf\u95ee'),
    createExactMapping(
      'Control which network requests are allowed when commands run in the sandbox.',
      '\u63a7\u5236\u547d\u4ee4\u5728\u6c99\u7bb1\u4e2d\u8fd0\u884c\u65f6\u5141\u8bb8\u54ea\u4e9b\u7f51\u7edc\u8bf7\u6c42\u3002'
    ),
    createExactMapping(
      'Edit allowed/denied domains in sandbox.json in your workspace.',
      '\u5728\u5de5\u4f5c\u533a\u7684 sandbox.json \u4e2d\u7f16\u8f91\u5141\u8bb8\u6216\u62d2\u7edd\u7684\u57df\u540d\u3002'
    ),
    createExactMapping(
      'sandbox.json + Defaults',
      'sandbox.json + \u9ed8\u8ba4\u503c'
    ),
    createExactMapping('sandbox.json Only', '\u4ec5 sandbox.json'),
    createExactMapping('Allow All', '\u5168\u90e8\u5141\u8bb8'),
    createExactMapping('Command Allowlist', '\u547d\u4ee4\u5141\u8bb8\u5217\u8868'),
    createExactMapping(
      'Commands that can run automatically',
      '\u53ef\u81ea\u52a8\u8fd0\u884c\u7684\u547d\u4ee4'
    ),
    createExactMapping('Add commands...', '\u6dfb\u52a0\u547d\u4ee4...'),
    createExactMapping('Add Suggestions', '\u6dfb\u52a0\u5efa\u8bae'),
    createExactMapping('MCP Allowlist', 'MCP \u5141\u8bb8\u5217\u8868'),
    createExactMapping(
      'MCP tools that can run automatically. Format: \'server:tool\', \'server:*\' for all tools from a server, \'*:tool\' for a tool from any server, or *:* for all tools from all servers',
      '\u53ef\u81ea\u52a8\u8fd0\u884c\u7684 MCP \u5de5\u5177\u3002\u683c\u5f0f\uff1a\'server:tool\'\u3001\'server:*\' \u8868\u793a\u67d0\u4e2a\u670d\u52a1\u5668\u7684\u5168\u90e8\u5de5\u5177\uff0c\'*:tool\' \u8868\u793a\u4efb\u610f\u670d\u52a1\u5668\u4e2d\u7684\u67d0\u4e2a\u5de5\u5177\uff0c*:* \u8868\u793a\u6240\u6709\u670d\u52a1\u5668\u7684\u5168\u90e8\u5de5\u5177'
    ),
    createExactMapping('Add MCP tools...', '\u6dfb\u52a0 MCP \u5de5\u5177...'),
    createExactMapping(
      'Fetch Domain Allowlist',
      '\u6293\u53d6\u57df\u540d\u5141\u8bb8\u5217\u8868'
    ),
    createExactMapping(
      'Domains that Agent can fetch from automatically. Use \'*\' for all domains, \'*.example.com\' for wildcard subdomains.',
      'Agent \u53ef\u81ea\u52a8\u6293\u53d6\u7684\u57df\u540d\u3002\u4f7f\u7528 \'*\' \u8868\u793a\u6240\u6709\u57df\u540d\uff0c\'*.example.com\' \u8868\u793a\u901a\u914d\u5b50\u57df\u540d\u3002'
    ),
    createExactMapping('Add domains...', '\u6dfb\u52a0\u57df\u540d...'),
    createExactMapping('Browser Protection', '\u6d4f\u89c8\u5668\u4fdd\u62a4'),
    createExactMapping(
      'Prevent Agent from automatically running Browser tools',
      '\u9632\u6b62 Agent \u81ea\u52a8\u8fd0\u884c\u6d4f\u89c8\u5668\u5de5\u5177'
    ),
    createExactMapping('MCP Tools Protection', 'MCP \u5de5\u5177\u4fdd\u62a4'),
    createExactMapping(
      'Prevent Agent from automatically running MCP tools',
      '\u9632\u6b62 Agent \u81ea\u52a8\u8fd0\u884c MCP \u5de5\u5177'
    ),
    createExactMapping(
      'File-Deletion Protection',
      '\u6587\u4ef6\u5220\u9664\u4fdd\u62a4'
    ),
    createExactMapping(
      'Prevent Agent from deleting files automatically',
      '\u9632\u6b62 Agent \u81ea\u52a8\u5220\u9664\u6587\u4ef6'
    ),
    createExactMapping(
      'External-File Protection',
      '\u5916\u90e8\u6587\u4ef6\u4fdd\u62a4'
    ),
    createExactMapping(
      'Prevent Agent from creating or modifying files outside of the workspace automatically',
      '\u9632\u6b62 Agent \u81ea\u52a8\u5728\u5de5\u4f5c\u533a\u5916\u521b\u5efa\u6216\u4fee\u6539\u6587\u4ef6'
    ),
    createExactMapping(
      'Inline Editing & Terminal',
      '\u884c\u5185\u7f16\u8f91\u4e0e\u7ec8\u7aef'
    ),
    createExactMapping(
      'Legacy Terminal Tool',
      '\u65e7\u7248\u7ec8\u7aef\u5de5\u5177'
    ),
    createExactMapping(
      'Use the legacy terminal tool in agent mode, for use on systems with unsupported shell configurations',
      '\u5728 Agent \u6a21\u5f0f\u4e0b\u4f7f\u7528\u65e7\u7248\u7ec8\u7aef\u5de5\u5177\uff0c\u9002\u7528\u4e8e Shell \u914d\u7f6e\u4e0d\u53d7\u652f\u6301\u7684\u7cfb\u7edf'
    ),
    createExactMapping('Voice Mode', '\u8bed\u97f3\u6a21\u5f0f'),
    createExactMapping('Recent Agents', '\u6700\u8fd1\u667a\u80fd\u4f53'),
    createExactMapping('No recent agents', '\u6682\u65e0\u6700\u8fd1\u667a\u80fd\u4f53'),
    createExactMapping('Clear All Notifications', '\u6e05\u9664\u6240\u6709\u901a\u77e5'),
    createExactMapping('Open Cursor', '\u6253\u5f00 Cursor'),
    createExactMapping('Settings', '\u8bbe\u7f6e'),
    createExactMapping(
      'Submit Keywords',
      '\u63d0\u4ea4\u5173\u952e\u8bcd'
    ),
    createExactMapping(
      'Custom keywords that trigger auto-submit in voice mode. Only single words (no spaces) are allowed. Punctuation and capitalization are ignored.',
      '\u5728\u8bed\u97f3\u6a21\u5f0f\u4e0b\u89e6\u53d1\u81ea\u52a8\u63d0\u4ea4\u7684\u81ea\u5b9a\u4e49\u5173\u952e\u8bcd\u3002\u4ec5\u5141\u8bb8\u5355\u4e2a\u8bcd\uff08\u4e0d\u542b\u7a7a\u683c\uff09\u3002\u4f1a\u5ffd\u7565\u6807\u70b9\u548c\u5927\u5c0f\u5199\u3002'
    ),
    createExactMapping('Attribution', '\u7f72\u540d'),
    createExactMapping(
      'Commit Attribution',
      '\u63d0\u4ea4\u7f72\u540d'
    ),
    createExactMapping(
      'Mark Agent commits as \'Made with Cursor\'',
      '\u5c06 Agent \u63d0\u4ea4\u6807\u8bb0\u4e3a \'Made with Cursor\''
    ),
    createExactMapping('PR Attribution', 'PR \u7f72\u540d'),
    createExactMapping(
      'Mark pull requests as made with Cursor',
      '\u5c06\u62c9\u53d6\u8bf7\u6c42\u6807\u8bb0\u4e3a\u7531 Cursor \u521b\u5efa'
    ),
    createExactMapping('Branch Prefix', '\u5206\u652f\u524d\u7f00'),
    createExactMapping(
      'Prefix for new branches created by Agent (e.g., cursor/, username/)',
      'Agent \u521b\u5efa\u65b0\u5206\u652f\u65f6\u4f7f\u7528\u7684\u524d\u7f00\uff08\u4f8b\u5982\uff1acursor/\u3001username/\uff09'
    ),
  ];
}

function defaultOverlayMappings() {
  return [
    createExactMapping('Agents Window', '智能体窗口'),
    createExactMapping('Open Editor Window', '打开编辑器窗口'),
    createExactMapping('Design Mode', '设计模式'),
    createExactMapping('Manual Mode', '手动模式'),
    createExactMapping('Agent Mode', '智能体模式'),
    createExactMapping('Open in Agent', '在智能体中打开'),
    createExactMapping('Background Agent', '后台 Agent'),
    createExactMapping('Update Access', '更新访问权限'),
  ];
}

function cursorWinCoverageTargets() {
  return defaultCursorWinCommonMappings().map((item) => item.originalText);
}

function analyzeCursorWinCoverage({ workbenchSource = '', mappings = [], targets = [] }) {
  const bundleTargets = targets.filter((target) => workbenchSource.includes(target));
  const mappedTargets = bundleTargets.filter(
    (target) => translateTextWithMappings(target, mappings) !== target
  );
  const missingTargets = bundleTargets.filter(
    (target) => !mappedTargets.includes(target)
  );

  return {
    totalTargetCount: targets.length,
    bundleTargetCount: bundleTargets.length,
    mappedTargetCount: mappedTargets.length,
    missingTargets,
  };
}

function productTipsCoverageTargets() {
  return [
    'Use /canvas to get interactive visualizations like dashboards from Cursor',
    'Cursor can respond with interactive visualizations alongside text. Use /canvas to get started',
    'Use /shell to run commands in the terminal',
    'Voice mode lets you dictate better prompts. Click or hold ctrl+M to enable',
    'Composer offers a great balance of intelligence and cost. Try it out from the model picker',
    'Ask mode uses read-only agents to research your codebase. Use shift+tab to enable',
    'Use /loop to run a prompt on a schedule or keep a local agent running continuously',
    'Use /add-plugin to install a plugin from the Cursor Marketplace',
    'Use cloud agents for better parallelization and durable execution. Go to cursor.com/agents',
  ];
}

function productTipScopedMappings(mappings = []) {
  return mappings.filter((entry) => isProductTipScopedMapping(entry));
}

function analyzeProductTipsCoverage({ mappings = [], targets = [] }) {
  const scopedMappings = productTipScopedMappings(mappings);
  const mappedTips = [];
  const missingTips = [];

  for (const sampleText of targets) {
    const translated = translateTextWithMappings(sampleText, scopedMappings, {
      scopeMatched: true,
      scopeText: sampleText,
    });
    if (translated === sampleText) {
      missingTips.push(sampleText);
    } else {
      mappedTips.push(sampleText);
    }
  }

  return {
    totalTipCount: targets.length,
    mappedTipCount: mappedTips.length,
    missingTips,
  };
}

function serializeMappings(mappings) {
  return JSON.stringify(mappings, null, 2);
}

const productTipScopeSelectors = ['[class*="empty-state-rotating-tips"]'];
const STATIC_SOURCE_PATCHES = [
  {
    from: 'Show all (<!> more)',
    to: '\u663e\u793a\u5168\u90e8\uff08\u8fd8\u6709 <!> \u9879\uff09',
  },
  {
    from: 'Show less',
    to: '\u6536\u8d77',
  },
];
const KEY_SURFACE_PATCH_CONTRACTS = [
  {
    id: 'search_models',
    surface: 'model_picker',
    required: true,
    fallbackMode: 'none',
    originalText: 'Search models',
    translatedText: '\u641c\u7d22\u6a21\u578b',
  },
  {
    id: 'send_follow_up',
    surface: 'composer',
    required: true,
    fallbackMode: 'none',
    originalText: 'Send follow-up',
    translatedText: '\u7ee7\u7eed\u8ffd\u95ee',
  },
  {
    id: 'product_tips_render_hook',
    surface: 'product_tips',
    required: true,
    fallbackMode: 'runtime',
    from: 'const Re=z?U?"":mkE:U?"":ne?.text??"",Be=',
    to: 'const Re=z?U?"":mkE:U?"":window.__cursorZhTranslateProductTipText?window.__cursorZhTranslateProductTipText(ne?.text??""):ne?.text??"",Be=',
  },
];
const KEY_SURFACE_CONTRACTS_BY_ORIGINAL_TEXT = new Map(
  KEY_SURFACE_PATCH_CONTRACTS.filter(
    (contract) => typeof contract.originalText === 'string' && contract.originalText.length > 0
  ).map((contract) => [contract.originalText, contract])
);

function isProductTipScopedMapping(entry) {
  const scopeSelectors = Array.isArray(entry?.scopeSelectors) ? entry.scopeSelectors : [];
  return (
    scopeSelectors.length === productTipScopeSelectors.length &&
    scopeSelectors.every((selector, index) => selector === productTipScopeSelectors[index])
  );
}

function sourceHasQuotedLiteral(workbenchSource, originalText) {
  if (typeof originalText !== 'string' || originalText.length === 0) {
    return false;
  }

  const escapedOriginal = escapeRegExp(originalText);
  const literalPattern = new RegExp(`(['"\`])${escapedOriginal}\\1`);
  return literalPattern.test(String(workbenchSource || ''));
}

function selectRuntimeMappings(workbenchSource, mappings = []) {
  return mappings.filter((entry) => {
    if (!entry || typeof entry.originalText !== 'string' || entry.originalText.length === 0) {
      return false;
    }

    if (entry.forceRuntime === true) {
      return true;
    }

    if (isProductTipScopedMapping(entry)) {
      return false;
    }

    const hasScopeSelectors =
      Array.isArray(entry.scopeSelectors) && entry.scopeSelectors.length > 0;
    const hasScopeHints =
      Array.isArray(entry.scopeContainsText) && entry.scopeContainsText.length > 0;

    if (entry.searchType !== 'exact') {
      return true;
    }

    if (hasScopeSelectors || hasScopeHints) {
      return true;
    }

    return !sourceHasQuotedLiteral(workbenchSource, entry.originalText);
  });
}

function defaultCursorWinDynamicMappings() {
  return [
    createNormalizedExactMapping('Sign In', '\u767b\u5f55'),
    createExactMapping('Sign in', '\u767b\u5f55'),
    createNormalizedExactMapping('Learn more', '\u4e86\u89e3\u66f4\u591a'),
    createExactMapping('Learn More', '\u4e86\u89e3\u66f4\u591a'),
    createNormalizedExactMapping('No result', '\u65e0\u7ed3\u679c'),
    createNormalizedExactMapping('No results', '\u65e0\u7ed3\u679c'),
    createNormalizedExactMapping('More Options', '\u66f4\u591a\u9009\u9879'),
    createNormalizedExactMapping('More options', '\u66f4\u591a\u9009\u9879'),
    createNormalizedExactMapping('available for download', '\u53ef\u4f9b\u4e0b\u8f7d'),
    createExactMapping('Browser Mode', '\u6d4f\u89c8\u5668\u6a21\u5f0f'),
    createRegexMapping('^Browser Tab:\\s*(.+)$', '\u6d4f\u89c8\u5668\u6807\u7b7e\u9875\uff1a$1', {
      flags: 'i',
      coverageHints: ['Browser Tab:'],
    }),
    createRegexMapping('^View all\\s*\\((.+)\\)$', '\u67e5\u770b\u5168\u90e8\uff08$1\uff09', {
      flags: 'i',
      coverageHints: ['View all ('],
    }),
    createRegexMapping('^Something went wrong:\\s*(.+)$', '\u51fa\u9519\u4e86\uff1a$1', {
      flags: 'i',
      coverageHints: ['Something went wrong:'],
    }),
    createRegexMapping('^Create\\s+/(.+)\\s+skill$', '\u521b\u5efa /$1 \u6280\u80fd', {
      flags: 'i',
      coverageHints: ['Create /'],
    }),
    createRegexMapping('^Submit with\\s+(.+)$', '\u4f7f\u7528 $1 \u53d1\u9001', {
      flags: 'i',
      coverageHints: ['Submit with '],
    }),
    createRegexMapping(
      '^When enabled,\\s*(.+) submits chat and Enter inserts a newline$',
      '\u542f\u7528\u540e\uff0c$1 \u53d1\u9001\u5bf9\u8bdd\uff0cEnter \u63d2\u5165\u6362\u884c',
      {
        flags: 'i',
        coverageHints: ['submits chat and Enter inserts a newline'],
      }
    ),
    createRegexMapping(
      '^Configured Hooks\\s*\\((.+)\\)$',
      '\u5df2\u914d\u7f6e Hook\uff08$1\uff09',
      {
        flags: 'i',
        coverageHints: ['Configured Hooks ('],
      }
    ),
    createNormalizedExactMapping('Automatically index any new folders with fewer than', '\u81ea\u52a8\u7d22\u5f15\u5c11\u4e8e', {
      scopeContainsText: ['Index New Folders'],
    }),
    createNormalizedExactMapping('files', '\u4e2a\u6587\u4ef6\u7684\u65b0\u6587\u4ef6\u5939', {
      scopeContainsText: ['Index New Folders'],
    }),
    createExactMapping('Repositories', '\u4ed3\u5e93'),
    createExactMapping('Search models', '\u641c\u7d22\u6a21\u578b'),
    createExactMapping(
      'Balanced quality and speed, recommended for most tasks',
      '\u8d28\u91cf\u4e0e\u901f\u5ea6\u5747\u8861\uff0c\u9002\u5408\u5927\u591a\u6570\u4efb\u52a1'
    ),
    createExactMapping('Send follow-up', '\u7ee7\u7eed\u8ffd\u95ee'),
    createExactMapping('No agents yet', '\u6682\u65e0 Agent'),
    createExactMapping(
      'Create an agent to start working on tasks',
      '\u521b\u5efa\u4e00\u4e2a Agent\uff0c\u5f00\u59cb\u5904\u7406\u4efb\u52a1'
    ),
    createExactMapping('Planning next moves', '\u6b63\u5728\u89c4\u5212\u4e0b\u4e00\u6b65'),
    createExactMapping('Thought', '\u601d\u8003'),
    createExactMapping('Thinking', '\u601d\u8003\u4e2d'),
    createExactMapping('briefly', '\u7247\u523b'),
    createExactMapping('for ${(e/1e3).toFixed(1)}s', '${(e/1e3).toFixed(1)} \u79d2'),
    createExactMapping('for ${n}s', '${n} \u79d2'),
    createExactMapping('${(e/1e3).toFixed(1)}s', '${(e/1e3).toFixed(1)} \u79d2'),
    createExactMapping('${n}s', '${n} \u79d2'),
    createExactMapping('Worked', '\u5904\u7406'),
    createExactMapping('Worked for ${q9p(n)}', '\u5904\u7406\u7528\u65f6 ${q9p(n)}'),
    createExactMapping('Worked for ${q9p(o)}', '\u5904\u7406\u7528\u65f6 ${q9p(o)}'),
    createExactMapping('Reading', '\u8bfb\u53d6\u4e2d'),
    createExactMapping('Read', '\u8bfb\u53d6'),
    createExactMapping('Grepping', '\u641c\u7d22\u4e2d'),
    createExactMapping('Grepped', '\u641c\u7d22'),
    createExactMapping('Searching files', '\u641c\u7d22\u6587\u4ef6\u4e2d'),
    createExactMapping('Searched files', '\u641c\u7d22\u6587\u4ef6'),
    createExactMapping('Running', '\u8fd0\u884c\u4e2d'),
    createExactMapping('Ran', '\u8fd0\u884c'),
    createExactMapping('Exploring', '\u63a2\u7d22\u4e2d'),
    createExactMapping('Explored', '\u5df2\u63a2\u7d22'),
    createExactMapping('Editing', '\u7f16\u8f91\u4e2d'),
    createExactMapping('Edited', '\u7f16\u8f91'),
    createExactMapping('Deleting', '\u5220\u9664\u4e2d'),
    createExactMapping('Deleted', '\u5220\u9664'),
    createExactMapping(
      'Switching workspace root',
      '\u6b63\u5728\u5207\u6362\u5de5\u4f5c\u533a\u6839\u76ee\u5f55'
    ),
    createExactMapping(
      'Switched workspace root',
      '\u5df2\u5207\u6362\u5de5\u4f5c\u533a\u6839\u76ee\u5f55'
    ),
    createExactMapping(
      "Couldn't switch workspace root",
      '\u65e0\u6cd5\u5207\u6362\u5de5\u4f5c\u533a\u6839\u76ee\u5f55'
    ),
    createExactMapping('Cancelled', '\u53d6\u6d88'),
    createExactMapping('Skipped', '\u8df3\u8fc7'),
    createExactMapping('Rejected', '\u62d2\u7edd'),
    createExactMapping('${i} director${i===1?"y":"ies"}', '${i} \u4e2a\u76ee\u5f55'),
    createExactMapping('${i} file${i===1?"":"s"}', '${i} \u4e2a\u6587\u4ef6'),
    createExactMapping(
      '${n.searches} search${n.searches===1?"":"es"}',
      '${n.searches} \u6b21\u641c\u7d22'
    ),
    createExactMapping(
      '${n.fetches} fetch${n.fetches===1?"":"es"}',
      '${n.fetches} \u6b21\u6293\u53d6'
    ),
    createExactMapping('lints', 'Lint \u68c0\u67e5'),
    createExactMapping('explored ${t[0]}', '\u5df2\u63a2\u7d22 ${t[0]}'),
    createExactMapping('ran ${e} command${e===1?"":"s"}', '\u5df2\u8fd0\u884c ${e} \u4e2a\u547d\u4ee4'),
    createExactMapping('${s} command${s===1?"":"s"}', '${s} \u4e2a\u547d\u4ee4'),
    createExactMapping('${e} agent${e===1?"":"s"}', '${e} \u4e2a Agent'),
    createExactMapping(
      '${i} browser action${i===1?"":"s"}',
      '${i} \u4e2a\u6d4f\u89c8\u5668\u64cd\u4f5c'
    ),
    createExactMapping(
      '${r} L${s.startLine}-${s.endLine}',
      '${r} \u7b2c ${s.startLine}-${s.endLine} \u884c'
    ),
    createExactMapping(' in ${Pat(t.path)}', ' \u5728 ${Pat(t.path)}'),
    createExactMapping('${r} in ${Pat(i)}', '\u5728 ${Pat(i)} \u4e2d\u641c\u7d22 ${r}'),
    createExactMapping('available tools', '\u53ef\u7528\u5de5\u5177'),
    createExactMapping('tool output', '\u5de5\u5177\u8f93\u51fa'),
    createNormalizedExactMapping(
      'Use /canvas to get interactive visualizations like dashboards from Cursor',
      '\u4f7f\u7528 /canvas \u4ece Cursor \u83b7\u53d6\u4eea\u8868\u76d8\u7b49\u4ea4\u4e92\u5f0f\u53ef\u89c6\u5316',
      {
        scopeSelectors: productTipScopeSelectors,
      }
    ),
    createNormalizedExactMapping(
      'Cursor can respond with interactive visualizations alongside text. Use /canvas to get started',
      'Cursor \u53ef\u4ee5\u5728\u6587\u672c\u65c1\u751f\u6210\u4ea4\u4e92\u5f0f\u53ef\u89c6\u5316\u3002\u4f7f\u7528 /canvas \u5f00\u59cb\u3002',
      {
        scopeSelectors: productTipScopeSelectors,
      }
    ),
    createNormalizedExactMapping(
      'Use /shell to run commands in the terminal',
      '\u4f7f\u7528 /shell \u5728\u7ec8\u7aef\u4e2d\u8fd0\u884c\u547d\u4ee4',
      {
        scopeSelectors: productTipScopeSelectors,
      }
    ),
    createNormalizedExactMapping(
      'Voice mode lets you dictate better prompts. Click or hold ctrl+M to enable',
      '\u8bed\u97f3\u6a21\u5f0f\u53ef\u5e2e\u52a9\u4f60\u53e3\u8ff0\u51fa\u66f4\u597d\u7684\u63d0\u793a\u8bcd\u3002\u70b9\u51fb\u6216\u6309\u4f4f ctrl+M \u542f\u7528',
      {
        scopeSelectors: productTipScopeSelectors,
      }
    ),
    createRegexMapping(
      '^(?:Use /model to pick the best model for your task\\.\\s*)?Composer offers a great balance (?:of intelligence and cost|for cost vs\\. capability)\\.(?:\\s*Try it out from the model picker)?$',
      '\u4f7f\u7528 /model \u4e3a\u4f60\u7684\u4efb\u52a1\u9009\u62e9\u6700\u5408\u9002\u7684\u6a21\u578b\u3002Composer \u5728\u667a\u80fd\u4e0e\u6210\u672c\u4e4b\u95f4\u53d6\u5f97\u4e86\u5f88\u597d\u7684\u5e73\u8861\u3002\u53ef\u5728\u6a21\u578b\u9009\u62e9\u5668\u4e2d\u8bd5\u7528\u3002',
      {
        flags: 'i',
        scopeSelectors: productTipScopeSelectors,
        coverageHints: [
          'Use /model to pick the best model for your task. Composer offers a great balance for cost vs. capability',
          'Composer offers a great balance of intelligence and cost. Try it out from the model picker',
        ],
      }
    ),
    createNormalizedExactMapping(
      'Ask mode uses read-only agents to research your codebase. Use shift+tab to enable',
      'Ask \u6a21\u5f0f\u4f1a\u4f7f\u7528\u53ea\u8bfb\u667a\u80fd\u4f53\u7814\u7a76\u4f60\u7684\u4ee3\u7801\u5e93\u3002\u4f7f\u7528 shift+tab \u542f\u7528\u3002',
      {
        scopeSelectors: productTipScopeSelectors,
      }
    ),
    createNormalizedExactMapping(
      'Use /loop to run a prompt on a schedule or keep a local agent running continuously',
      '\u4f7f\u7528 /loop \u6309\u65f6\u8c03\u5ea6 Prompt\uff0c\u6216\u8ba9\u672c\u5730 Agent \u6301\u7eed\u8fd0\u884c\u3002',
      {
        scopeSelectors: productTipScopeSelectors,
      }
    ),
    createRegexMapping(
      '^(?:Plugins help you customize Cursor for your workflows\\.\\s*)?Use /add-plugin (?:to get started|to install a plugin from the Cursor Marketplace)$',
      '\u4f7f\u7528 /add-plugin \u4ece Cursor Marketplace \u5b89\u88c5\u63d2\u4ef6\u3002',
      {
        flags: 'i',
        scopeSelectors: productTipScopeSelectors,
        coverageHints: [
          'Plugins help you customize Cursor for your workflows. Use /add-plugin to get started',
          'Use /add-plugin to install a plugin from the Cursor Marketplace',
        ],
      }
    ),
    createNormalizedExactMapping(
      'Use cloud agents for better parallelization and durable execution. Go to cursor.com/agents',
      '\u4f7f\u7528\u4e91\u7aef Agent \u53ef\u83b7\u5f97\u66f4\u597d\u7684\u5e76\u884c\u5316\u4e0e\u6301\u4e45\u6267\u884c\u80fd\u529b\u3002\u524d\u5f80 cursor.com/agents\u3002',
      {
        scopeSelectors: productTipScopeSelectors,
      }
    ),
    createNormalizedExactMapping('System', '\u8ddf\u968f\u7cfb\u7edf'),
    createNormalizedExactMapping('Light', '\u6d45\u8272', {
      scopeContainsText: ['Theme', 'High contrast', 'System', 'Dark'],
    }),
    createNormalizedExactMapping('Dark', '\u6df1\u8272', {
      scopeContainsText: ['Theme', 'High contrast', 'System', 'Light'],
    }),
    createNormalizedExactMapping('High contrast', '\u9ad8\u5bf9\u6bd4\u5ea6', {
      scopeContainsText: ['Theme', 'System', 'Light', 'Dark'],
    }),
    createNormalizedExactMapping('Browser', '\u6d4f\u89c8\u5668', {
      scopeContainsText: ['Browser Mode', 'Show Localhost Links in Browser'],
    }),
    createNormalizedExactMapping('Off', '\u5173\u95ed', {
      scopeContainsText: ['Browser Mode', 'Browser Tab'],
    }),
    createNormalizedExactMapping('High', '\u9ad8\u7cbe\u5ea6', {
      scopeContainsText: ['GPT-', 'Ask'],
    }),
    createNormalizedExactMapping('Fast', '\u5feb\u901f', {
      scopeContainsText: ['GPT-', 'Ask'],
    }),
    createNormalizedExactMapping('Compact', '\u7d27\u51d1'),
    createNormalizedExactMapping('Detailed', '\u8be6\u7ec6'),
    createNormalizedExactMapping('Plan', '\u89c4\u5212'),
    createNormalizedExactMapping('Multitask', '\u591a\u4efb\u52a1'),
    createNormalizedExactMapping('Debug', '\u8c03\u8bd5'),
    createNormalizedExactMapping('Tips', '\u63d0\u793a'),
    createNormalizedExactMapping('Tools', '\u5de5\u5177'),
    createNormalizedExactMapping('Cloud', '\u4e91\u7aef'),
    createNormalizedExactMapping('Manage', '\u7ba1\u7406'),
    createNormalizedExactMapping('Default', '\u9ed8\u8ba4'),
    createNormalizedExactMapping('Customize', '\u81ea\u5b9a\u4e49'),
  ];
}

function scopeHintsMatch(scopeContainsText = [], scopeText = '') {
  if (!Array.isArray(scopeContainsText) || scopeContainsText.length === 0) {
    return true;
  }

  const normalizedScopeText = normalizeTextForComparison(scopeText);
  if (!normalizedScopeText) {
    return false;
  }

  return scopeContainsText.some((hint) =>
    normalizedScopeText.includes(normalizeTextForComparison(hint))
  );
}

function mappingMatchesScope(entry, options = {}) {
  const hasScopeSelectors =
    Array.isArray(entry?.scopeSelectors) && entry.scopeSelectors.length > 0;
  const hasScopeHints =
    Array.isArray(entry?.scopeContainsText) && entry.scopeContainsText.length > 0;

  if (!hasScopeSelectors && !hasScopeHints) {
    return true;
  }

  if (options.scopeMatched === false) {
    return false;
  }

  if (options.scopeMatched === true) {
    return true;
  }

  return scopeHintsMatch(entry.scopeContainsText, options.scopeText || '');
}

function describeCoverageEntry(entry) {
  if (!entry) {
    return '';
  }

  if (Array.isArray(entry.coverageHints) && entry.coverageHints.length > 0) {
    return entry.coverageHints[0];
  }

  return entry.originalText || '';
}

function entryAppearsInSource(entry, workbenchSource = '') {
  const haystack = normalizeTextForComparison(workbenchSource);
  const hints =
    Array.isArray(entry?.coverageHints) && entry.coverageHints.length > 0
      ? entry.coverageHints
      : [entry?.originalText];

  return hints.some((hint) => haystack.includes(normalizeTextForComparison(hint)));
}

function translateTextWithMappings(text, mappings = [], options = {}) {
  if (typeof text !== 'string' || text.length === 0) {
    return text;
  }

  let current = text;
  for (const entry of mappings) {
    if (!entry || !entry.originalText) {
      continue;
    }

    if (!mappingMatchesScope(entry, options)) {
      continue;
    }

    if (entry.searchType === 'exact') {
      if (current.trim() === entry.originalText) {
        current = entry.changeText;
      }
    } else if (entry.searchType === 'normalizedExact') {
      if (
        normalizeTextForComparison(current) ===
        normalizeTextForComparison(entry.originalText)
      ) {
        current = entry.changeText;
      }
    } else if (entry.searchType === 'partial') {
      current = current.split(entry.originalText).join(entry.changeText);
    } else if (entry.searchType === 'regex') {
      const regex = new RegExp(entry.originalText, entry.flags || 'g');
      current = current.replace(regex, entry.changeText);
    }
  }

  return current;
}

function analyzeDynamicRuleCoverage({ workbenchSource = '', mappings = [], targets = [] }) {
  const mappingIndex = new Map(mappings.map((entry) => [mappingKey(entry), entry]));
  const bundleRules = targets.filter((entry) => entryAppearsInSource(entry, workbenchSource));
  const mappedRules = bundleRules.filter((entry) => {
    const activeEntry = mappingIndex.get(mappingKey(entry));
    if (!activeEntry) {
      return false;
    }

    if (activeEntry.searchType === 'regex') {
      return true;
    }

    const sampleText = describeCoverageEntry(activeEntry);
    const scopeText = Array.isArray(activeEntry.scopeContainsText)
      ? activeEntry.scopeContainsText.join(' ')
      : '';

    return (
      translateTextWithMappings(sampleText, [activeEntry], {
        scopeMatched: true,
        scopeText,
      }) !== sampleText
    );
  });
  const missingRules = bundleRules
    .filter((entry) => !mappedRules.some((mapped) => mappingKey(mapped) === mappingKey(entry)))
    .map((entry) => describeCoverageEntry(entry));

  return {
    totalRuleCount: targets.length,
    bundleRuleCount: bundleRules.length,
    mappedRuleCount: mappedRules.length,
    missingRules,
  };
}

function escapeRegExp(source) {
  return String(source).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeForQuotedLiteral(text, quote, options = {}) {
  const preserveTemplatePlaceholders = Boolean(
    options && options.preserveTemplatePlaceholders
  );
  let current = String(text).replace(/\\/g, '\\\\');
  if (quote === "'") {
    current = current.replace(/'/g, "\\'");
  } else if (quote === '"') {
    current = current.replace(/"/g, '\\"');
  } else if (quote === '`') {
    current = current.replace(/`/g, '\\`');
    if (!preserveTemplatePlaceholders) {
      current = current.replace(/\$\{/g, '\\${');
    }
  }
  return current;
}

function applyStaticSourceTranslations(workbenchSource, mappings = []) {
  let current = String(workbenchSource || '');
  const exactMappings = mappings
    .filter(
      (entry) =>
        entry &&
        entry.searchType === 'exact' &&
        typeof entry.originalText === 'string' &&
        entry.originalText.length > 0 &&
        typeof entry.changeText === 'string'
    )
    .sort((left, right) => right.originalText.length - left.originalText.length);

  // Fast path: use split/join for literals that contain no regex-special chars
  // and no quote chars that need escaping. This avoids the overhead of
  // creating and running RegExp objects on multi-MB source text.
  const REGEX_SPECIAL_RE = /[.*+?^${}()|[\]\\]/;
  const QUOTE_CHARS = new Set(["'", '"', '`']);

  for (const entry of exactMappings) {
    const original = entry.originalText;
    const changed = entry.changeText;

    // Determine if we can use the fast split/join path.
    const canUseFastPath =
      !REGEX_SPECIAL_RE.test(original) &&
      !QUOTE_CHARS.has(original[0]) &&
      !QUOTE_CHARS.has(original[original.length - 1]) &&
      !QUOTE_CHARS.has(changed[0]) &&
      !QUOTE_CHARS.has(changed[changed.length - 1]);

    if (canUseFastPath) {
      // Build the three quoted variants and replace them directly.
      const singleQuoted = `'${original}'`;
      const doubleQuoted = `"${original}"`;
      const templateQuoted = `\`${original}\``;
      const singleChanged = `'${changed}'`;
      const doubleChanged = `"${changed}"`;
      const templateChanged = `\`${changed}\``;

      if (current.includes(singleQuoted)) {
        current = current.split(singleQuoted).join(singleChanged);
      }
      if (current.includes(doubleQuoted)) {
        current = current.split(doubleQuoted).join(doubleChanged);
      }
      if (current.includes(templateQuoted)) {
        current = current.split(templateQuoted).join(templateChanged);
      }
      continue;
    }

    // Slow path: full regex-based replacement for complex literals.
    const escapedOriginal = escapeRegExp(original);
    const literalPattern = new RegExp(`(['"\`])${escapedOriginal}\\1`, 'g');
    current = current.replace(literalPattern, (_match, quote) => {
      const translated = escapeForQuotedLiteral(changed, quote, {
        preserveTemplatePlaceholders:
          quote === '`' && original.includes('${'),
      });
      return `${quote}${translated}${quote}`;
    });
  }

  const embeddedUiSourcePatches = [
    {
      from: 'Show all (<!> more)',
      to: '显示全部（还有 <!> 项）',
    },
    {
      from: 'Show less',
      to: '收起',
    },
    {
      from: 'const Re=z?U?"":mkE:U?"":ne?.text??"",Be=',
      to: 'const Re=z?U?"":mkE:U?"":window.__cursorZhTranslateProductTipText?window.__cursorZhTranslateProductTipText(ne?.text??""):ne?.text??"",Be=',
    },
  ];

  for (const patch of embeddedUiSourcePatches) {
    if (!current.includes(patch.from)) {
      continue;
    }
    current = current.split(patch.from).join(patch.to);
  }

  return current;
}

function initializePatchContracts() {
  const contracts = {};

  for (const contract of KEY_SURFACE_PATCH_CONTRACTS) {
    contracts[contract.id] = {
      surface: contract.surface,
      required: contract.required,
      fallbackMode: contract.fallbackMode,
      severityOnMiss: contract.fallbackMode === 'runtime' ? 'warning' : 'error',
      matchCount: 0,
    };
  }

  return contracts;
}

function countSubstringMatches(sourceText, pattern) {
  if (typeof pattern !== 'string' || pattern.length === 0) {
    return 0;
  }

  return String(sourceText || '').split(pattern).length - 1;
}

function countQuotedLiteralMatches(sourceText, literalText) {
  if (typeof literalText !== 'string' || literalText.length === 0) {
    return 0;
  }

  const escapedLiteral = escapeRegExp(literalText);
  const matches = String(sourceText || '').match(new RegExp(`(['"\`])${escapedLiteral}\\1`, 'g'));
  return Array.isArray(matches) ? matches.length : 0;
}

function applyStaticSourceTranslationsDetailed(workbenchSource, mappings = []) {
  const sourceText = String(workbenchSource || '');
  const translatedSource = applyStaticSourceTranslations(sourceText, mappings);
  const contracts = initializePatchContracts();

  for (const contract of KEY_SURFACE_PATCH_CONTRACTS) {
    if (typeof contract.originalText === 'string' && contract.originalText.length > 0) {
      const sourceMatchCount = countQuotedLiteralMatches(sourceText, contract.originalText);
      if (sourceMatchCount === 0) {
        continue;
      }

      const translatedMatchCount = countQuotedLiteralMatches(
        translatedSource,
        contract.translatedText
      );
      contracts[contract.id].matchCount = Math.min(sourceMatchCount, translatedMatchCount);
      continue;
    }

    if (typeof contract.from === 'string' && contract.from.length > 0) {
      const sourceMatchCount = countSubstringMatches(sourceText, contract.from);
      if (sourceMatchCount === 0) {
        continue;
      }

      const translatedMatchCount = countSubstringMatches(translatedSource, contract.to);
      contracts[contract.id].matchCount = Math.min(sourceMatchCount, translatedMatchCount);
    }
  }

  return {
    translatedSource,
    contracts,
  };
}

function summarizeStaticPatchContractsFromTranslatedSource(translatedSourceText = '') {
  const contracts = initializePatchContracts();
  const text = String(translatedSourceText || '');

  for (const contract of KEY_SURFACE_PATCH_CONTRACTS) {
    if (typeof contract.translatedText === 'string' && contract.translatedText.length > 0) {
      contracts[contract.id].matchCount = countQuotedLiteralMatches(
        text,
        contract.translatedText
      );
      continue;
    }

    if (typeof contract.to === 'string' && contract.to.length > 0) {
      contracts[contract.id].matchCount = countSubstringMatches(text, contract.to);
    }
  }

  return contracts;
}

function evaluatePatchContracts({ runtimeMode, contracts }) {
  const issues = [];
  const warnings = [];

  for (const [contractId, contract] of Object.entries(contracts || {})) {
    if (contract?.required !== true || contract.matchCount > 0) {
      continue;
    }

    if (contract.fallbackMode === 'runtime') {
      warnings.push(
        `Static patch contract missed and runtime fallback stayed active: ${contractId}`
      );
      continue;
    }

    if (runtimeMode === 'performance') {
      issues.push(`Required static patch contract failed: ${contractId}`);
    }
  }

  return { issues, warnings };
}

function summarizeRuntimeFootprint(bundleText, translatedSourceText, runtimeMappings = []) {
  const runtimeHeaderChars = Math.max(
    String(bundleText || '').length - String(translatedSourceText || '').length,
    0
  );

  return {
    runtimeHeaderChars,
    runtimeHeaderKB: +(runtimeHeaderChars / 1024).toFixed(1),
    runtimeMappingCount: Array.isArray(runtimeMappings) ? runtimeMappings.length : 0,
  };
}

function buildTranslatedWorkbenchBundle({
  workbenchSource,
  mappings,
  runtimeMappings,
  metadata,
}) {
  const safeMetadata = metadata || {};
  const experimentalRuntimeToggleEnabled =
    safeMetadata.experimentalRuntimeToggleEnabled === true &&
    typeof safeMetadata.toggleSignalPath === 'string' &&
    safeMetadata.toggleSignalPath.length > 0;
  const runtimeDiagnosticsEnabled = safeMetadata.runtimeDiagnosticsEnabled === true;
  const generalRuntimeMappings = Array.isArray(runtimeMappings)
    ? runtimeMappings
    : selectRuntimeMappings(workbenchSource, mappings);
  const scopedProductTipMappings = productTipScopedMappings(mappings);
  const runtimeHeader = [
    '/* Cursor ZH generated runtime: do not edit generated file directly. */',
    '(function () {',
    `  const translationMetadata = ${JSON.stringify(safeMetadata)};`,
    `  const translationMappings = ${serializeMappings(generalRuntimeMappings)};`,
    `  const productTipMappings = ${serializeMappings(scopedProductTipMappings)};`,
    '  function normalizeProductTipText(text) {',
    '    return String(text || "")',
    '      .replace(/\\u2026/g, "...")',
    '      .replace(/\\.{3,}/g, "...")',
    '      .replace(/&&/g, "")',
    '      .replace(/&/g, "")',
    '      .replace(/\\s+/g, " ")',
    '      .trim()',
    '      .toLowerCase();',
    '  }',
    '  function __cursorZhTranslateProductTipText(text) {',
    '    if (typeof text !== "string" || text.length === 0) return text;',
    '    let current = text;',
    '    for (let i = 0; i < productTipMappings.length; i++) {',
    '      const entry = productTipMappings[i];',
    '      if (!entry || !entry.originalText) continue;',
    '      if (entry.searchType === "exact") {',
    '        if (current.trim() === entry.originalText) current = entry.changeText;',
    '      } else if (entry.searchType === "normalizedExact") {',
    '        if (normalizeProductTipText(current) === normalizeProductTipText(entry.originalText)) current = entry.changeText;',
    '      } else if (entry.searchType === "partial") {',
    '        current = current.split(entry.originalText).join(entry.changeText);',
    '      } else if (entry.searchType === "regex") {',
    '        current = current.replace(new RegExp(entry.originalText, entry.flags || "g"), entry.changeText);',
    '      }',
    '    }',
    '    return current;',
    '  }',
    '  if (typeof globalThis !== "undefined") globalThis.__cursorZhTranslateProductTipText = __cursorZhTranslateProductTipText;',
    ...(runtimeDiagnosticsEnabled
      ? [
          '  function createCursorZhPerf() {',
          '    return {',
          '      translateCalls: 0, translateTime: 0,',
          '      scopeChecks: 0, scopeCacheHits: 0,',
          '      treeWalkCount: 0, treeWalkTime: 0,',
          '      mutationBatchCount: 0, mutationBatchTime: 0,',
          '      idleQueueDepth: 0, idleQueueProcessed: 0,',
          '      skippedTreeWalks: 0, idleQueueDeduped: 0,',
          '      _snapshotStart: 0,',
          '      snapshot() {',
          '        const p = this;',
          '        const elapsed = performance.now() - p._snapshotStart;',
          '        const scopeRatio = p.scopeChecks > 0 ? (p.scopeCacheHits / p.scopeChecks * 100).toFixed(1) : 0;',
          '        const avgTranslate = p.translateCalls > 0 ? (p.translateTime / p.translateCalls).toFixed(3) : 0;',
          '        const avgTreeWalk = p.treeWalkCount > 0 ? (p.treeWalkTime / p.treeWalkCount).toFixed(2) : 0;',
          '        const avgMutation = p.mutationBatchCount > 0 ? (p.mutationBatchTime / p.mutationBatchCount).toFixed(2) : 0;',
          '        return {',
          '          elapsedMs: +elapsed.toFixed(1),',
          '          translateCalls: p.translateCalls,',
          '          avgTranslateMs: +avgTranslate,',
          '          totalTranslateMs: +p.translateTime.toFixed(2),',
          '          scopeChecks: p.scopeChecks,',
          '          scopeCacheHits: p.scopeCacheHits,',
          '          scopeHitRate: +scopeRatio,',
          '          cacheLimit: window.__cursorZhRuntime ? window.__cursorZhRuntime._scopeCacheLimit : 0,',
          '          treeWalkCount: p.treeWalkCount,',
          '          avgTreeWalkMs: +avgTreeWalk,',
          '          mutationBatchCount: p.mutationBatchCount,',
          '          avgMutationBatchMs: +avgMutation,',
          '          idleQueueDepth: p.idleQueueDepth,',
          '          idleQueueProcessed: p.idleQueueProcessed,',
          '          skippedTreeWalks: p.skippedTreeWalks,',
          '          idleQueueDeduped: p.idleQueueDeduped,',
          '        };',
          '      },',
          '      report() {',
          '        const s = this.snapshot();',
          '        console.table(s);',
          '        return s;',
          '      },',
          '      reset() {',
          '        this.translateCalls = 0; this.translateTime = 0;',
          '        this.scopeChecks = 0; this.scopeCacheHits = 0;',
          '        this.treeWalkCount = 0; this.treeWalkTime = 0;',
          '        this.mutationBatchCount = 0; this.mutationBatchTime = 0;',
          '        this.idleQueueDepth = 0; this.idleQueueProcessed = 0;',
          '        this.skippedTreeWalks = 0; this.idleQueueDeduped = 0;',
          '        this._snapshotStart = performance.now();',
          '      },',
          '    };',
          '  }',
        ]
      : []),
    '  class TextTranslator {',
    '    constructor(entries, config) {',
    '      this.entries = Array.isArray(entries) ? entries : [];',
    '      this.config = config || {};',
    '      this.stageDocumentRoot = config.stageDocumentRoot !== false;',
    '      this.shortExactTextFallback = config.shortExactTextFallback !== false;',
    '      this.observeScopeSelectors = Array.isArray(this.config.observeScopeSelectors)',
    '        ? this.config.observeScopeSelectors',
    '        : [];',
    '      this.skipSelector = "pre, code, .monaco-editor, .xterm, .cm-editor, .cm-content, .view-lines";',
    '      this._seenNodes = new Map();',
    '      this._pendingMutations = [];',
    '      this._flushTimer = null;',
    '      this._isFlushing = false;',
    '      this._regexCache = new Map();',
    '      this._scopeCache = new Map();',
    '      this._scopeCacheLimit = 200;',
    '      this._scopeCacheWrites = 0;',
    '      this._exactMap = new Map();',
    '      this._buildExactMap();',
    '      this._precomputeScopeHints();',
    '      this._idleQueue = [];',
    '      this._idleTimer = null;',
    '      this._translatedSubtrees = new WeakSet();',
    '      this._pendingIdleRoots = new WeakSet();',
    '      this._stagedRootSet = new WeakSet();',
    '      this._perf = null;',
    ...(runtimeDiagnosticsEnabled
      ? [
          '      this._perf = createCursorZhPerf();',
          '      window.__cursorZhPerf = this._perf;',
          '      this._perf.reset();',
        ]
      : []),
    '      this._enabled = true;',
    '    }',
    '    get enabled() { return this._enabled; }',
    '    set enabled(value) {',
    '      const wasEnabled = this._enabled;',
    '      this._enabled = Boolean(value);',
    '      if (wasEnabled && !this._enabled) {',
    '        this._pendingMutations = [];',
    '        this._idleQueue = [];',
    '        if (this._flushTimer) { window.clearTimeout(this._flushTimer); this._flushTimer = null; }',
    '        if (this._idleTimer) { window.clearTimeout(this._idleTimer); this._idleTimer = null; }',
    '        if (this._stagedTimer) { window.clearTimeout(this._stagedTimer); this._stagedTimer = null; }',
    '        this._stagedRoots = [];',
    '        this._stagedRootSet = new WeakSet();',
    '      }',
    '    }',
    ...(experimentalRuntimeToggleEnabled
      ? [
          '    _saveOriginalText(element, originalText) {',
          '      if (!element || element.nodeType !== Node.ELEMENT_NODE) return;',
          '      try {',
          '        let data = {};',
          '        const raw = element.getAttribute("data-cursor-zh-origins");',
          '        if (raw) { try { data = JSON.parse(raw); } catch {} }',
          '        if (!data.text) data.text = originalText;',
          '        element.setAttribute("data-cursor-zh-origins", JSON.stringify(data));',
          '      } catch {}',
          '    }',
          '    _saveOriginalAttr(element, attr, originalValue) {',
          '      if (!element || element.nodeType !== Node.ELEMENT_NODE) return;',
          '      try {',
          '        let data = {};',
          '        const raw = element.getAttribute("data-cursor-zh-origins");',
          '        if (raw) { try { data = JSON.parse(raw); } catch {} }',
          '        if (!data.attrs) data.attrs = {};',
          '        if (!(attr in data.attrs)) data.attrs[attr] = originalValue;',
          '        element.setAttribute("data-cursor-zh-origins", JSON.stringify(data));',
          '      } catch {}',
          '    }',
          '    restoreOriginalText(root) {',
          '      const targetRoot = root || document;',
          '      if (!targetRoot) return;',
          '      const elements = targetRoot.querySelectorAll ? targetRoot.querySelectorAll("[data-cursor-zh-origins]") : [];',
          '      for (let i = 0; i < elements.length; i++) {',
          '        const el = elements[i];',
          '        try {',
          '          const raw = el.getAttribute("data-cursor-zh-origins");',
          '          if (!raw) continue;',
          '          const data = JSON.parse(raw);',
          '          if (data.text) {',
          '            if (this.isSegmentedTipElement(el)) {',
          '              while (el.firstChild) el.removeChild(el.firstChild);',
          '              el.appendChild(this._renderTipContent(data.text));',
          '            } else if (el.firstChild && el.firstChild.nodeType === Node.TEXT_NODE) {',
          '              el.firstChild.textContent = data.text;',
          '            }',
          '          }',
          '          if (data.attrs) {',
          '            for (const attr of ["title", "aria-label", "aria-description", "placeholder"]) {',
          '              if (attr in data.attrs) el.setAttribute(attr, data.attrs[attr]);',
          '            }',
          '          }',
          '          el.removeAttribute("data-cursor-zh-origins");',
          '        } catch {}',
          '      }',
          '      if (targetRoot.querySelectorAll) {',
          '        const allElements = targetRoot.querySelectorAll("*");',
          '        for (let i = 0; i < allElements.length; i++) {',
          '          const el = allElements[i];',
          '          if (el.shadowRoot) this.restoreOriginalText(el.shadowRoot);',
          '        }',
          '        const frames = targetRoot.querySelectorAll("iframe");',
          '        for (let i = 0; i < frames.length; i++) {',
          '          try {',
          '            const doc = frames[i].contentDocument;',
          '            if (doc) this.restoreOriginalText(doc);',
          '          } catch {}',
          '        }',
          '      }',
          '    }',
          '    clearTranslationState() {',
          '      this._seenNodes.clear();',
          '      this._translatedSubtrees = new WeakSet();',
          '      this._pendingIdleRoots = new WeakSet();',
          '      this._stagedRootSet = new WeakSet();',
          '      this._pendingMutations = [];',
          '      this._idleQueue = [];',
          '      this._pendingDiscoveryMutations = [];',
          '      if (this._flushTimer) { window.clearTimeout(this._flushTimer); this._flushTimer = null; }',
          '      if (this._idleTimer) { window.clearTimeout(this._idleTimer); this._idleTimer = null; }',
          '      if (this._stagedTimer) { window.clearTimeout(this._stagedTimer); this._stagedTimer = null; }',
          '      if (this._discoveryFlushTimer) { window.clearTimeout(this._discoveryFlushTimer); this._discoveryFlushTimer = null; }',
          '      this._stagedRoots = [];',
          '      this._treeWalkDone = false;',
          '      this._attributeWalkDone = false;',
          '    }',
          '    retranslateAll() {',
          '      this.clearTranslationState();',
          '      this._enabled = true;',
          '      const documentRoot = document.body || document.documentElement;',
          '      if (documentRoot) this._stageRootForTranslation(documentRoot);',
          '      const scopeRoots = this.collectScopeRoots(document);',
          '      for (let i = 0; i < scopeRoots.length; i++) {',
          '        this._stageRootForTranslation(scopeRoots[i]);',
          '        this.observeRoot(scopeRoots[i]);',
          '        this.observeExistingShadowRoots(scopeRoots[i]);',
          '        this.observeExistingFrames(scopeRoots[i]);',
          '      }',
          '      if (document.documentElement) this.observeDiscoveryRoot(document.documentElement);',
          '    }',
          '    _startTogglePolling() {',
          '      const signalPath = translationMetadata.toggleSignalPath;',
          '      if (!signalPath || typeof require === "undefined") return;',
          '      const fs = require("fs");',
          '      let lastMtime = 0;',
          '      let lastState = "zh";',
          '      const check = () => {',
          '        try {',
          '          const stat = fs.statSync(signalPath);',
          '          const mtime = stat.mtimeMs || stat.mtime.getTime();',
          '          if (mtime !== lastMtime) {',
          '            lastMtime = mtime;',
          '            const content = fs.readFileSync(signalPath, "utf8");',
          '            const signal = JSON.parse(content);',
          '            const desired = signal.desiredState || "zh";',
          '            if (desired !== lastState) {',
          '              lastState = desired;',
          '              if (desired === "en" && this._enabled) {',
          '                this.enabled = false;',
          '                this.restoreOriginalText();',
          '              } else if (desired === "zh" && !this._enabled) {',
          '                this.retranslateAll();',
          '              }',
          '            }',
          '          }',
          '        } catch {}',
          '      };',
          '      check();',
          '      this._togglePollInterval = window.setInterval(check, 2000);',
          '    }',
          '    _stopTogglePolling() {',
          '      if (this._togglePollInterval) {',
          '        window.clearInterval(this._togglePollInterval);',
          '        this._togglePollInterval = null;',
          '      }',
          '    }',
        ]
      : [
          '    _saveOriginalText(element, originalText) {}',
          '    _saveOriginalAttr(element, attr, originalValue) {}',
        ]),
    '    _buildExactMap() {',
    '      for (let i = 0; i < this.entries.length; i++) {',
    '        const entry = this.entries[i];',
    '        if (!entry || !entry.originalText) continue;',
    '        const hasScope = (Array.isArray(entry.scopeSelectors) && entry.scopeSelectors.length > 0)',
    '          || (Array.isArray(entry.scopeContainsText) && entry.scopeContainsText.length > 0);',
    '        if (hasScope || entry.searchType !== "exact") continue;',
    '        if (!this._exactMap.has(entry.originalText)) {',
    '          this._exactMap.set(entry.originalText, entry.changeText);',
    '        }',
    '      }',
    '    }',
    '    _precomputeScopeHints() {',
    '      for (let i = 0; i < this.entries.length; i++) {',
    '        const entry = this.entries[i];',
    '        if (!entry || !Array.isArray(entry.scopeContainsText)) continue;',
    '        entry.__normalizedHints = entry.scopeContainsText.map((h) => this.normalizeText(h));',
    '      }',
    '    }',
    '    _getTextHash(text) {',
    '      let h = 0;',
    '      for (let i = 0; i < text.length; i++) {',
    '        h = ((h << 5) - h) + text.charCodeAt(i);',
    '        h |= 0;',
    '      }',
    '      return h;',
    '    }',
    '    _scheduleIdleWork() {',
    '      if (this._idleTimer) return;',
    '      this._idleTimer = window.setTimeout(() => this._processIdleQueue(), 0);',
    '    }',
    '    _processIdleQueue() {',
    '      this._idleTimer = null;',
    '      let queue = this._idleQueue;',
    '      this._idleQueue = [];',
    '      const perf = this._perf;',
    '      if (perf) { perf.idleQueueDepth = Math.max(perf.idleQueueDepth, queue.length); }',
    '      const treeTasks = [];',
    '      const otherTasks = [];',
    '      for (let i = 0; i < queue.length; i++) {',
    '        const task = queue[i];',
    '        if (task.type === "translateTree") {',
    '          treeTasks.push(task);',
    '        } else {',
    '          otherTasks.push(task);',
    '        }',
    '      }',
    '      const merged = [];',
    '      for (let i = 0; i < treeTasks.length; i++) {',
    '        const a = treeTasks[i];',
    '        if (!a) continue;',
    '        let contained = false;',
    '        for (let j = 0; j < treeTasks.length; j++) {',
    '          if (i === j || !treeTasks[j]) continue;',
    '          const b = treeTasks[j];',
    '          try {',
    '            if (a.root !== b.root && a.root.closest && a.root.closest(b.root)) {',
    '              contained = true;',
    '              break;',
    '            }',
    '          } catch {}',
    '        }',
    '        if (!contained) merged.push(a);',
    '        else if (perf) perf.idleQueueDeduped += 1;',
    '      }',
    '      queue = merged.concat(otherTasks);',
    '      for (let i = 0; i < queue.length; i++) {',
    '        const task = queue[i];',
    '        if (task.type === "translateTree") {',
    '          this._pendingIdleRoots.delete(task.root);',
    '          this.translateTree(task.root);',
    '        } else if (task.type === "observeRoot") {',
    '          this.observeRoot(task.root);',
    '        }',
    '        if (perf) perf.idleQueueProcessed += 1;',
    '      }',
    '    }',
    '    normalizeText(text) {',
    '      return String(text || "")',
    '        .replace(/\\u2026/g, "...")',
    '        .replace(/\\.{3,}/g, "...")',
    '        .replace(/&&/g, "")',
    '        .replace(/&/g, "")',
    '        .replace(/\\s+/g, " ")',
    '        .trim()',
    '        .toLowerCase();',
    '    }',
    '    shouldSkipElement(element) {',
      '      if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;',
      '      try {',
      '        return Boolean(element.closest(this.skipSelector));',
      '      } catch {',
      '        return false;',
      '      }',
      '    }',
    '    matchesAnySelector(element, selectors) {',
    '      if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;',
    '      if (!Array.isArray(selectors) || selectors.length === 0) return false;',
    '      return selectors.some((selector) => {',
    '        try {',
    '          return Boolean(element.matches(selector) || element.closest(selector));',
    '        } catch {',
    '          return false;',
    '        }',
    '      });',
    '    }',
    '    _getRegex(pattern, flags) {',
    '      const key = pattern + "\0" + flags;',
    '      let cached = this._regexCache.get(key);',
    '      if (!cached) {',
    '        cached = new RegExp(pattern, flags);',
    '        this._regexCache.set(key, cached);',
    '      }',
    '      return cached;',
    '    }',
    '    matchesScope(entry, element) {',
    '      const hasScopeSelectors = Array.isArray(entry.scopeSelectors) && entry.scopeSelectors.length > 0;',
    '      const hasScopeHints = Array.isArray(entry.scopeContainsText) && entry.scopeContainsText.length > 0;',
    '      if (!hasScopeSelectors && !hasScopeHints) return true;',
    '      if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;',
    '      const cacheKey = entry.originalText + "\0" + (entry.searchType || "exact") + "\0" + (element.tagName || "");',
    '      const cached = this._scopeCache.get(cacheKey);',
    '      if (cached !== undefined) {',
    '        if (this._perf) this._perf.scopeCacheHits += 1;',
    '        return cached;',
    '      }',
    '      if (this._perf) this._perf.scopeChecks += 1;',
    '      let result = false;',
    '      if (hasScopeSelectors) {',
    '        try {',
    '          if (element.closest(entry.scopeSelectors.join(","))) { result = true; }',
    '        } catch {}',
    '      }',
    '      if (!result && hasScopeHints) {',
    '        let current = element;',
    '        for (let depth = 0; current && depth < 6; depth += 1, current = current.parentElement) {',
    '          const scopeText = this.normalizeText(current.textContent || "");',
    '          if (!scopeText) continue;',
    '          const hints = entry.__normalizedHints || entry.scopeContainsText;',
    '          if (hints.some((hint) => scopeText.includes(hint))) {',
    '            result = true;',
    '            break;',
    '          }',
    '        }',
    '      }',
    '      if (this._scopeCache.size >= this._scopeCacheLimit) {',
    '        const firstKey = this._scopeCache.keys().next().value;',
    '        this._scopeCache.delete(firstKey);',
    '      }',
    '      this._scopeCache.set(cacheKey, result);',
    '      this._scopeCacheWrites += 1;',
    '      if (this._scopeCacheWrites >= 100) {',
    '        this._scopeCacheWrites = 0;',
    '        this._adjustScopeCache();',
    '      }',
    '      return result;',
    '    }',
    '    _invalidateSubtree(element) {',
    '      let current = element;',
    '      while (current) {',
    '        if (this._translatedSubtrees.has(current)) {',
    '          this._translatedSubtrees.delete(current);',
    '          break;',
    '        }',
    '        current = current.parentElement;',
    '      }',
    '    }',
    '    _adjustScopeCache() {',
    '      const perf = this._perf;',
    '      if (!perf || perf.scopeChecks < 500) return;',
    '      const ratio = perf.scopeCacheHits / perf.scopeChecks;',
    '      if (ratio > 0.85 && this._scopeCacheLimit < 800) {',
    '        this._scopeCacheLimit += 50;',
    '      } else if (ratio < 0.3 && this._scopeCacheLimit > 50) {',
    '        this._scopeCacheLimit -= 50;',
    '      }',
    '      perf.scopeChecks = 0;',
    '      perf.scopeCacheHits = 0;',
    '    }',
    '    isScopeContainer(element) {',
    '      if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;',
    '      if (!Array.isArray(this.observeScopeSelectors) || this.observeScopeSelectors.length === 0) return true;',
    '      return this.matchesAnySelector(element, this.observeScopeSelectors);',
    '    }',
    '    hasScopedObservation() {',
    '      return Array.isArray(this.observeScopeSelectors) && this.observeScopeSelectors.length > 0;',
    '    }',
    '    isSegmentedTipElement(element) {',
    '      if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;',
    '      try {',
    '        return Boolean(element.matches(".glass-empty-state-rotating-tips__text"));',
    '      } catch {',
    '        return false;',
    '      }',
    '    }',
    '    findSegmentedTipRoot(node) {',
    '      if (!node) return null;',
    '      const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;',
    '      if (!element || element.nodeType !== Node.ELEMENT_NODE) return null;',
    '      if (this.isSegmentedTipElement(element)) return element;',
    '      try {',
    '        return element.closest ? element.closest(".glass-empty-state-rotating-tips__text") : null;',
    '      } catch {',
    '        return null;',
    '      }',
    '    }',
    '    _renderTipContent(text) {',
    '      const fragment = document.createDocumentFragment();',
    '      const wrapper = document.createElement("span");',
    '      wrapper.className = "cursor-zh-tip-inline";',
    '      wrapper.style.display = "block";',
    '      wrapper.style.width = "100%";',
    '      wrapper.style.maxWidth = "100%";',
    '      wrapper.style.whiteSpace = "normal";',
    '      wrapper.style.textAlign = "center";',
    '      wrapper.style.lineHeight = "inherit";',
    '      const parts = String(text || "").split(/(\\s+)/);',
    '      for (let i = 0; i < parts.length; i++) {',
    '        const part = parts[i];',
    '        if (!part) continue;',
    '        if (/^\\s+$/.test(part)) {',
    '          wrapper.appendChild(document.createTextNode(part));',
    '          continue;',
    '        }',
    '        if (part.startsWith("/") || part.startsWith("@")) {',
    '          const chip = document.createElement("span");',
    '          chip.className = "glass-empty-state-rotating-tips__chip";',
    '          chip.textContent = part;',
    '          wrapper.appendChild(chip);',
    '          continue;',
    '        }',
    '        wrapper.appendChild(document.createTextNode(part));',
    '      }',
    '      fragment.appendChild(wrapper);',
    '      return fragment;',
    '    }',
    '    translateSpecialElement(element) {',
    '      if (!this._enabled) return false;',
    '      if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;',
    '      if (this.shouldSkipElement(element)) return false;',
    '      if (!this.isSegmentedTipElement(element)) return false;',
    '      const text = element.textContent || "";',
    '      if (!text || text.length > 500) return false;',
    '      const translated = this.translateTextForElement(text, element);',
    '      if (translated === text) return false;',
    '      this._saveOriginalText(element, text);',
    '      while (element.firstChild) element.removeChild(element.firstChild);',
    '      element.appendChild(this._renderTipContent(translated));',
    '      return true;',
    '    }',
    '    translateText(text) {',
      '      return this.translateTextForElement(text, null);',
    '    }',
    '    translateTextForElement(text, element) {',
    '      if (typeof text !== "string" || text.length === 0) return text;',
    '      const perf = this._perf;',
    '      const start = perf ? performance.now() : 0;',
    '      let current = text;',
    '      const trimmed = current.trim();',
    '      const fast = this._exactMap.get(trimmed);',
    '      if (fast !== undefined) {',
    '        current = fast;',
    '      } else {',
    '        for (const entry of this.entries) {',
    '          if (!entry || !entry.originalText) continue;',
    '          if (!this.matchesScope(entry, element || null)) continue;',
    '          if (entry.searchType === "exact") {',
    '            if (trimmed === entry.originalText) current = entry.changeText;',
    '          } else if (entry.searchType === "normalizedExact") {',
    '            if (this.normalizeText(current) === this.normalizeText(entry.originalText)) current = entry.changeText;',
    '          } else if (entry.searchType === "partial") {',
    '            current = current.split(entry.originalText).join(entry.changeText);',
    '          } else if (entry.searchType === "regex") {',
    '            const regex = this._getRegex(entry.originalText, entry.flags || "g");',
    '            current = current.replace(regex, entry.changeText);',
    '          }',
    '        }',
    '      }',
    '      if (perf) { perf.translateCalls += 1; perf.translateTime += performance.now() - start; }',
    '      return current;',
    '    }',
    '    translateNode(node) {',
    '      if (!this._enabled) return;',
    '      if (!node || node.nodeType !== Node.TEXT_NODE) return;',
    '      const text = node.textContent;',
    '      if (!text || text.length > 500) return;',
    '      const hash = this._getTextHash(text);',
    '      const prev = this._seenNodes.get(node);',
    '      if (prev === hash) return;',
    '      this._seenNodes.set(node, hash);',
    '      const parent = node.parentElement;',
    '      if (!parent) return;',
    '      const specialRoot = this.findSegmentedTipRoot(parent);',
    '      if (specialRoot) {',
    '        this._translatedSubtrees.delete(specialRoot);',
    '        this.translateSpecialElement(specialRoot);',
    '        return;',
    '      }',
    '      if (this.shouldSkipElement(parent)) return;',
    '      const translated = this.translateTextForElement(text, parent);',
    '      if (translated !== text) {',
    '        this._saveOriginalText(parent, text);',
    '        node.textContent = translated;',
    '      }',
    '    }',
    '    translateExactTextNode(node) {',
    '      if (!this._enabled) return false;',
    '      if (!node || node.nodeType !== Node.TEXT_NODE) return false;',
    '      const text = node.textContent;',
    '      if (!text || text.length > 220) return false;',
    '      const parent = node.parentElement;',
    '      if (!parent || this.shouldSkipElement(parent)) return false;',
    '      let translated = this._exactMap.get(text);',
    '      if (!translated) {',
    '        const compact = text.replace(/\\s+/g, " ").trim();',
    '        if (!compact || compact.length > 220 || compact === text) return false;',
    '        translated = this._exactMap.get(compact);',
    '        if (!translated) return false;',
    '        node.textContent = text.replace(compact, translated);',
    '        return true;',
    '      }',
    '      node.textContent = translated;',
    '      return true;',
    '    }',
    '    translateAttributes(element) {',
    '      if (!this._enabled) return;',
    '      if (!element || element.nodeType !== Node.ELEMENT_NODE) return;',
    '      if (this.shouldSkipElement(element)) return;',
    '      for (const attr of ["title", "aria-label", "aria-description", "placeholder"]) {',
    '        const value = element.getAttribute(attr);',
    '        if (!value) continue;',
    '        const translated = this.translateTextForElement(value, element);',
    '        if (translated !== value) {',
    '          this._saveOriginalAttr(element, attr, value);',
    '          element.setAttribute(attr, translated);',
    '        }',
    '      }',
    '    }',
    '    collectScopeRoots(root) {',
    '      if (!root) return [];',
    '      const results = [];',
    '      const seen = new Set();',
    '      const add = (element) => {',
    '        if (!element || element.nodeType !== Node.ELEMENT_NODE) return;',
    '        if (seen.has(element)) return;',
    '        seen.add(element);',
    '        results.push(element);',
    '      };',
    '      if (root.nodeType === Node.ELEMENT_NODE && this.isScopeContainer(root)) {',
    '        add(root);',
    '      }',
    '      if (!Array.isArray(this.observeScopeSelectors) || this.observeScopeSelectors.length === 0) {',
    '        if (root === document || root === document.documentElement || root === document.body) {',
    '          add(document.body || document.documentElement);',
    '        }',
    '        return results.filter(Boolean);',
    '      }',
    '      if (root.querySelectorAll) {',
    '        try {',
    '          const mergedSelector = this.observeScopeSelectors.join(",");',
    '          const matched = root.querySelectorAll(mergedSelector);',
    '          for (let i = 0; i < matched.length; i++) {',
    '            add(matched[i]);',
    '          }',
    '        } catch {}',
    '      }',
    '      return results.filter(Boolean);',
    '    }',
    '    _chunkedTreeWalk(root, deadline) {',
    '      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);',
    '      let node;',
    '      while ((node = walker.nextNode())) {',
    '        this.translateNode(node);',
    '        if (deadline && deadline.timeRemaining() <= 2) return false;',
    '      }',
    '      return true;',
    '    }',
    '    _chunkedAttributeWalk(root, deadline) {',
    '      if (root.nodeType === Node.ELEMENT_NODE) {',
    '        this.translateAttributes(root);',
    '      }',
    '      return true;',
    '    }',
    '    runShortExactTextFallback(root) {',
    '      if (!this.shortExactTextFallback || !root || !root.createTreeWalker && !document.createTreeWalker) return;',
    '      const startRoot = root.nodeType === Node.DOCUMENT_NODE ? (root.body || root.documentElement) : root;',
    '      if (!startRoot) return;',
    '      let walker;',
    '      try {',
    '        walker = document.createTreeWalker(startRoot, NodeFilter.SHOW_TEXT, null, false);',
    '      } catch {',
    '        return;',
    '      }',
    '      const schedule = (fn) => {',
    '        if (typeof requestIdleCallback === "function") requestIdleCallback(fn, { timeout: 500 });',
    '        else window.setTimeout(() => fn({ timeRemaining: () => 0 }), 0);',
    '      };',
    '      const process = (deadline) => {',
    '        let node;',
    '        let visited = 0;',
    '        while ((node = walker.nextNode())) {',
    '          this.translateExactTextNode(node);',
    '          visited += 1;',
    '          if (visited >= 400 || (deadline && deadline.timeRemaining && deadline.timeRemaining() <= 2)) {',
    '            schedule(process);',
    '            return;',
    '          }',
    '        }',
    '      };',
    '      schedule(process);',
    '    }',
    '    translateTree(root) {',
    '      if (!root) return;',
    '      const perf = this._perf;',
    '      if (this._translatedSubtrees.has(root)) {',
    '        if (perf) perf.skippedTreeWalks += 1;',
    '        return;',
    '      }',
    '      const start = perf ? performance.now() : 0;',
    '      if (root.nodeType === Node.TEXT_NODE) {',
    '        this.translateNode(root);',
    '        if (perf) { perf.treeWalkCount += 1; perf.treeWalkTime += performance.now() - start; }',
    '        return;',
    '      }',
    '      if (root.nodeType === Node.ELEMENT_NODE) {',
    '        this.translateAttributes(root);',
    '        if (this.translateSpecialElement(root)) {',
    '          this._translatedSubtrees.add(root);',
    '          if (perf) { perf.treeWalkCount += 1; perf.treeWalkTime += performance.now() - start; }',
    '          return;',
    '        }',
    '        if (this.shouldSkipElement(root)) {',
    '          this._translatedSubtrees.add(root);',
    '          if (perf) { perf.treeWalkCount += 1; perf.treeWalkTime += performance.now() - start; }',
    '          return;',
    '        }',
    '      }',
    '      const hasIdle = typeof requestIdleCallback === "function";',
    '      if (!hasIdle || this._pendingAttributeElements) {',
    '        this._chunkedTreeWalk(root, null);',
    '        this._chunkedAttributeWalk(root, null);',
    '        this._translatedSubtrees.add(root);',
    '        if (perf) { perf.treeWalkCount += 1; perf.treeWalkTime += performance.now() - start; }',
    '        return;',
    '      }',
    '      const doChunked = (deadline) => {',
    '        let done = true;',
    '        if (!this._treeWalkDone) {',
    '          this._treeWalkDone = this._chunkedTreeWalk(root, deadline);',
    '          done = this._treeWalkDone;',
    '        }',
    '        if (this._treeWalkDone && !this._attributeWalkDone) {',
    '          this._attributeWalkDone = this._chunkedAttributeWalk(root, deadline);',
    '          done = this._attributeWalkDone;',
    '        }',
    '        if (!done) {',
    '          requestIdleCallback(doChunked, { timeout: 200 });',
    '        } else {',
    '          this._treeWalkDone = false;',
    '          this._attributeWalkDone = false;',
    '          this._translatedSubtrees.add(root);',
    '          if (perf) { perf.treeWalkCount += 1; perf.treeWalkTime += performance.now() - start; }',
    '        }',
    '      };',
    '      this._treeWalkDone = false;',
    '      this._attributeWalkDone = false;',
    '      requestIdleCallback(doChunked, { timeout: 200 });',
    '    }',
    '    _scheduleFlush() {',
    '      if (this._flushTimer) return;',
    '      this._flushTimer = window.setTimeout(() => this._flushMutations(), 16);',
    '    }',
    '    _flushMutations() {',
    '      this._flushTimer = null;',
    '      if (!this._enabled) { this._pendingMutations = []; return; }',
    '      if (this._isFlushing) return;',
    '      this._isFlushing = true;',
    '      const perf = this._perf;',
    '      const start = perf ? performance.now() : 0;',
    '      try {',
    '        const mutations = this._pendingMutations;',
    '        this._pendingMutations = [];',
    '        const addedElements = [];',
    '        const segmentedTipRoots = new Set();',
    '        for (const mutation of mutations) {',
    '          mutation.addedNodes.forEach((node) => {',
    '            const specialRoot = this.findSegmentedTipRoot(node);',
    '            if (specialRoot) {',
    '              this._translatedSubtrees.delete(specialRoot);',
    '              segmentedTipRoots.add(specialRoot);',
    '              return;',
    '            }',
    '            if (node.nodeType === Node.TEXT_NODE) {',
    '              this.translateNode(node);',
    '              this._invalidateSubtree(node.parentElement);',
    '            } else if (node.nodeType === Node.ELEMENT_NODE) {',
    '              addedElements.push(node);',
    '              this._invalidateSubtree(node);',
    '            }',
    '          });',
    '          if (mutation.type === "characterData") {',
    '            const specialRoot = this.findSegmentedTipRoot(mutation.target);',
    '            if (specialRoot) {',
    '              this._translatedSubtrees.delete(specialRoot);',
    '              segmentedTipRoots.add(specialRoot);',
    '            } else {',
    '              this.translateNode(mutation.target);',
    '              this._invalidateSubtree(mutation.target.parentElement);',
    '            }',
    '          }',
    '          if (mutation.type === "attributes" && mutation.target) {',
    '            this.translateAttributes(mutation.target);',
    '            this._invalidateSubtree(mutation.target);',
    '          }',
    '        }',
    '        segmentedTipRoots.forEach((specialRoot) => this.translateSpecialElement(specialRoot));',
    '        for (let i = 0; i < addedElements.length; i++) {',
    '          const element = addedElements[i];',
    '          this.translateAttributes(element);',
    '          if (!this._pendingIdleRoots.has(element)) {',
    '            this._pendingIdleRoots.add(element);',
    '            this._idleQueue.push({ type: "translateTree", root: element });',
    '          }',
    '          if (element.tagName === "IFRAME") {',
    '            this.bindFrame(element);',
    '          }',
    '          if (element.shadowRoot) {',
    '            if (!this._pendingIdleRoots.has(element.shadowRoot)) {',
    '              this._pendingIdleRoots.add(element.shadowRoot);',
    '              this._idleQueue.push({ type: "translateTree", root: element.shadowRoot });',
    '              this._idleQueue.push({ type: "observeRoot", root: element.shadowRoot });',
    '            }',
    '          }',
    '        }',
    '        if (this._idleQueue.length > 0) this._scheduleIdleWork();',
    '      } finally {',
    '        this._isFlushing = false;',
    '        if (perf) { perf.mutationBatchCount += 1; perf.mutationBatchTime += performance.now() - start; }',
    '      }',
    '    }',
    '    observeRoot(root) {',
    '      if (!root || root.__cursorZhObserver) return;',
    '      const observer = new MutationObserver((mutations) => {',
    '        for (const mutation of mutations) {',
    '          this._pendingMutations.push(mutation);',
    '        }',
    '        this._scheduleFlush();',
    '      });',
    '      observer.observe(root, {',
    '        subtree: true,',
    '        childList: true,',
    '        characterData: true,',
    '        attributes: true,',
    '        attributeFilter: ["title", "aria-label", "aria-description", "placeholder"]',
    '      });',
    '      root.__cursorZhObserver = observer;',
    '    }',
    '    observeScopedRoots(root) {',
    '      const scopeRoots = this.collectScopeRoots(root);',
    '      const shouldStageRoot = Boolean(',
    '        root &&',
    '        (root.nodeType === Node.ELEMENT_NODE || root.nodeType === Node.DOCUMENT_FRAGMENT_NODE) &&',
    '        !this.hasScopedObservation()',
    '      );',
    '      if (shouldStageRoot) this._stageRootForTranslation(root);',
    '      if (scopeRoots.length === 0) return;',
    '      for (let i = 0; i < scopeRoots.length; i++) {',
    '        const scopeRoot = scopeRoots[i];',
    '        this.translateTree(scopeRoot);',
    '        this.observeRoot(scopeRoot);',
    '        this.observeExistingShadowRoots(scopeRoot);',
    '        this.observeExistingFrames(scopeRoot);',
    '      }',
    '    }',
    '    _stagedRoots = [];',
    '    _stagedTimer = null;',
    '    _isStagedTranslating = false;',
    '    _stageRootForTranslation(root) {',
    '      if (!root) return;',
    '      if (this._translatedSubtrees.has(root)) return;',
    '      if (this._stagedRootSet.has(root)) return;',
    '      this._stagedRootSet.add(root);',
    '      this._stagedRoots.push(root);',
    '      if (this._stagedTimer) return;',
    '      this._stagedTimer = window.setTimeout(() => this._flushStagedRoots(), 100);',
    '    }',
    '    _flushStagedRoots() {',
    '      this._stagedTimer = null;',
    '      if (this._isStagedTranslating) {',
    '        this._stagedTimer = window.setTimeout(() => this._flushStagedRoots(), 100);',
    '        return;',
    '      }',
    '      this._isStagedTranslating = true;',
    '      const batchSize = 3;',
    '      let processed = 0;',
    '      const flushBatch = () => {',
    '        while (processed < batchSize && this._stagedRoots.length > 0) {',
    '          const root = this._stagedRoots.shift();',
    '          if (root) this._stagedRootSet.delete(root);',
    '          if (root && !this._translatedSubtrees.has(root)) {',
    '            this.translateTree(root);',
    '          }',
    '          processed += 1;',
    '        }',
    '        if (this._stagedRoots.length > 0) {',
    '          window.setTimeout(() => {',
    '            processed = 0;',
    '            flushBatch();',
    '          }, 50);',
    '        } else {',
    '          this._isStagedTranslating = false;',
    '        }',
    '      };',
    '      flushBatch();',
    '    }',
    '    observeExistingShadowRoots(root) {',
    '      if (!root || !root.querySelectorAll) return;',
    '      const elements = root.querySelectorAll("*");',
    '      for (let i = 0; i < elements.length; i++) {',
    '        const element = elements[i];',
    '        if (!element.shadowRoot) continue;',
    '        this.translateTree(element.shadowRoot);',
    '        this.observeRoot(element.shadowRoot);',
    '      }',
    '    }',
    '    bindFrame(frame) {',
    '      if (!frame || frame.__cursorZhFrameBound) return;',
    '      const translateFrame = () => {',
    '        try {',
    '          const doc = frame.contentDocument;',
    '          if (!doc) return;',
    '          const root = doc.documentElement || doc.body || doc;',
    '          this.translateTree(root);',
    '          if (doc.documentElement) this.observeDiscoveryRoot(doc.documentElement);',
    '        } catch {}',
    '      };',
    '      frame.addEventListener("load", translateFrame);',
    '      frame.__cursorZhFrameBound = true;',
    '      translateFrame();',
    '    }',
    '    observeExistingFrames(root) {',
    '      if (!root || !root.querySelectorAll) return;',
    '      const frames = root.querySelectorAll("iframe");',
    '      for (let i = 0; i < frames.length; i++) {',
    '        this.bindFrame(frames[i]);',
    '      }',
    '    }',
    '    _scheduleDiscoveryFlush() {',
    '      if (this._discoveryFlushTimer) return;',
    '      this._discoveryFlushTimer = window.setTimeout(() => this._flushDiscoveryMutations(), 16);',
    '    }',
    '    _flushDiscoveryMutations() {',
    '      this._discoveryFlushTimer = null;',
    '      if (!this._enabled) { this._pendingDiscoveryMutations = []; return; }',
    '      if (this._isDiscoveryFlushing) return;',
    '      this._isDiscoveryFlushing = true;',
    '      try {',
    '        const mutations = this._pendingDiscoveryMutations;',
    '        this._pendingDiscoveryMutations = [];',
    '        const addedElements = [];',
    '        for (const mutation of mutations) {',
    '          mutation.addedNodes.forEach((node) => {',
    '            if (node.nodeType === Node.TEXT_NODE) {',
    '              this.translateNode(node);',
    '            } else if (node.nodeType === Node.ELEMENT_NODE) {',
    '              addedElements.push(node);',
    '            }',
    '          });',
    '          if (mutation.type === "attributes" && mutation.target) {',
    '            this.translateAttributes(mutation.target);',
    '          }',
    '        }',
    '        for (const node of addedElements) {',
    '          this.translateAttributes(node);',
    '          this.observeScopedRoots(node);',
    '          if (this.shortExactTextFallback) {',
    '            const fallbackText = (node.textContent || "").replace(/\\s+/g, " ").trim();',
    '            if (fallbackText && fallbackText.length <= 220) {',
    '              const fallbackRoot = node;',
    '              this.runShortExactTextFallback(fallbackRoot);',
    '            }',
    '          }',
    '          if (node.shadowRoot) {',
    '            this.translateTree(node.shadowRoot);',
    '            this.observeRoot(node.shadowRoot);',
    '          }',
    '          if (node.tagName === "IFRAME") {',
    '            this.bindFrame(node);',
    '          }',
    '        }',
    '      } finally {',
    '        this._isDiscoveryFlushing = false;',
    '      }',
    '    }',
    '    observeDiscoveryRoot(root) {',
    '      if (!root || root.__cursorZhDiscoveryObserver) return;',
    '      this._pendingDiscoveryMutations = [];',
    '      this._discoveryFlushTimer = null;',
    '      this._isDiscoveryFlushing = false;',
    '      const observer = new MutationObserver((mutations) => {',
    '        for (const mutation of mutations) {',
    '          this._pendingDiscoveryMutations.push(mutation);',
    '        }',
    '        this._scheduleDiscoveryFlush();',
    '      });',
    '      observer.observe(root, {',
    '        subtree: true,',
    '        childList: true,',
    '        attributes: Boolean(translationMetadata.runtimeConfig.observeDiscoveryAttributes),',
    '        attributeFilter: Boolean(translationMetadata.runtimeConfig.observeDiscoveryAttributes)',
    '          ? ["title", "aria-label", "aria-description", "placeholder"]',
    '          : undefined',
    '      });',
    '      root.__cursorZhDiscoveryObserver = observer;',
    '    }',
    '    installShadowObserver() {',
    '      if (typeof Element === "undefined") return;',
    '      const proto = Element.prototype;',
    '      if (!proto || proto.__cursorZhAttachShadowPatched) return;',
    '      const originalAttachShadow = proto.attachShadow;',
    '      if (typeof originalAttachShadow !== "function") return;',
    '      const translator = this;',
    '      proto.attachShadow = function patchedAttachShadow(init) {',
    '        const shadowRoot = originalAttachShadow.call(this, init);',
    '        queueMicrotask(() => {',
    '          if (!translator.isScopeContainer(this) && !translator.collectScopeRoots(shadowRoot).length) return;',
    '          translator.translateTree(shadowRoot);',
    '          translator.observeRoot(shadowRoot);',
    '        });',
    '        return shadowRoot;',
    '      };',
    '      proto.__cursorZhAttachShadowPatched = true;',
    '    }',
    '    install() {',
    '      const run = () => {',
    '        const documentRoot = document.body || document.documentElement;',
    '        if (this.stageDocumentRoot && documentRoot) this._stageRootForTranslation(documentRoot);',
    '        if (this.shortExactTextFallback && documentRoot) {',
    '          const exactFallbackRoot = documentRoot;',
    '          this.runShortExactTextFallback(exactFallbackRoot);',
    '        }',
    '        const scopeRoots = this.collectScopeRoots(document);',
    '        for (let i = 0; i < scopeRoots.length; i++) {',
    '          this._stageRootForTranslation(scopeRoots[i]);',
    '          this.observeRoot(scopeRoots[i]);',
    '          this.observeExistingShadowRoots(scopeRoots[i]);',
    '          this.observeExistingFrames(scopeRoots[i]);',
    '        }',
    '      };',
    '      const periodicScan = () => {',
    '        run();',
    '      };',
    '      this.installShadowObserver();',
    '      if (document.readyState === "loading") {',
    '        document.addEventListener("DOMContentLoaded", periodicScan, { once: true });',
    '      } else {',
    '        periodicScan();',
    '      }',
    '      const rescanDelays = Array.isArray(translationMetadata.runtimeConfig.rescanDelaysMs)',
    '        ? translationMetadata.runtimeConfig.rescanDelaysMs',
    '        : [];',
    '      rescanDelays.forEach((delay) => {',
    '        if (!Number.isFinite(delay) || delay < 0) return;',
    '        window.setTimeout(() => periodicScan(), delay);',
    '      });',
    '      const startObserver = () => {',
    '        this.observeDiscoveryRoot(document.documentElement);',
    '        if (this._stagedRoots.length > 0 && !this._stagedTimer) {',
    '          this._stagedTimer = window.setTimeout(() => this._flushStagedRoots(), 100);',
    '        }',
    '      };',
    '      if (document.documentElement) startObserver();',
    '      else document.addEventListener("DOMContentLoaded", startObserver, { once: true });',
    '      window.__cursorZhRuntime = this;',
    '      window.__cursorZhMetadata = translationMetadata;',
    ...(experimentalRuntimeToggleEnabled
      ? [
          '      Object.defineProperty(window, "__cursorZhEnabled", {',
          '        get() { return window.__cursorZhRuntime ? window.__cursorZhRuntime.enabled : true; },',
          '        set(value) { if (window.__cursorZhRuntime) window.__cursorZhRuntime.enabled = value; },',
          '      });',
        ]
      : []),
    ...(experimentalRuntimeToggleEnabled ? ['      this._startTogglePolling();'] : []),
    '    }',
    '  }',
    '  new TextTranslator(translationMappings, translationMetadata.runtimeConfig || {}).install();',
    '})();',
    '',
  ].join('\n');

  const translatedSource = applyStaticSourceTranslations(workbenchSource, mappings);
  return `${runtimeHeader}${translatedSource}`;
}

module.exports = {
  applyStaticSourceTranslations,
  applyStaticSourceTranslationsDetailed,
  analyzeCursorWinCoverage,
  analyzeProductTipsCoverage,
  analyzeDynamicRuleCoverage,
  buildTranslatedWorkbenchBundle,
  compareLanguagePackVersion,
  cursorWinCoverageTargets,
  defaultCursorWinCommonMappings,
  defaultCursorWinDynamicMappings,
  defaultOverlayMappings,
  evaluatePatchContracts,
  mergeMappings,
  normalizeTextForComparison,
  productTipsCoverageTargets,
  parseJsonc,
  parseLegacyWorktreeMappings,
  selectRuntimeMappings,
  summarizeStaticPatchContractsFromTranslatedSource,
  summarizeRuntimeFootprint,
  translateTextWithMappings,
  withLocaleSetting,
};
