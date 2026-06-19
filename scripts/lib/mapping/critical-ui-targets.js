/** Critical chat / shell UI strings that must have exact mappings. */
const CRITICAL_CHAT_SHELL_UI = [
  { originalText: 'File', changeText: '文件' },
  { originalText: 'Edit', changeText: '编辑' },
  { originalText: 'View', changeText: '视图' },
  { originalText: 'Help', changeText: '帮助' },
  { originalText: 'Window', changeText: '窗口' },
  { originalText: 'Pin', changeText: '固定', forceRuntime: true },
  { originalText: 'Unpin', changeText: '取消固定', forceRuntime: true },
  { originalText: 'Rename', changeText: '重命名', forceRuntime: true },
  { originalText: 'Mark as Unread', changeText: '标记为未读', forceRuntime: true },
  { originalText: 'Mark as Read', changeText: '标记为已读', forceRuntime: true },
  { originalText: 'Archive', changeText: '归档', forceRuntime: true },
  { originalText: 'Split', changeText: '拆分', forceRuntime: true },
  { originalText: 'Fork Chat', changeText: '分叉对话', forceRuntime: true },
  { originalText: 'Export Chat', changeText: '导出对话', forceRuntime: true },
  { originalText: 'Export Transcript', changeText: '导出转录', forceRuntime: true },
  { originalText: 'Copy Message', changeText: '复制消息', forceRuntime: true },
  { originalText: 'Copy', changeText: '复制', forceRuntime: true },
  { originalText: 'Cut', changeText: '剪切', forceRuntime: true },
  { originalText: 'Paste', changeText: '粘贴', forceRuntime: true },
  { originalText: 'Select All', changeText: '全选', forceRuntime: true },
  { originalText: 'Cancel Chat', changeText: '取消对话', forceRuntime: true },
  { originalText: 'Close Tab', changeText: '关闭标签页', forceRuntime: true },
  { originalText: 'New Tab', changeText: '新建标签页', forceRuntime: true },
  { originalText: 'Reload Window', changeText: '重新加载窗口', forceRuntime: true },
  { originalText: 'Open Chat', changeText: '打开对话', forceRuntime: true },
  { originalText: 'Untitled Chat', changeText: '无标题对话', forceRuntime: true },
  { originalText: 'Untitled Plan', changeText: '无标题计划', forceRuntime: true },
  {
    originalText: 'New Chat with Selections',
    changeText: '用所选内容新建对话',
    forceRuntime: true,
  },
  { originalText: 'Copy Path', changeText: '复制路径', forceRuntime: true },
  {
    originalText: 'Reveal in File Explorer',
    changeText: '在文件资源管理器中显示',
    forceRuntime: true,
  },
  { originalText: 'Create PR', changeText: '创建 PR', forceRuntime: true },
  { originalText: 'Pull Request', changeText: '拉取请求', forceRuntime: true },
  { originalText: 'Creating PR...', changeText: '正在创建 PR...', forceRuntime: true },
  { originalText: 'Create Draft PR', changeText: '创建草稿 PR', forceRuntime: true },
  { originalText: 'Merge Editor', changeText: '合并编辑器', forceRuntime: true },
  { originalText: 'Discard Changes', changeText: '放弃更改', forceRuntime: true },
  { originalText: 'Keep All', changeText: '全部保留', forceRuntime: true },
  { originalText: 'Undo All', changeText: '全部撤销', forceRuntime: true },
  { originalText: 'Undo Apply', changeText: '撤销应用', forceRuntime: true },
  { originalText: 'Move to Local', changeText: '移到本地', forceRuntime: true },
  { originalText: 'Move to Trash', changeText: '移到废纸篓', forceRuntime: true },
  { originalText: 'Open in Web', changeText: '在 Web 中打开', forceRuntime: true },
  { originalText: 'Open Browser', changeText: '打开浏览器', forceRuntime: true },
  { originalText: 'New Folder', changeText: '新建文件夹', forceRuntime: true },
  { originalText: 'New Project', changeText: '新建项目', forceRuntime: true },
  { originalText: 'Cloud Agent', changeText: '云 Agent', forceRuntime: true },
  { originalText: 'Fix with Agent', changeText: '用 Agent 修复', forceRuntime: true },
  { originalText: 'Fix in Agent', changeText: '在 Agent 中修复', forceRuntime: true },
  { originalText: 'Give Feedback', changeText: '提供反馈', forceRuntime: true },
  { originalText: 'Report Issue', changeText: '报告问题', forceRuntime: true },
  { originalText: 'View Plan', changeText: '查看计划', forceRuntime: true },
  { originalText: 'Checkout Branch', changeText: '检出分支', forceRuntime: true },
  { originalText: 'Diff with Main', changeText: '与 Main 差异', forceRuntime: true },
  { originalText: 'Load Diff', changeText: '加载差异', forceRuntime: true },
  { originalText: 'Review Changes', changeText: '查看更改', forceRuntime: true },
  { originalText: 'Go to Next Change', changeText: '转到下一处更改', forceRuntime: true },
  { originalText: 'Go to Previous Change', changeText: '转到上一处更改', forceRuntime: true },
  { originalText: 'Open Settings', changeText: '打开设置', forceRuntime: true },
  { originalText: 'No Results', changeText: '无结果', forceRuntime: true },
  { originalText: 'Not Found', changeText: '未找到', forceRuntime: true },
  { originalText: 'Not Supported', changeText: '不支持', forceRuntime: true },
  { originalText: 'Connection Failed', changeText: '连接失败', forceRuntime: true },
  { originalText: 'Files & Folders', changeText: '文件和文件夹', forceRuntime: true },
  { originalText: 'Select Repos', changeText: '选择仓库', forceRuntime: true },
  { originalText: 'Add MCP', changeText: '添加 MCP', forceRuntime: true },
  { originalText: 'Run MCP tool', changeText: '运行 MCP 工具', forceRuntime: true },
  { originalText: 'Debug Mode', changeText: '调试模式', forceRuntime: true },
  { originalText: 'Mermaid Diagram', changeText: 'Mermaid 图表', forceRuntime: true },
  { originalText: 'More actions', changeText: '更多操作', forceRuntime: true },
];

/** Editor chrome, settings surfaces, and composer controls from user-reported gaps. */
const CRITICAL_UI_SURFACE_TARGETS = [
  { originalText: 'Save File', changeText: '保存文件' },
  { originalText: 'Copy Relative Path', changeText: '复制相对路径' },
  { originalText: 'Copy Relative Path of Active File', changeText: '复制活动文件的相对路径' },
  { originalText: 'Diff View', changeText: '差异视图' },
  { originalText: 'Line Numbers', changeText: '行号' },
  { originalText: 'Word Wrap', changeText: '自动换行' },
  { originalText: 'Auto Save', changeText: '自动保存' },
  { originalText: 'Browse Files', changeText: '浏览文件' },
  { originalText: 'Search Files', changeText: '搜索文件' },
  { originalText: 'PR Preferences', changeText: 'PR 偏好设置' },
  {
    originalText: 'Preferred PR destination',
    changeText: '首选 PR 打开位置',
  },
  {
    originalText: 'Choose where PR links open across web, the desktop app and IDE.',
    changeText: '选择 PR 链接在 Web、桌面应用和 IDE 中的打开方式。',
  },
  {
    originalText: 'Ignore Symlinks in Cursor Ignore Search',
    changeText: '在 Cursor Ignore 搜索中忽略符号链接',
  },
  { originalText: 'Auto-Parse Links', changeText: '自动解析链接' },
  { originalText: 'Authentication', changeText: '身份验证' },
  {
    originalText: 'Wait for MCP Authentication',
    changeText: '等待 MCP 身份验证',
  },
  {
    originalText:
      'Wait indefinitely to authenticate when prompted. When off, skip authentication prompts after 30 seconds.',
    changeText:
      '无限期等待身份验证提示。关闭后，30 秒后跳过身份验证提示。',
  },
  { originalText: 'Send', changeText: '发送', forceRuntime: true },
  {
    originalText: 'Modes, skills, MCPs and more',
    changeText: '模式、技能、MCP 等',
    forceRuntime: true,
  },
  {
    originalText:
      'Your code data will not be trained on or used to improve the product. Code may be stored to provide features such as Background Agent.',
    changeText:
      '你的代码数据不会用于训练或改进产品。代码可能会被存储以提供 Background Agent 等功能。',
  },
  {
    originalText: 'Loading Subagents...',
    changeText: '正在加载子智能体...',
  },
  { originalText: 'Web Fetch Tool', changeText: '网页抓取工具' },
];

/** Agent / composer UI from user-reported screenshot gaps (round 2). */
const CRITICAL_AGENT_UI_TARGETS = [
  { originalText: 'Split Right', changeText: '向右拆分' },
  { originalText: 'Split Down', changeText: '向下拆分' },
  { originalText: 'Plan New Idea', changeText: '规划新想法' },
  { originalText: 'Start Multitasking', changeText: '开始多任务处理' },
  { originalText: 'Run in Cloud', changeText: '在云端运行' },
  { originalText: 'Run in background', changeText: '在后台运行' },
  {
    originalText: 'Agent is waiting for a command to finish.',
    changeText: 'Agent 正在等待命令完成。',
  },
  {
    originalText: 'Agent is waiting for commands to finish.',
    changeText: 'Agent 正在等待多条命令完成。',
  },
  { originalText: 'Created snapshot', changeText: '已创建快照' },
  { originalText: '{0} to Send', changeText: '{0} 后发送' },
  { originalText: '1 Queued', changeText: '1 个排队' },
  { originalText: 'to Send', changeText: '待发送' },
  { originalText: 'Thought', changeText: '思考' },
  { originalText: 'Edit Queued', changeText: '编辑排队' },
  { originalText: 'Send now', changeText: '立即发送' },
  { originalText: 'New Agent in Project', changeText: '在项目中新建 Agent' },
];

/** Workspace / sidebar / terminal / dialog gaps (round 3). */
const CRITICAL_WORKSPACE_UI_TARGETS = [
  { originalText: 'Set Up Workspace', changeText: '设置工作区' },
  { originalText: 'Connect SSH', changeText: '连接 SSH' },
  { originalText: 'Run On', changeText: '运行位置' },
  { originalText: 'Repos', changeText: '仓库' },
  { originalText: '1 Terminal', changeText: '1 个终端' },
  { originalText: '{0} Terminals', changeText: '{0} 个终端' },
  { originalText: 'No projects', changeText: '无项目' },
  {
    originalText: 'Submit from a previous message?',
    changeText: '从之前的消息提交？',
  },
  {
    originalText:
      'Submitting from a previous message will revert file changes to before this message and clear the messages after this one.',
    changeText:
      '从之前的消息提交将还原该消息之前的文件更改，并清除此消息之后的所有消息。',
  },
  { originalText: "Don't Ask Again", changeText: '不再询问' },
  { originalText: "Don't revert", changeText: '不还原' },
  { originalText: 'Revert', changeText: '还原' },
  { originalText: 'Always revert', changeText: '始终还原' },
];

/** Glass account menu and macOS-style Help menu items missed by quoted-literal scan. */
const CRITICAL_GLASS_APP_MENU_UI_TARGETS = [
  { originalText: 'Shortcuts', changeText: '快捷键' },
  { originalText: 'Contact Us', changeText: '联系我们' },
  { originalText: 'Check for Updates...', changeText: '检查更新...' },
  { originalText: 'Search Settings', changeText: '搜索设置' },
];

/** Glass shell surfaces from user-reported round 5 gaps. */
const CRITICAL_GLASS_ROUND5_UI_TARGETS = [
  { originalText: 'Fork', changeText: '分叉' },
  { originalText: 'Export', changeText: '导出' },
  { originalText: 'Find in Changes', changeText: '在更改中查找' },
  { originalText: 'Open any file, URL, ...', changeText: '打开任意文件、URL...' },
  { originalText: 'Canvas', changeText: '画布' },
  { originalText: 'Open Tabs', changeText: '打开的标签页' },
  { originalText: 'Unified', changeText: '统一' },
  { originalText: 'Uncommitted', changeText: '未提交' },
  { originalText: 'Last Turn', changeText: '最后一轮' },
  { originalText: 'Current Turn', changeText: '当前轮次' },
  { originalText: 'No committed changes', changeText: '没有已提交的更改' },
  { originalText: 'No Commits', changeText: '没有提交' },
  { originalText: 'No uncommitted changes', changeText: '没有未提交的更改' },
];

/** Glass agent mode menu, tooltips, and browser tools header (round 6). */
const CRITICAL_GLASS_ROUND6_UI_TARGETS = [
  { originalText: 'Add agents, context, tools...', changeText: '添加智能体、上下文和工具...' },
  { originalText: 'Plan Mode', changeText: '规划模式' },
  { originalText: 'Multitask Mode', changeText: '多任务模式' },
  { originalText: 'Ask Mode', changeText: '提问模式' },
  { originalText: 'Manage View', changeText: '管理视图' },
  {
    originalText:
      'Generates a robust implementation plan prior to writing code, asking clarifying questions when needed.',
    changeText: '在编写代码前生成可靠的实现计划，必要时提出澄清问题。',
  },
  {
    originalText:
      'Pinpoints the root cause of an issue by generating hypotheses and gathering runtime evidence.',
    changeText: '通过生成假设并收集运行时证据，定位问题的根本原因。',
  },
  {
    originalText:
      'Uses a fleet of subagents to parallelize requests, instead of adding them to a queue.',
    changeText: '使用子智能体并行处理请求，而不是将它们加入队列。',
  },
  {
    originalText: 'Explores the codebase and answer questions without making  edits.',
    changeText: '探索代码库并回答问题，不进行编辑。',
  },
];

/** Glass chat feedback, relative time, and workspace rail header (round 7). */
const CRITICAL_GLASS_ROUND7_UI_TARGETS = [
  { originalText: 'Good response', changeText: '回答不错' },
  { originalText: 'Bad response', changeText: '回答不佳' },
  { originalText: 'just now', changeText: '刚刚' },
  { originalText: 'Updated just now', changeText: '刚刚更新' },
];

/** Glass MCP panel, copy menu, waiting status, build hint, and relative time (round 8). */
const CRITICAL_GLASS_ROUND8_UI_TARGETS = [
  { originalText: 'Home MCP Servers', changeText: 'Home MCP 服务器' },
  { originalText: 'Servers available from Home.', changeText: '来自 Home 的可用服务器。' },
  { originalText: 'Copy Messages', changeText: '复制消息' },
  {
    originalText: 'Parallelize Build with Multitask Mode.',
    changeText: '使用多任务模式并行构建。',
  },
];

/** Glass agent tool-call wait status labels (round 9). */
const CRITICAL_GLASS_ROUND9_UI_TARGETS = [
  { originalText: 'Wait skipped', changeText: '已跳过等待' },
];

/** Glass chat copy submenu labels (round 10). */
const CRITICAL_GLASS_ROUND10_UI_TARGETS = [
  { originalText: 'Copy Branch Name', changeText: '复制分支名' },
];

/** Glass agent list filters, sort menus, and composer controls (round 11). */
const CRITICAL_GLASS_ROUND11_UI_TARGETS = [
  { originalText: 'Sort by', changeText: '排序' },
  { originalText: 'Filter by', changeText: '筛选' },
  { originalText: 'Mark All as Read', changeText: '全部标记为已读' },
  { originalText: 'Needs Attention', changeText: '需要关注' },
  { originalText: 'Copy Request ID', changeText: '复制请求 ID' },
  { originalText: 'PR Draft', changeText: 'PR 草稿' },
  { originalText: 'PR Open', changeText: 'PR 已打开' },
  { originalText: 'PR Merged', changeText: 'PR 已合并' },
  { originalText: 'PR Closed', changeText: 'PR 已关闭' },
  { originalText: 'No PR', changeText: '无 PR' },
  { originalText: 'Frontend QA', changeText: '前端 QA' },
  { originalText: 'Check for Updates', changeText: '检查更新' },
  { originalText: 'Dictate', changeText: '听写' },
];

/** Glass checkpoint revert dialog and chat summarization status (round 12). */
const CRITICAL_GLASS_ROUND12_UI_TARGETS = [
  {
    originalText: 'Discard all changes up to this checkpoint?',
    changeText: '是否丢弃此检查点之前的所有更改？',
  },
  {
    originalText: 'You can always undo this later.',
    changeText: '你之后仍可撤销此操作。',
  },
  {
    originalText: 'Note: Notebook cells are not supported for reverting.',
    changeText: '注意：不支持还原 Notebook 单元格。',
  },
  { originalText: 'Chat context summarized', changeText: '聊天上下文已总结' },
  { originalText: 'Summarizing chat context', changeText: '正在总结聊天上下文' },
];

/** Glass plans and usage settings (round 13). */
const CRITICAL_GLASS_ROUND13_UI_TARGETS = [
  { originalText: 'Current Plan', changeText: '当前套餐' },
  { originalText: 'Upgrade Available', changeText: '可升级' },
  { originalText: 'On-Demand Usage', changeText: '按需用量' },
  { originalText: 'On-Demand Spending', changeText: '按需支出' },
  {
    originalText: 'On-demand spending is currently disabled',
    changeText: '按需支出当前已禁用',
  },
  { originalText: 'Monthly Limit', changeText: '每月上限' },
  {
    originalText: 'Set a fixed amount or make it unlimited.',
    changeText: '设置固定额度或不设上限。',
  },
  {
    originalText: 'Unlock 3x more usage on Agent & more',
    changeText: '解锁 Agent 等 3 倍用量',
  },
  {
    originalText:
      'On-demand usage is consumed after a usage limit is reached, and is billed in arrears.',
    changeText: '达到用量上限后将使用按需用量，并按后付费结算。',
  },
];

/** Glass menubar update menu and search-models auto subtitle (round 14). */
const CRITICAL_GLASS_ROUND14_UI_TARGETS = [
  { originalText: 'Check for Updates\u2026', changeText: '检查更新\u2026' },
  { originalText: 'Checking for Updates\u2026', changeText: '正在检查更新\u2026' },
  {
    originalText: 'Balanced quality and speed, recommended for most tasks',
    changeText: '质量与速度均衡，适合大多数任务',
    forceRuntime: true,
  },
];

/** Glass queue tray, composer stop tooltip, auto trigger, agent status (round 16). */
const CRITICAL_GLASS_ROUND16_UI_TARGETS = [
  {
    originalText: 'Taking longer than expected\u2026',
    changeText: '耗时比预期更长\u2026',
  },
];

/** Glass canvas list, context usage tray, publish menu (round 17). */
const CRITICAL_GLASS_ROUND17_UI_TARGETS = [
  { originalText: 'Context Usage', changeText: '上下文用量' },
  { originalText: 'View Report', changeText: '查看报告' },
  { originalText: 'Hide Canvas List', changeText: '隐藏画布列表' },
  { originalText: 'Show Canvas List', changeText: '显示画布列表' },
  { originalText: 'Hide canvas list', changeText: '隐藏画布列表' },
  { originalText: 'Show canvas list', changeText: '显示画布列表' },
  { originalText: 'Create new canvas', changeText: '新建画布' },
  { originalText: 'Create a Canvas from chat', changeText: '从对话创建画布' },
  { originalText: 'All team members can view', changeText: '所有团队成员均可查看' },
  { originalText: 'Publish', changeText: '发布' },
  { originalText: 'Recent', changeText: '最近' },
  { originalText: ' context used', changeText: ' 上下文已用' },
  { originalText: 'Active Rules', changeText: '活跃规则' },
  { originalText: 'Other', changeText: '其他' },
  { originalText: 'Context Usage Report', changeText: '上下文用量报告' },
  { originalText: 'Context Explorer', changeText: '上下文浏览器' },
  { originalText: 'Debug with Agent', changeText: '用 Agent 调试' },
  { originalText: 'Expand All', changeText: '全部展开' },
  { originalText: 'Collapse All', changeText: '全部收起' },
  { originalText: 'Open Chat', changeText: '打开对话' },
  { originalText: 'Tokens used', changeText: '已用 Token' },
  {
    originalText: 'System prompt',
    changeText: '系统提示词',
    forceRuntime: true,
  },
  {
    originalText: 'Tool definitions',
    changeText: '工具定义',
    forceRuntime: true,
  },
  {
    originalText: 'Summarized conversation',
    changeText: '已总结对话',
    forceRuntime: true,
  },
  {
    originalText: 'Subagent definitions',
    changeText: '子智能体定义',
    forceRuntime: true,
  },
  {
    originalText: 'Conversation',
    changeText: '对话',
    forceRuntime: true,
  },
  {
    originalText: 'Rules',
    changeText: '规则',
    forceRuntime: true,
  },
  {
    originalText: 'Skills',
    changeText: '技能',
    forceRuntime: true,
  },
];

/** Glass terminal list toggle and SCM changes error (round 18). */
const CRITICAL_GLASS_ROUND18_UI_TARGETS = [
  { originalText: 'Failed to load changes', changeText: '无法加载更改' },
  { originalText: 'Hide Terminal List', changeText: '隐藏终端列表' },
  { originalText: 'Show Terminal List', changeText: '显示终端列表' },
  { originalText: 'Hide terminal list', changeText: '隐藏终端列表' },
  { originalText: 'Show terminal list', changeText: '显示终端列表' },
];

/** Glass branch picker for automations and repo workflows (round 19). */
const CRITICAL_GLASS_ROUND19_UI_TARGETS = [
  { originalText: 'Search branches...', changeText: '搜索分支...' },
  { originalText: 'Search branches', changeText: '搜索分支' },
  { originalText: 'Loading branches...', changeText: '正在加载分支...' },
  { originalText: 'No branches found', changeText: '未找到分支' },
  { originalText: 'No branches available', changeText: '无可用分支' },
  { originalText: 'Select a repository first', changeText: '请先选择仓库' },
];

/** Glass automations hub, empty state, and approval dialogs (round 20). */
const CRITICAL_GLASS_ROUND20_UI_TARGETS = [
  {
    originalText:
      'Automate repetitive tasks with always-on cloud agents that respond to environment triggers.',
    changeText: '借助始终在线的云端智能体自动执行重复任务，并响应环境触发器。',
  },
  { originalText: 'Total Automations', changeText: '自动化总数' },
  { originalText: 'Successful · 7d', changeText: '成功 · 7天' },
  { originalText: 'Failed · 7d', changeText: '失败 · 7天' },
  { originalText: 'Run History', changeText: '运行历史' },
  { originalText: 'New Automation', changeText: '新建自动化' },
  { originalText: 'No Automations Yet', changeText: '暂无自动化' },
  { originalText: 'No Results Found', changeText: '未找到结果' },
  {
    originalText:
      'Run agents on a schedule or automatically in response to events. Billed at plan rates.',
    changeText: '按计划运行智能体，或在事件触发时自动运行。按套餐标准计费。',
  },
  {
    originalText: 'Reduce interruptions with Auto-review',
    changeText: '使用 Auto-review 减少打断',
  },
  {
    originalText:
      'This mode allows Cursor to work for longer with fewer approval prompts and safer execution. Future commands and actions will go through this mode.',
    changeText:
      '此模式可减少审批提示、更安全地执行，让 Cursor 持续工作更久。后续命令与操作将按该模式运行。',
  },
  { originalText: 'Switch to Auto-review', changeText: '切换到 Auto-review' },
  { originalText: "Don't show again", changeText: '不再显示' },
  { originalText: 'Enable Run Everything?', changeText: '启用全部运行？' },
  { originalText: 'Enable Run Everything', changeText: '启用全部运行' },
  { originalText: 'Use Allowlist instead', changeText: '改用允许列表' },
  { originalText: 'Use Sandbox instead', changeText: '改用沙箱' },
  {
    originalText:
      'This allows the agent to execute any tool or shell command without approval. A prompt injection or a malicious tool could delete files or exfiltrate secrets from your machine. We recommend using Allowlist.',
    changeText:
      '这将允许智能体在未经批准的情况下执行任何工具或 shell 命令。提示注入或恶意工具可能删除文件或窃取你机器上的密钥。建议使用允许列表。',
  },
  {
    originalText:
      'This allows the agent to execute any tool or shell command without approval. A prompt injection or a malicious tool could delete files or exfiltrate secrets from your machine. We recommend using Sandbox.',
    changeText:
      '这将允许智能体在未经批准的情况下执行任何工具或 shell 命令。提示注入或恶意工具可能删除文件或窃取你机器上的密钥。建议使用沙箱。',
  },
];

/** Glass agent sidebar overflow menu (round 21). */
const CRITICAL_GLASS_ROUND21_UI_TARGETS = [
  { originalText: 'Archive All', changeText: '全部归档' },
  { originalText: 'Remove from Sidebar', changeText: '从侧边栏移除' },
];

/** Glass agent context menu move submenu (round 22). */
const CRITICAL_GLASS_ROUND22_UI_TARGETS = [
  { originalText: 'Move to', changeText: '移动到' },
];

/** Glass embedded browser menu and clear-data dialogs (round 4). */
const CRITICAL_GLASS_BROWSER_UI_TARGETS = [
  { originalText: 'Take Screenshot', changeText: '截图' },
  { originalText: 'Hard Reload', changeText: '强制重新加载' },
  { originalText: 'Copy Current URL', changeText: '复制当前 URL' },
  { originalText: 'Show Bookmark Bar', changeText: '显示书签栏' },
  { originalText: 'Clear Browsing History', changeText: '清除浏览记录' },
  { originalText: 'Clear Cookies', changeText: '清除 Cookie' },
  { originalText: 'Clear Cache', changeText: '清除缓存' },
  {
    originalText: 'This will remove all browsing history entries.',
    changeText: '这将删除所有浏览历史记录。',
  },
  {
    originalText: 'This will remove all cookies. You may be signed out of websites.',
    changeText: '这将删除所有 Cookie，你可能会从网站退出登录。',
  },
  {
    originalText: 'This will clear the browser cache.',
    changeText: '这将清除浏览器缓存。',
  },
  { originalText: 'Clear Accepted Certificates', changeText: '清除已接受的证书' },
  {
    originalText: 'This will remove all manually accepted certificates.',
    changeText: '这将删除所有手动接受的证书。',
  },
];

/** Substrings embedded in Solid/HTML template literals that exact literal pass misses. */
const CRITICAL_EMBEDDED_UI_PATCHES = [
  { from: '<div>Web Search Tool', to: '<div>网页搜索工具' },
  { from: '<div><span>Subagents', to: '<div><span>子智能体' },
  { from: '<div>Web Fetch Tool', to: '<div>网页抓取工具' },
  {
    from: 'Choose how Agents run tools like command execution, MCP, and file writes.',
    to: '选择 Agent 运行命令执行、MCP 和文件写入等工具的方式。',
  },
  { from: 'Loading Subagents...', to: '正在加载子智能体...' },
  { from: 'New Agent in ${', to: '在 ${' },
  { from: 'Created ${', to: '已创建 ${' },
  { from: 'duration-100"> Queued', to: 'duration-100"> 个排队' },
  { from: 'duration-100"> 排队', to: 'duration-100"> 个排队' },
  { from: ':"Thought"', to: ':"思考"' },
  { from: '>Run in background', to: '>在后台运行' },
  { from: 'label:"Run in Cloud"', to: 'label:"在云端运行"' },
  { from: 'n?"Workspaces":', to: 'n?"工作区":' },
  { from: '`${n} Terminals`', to: '`${n} 个终端`' },
  { from: 'children:"No projects"', to: 'children:"无项目"' },
  { from: 'children:"Shortcuts"', to: 'children:"快捷键"' },
  { from: 'children:"Contact Us"', to: 'children:"联系我们"' },
  {
    from: 'Ft(11756,"Check for Updates...")',
    to: 'Ft(11756,"检查更新...")',
  },
  { from: 'label:"Fork"', to: 'label:"分叉"' },
  { from: 'label:"Export"', to: 'label:"导出"' },
  { from: 'z5C="Search Settings"', to: 'z5C="搜索设置"' },
  { from: 'children:"Find in Changes"', to: 'children:"在更改中查找"' },
  { from: 'title:"Find in Changes"', to: 'title:"在更改中查找"' },
  { from: 'placeholder:"Open any file, URL, ..."', to: 'placeholder:"打开任意文件、URL..."' },
  { from: 'children:"Canvas"', to: 'children:"画布"' },
  { from: 'children:"Open Tabs"', to: 'children:"打开的标签页"' },
  { from: '{value:"unified",label:"Unified"}', to: '{value:"unified",label:"统一"}' },
  { from: '{value:"split",label:"Split"}', to: '{value:"split",label:"拆分"}' },
  {
    from: 'subtitle:"Balanced quality and speed, recommended for most tasks"',
    to: 'subtitle:"质量与速度均衡，适合大多数任务"',
  },
  {
    from: 'description:m()?"Balanced quality and speed, recommended for most tasks":void 0',
    to: 'description:m()?"质量与速度均衡，适合大多数任务":void 0',
  },
  {
    from: 'sectionHeaderLabel:`On ${n.workspaceName.trim()||"workspace"}`',
    to: 'sectionHeaderLabel:`在 ${n.workspaceName.trim()||"工作区"}`',
  },
  {
    from: 'lastTurn:"Last Turn",uncommitted:"Uncommitted",unstaged:"Unstaged",staged:"Staged",branch:"Branch"',
    to: 'lastTurn:"最后一轮",uncommitted:"未提交",unstaged:"未暂存",staged:"已暂存",branch:"分支"',
  },
  {
    from: 'return n==="lastTurn"&&e===!0?"Current Turn":R9I[n]',
    to: 'return n==="lastTurn"&&e===!0?"当前轮次":R9I[n]',
  },
  { from: '`No ${e} Changes`', to: '`没有${e}的更改`' },
  { from: '"No committed changes"', to: '"没有已提交的更改"' },
  { from: '"No Commits"', to: '"没有提交"' },
  { from: 'placeholder:"Add agents, context, tools..."', to: 'placeholder:"添加智能体、上下文和工具..."' },
  {
    from: 'description:"Generates a robust implementation plan prior to writing code, asking clarifying questions when needed."',
    to: 'description:"在编写代码前生成可靠的实现计划，必要时提出澄清问题。"',
  },
  {
    from: 'description:"Pinpoints the root cause of an issue by generating hypotheses and gathering runtime evidence."',
    to: 'description:"通过生成假设并收集运行时证据，定位问题的根本原因。"',
  },
  {
    from: 'description:"Uses a fleet of subagents to parallelize requests, instead of adding them to a queue."',
    to: 'description:"使用子智能体并行处理请求，而不是将它们加入队列。"',
  },
  {
    from: 'description:"Explores the codebase and answer questions without making  edits."',
    to: 'description:"探索代码库并回答问题，不进行编辑。"',
  },
  { from: 'function Onh(n){return`${n} Mode`}', to: 'function Onh(n){return`${n}模式`}' },
  { from: 'function iAC(n){return`${n} Mode`}', to: 'function iAC(n){return`${n}模式`}' },
  { from: 'title:"Plan Mode"', to: 'title:"规划模式"' },
  { from: 'title:"Debug Mode"', to: 'title:"调试模式"' },
  { from: 'title:"Multitask Mode"', to: 'title:"多任务模式"' },
  { from: 'title:"Ask Mode"', to: 'title:"提问模式"' },
  { from: 'children:"Manage View"', to: 'children:"管理视图"' },
  { from: 'se(fxe,{title:"Tools"', to: 'se(fxe,{title:"工具"' },
  { from: 'title:"Good response"', to: 'title:"回答不错"' },
  { from: 'title:"Bad response"', to: 'title:"回答不佳"' },
  { from: 'return t<dxh?"just now"', to: 'return t<dxh?"刚刚"' },
  { from: 'return"just now"', to: 'return"刚刚"' },
  { from: '"Updated just now"', to: '"刚刚更新"' },
  {
    from: 'title:"Home MCP Servers",description:"Servers available from Home."',
    to: 'title:"Home MCP 服务器",description:"来自 Home 的可用服务器。"',
  },
  { from: 'label:"Copy Messages"', to: 'label:"复制消息"' },
  {
    from: 'Waiting for <!> command<!> to finish',
    to: '正在等待 <!> 个命令<!> 完成',
  },
  {
    from: 'rog="Agent is waiting for a command to finish."',
    to: 'rog="Agent 正在等待命令完成。"',
  },
  {
    from: 'sog="Agent is waiting for commands to finish."',
    to: 'sog="Agent 正在等待多条命令完成。"',
  },
  {
    from: 'Parallelize Build with Multitask Mode.',
    to: '使用多任务模式并行构建。',
  },
  { from: 'e()?"Plan Mode":"Debug Mode"', to: 'e()?"规划模式":"调试模式"' },
  {
    from: ',"Debug Mode"),"Whether additional debug information shall be generated."',
    to: ',"调试模式"),"是否应生成额外的调试信息。"',
  },
  {
    from: '),"Debug Mode"),"Whether additional debug information shall be generated."',
    to: '),"调试模式"),"是否应生成额外的调试信息。"',
  },
  {
    from: ',"调试模式"),"Whether additional debug information shall be generated."',
    to: ',"调试模式"),"是否应生成额外的调试信息。"',
  },
  {
    from: '),"调试模式"),"Whether additional debug information shall be generated."',
    to: '),"调试模式"),"是否应生成额外的调试信息。"',
  },
  { from: '${Math.floor(t/dxh)}m ago', to: '${Math.floor(t/dxh)}分钟前' },
  { from: '${Math.floor(t/mxh)}h ago', to: '${Math.floor(t/mxh)}小时前' },
  { from: '${Math.floor(t/mOi)}d ago', to: '${Math.floor(t/mOi)}天前' },
  { from: 'Last updated ${x} ago', to: '上次更新于 ${x} 前' },
  { from: '{action:"Wait skipped",details:""}', to: '{action:"已跳过等待",details:""}' },
  {
    from: '["Waiting","Waited","Wait skipped"]',
    to: '["等待中","已等待","已跳过等待"]',
  },
  {
    from: '["Waiting","Waited","已跳过等待"]',
    to: '["等待中","已等待","已跳过等待"]',
  },
  { from: '?"Wait skipped":"Waited"', to: '?"已跳过等待":"已等待"' },
  { from: '?"已跳过等待":"Waited"', to: '?"已跳过等待":"已等待"' },
  { from: 'label:"Copy Branch Name"', to: 'label:"复制分支名"' },
  { from: 'pyf="Copy Branch Name"', to: 'pyf="复制分支名"' },
  { from: 'label:"Sort by"', to: 'label:"排序"' },
  { from: 'children:"Sort by"}', to: 'children:"排序"}' },
  { from: '"aria-label":"Sort by"', to: '"aria-label":"排序"' },
  { from: 'title:"Filter by"', to: 'title:"筛选"' },
  { from: 'children:"Mark All as Read"', to: 'children:"全部标记为已读"' },
  { from: 'children:"Archive All"', to: 'children:"全部归档"' },
  { from: 'children:"Remove from Sidebar"', to: 'children:"从侧边栏移除"' },
  { from: '?"Confirm":"全部归档"', to: '?"确认":"全部归档"' },
  { from: 'children:"Move to"', to: 'children:"移动到"' },
  {
    from: 'xWA=[{value:"needs_attention",label:"Needs Attention",icon:"exclamation-circle"},{value:"unread",label:"Unread",icon:"bell"},{value:"in_progress",label:"Working",icon:"loading"},{value:"draft",label:"Draft",icon:"circle-dashed"},{value:"done",label:"Done",icon:"check-circle"}]',
    to: 'xWA=[{value:"needs_attention",label:"需要关注",icon:"exclamation-circle"},{value:"unread",label:"未读",icon:"bell"},{value:"in_progress",label:"进行中",icon:"loading"},{value:"draft",label:"草稿",icon:"circle-dashed"},{value:"done",label:"已完成",icon:"check-circle"}]',
  },
  {
    from: 'e8C=[{value:"needs_attention",label:"Needs Attention",icon:"exclamation-circle"},{value:"unread_only",label:"Unread",icon:"bell"},{value:"running",label:"Working",icon:"loading"},{value:"draft",label:"Draft",icon:"circle-dashed"},{value:"done",label:"Done",icon:"check-circle"}]',
    to: 'e8C=[{value:"needs_attention",label:"需要关注",icon:"exclamation-circle"},{value:"unread_only",label:"未读",icon:"bell"},{value:"running",label:"进行中",icon:"loading"},{value:"draft",label:"草稿",icon:"circle-dashed"},{value:"done",label:"已完成",icon:"check-circle"}]',
  },
  {
    from: 'wHP=[{key:"needs_attention",label:"Needs Attention",sectionIcon:"exclamation-circle"},{key:"in_progress",label:"Working",sectionIcon:{element:"ascii-loader"}},{key:"source:draft",label:"Draft",sectionIcon:"circle-dashed"},{key:"done",label:"Done",sectionIcon:"check-circle"}]',
    to: 'wHP=[{key:"needs_attention",label:"需要关注",sectionIcon:"exclamation-circle"},{key:"in_progress",label:"进行中",sectionIcon:{element:"ascii-loader"}},{key:"source:draft",label:"草稿",sectionIcon:"circle-dashed"},{key:"done",label:"已完成",sectionIcon:"check-circle"}]',
  },
  { from: '{key:"needs-attention",title:"Needs Attention"', to: '{key:"needs-attention",title:"需要关注"' },
  {
    from: 'gHA=[{id:"needsAttention",title:"Needs Attention"},{id:"installed",title:"Installed"}]',
    to: 'gHA=[{id:"needsAttention",title:"需要关注"},{id:"installed",title:"已安装"}]',
  },
  {
    from: 't8C=[{value:"git:draft",label:"PR Draft",icon:"git-pull-request-draft"},{value:"git:open",label:"PR Open",icon:"git-pull-request"},{value:"git:merged",label:"PR Merged",icon:"git-merge"},{value:"git:closed",label:"PR Closed",icon:"git-pull-request-closed"},{value:"git:none",label:"No PR",icon:"slash-circle"}]',
    to: 't8C=[{value:"git:draft",label:"PR 草稿",icon:"git-pull-request-draft"},{value:"git:open",label:"PR 已打开",icon:"git-pull-request"},{value:"git:merged",label:"PR 已合并",icon:"git-merge"},{value:"git:closed",label:"PR 已关闭",icon:"git-pull-request-closed"},{value:"git:none",label:"无 PR",icon:"slash-circle"}]',
  },
  {
    from: 'AWA=[{value:"cloud",label:"Cloud",icon:"cloud"},{value:"local",label:"Local",icon:"laptop"}]',
    to: 'AWA=[{value:"cloud",label:"云端",icon:"cloud"},{value:"local",label:"本地",icon:"laptop"}]',
  },
  {
    from: '"source:desktop":{label:"Desktop",icon:"laptop"},"source:web":{label:"Web",icon:"window"},"source:mobile":{label:"Mobile",icon:"device-mobile"},"source:slack":{label:"Slack"},"source:linear":{label:"Linear"},"source:scm":{label:"GitHub / GitLab / Bitbucket",icon:"github"},"source:cli":{label:"CLI",icon:"terminal"},"source:third_party":{label:"Claude Code"},"source:setup":{label:"Setup",icon:"cog"},"source:sdk":{label:"SDK",icon:"brackets-curly"},"source:automations":{label:"Automations",icon:"robot"},"source:api":{label:"API",icon:"code"},"source:bugbot_autofix":{label:"Bugbot",icon:"bugbot"},"source:qabot_frontend":{label:"Frontend QA",icon:"robot"},"source:local":{label:"Local",icon:"laptop"}',
    to: '"source:desktop":{label:"桌面端",icon:"laptop"},"source:web":{label:"网页",icon:"window"},"source:mobile":{label:"移动端",icon:"device-mobile"},"source:slack":{label:"Slack"},"source:linear":{label:"Linear"},"source:scm":{label:"GitHub / GitLab / Bitbucket",icon:"github"},"source:cli":{label:"CLI",icon:"terminal"},"source:third_party":{label:"Claude Code"},"source:setup":{label:"设置",icon:"cog"},"source:sdk":{label:"SDK",icon:"brackets-curly"},"source:automations":{label:"自动化",icon:"robot"},"source:api":{label:"API",icon:"code"},"source:bugbot_autofix":{label:"Bugbot",icon:"bugbot"},"source:qabot_frontend":{label:"前端 QA",icon:"robot"},"source:local":{label:"本地",icon:"laptop"}',
  },
  { from: '"source:setup":{label:"Setup"', to: '"source:setup":{label:"设置"' },
  { from: '"source:qabot_frontend":{label:"Frontend QA"', to: '"source:qabot_frontend":{label:"前端 QA"' },
  { from: 'U(li.SubMenuTrigger,{label:"Display",children:"Display"})', to: 'U(li.SubMenuTrigger,{label:"显示",children:"显示"})' },
  { from: 'children:"Machine"}):null', to: 'children:"机器"}):null' },
  {
    from: 'plf=[{value:"workspace",label:"Workspace",icon:"folder"},{value:"branch",label:"Branch",icon:"git-branch"},{value:"timestamp",label:"Updated",icon:"clock"},{value:"source",label:"Source",icon:"arrow-bracket-to-right"}]',
    to: 'plf=[{value:"workspace",label:"工作区",icon:"folder"},{value:"branch",label:"分支",icon:"git-branch"},{value:"timestamp",label:"更新时间",icon:"clock"},{value:"source",label:"来源",icon:"arrow-bracket-to-right"}]',
  },
  {
    from: 'X11=[{value:"updated",label:"Updated",icon:"clock"},{value:"created",label:"Created",icon:"chat-bubble-pencil"},{value:"status",label:"Status",icon:"circle-dashed"}]',
    to: 'X11=[{value:"updated",label:"更新时间",icon:"clock"},{value:"created",label:"创建时间",icon:"chat-bubble-pencil"},{value:"status",label:"状态",icon:"circle-dashed"}]',
  },
  {
    from: 'X5C=[{value:"created",label:"Created",icon:"chat-bubble-pencil"},{value:"updated",label:"Updated",icon:"clock"},{value:"status",label:"Status",icon:"circle-dashed"}]',
    to: 'X5C=[{value:"created",label:"创建时间",icon:"chat-bubble-pencil"},{value:"updated",label:"更新时间",icon:"clock"},{value:"status",label:"状态",icon:"circle-dashed"}]',
  },
  {
    from: 'IWA=[{value:"any_time",label:"Any time"},{value:"recency:within_day",label:"Past day"},{value:"recency:within_week",label:"Past week"},{value:"recency:within_month",label:"Past month"}]',
    to: 'IWA=[{value:"any_time",label:"任意时间"},{value:"recency:within_day",label:"过去一天"},{value:"recency:within_week",label:"过去一周"},{value:"recency:within_month",label:"过去一个月"}]',
  },
  { from: 'label:"Copy Request ID"', to: 'label:"复制请求 ID"' },
  { from: 'hyf="Copy Request ID"', to: 'hyf="复制请求 ID"' },
  {
    from: 'n.canStopFsdAgent?U(co,{onClick:i,size:"xs",variant:"ghost",children:"Stop"}):null',
    to: 'n.canStopFsdAgent?U(co,{onClick:i,size:"xs",variant:"ghost",children:"停止"}):null',
  },
  {
    from: 'source:"composer_cancel_button"})},get style(){return _st()},get keybinding(){return Hi(()=>Y().width>g$n)()?X():void 0},children:"Stop"}',
    to: 'source:"composer_cancel_button"})},get style(){return _st()},get keybinding(){return Hi(()=>Y().width>g$n)()?X():void 0},children:"停止"}',
  },
  {
    from: 'class:"composer-toolbar-background-job-item-stop",onClick:m=>{m.stopPropagation(),n.onKill(r)},children:"Stop"',
    to: 'class:"composer-toolbar-background-job-item-stop",onClick:m=>{m.stopPropagation(),n.onKill(r)},children:"停止"',
  },
  { from: 'title:"Dictate"', to: 'title:"听写"' },
  { from: 'children:["Click or hold ",', to: 'children:["点击或按住 ",' },
  { from: '," to dictate"]', to: ',"听写"]' },
  { from: 'label:"Check for Updates",action:', to: 'label:"检查更新",action:' },
  { from: 'label:"Archived",onSelect:h})', to: 'label:"已归档",onSelect:h})' },
  { from: 'label:"Status",children:"Status"}', to: 'label:"状态",children:"状态"}' },
  { from: 'label:"Environment",children:"Environment"}', to: 'label:"环境",children:"环境"}' },
  { from: 'label:"Updated",children:"Updated"}', to: 'label:"更新时间",children:"更新时间"}' },
  {
    from: 'title:"Discard all changes up to this checkpoint?"',
    to: 'title:"是否丢弃此检查点之前的所有更改？"',
  },
  { from: 'g="You can always undo this later."', to: 'g="你之后仍可撤销此操作。"' },
  {
    from: 'g=`You can always undo this later.\nNote: Notebook cells are not supported for reverting.`',
    to: 'g=`你之后仍可撤销此操作。\n注意：不支持还原 Notebook 单元格。`',
  },
  {
    from: 'summarizationMessage||"Chat context summarized"',
    to: 'summarizationMessage||"聊天上下文已总结"',
  },
  { from: '?"Summarizing chat context":s()', to: '?"正在总结聊天上下文":s()' },
  { from: 'mb-2">Current Plan</div>', to: 'mb-2">当前套餐</div>' },
  { from: 'mb-2">Upgrade Available</div>', to: 'mb-2">可升级</div>' },
  { from: '`Included in ${ge().planName}`', to: '`已包含于 ${ge().planName}`' },
  { from: 'flex-grow">Resets on ', to: 'flex-grow">重置于 ' },
  { from: 'flex-grow"> day<!> left', to: 'flex-grow"> 天<!>后' },
  { from: '`${Ye} (${ot} days)`', to: '`${Ye}（${ot} 天）`' },
  {
    from: 'se(sm,{title:"Manage",size:"small",type:"tertiary",onClick:xe,style:{padding:"2px 8px"}})',
    to: 'se(sm,{title:"管理",size:"small",type:"tertiary",onClick:xe,style:{padding:"2px 8px"}})',
  },
  { from: 'label:"Total"', to: 'label:"总计"' },
  { from: '"% Auto and"," "', to: '"% 自动与"," "' },
  { from: '"% API used"', to: '"% API 已用"' },
  { from: '`${Math.round(je())}% Auto used`', to: '`${Math.round(je())}% 自动已用`' },
  { from: '<span>On-Demand Usage', to: '<span>按需用量' },
  { from: 'label:"On-Demand Spending"', to: 'label:"按需支出"' },
  {
    from: '()=>Ke()?`$${fe(ce()?.used??0)}`:"Disabled"',
    to: '()=>Ke()?`$${fe(ce()?.used??0)}`:"已禁用"',
  },
  { from: 'label:"Monthly Limit"', to: 'label:"每月上限"' },
  {
    from: 'items:[{id:"fixed",label:"Fixed"},{id:"unlimited",label:"Unlimited"},{id:"disabled",label:"Disabled"}]',
    to: 'items:[{id:"fixed",label:"固定"},{id:"unlimited",label:"不限"},{id:"disabled",label:"禁用"}]',
  },
  {
    from: 'get disabled(){return H()||!Xe()},children:"Save"}',
    to: 'get disabled(){return H()||!Xe()},children:"保存"}',
  },
  { from: '>$20/mo</span>', to: '>$20/月</span>' },
  { from: '>$60/mo</span>', to: '>$60/月</span>' },
  { from: 'It="$20/mo"', to: 'It="$20/月"' },
  { from: 'It="$60/mo"', to: 'It="$60/月"' },
  { from: 'price:"$60/mo"', to: 'price:"$60/月"' },
  {
    from: 'description:"Unlock 3x more usage on Agent & more"',
    to: 'description:"解锁 Agent 等 3 倍用量"',
  },
  {
    from: 'description:"On-demand spending is currently disabled"',
    to: 'description:"按需支出当前已禁用"',
  },
  {
    from: 'description:"Set a fixed amount or make it unlimited."',
    to: 'description:"设置固定额度或不设上限。"',
  },
  {
    from: 'On-demand usage is consumed after a usage limit is reached, and is billed in arrears.',
    to: '达到用量上限后将使用按需用量，并按后付费结算。',
  },
  {
    from: 's=r&&r.trim().length>0?`Included in ${r.trim()} Plan`:"Included"',
    to: 's=r&&r.trim().length>0?`${r.trim()} 套餐已包含`:"已包含"',
  },
  {
    from: 'label:"On-Demand Usage",description:"Enable on-demand usage to go beyond your plan\'s included usage. Requires a paid plan."',
    to: 'label:"按需用量",description:"启用按需用量以超出套餐包含的额度。需要付费套餐。"',
  },
  { from: 'title:"Check for Updates\\u2026"', to: 'title:"检查更新\\u2026"' },
  { from: 'title:"Checking for Updates\\u2026"', to: 'title:"正在检查更新\\u2026"' },
  {
    from: 'jLi={routedModelViewConfig:{routedModelViewToNamedViewToggle:{titleMarkdown:"Auto",subtitle:"Balanced quality and speed, recommended for most tasks"',
    to: 'jLi={routedModelViewConfig:{routedModelViewToNamedViewToggle:{titleMarkdown:"自动",subtitle:"质量与速度均衡，适合大多数任务"',
  },
  {
    from: 'titleMarkdown:"Auto",subtitle:"质量与速度均衡，适合大多数任务"',
    to: 'titleMarkdown:"自动",subtitle:"质量与速度均衡，适合大多数任务"',
  },
  { from: 'hintText:"Send now"', to: 'hintText:"立即发送"' },
  { from: '"aria-label":"Send now"', to: '"aria-label":"立即发送"' },
  { from: 'children:"Edit Queued"', to: 'children:"编辑排队"' },
  {
    from: 'B("glass.queueTray.sendKeyHint","{0} to Send",F)',
    to: 'B("glass.queueTray.sendKeyHint","{0} 后发送",F)',
  },
  {
    from: '{id:"reload-window",label:"Reload Window",callback:',
    to: '{id:"reload-window",label:"重新加载窗口",callback:',
  },
  {
    from: '{id:"reloadWindow",label:"Reload Window",tooltip:',
    to: '{id:"reloadWindow",label:"重新加载窗口",tooltip:',
  },
  { from: '{label:"Reload Window",run:', to: '{label:"重新加载窗口",run:' },
  {
    from: 'G=dVy(o),n[11]=o,n[12]=G):G=n[12];const W=G;let H;n[13]!==s||n[14]!==i',
    to: 'G=dVy(o),n[11]=o,n[12]=G):G=n[12];const W=window.__cursorZhTranslateInlineText?window.__cursorZhTranslateInlineText(G??""):G;let H;n[13]!==s||n[14]!==i',
  },
  { from: 'children:[j.length," Queued"]', to: 'children:[j.length," 个排队"]' },
  {
    from: 'return"Taking longer than expected\\u2026"',
    to: 'return"耗时比预期更长\\u2026"',
  },
  { from: 'U(rd,{shortcut:p,title:"Stop"})', to: 'U(rd,{shortcut:p,title:"停止"})' },
  {
    from: 'variant:"secondary",onClick:i,children:"Stop"',
    to: 'variant:"secondary",onClick:i,children:"停止"',
  },
  { from: 'const V=H?"Auto":j,K=O&&!H', to: 'const V=H?"自动":j,K=O&&!H' },
  {
    from: 'children:"Auto"})}),n[6]=c,n[7]=m)',
    to: 'children:"自动"})}),n[6]=c,n[7]=m)',
  },
  {
    from: 'function hVy(n){const t=Sdt(n)?.routedModelViewToNamedViewToggle?.titleMarkdown?.trim();return t||void 0}',
    to: 'function hVy(n){const t=Sdt(n)?.routedModelViewToNamedViewToggle?.titleMarkdown?.trim();if(!t)return;const i=window.__cursorZhTranslateInlineText?window.__cursorZhTranslateInlineText(t):t;return i||void 0}',
  },
  {
    from: 'onDidChangeCache(()=>{p.dispose(),this._notificationService.prompt(Ul.Error,B(13452,null),[{label:B(13453,null),run:()=>this._hostService.reload()}])})',
    to: 'onDidChangeCache(()=>{p.dispose()})',
  },
  {
    from: 'onDidChangeCache(()=>{g.dispose(),this._notificationService.prompt(Io.Error,k(13452,null),[{label:k(13453,null),run:()=>this._hostService.reload()}])})',
    to: 'onDidChangeCache(()=>{g.dispose()})',
  },
  { from: 'label:"Context Usage"', to: 'label:"上下文用量"' },
  { from: 'LI_="Context Usage"', to: 'LI_="上下文用量"' },
  { from: 'children:"View Report"', to: 'children:"查看报告"' },
  {
    from: 'title:n?"Hide Canvas List":"Show Canvas List"',
    to: 'title:n?"隐藏画布列表":"显示画布列表"',
  },
  {
    from: '"aria-label":n?"Hide canvas list":"Show canvas list"',
    to: '"aria-label":n?"隐藏画布列表":"显示画布列表"',
  },
  { from: 'children:"Create new canvas"', to: 'children:"新建画布"' },
  { from: 'title:"Create new canvas"', to: 'title:"新建画布"' },
  {
    from: 'description:"All team members can view"',
    to: 'description:"所有团队成员均可查看"',
  },
  { from: 'children:"Publish"', to: 'children:"发布"' },
  { from: 'label:"Recent"', to: 'label:"最近"' },
  { from: 'return"0% Full"', to: 'return"0% 已满"' },
  { from: '% Full`', to: '% 已满`' },
  { from: 'et("<span> context used")', to: 'et("<span> 上下文已用")' },
  { from: ' Ye+=" context used"', to: ' Ye+=" 上下文已用"' },
  { from: 'Ye+=" context used"', to: 'Ye+=" 上下文已用"' },
  { from: ')} context used`', to: ')} 上下文已用`' },
  { from: ')} context used"),It', to: ')} 上下文已用"),It' },
  { from: '${ke} context used`', to: '${ke} 上下文已用`' },
  { from: '<div>Active Rules</div>', to: '<div>活跃规则</div>' },
  { from: ',G," Tokens"]', to: ',G," 个 Token"]' },
  { from: 'label:"Other"', to: 'label:"其他"' },
  {
    from: 'children:"Create a Canvas from chat"',
    to: 'children:"从对话创建画布"',
  },
  {
    from: 'label:o.label,tokens:a,displayTokens:L9t(a),color:Ys1[o.id]',
    to: 'label:window.__cursorZhTranslateInlineText?window.__cursorZhTranslateInlineText(o.label):o.label,tokens:a,displayTokens:L9t(a),color:Ys1[o.id]',
  },
  { from: "eyebrow: 'Context Usage Report'", to: "eyebrow: '上下文用量报告'" },
  { from: "donutCaption: 'Full'", to: "donutCaption: '已满'" },
  { from: "explorerTitle: 'Context Explorer'", to: "explorerTitle: '上下文浏览器'" },
  { from: "debugButton: 'Debug with Agent'", to: "debugButton: '用 Agent 调试'" },
  { from: "expandAll: 'Expand All'", to: "expandAll: '全部展开'" },
  { from: "collapseAll: 'Collapse All'", to: "collapseAll: '全部收起'" },
  { from: "openChat: 'Open Chat'", to: "openChat: '打开对话'" },
  { from: "metaTokensUsed: 'Tokens used'", to: "metaTokensUsed: '已用 Token'" },
  {
    from: 'M?"Hide Terminal List":"Show Terminal List"',
    to: 'M?"隐藏终端列表":"显示终端列表"',
  },
  {
    from: 'M?"Hide terminal list":"Show terminal list"',
    to: 'M?"隐藏终端列表":"显示终端列表"',
  },
  { from: 'return"Failed to load changes"', to: 'return"无法加载更改"' },
  { from: '"Failed to load changes"', to: '"无法加载更改"' },
  { from: 'searchPlaceholder:"Search branches..."', to: 'searchPlaceholder:"搜索分支..."' },
  { from: 'placeholder:"Search branches..."', to: 'placeholder:"搜索分支..."' },
  { from: '"aria-label":"Search branches"', to: '"aria-label":"搜索分支"' },
  { from: 'C="Loading branches..."', to: 'C="正在加载分支..."' },
  { from: '"Loading branches..."', to: '"正在加载分支..."' },
  { from: 'C="No branches found"', to: 'C="未找到分支"' },
  { from: '"No branches found"', to: '"未找到分支"' },
  { from: 'C="No branches available"', to: 'C="无可用分支"' },
  { from: '"No branches available"', to: '"无可用分支"' },
  { from: '"Select a repository first"', to: '"请先选择仓库"' },
  { from: 'label:"Successful \\xB7 7d"', to: 'label:"成功 · 7天"' },
  { from: 'label:"Failed \\xB7 7d"', to: 'label:"失败 · 7天"' },
  { from: 'label:"Successful \\xB7 24h"', to: 'label:"成功 · 24h"' },
  { from: 'label:"Failed \\xB7 24h"', to: 'label:"失败 · 24h"' },
  { from: 'children:"Total Automations"', to: 'children:"自动化总数"' },
  { from: 'children:["Run History"', to: 'children:["运行历史"' },
  { from: 'ariaLabel:"Run history"', to: 'ariaLabel:"运行历史"' },
  {
    from: ':c?"No Results Found":"No Automations Yet"',
    to: ':c?"未找到结果":"暂无自动化"',
  },
  { from: 'children:"New Automation"', to: 'children:"新建自动化"' },
  { from: 'title:"Enable Run Everything?"', to: 'title:"启用全部运行？"' },
  { from: 'label:"Enable Run Everything"', to: 'label:"启用全部运行"' },
  {
    from: 'label:i?"Use Sandbox instead":"Use Allowlist instead"',
    to: 'label:i?"改用沙箱":"改用允许列表"',
  },
];

const CRITICAL_UI_ALL_TARGETS = [
  ...CRITICAL_CHAT_SHELL_UI,
  ...CRITICAL_UI_SURFACE_TARGETS,
  ...CRITICAL_AGENT_UI_TARGETS,
  ...CRITICAL_WORKSPACE_UI_TARGETS,
  ...CRITICAL_GLASS_APP_MENU_UI_TARGETS,
  ...CRITICAL_GLASS_ROUND5_UI_TARGETS,
  ...CRITICAL_GLASS_ROUND6_UI_TARGETS,
  ...CRITICAL_GLASS_ROUND7_UI_TARGETS,
  ...CRITICAL_GLASS_ROUND8_UI_TARGETS,
  ...CRITICAL_GLASS_ROUND9_UI_TARGETS,
  ...CRITICAL_GLASS_ROUND10_UI_TARGETS,
  ...CRITICAL_GLASS_ROUND11_UI_TARGETS,
  ...CRITICAL_GLASS_ROUND12_UI_TARGETS,
  ...CRITICAL_GLASS_ROUND13_UI_TARGETS,
  ...CRITICAL_GLASS_ROUND14_UI_TARGETS,
  ...CRITICAL_GLASS_ROUND16_UI_TARGETS,
  ...CRITICAL_GLASS_ROUND17_UI_TARGETS,
  ...CRITICAL_GLASS_ROUND18_UI_TARGETS,
  ...CRITICAL_GLASS_ROUND19_UI_TARGETS,
  ...CRITICAL_GLASS_ROUND20_UI_TARGETS,
  ...CRITICAL_GLASS_ROUND21_UI_TARGETS,
  ...CRITICAL_GLASS_ROUND22_UI_TARGETS,
  ...CRITICAL_GLASS_BROWSER_UI_TARGETS,
];

module.exports = {
  CRITICAL_CHAT_SHELL_UI,
  CRITICAL_UI_SURFACE_TARGETS,
  CRITICAL_AGENT_UI_TARGETS,
  CRITICAL_WORKSPACE_UI_TARGETS,
  CRITICAL_GLASS_APP_MENU_UI_TARGETS,
  CRITICAL_GLASS_ROUND5_UI_TARGETS,
  CRITICAL_GLASS_ROUND6_UI_TARGETS,
  CRITICAL_GLASS_ROUND7_UI_TARGETS,
  CRITICAL_GLASS_ROUND8_UI_TARGETS,
  CRITICAL_GLASS_ROUND9_UI_TARGETS,
  CRITICAL_GLASS_ROUND10_UI_TARGETS,
  CRITICAL_GLASS_ROUND11_UI_TARGETS,
  CRITICAL_GLASS_ROUND12_UI_TARGETS,
  CRITICAL_GLASS_ROUND13_UI_TARGETS,
  CRITICAL_GLASS_ROUND14_UI_TARGETS,
  CRITICAL_GLASS_ROUND16_UI_TARGETS,
  CRITICAL_GLASS_ROUND17_UI_TARGETS,
  CRITICAL_GLASS_ROUND18_UI_TARGETS,
  CRITICAL_GLASS_ROUND19_UI_TARGETS,
  CRITICAL_GLASS_ROUND20_UI_TARGETS,
  CRITICAL_GLASS_ROUND21_UI_TARGETS,
  CRITICAL_GLASS_ROUND22_UI_TARGETS,
  CRITICAL_GLASS_BROWSER_UI_TARGETS,
  CRITICAL_EMBEDDED_UI_PATCHES,
  CRITICAL_UI_ALL_TARGETS,
};
