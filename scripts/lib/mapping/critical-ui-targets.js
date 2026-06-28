const {
  CRITICAL_GLASS_ROUND32_AUTOMATION_TEMPLATES,
} = require('./critical-ui-round32-templates');
const {
  CRITICAL_MARKETPLACE_UI_SHELL_TARGETS,
} = require('./marketplace-ui-shell-targets');

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

/** Run mode descriptions and allowlist settings panel (round 23). */
const CRITICAL_GLASS_ROUND23_UI_TARGETS = [
  { originalText: 'Allowlist options', changeText: '允许列表选项' },
  {
    originalText:
      'You can configure Shell, MCP and Fetch allowlists for Auto mode. However, Auto works well without these.',
    changeText:
      '你可以为 Auto 模式配置 Shell、MCP 和 Fetch 允许列表；不过即使没有这些，Auto 也能良好运行。',
  },
  {
    originalText: 'Agent will ask for approval before running tools.',
    changeText: '智能体在运行工具前会请求批准。',
  },
  {
    originalText: 'Commands that are allowlisted will run automatically.',
    changeText: '已加入允许列表的命令将自动运行。',
  },
  {
    originalText:
      "A classifier will run for each action and decide whether it's safe to execute this command. Allowlists are still respected.",
    changeText: '分类器会为每个操作判断是否可安全执行该命令。仍将遵守允许列表。',
  },
  {
    originalText: 'All commands will run without approval, classification or sandboxing.',
    changeText: '所有命令都将在未经批准、分类或沙箱限制的情况下运行。',
  },
];

/** Automation subtitle embeds, web search setting, and always-run approval UI (round 24). */
const CRITICAL_GLASS_ROUND24_UI_TARGETS = [
  {
    originalText:
      'Enabled by Run Everything Auto-Run Mode: Agent bypasses approval prompts for tools including Web Search.',
    changeText: '由「全部运行」自动运行模式启用：智能体会跳过包括网页搜索在内的工具审批提示。',
  },
  { originalText: 'Disabled by your team admin.', changeText: '已由团队管理员禁用。' },
  {
    originalText: 'Enabled by Run Everything Auto-Run Mode.',
    changeText: '由「全部运行」自动运行模式启用。',
  },
  { originalText: 'Always Run', changeText: '始终运行' },
  { originalText: 'Always run selected commands', changeText: '始终运行所选命令' },
  { originalText: 'Always run these commands', changeText: '始终运行这些命令' },
  { originalText: 'Change run mode', changeText: '更改运行模式' },
  { originalText: 'Auto-Run', changeText: '自动运行' },
  { originalText: 'Will allow:', changeText: '将允许：' },
];

/** Customize welcome banner, referral pill, and automations lazy-chunk gaps (round 26). */
const CRITICAL_GLASS_ROUND26_UI_TARGETS = [
  { originalText: 'Welcome to Customize', changeText: '欢迎使用自定义' },
  {
    originalText:
      'Manage plugins, MCPs, skills, rules, commands, and hooks in one place.',
    changeText: '在一处管理插件、MCP、技能、规则、命令和钩子。',
  },
  {
    originalText: 'Refer friends, earn up to $250',
    changeText: '推荐好友，最高赚取 $250',
  },
];

/** Command palette, glass menu, and developer command gaps (round 27). */
const CRITICAL_GLASS_ROUND27_UI_TARGETS = [
  { originalText: 'Toggle Expand Agent', changeText: '切换展开智能体' },
  { originalText: 'Show Apps Panel', changeText: '显示应用面板' },
  { originalText: 'Toggle Design Mode', changeText: '切换设计模式' },
  { originalText: 'Show Terminal', changeText: '显示终端' },
  { originalText: 'Hide Status Bar', changeText: '隐藏状态栏' },
  { originalText: 'New Output View', changeText: '新建输出视图' },
  { originalText: 'Open Browser Tab', changeText: '打开浏览器标签页' },
  { originalText: 'Toggle File Tree', changeText: '切换文件树' },
  { originalText: 'Toggle Files Sidebar', changeText: '切换文件侧边栏' },
  { originalText: 'Toggle Search in Files', changeText: '切换在文件中搜索' },
  { originalText: 'Next Tab', changeText: '下一个标签页' },
  { originalText: 'Previous Tab', changeText: '上一个标签页' },
  { originalText: 'Open Canvas', changeText: '打开画布' },
  { originalText: 'Group by Workspace', changeText: '按工作区分组' },
  { originalText: 'Group by Updated', changeText: '按更新时间分组' },
  { originalText: 'Group by Status', changeText: '按状态分组' },
  { originalText: 'Group by Environment', changeText: '按环境分组' },
  { originalText: 'Group by Repository', changeText: '按仓库分组' },
  { originalText: 'Skills & Commands', changeText: '技能与命令' },
  { originalText: 'Show more', changeText: '显示更多' },
  { originalText: 'Recent Files', changeText: '最近文件' },
  { originalText: 'Open Customize', changeText: '打开自定义' },
  { originalText: 'Open Automations', changeText: '打开自动化' },
  { originalText: 'Toggle Full Screen', changeText: '切换全屏' },
  {
    originalText: 'Search files, actions, agents...',
    changeText: '搜索文件、操作和智能体...',
  },
  { originalText: 'Use Voice', changeText: '使用语音' },
  { originalText: 'Pin / Unpin Agent', changeText: '固定/取消固定智能体' },
  { originalText: 'Split Tile Horizontally', changeText: '水平拆分分屏' },
  { originalText: 'Split Tile Vertically', changeText: '垂直拆分分屏' },
  { originalText: 'Remove from Tileset', changeText: '从分屏组移除' },
  { originalText: 'Search Agents', changeText: '搜索智能体' },
  { originalText: 'New Agent with Model', changeText: '使用模型新建智能体' },
  { originalText: 'Start Electron Trace', changeText: '启动 Electron 跟踪' },
  {
    originalText: 'Capture and Send Debugging Data',
    changeText: '捕获并发送调试数据',
  },
  { originalText: 'Workspace Diagnostics', changeText: '工作区诊断' },
  { originalText: 'Display Workspace Metadata', changeText: '显示工作区元数据' },
  {
    originalText: 'Display Explorer Orchestrator Cache',
    changeText: '显示 Explorer 编排器缓存',
  },
  { originalText: 'Connect via WSL', changeText: '通过 WSL 连接' },
  { originalText: 'Update Cursor', changeText: '更新 Cursor' },
  { originalText: 'High Contrast Theme', changeText: '高对比度主题' },
  { originalText: 'Reset In-App Ad Views', changeText: '重置应用内广告视图' },
  { originalText: 'Toggle Developer Tools', changeText: '切换开发者工具' },
  { originalText: 'Toggle Cursor Dev Tools', changeText: '切换 Cursor 开发者工具' },
  {
    originalText: 'Developer: Open Logs Folder',
    changeText: '开发者：打开日志文件夹',
  },
  { originalText: 'Set Log Level...', changeText: '设置日志级别...' },
  { originalText: 'Start File Watch Recording', changeText: '启动文件监视录制' },
  { originalText: 'Process Explorer', changeText: '进程资源管理器' },
  {
    originalText: 'Developer: Delete Old Chats',
    changeText: '开发者：删除旧对话',
  },
  { originalText: 'GC Agent KV Blobs', changeText: '回收 Agent KV 存储' },
  {
    originalText: 'Open Developer Tools for Extension Host',
    changeText: '打开扩展宿主开发者工具',
  },
  {
    originalText: 'Start Extension Host CPU Profiler',
    changeText: '启动扩展宿主 CPU 分析器',
  },
  {
    originalText: 'Start Extension Host Heap Allocation Profiler',
    changeText: '启动扩展宿主堆分配分析器',
  },
  {
    originalText: 'Start Remote Server CPU Profiler',
    changeText: '启动远程服务器 CPU 分析器',
  },
  {
    originalText: 'Start Extension Host RPC Profiler',
    changeText: '启动扩展宿主 RPC 分析器',
  },
  { originalText: 'Developer', changeText: '开发者' },
  { originalText: 'Learn More', changeText: '了解更多' },
  { originalText: 'Later', changeText: '稍后' },
];

/** Queued badge, plan find menu, and plugins onboarding card (round 28). */
const CRITICAL_GLASS_ROUND28_UI_TARGETS = [
  { originalText: ' Queued', changeText: ' 个排队' },
  { originalText: 'Copy as Markdown', changeText: '复制为 Markdown' },
  { originalText: 'Find in Plan', changeText: '在计划中查找' },
  { originalText: 'Extend Cursor with Plugins', changeText: '使用插件扩展 Cursor' },
  {
    originalText:
      'Plugins bundle rules, skills, subagents, commands, MCP servers, and hooks into one installable package.',
    changeText:
      '插件将规则、技能、子智能体、命令、MCP 服务器和钩子打包为一个可安装包。',
  },
];

/** Plan, automations editor, MAX mode, GitHub connect, and cloud-agent status (round 29). */
const CRITICAL_GLASS_ROUND29_UI_TARGETS = [
  {
    originalText: 'Create a plan for your agent to work from',
    changeText: '为你的智能体创建可执行的计划',
    forceRuntime: true,
  },
  { originalText: 'Create new plan', changeText: '新建计划', forceRuntime: true },
  { originalText: 'Describe your goal...', changeText: '描述你的目标...', forceRuntime: true },
  { originalText: 'Select repository', changeText: '选择仓库' },
  { originalText: 'Search repositories', changeText: '搜索仓库' },
  {
    originalText: 'Connect GitHub to see repositories',
    changeText: '连接 GitHub 以查看仓库',
    forceRuntime: true,
  },
  { originalText: 'Connect to GitHub', changeText: '连接 GitHub', forceRuntime: true },
  { originalText: 'MAX MODE', changeText: 'MAX 模式', forceRuntime: true },
  {
    originalText:
      'Maxes out context windows and tool calls. For advanced users that are cost insensitive. Billed at API-pricing.',
    changeText: '最大化上下文窗口与工具调用次数。面向不太在意成本的高级用户。按 API 定价计费。',
    forceRuntime: true,
  },
  { originalText: 'Enable MAX Mode', changeText: '启用 MAX 模式', forceRuntime: true },
  { originalText: 'View Pricing', changeText: '查看定价', forceRuntime: true },
  { originalText: 'New automation', changeText: '新建自动化', forceRuntime: true },
  { originalText: 'Create new automation', changeText: '新建自动化', forceRuntime: true },
  { originalText: 'Agent Instructions', changeText: '智能体指令', forceRuntime: true },
  { originalText: 'Add Trigger', changeText: '添加触发器', forceRuntime: true },
  { originalText: 'Add Trigger or Tool', changeText: '添加触发器或工具', forceRuntime: true },
  { originalText: 'Copy as JSON', changeText: '复制为 JSON', forceRuntime: true },
  { originalText: 'Duplicate', changeText: '复制', forceRuntime: true },
  { originalText: 'Save', changeText: '保存', forceRuntime: true },
  { originalText: 'Delete', changeText: '删除', forceRuntime: true },
  { originalText: 'Save Automation', changeText: '保存自动化' },
  { originalText: 'Saving...', changeText: '正在保存...', forceRuntime: true },
  { originalText: 'Ask before running', changeText: '运行前询问', forceRuntime: true },
  { originalText: 'Run everything', changeText: '全部运行', forceRuntime: true },
  { originalText: 'Enable This Agent', changeText: '启用此智能体', forceRuntime: true },
  { originalText: 'Runs On', changeText: '运行于', forceRuntime: true },
  { originalText: 'GitHub Not Connected', changeText: 'GitHub 未连接', forceRuntime: true },
  { originalText: 'Created', changeText: '创建', forceRuntime: true },
  { originalText: 'Model', changeText: '模型', forceRuntime: true },
  { originalText: 'Actions', changeText: '操作', forceRuntime: true },
  {
    originalText: 'GitHub app access updated. Cloud Agent setup is refreshing.',
    changeText: 'GitHub 应用访问权限已更新。云 Agent 设置正在刷新。',
    forceRuntime: true,
  },
  {
    originalText: 'GitHub returned an unexpected connection state.',
    changeText: 'GitHub 返回了意外的连接状态。',
    forceRuntime: true,
  },
  { originalText: 'Send to Slack', changeText: '发送到 Slack', forceRuntime: true },
  {
    originalText: 'Read Public Slack Channels',
    changeText: '读取公共 Slack 频道',
    forceRuntime: true,
  },
  {
    originalText: 'Send to Microsoft Teams',
    changeText: '发送到 Microsoft Teams',
    forceRuntime: true,
  },
  {
    originalText: 'Read Microsoft Teams Channels',
    changeText: '读取 Microsoft Teams 频道',
    forceRuntime: true,
  },
  {
    originalText: 'Comment on Pull Request',
    changeText: '评论拉取请求',
    forceRuntime: true,
  },
  { originalText: 'Request Reviewers', changeText: '请求审查者', forceRuntime: true },
  { originalText: 'Waiting for shell', changeText: '正在等待 shell', forceRuntime: true },
  { originalText: 'Waited for shell', changeText: '已等待 shell', forceRuntime: true },
  { originalText: 'Read terminal', changeText: '读取终端', forceRuntime: true },
  { originalText: 'No channels available', changeText: '无可用频道', forceRuntime: true },
  {
    originalText: 'Only the creator can add MCP servers for this automation.',
    changeText: '只有创建者可以为此自动化添加 MCP 服务器。',
    forceRuntime: true,
  },
];

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
  { from: 'label:"Allowlist options"', to: 'label:"允许列表选项"' },
  {
    from: 'description:"You can configure Shell, MCP and Fetch allowlists for Auto mode. However, Auto works well without these."',
    to: 'description:"你可以为 Auto 模式配置 Shell、MCP 和 Fetch 允许列表；不过即使没有这些，Auto 也能良好运行。"',
  },
  {
    from: 'description:"Automate repetitive tasks with always-on cloud agents that respond to environment triggers."',
    to: 'description:"借助始终在线的云端智能体自动执行重复任务，并响应环境触发器。"',
  },
  {
    from: 'P8P="Automate repetitive tasks with always-on cloud agents that respond to environment triggers."',
    to: 'P8P="借助始终在线的云端智能体自动执行重复任务，并响应环境触发器。"',
  },
  { from: 'children:"Always Run"', to: 'children:"始终运行"' },
  { from: '?"Always Run":', to: '?"始终运行":' },
  { from: "Always Run '", to: "始终运行 '" },
  { from: 'label:"Always run"', to: 'label:"始终运行"' },
  { from: 'label:"Auto-Run"', to: 'label:"自动运行"' },
  { from: 'label:"Change run mode"', to: 'label:"更改运行模式"' },
  { from: 'Always run selected commands', to: '始终运行所选命令' },
  { from: 'Always run these commands', to: '始终运行这些命令' },
  { from: 'Will allow:', to: '将允许：' },
  { from: ' more...`]:', to: ' 项...`]:' },
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
    to: 'X11=[{value:"updated",label:"更新时间",icon:"clock"},{value:"created",label:"创建",icon:"chat-bubble-pencil"},{value:"status",label:"状态",icon:"circle-dashed"}]',
  },
  {
    from: 'X5C=[{value:"created",label:"Created",icon:"chat-bubble-pencil"},{value:"updated",label:"Updated",icon:"clock"},{value:"status",label:"Status",icon:"circle-dashed"}]',
    to: 'X5C=[{value:"created",label:"创建",icon:"chat-bubble-pencil"},{value:"updated",label:"更新时间",icon:"clock"},{value:"status",label:"状态",icon:"circle-dashed"}]',
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
    applyBeforeStatic: true,
  },
  { from: 'label:"Monthly Limit"', to: 'label:"每月上限"' },
  {
    from: 'items:[{id:"fixed",label:"Fixed"},{id:"unlimited",label:"Unlimited"},{id:"disabled",label:"Disabled"}]',
    to: 'items:[{id:"fixed",label:"固定"},{id:"unlimited",label:"不限"},{id:"disabled",label:"禁用"}]',
    applyBeforeStatic: true,
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
    applyBeforeStatic: true,
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
  { from: 'children:[t.length," Queued"]', to: 'children:[t.length," 个排队"]' },
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
  {
    from: 'onDidChangeCache(()=>{h.dispose(),this._notificationService.prompt(jo.Error,x(13355,null),[{label:x(13356,null),run:()=>this._hostService.reload()}])})',
    to: 'onDidChangeCache(()=>{h.dispose()})',
  },
  {
    from: 'onDidChangeCache(()=>{g.dispose(),this._notificationService.prompt(uo.Error,k(13355,null),[{label:k(13356,null),run:()=>this._hostService.reload()}])})',
    to: 'onDidChangeCache(()=>{g.dispose()})',
  },
  {
    from: 'wu=$a?"Drop here to attach...":Te?"Send follow-up with subagent":ue.header.source==="claude-code"?"Continue chatting in Cursor":"Send follow-up"',
    to: 'wu=$a?"拖放到此处以附加...":Te?"向子 Agent 继续追问":ue.header.source==="claude-code"?"在 Cursor 中继续聊天":"继续追问"',
  },
  { from: 'var skS="Search Settings"', to: 'var skS="搜索设置"' },
  {
    from: 'title:"Log out?",description:"You\'ll be logged out of your Cursor account on this device.",primaryLabel:"Log Out"',
    to: 'title:"退出登录？",description:"你将在此设备上退出 Cursor 账户登录。",primaryLabel:"退出登录"',
    applyBeforeStatic: true,
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
  {
    from: ':g?"No Results Found":"No Automations Yet"',
    to: ':g?"未找到结果":"暂无自动化"',
  },
  { from: 'children:"New Automation"', to: 'children:"新建自动化"' },
  { from: ',"New Automation"]', to: ',"新建自动化"]' },
  {
    from: 'children:"Run agents on a schedule or automatically in response to events. Billed at plan rates."',
    to: 'children:"按计划运行智能体，或在事件触发时自动运行。按套餐标准计费。"',
  },
  {
    from: 'b$m={title:"Welcome to Customize",body:"Manage plugins, MCPs, skills, rules, commands, and hooks in one place."}',
    to: 'b$m={title:"欢迎使用自定义",body:"在一处管理插件、MCP、技能、规则、命令和钩子。"}',
    applyBeforeStatic: true,
  },
  { from: 'Refer friends, earn up to $250', to: '推荐好友，最高赚取 $250' },
  { from: 'glassCategory:"Mode"', to: 'glassCategory:"模式"' },
  { from: 'glassCategory:"Agent"', to: 'glassCategory:"智能体"' },
  { from: 'title:"Enable Run Everything?"', to: 'title:"启用全部运行？"' },
  { from: 'label:"Enable Run Everything"', to: 'label:"启用全部运行"' },
  {
    from: 'label:i?"Use Sandbox instead":"Use Allowlist instead"',
    to: 'label:i?"改用沙箱":"改用允许列表"',
  },
  { from: 'children:"MAX MODE"', to: 'children:"MAX 模式"' },
  { from: 'children:"Enable MAX Mode"', to: 'children:"启用 MAX 模式"' },
  { from: 'children:["View Pricing ', to: 'children:["查看定价 ' },
  { from: 'children:"Agent Instructions"', to: 'children:"智能体指令"' },
  { from: 'children:"Add Trigger"', to: 'children:"添加触发器"' },
  { from: 'label:"Copy as JSON"', to: 'label:"复制为 JSON"' },
  { from: 'label:"Send to Slack"', to: 'label:"发送到 Slack"' },
  { from: 'label:"Read Public Slack Channels"', to: 'label:"读取公共 Slack 频道"' },
  { from: 'label:"Send to Microsoft Teams"', to: 'label:"发送到 Microsoft Teams"' },
  { from: 'label:"Read Microsoft Teams Channels"', to: 'label:"读取 Microsoft Teams 频道"' },
  { from: 'label:"Comment on Pull Request"', to: 'label:"评论拉取请求"' },
  { from: 'label:"Request Reviewers"', to: 'label:"请求审查者"' },
  { from: 'placeHolder:"Select repository"', to: 'placeHolder:"选择仓库"' },
  {
    from: 'message:"GitHub returned an unexpected connection state."',
    to: 'message:"GitHub 返回了意外的连接状态。"',
  },
  {
    from: 'Maxes out context windows and tool calls. For advanced users that are cost insensitive. Billed at API-pricing.',
    to: '最大化上下文窗口与工具调用次数。面向不太在意成本的高级用户。按 API 定价计费。',
  },
  {
    from: 'GitHub app access updated. Cloud Agent setup is refreshing.',
    to: 'GitHub 应用访问权限已更新。云 Agent 设置正在刷新。',
  },
  {
    from: 'return["Reading terminal","Read terminal","Read terminal attempted"]',
    to: 'return["正在读取终端","读取终端","尝试读取终端"]',
    applyBeforeStatic: true,
  },
  {
    from: 'loadingAction:`Monitoring background ${e===1?"task":"tasks"}`',
    to: 'loadingAction:`正在监控后台${e===1?"任务":"任务"}`',
  },
  {
    from: 'const r=[`background ${n===1?"task":"tasks"}`];return e>0&&r.push(`${e} complete`),t>0&&r.push(`${t} active`),{completedAction:"Monitored",completedDetails:r.join(", ")}',
    to: 'const r=[`${n===1?"后台任务":"后台任务"}`];return e>0&&r.push(`${e} 已完成`),t>0&&r.push(`${t} 进行中`),{completedAction:"已监控",completedDetails:r.join("，")}',
    applyBeforeStatic: true,
  },
  {
    from: 'return n.count>1?{action:"Finished",details:`${n.count} background tasks`}:{action:n.action,details:n.title}',
    to: 'return n.count>1?{action:"已完成",details:`${n.count} 个后台任务`}:{action:n.action,details:n.title}',
    applyBeforeStatic: true,
  },
  { from: 'title:"Open SSH Configuration File"', to: 'title:"打开 SSH 配置文件"' },
  { from: 'title:"Delete Cloud-Agent Cache"', to: 'title:"删除 Cloud Agent 缓存"' },
  {
    from: 'title:"Developer: Delete Old Chats\\u2026"',
    to: 'title:"开发者：删除旧对话\\u2026"',
  },
  { from: 'title:"GC Agent KV Blobs"', to: 'title:"回收 Agent KV 存储"' },
  {
    from: 'value:"Delete Old Chats...",original:"Delete Old Chats..."',
    to: 'value:"删除旧对话...",original:"删除旧对话..."',
  },
  { from: 'title:"Open Plan"', to: 'title:"打开计划"' },
  {
    from: 'z(Ec,{title:"Manage",size:"small",type:"tertiary"',
    to: 'z(Ec,{title:"管理",size:"small",type:"tertiary"',
  },
  { from: 'children:"Inactive"', to: 'children:"未激活"', applyBeforeStatic: true },
  { from: 'o=t?"Active":"Inactive"', to: 'o=t?"已激活":"未激活"', applyBeforeStatic: true },
  { from: 'title:"Delete automation"', to: 'title:"删除自动化"' },
  { from: 'label:"Edit Details"', to: 'label:"编辑详情"' },
  { from: 'children:"Add Tool or MCP"', to: 'children:"添加工具或 MCP"' },
  {
    from: 'Mi["agent-prompts-section"]="Enter instructions for the agent before saving."',
    to: 'Mi["agent-prompts-section"]="保存前请输入智能体指令。"',
  },
  {
    from: 'Mi["agent-triggers-section"]="Add a trigger before saving."',
    to: 'Mi["agent-triggers-section"]="保存前请添加触发器。"',
  },
  {
    from: 'return"Get maximum value with 20x usage limits and early access to advanced features."',
    to: 'return"获取 20 倍用量上限与高级功能的抢先体验，价值最大化。"',
  },
  {
    from: 'se(Oe,()=>`Included in ${le().planName}`)',
    to: 'se(Oe,()=>`已包含于 ${le().planName}`)',
  },
  {
    from: 'description:"Customize is the new home for managing this page"',
    to: 'description:"自定义页面是统一管理此页功能的新入口"',
  },
  { from: '[Es.MEMORIES]:"Memories"', to: '[Es.MEMORIES]:"记忆"' },
  { from: 'title:"Guide Agent with Rules"', to: 'title:"用规则引导 Agent"' },
  {
    from:
      'description:"Rules give Agent persistent, system-level instructions for your coding standards and workflows."',
    to: 'description:"规则为 Agent 提供持久、系统级的编码标准与工作流指令。"',
  },
  { from: 'children:"From Marketplace"', to: 'children:"从 Marketplace 添加"' },
  { from: 'children:"From Local Repo"', to: 'children:"从本地仓库添加"' },
  { from: 'metadata:{description:"Run Task"', to: 'metadata:{description:"运行任务"' },
  {
    from: 'placeholder:"Select the task to run..."',
    to: 'placeholder:"选择要运行的任务..."',
  },
  {
    from: 'children:"No runnable workspace tasks found."',
    to: 'children:"未找到可运行的工作区任务。"',
  },
  { from: 'title:"New User Rule"', to: 'title:"新建用户规则"' },
  {
    from: 'placeHolder:"Style request, response language, tone..."',
    to: 'placeHolder:"风格要求、回复语言、语气…"',
  },
  {
    from: 'prompt:"User Rules apply to all of your chats"',
    to: 'prompt:"用户规则适用于你的所有对话"',
  },
  { from: 'title:\\"No Rules Yet\\"', to: 'title:\\"暂无规则\\"' },
  {
    from: 'description:\\"Create rules to guide Agent behavior\\"',
    to: 'description:\\"创建规则以引导 Agent 行为\\"',
  },
  {
    from: '?\\"New User Rule\\":n.hasWorkspaceScopeSelected?\\"New Project Rule\\"',
    to: '?\\"新建用户规则\\":n.hasWorkspaceScopeSelected?\\"新建项目规则\\"',
  },
  { from: 'confirmLabel??\\"Confirm\\"', to: 'confirmLabel??\\"确认\\"' },
  { from: 'title:\\"Could Not Load Rules\\"', to: 'title:\\"无法加载规则\\"' },
  {
    from: 'Failed to load workspace rules.',
    to: '无法加载工作区规则。',
  },
  { from: 'title:"Save and Enable"', to: 'title:"保存并启用"' },
  { from: 'children:"Save and Enable"', to: 'children:"保存并启用"' },
  {
    from:
      'This automation is currently disabled. Enable it to start running on its triggers.',
    to: '此自动化当前已禁用。启用后将随触发器开始运行。',
  },
  {
    from:
      'This automation is currently disabled. You can save it as-is, or review the warnings before enabling it.',
    to: '此自动化当前已禁用。你可以直接保存，或启用前先查看警告。',
  },
  {
    from: 'children:["Are you sure you want to delete \\u201C",t,"\\u201D? This cannot be undone."]',
    to: 'children:["确定要删除 \\u201C",t,"\\u201D？此操作无法撤销。"]',
  },
  { from: '"Resolve these issues to activate"', to: '"请先解决以下问题后再激活"' },
  { from: '"Fix the blocking issues to activate."', to: '"请先修复以下阻塞项后再激活。"' },
  { from: '"Fix the blocking issue to activate."', to: '"请先修复阻塞项后再激活。"' },
  { from: 'children:"Got it"', to: 'children:"知道了"' },
  { from: 'children:"Go back"', to: 'children:"返回"' },
  {
    from: 'Mi["agent-prompts-section"]="Add a prompt before saving."',
    to: 'Mi["agent-prompts-section"]="保存前请添加提示词。"',
  },
  {
    from: '(await n.listMarketplacePlugins({})).plugins].map(l2)',
    to: '(await n.listMarketplacePlugins({})).plugins].map(p=>l2((h=globalThis.__cursorZhMarketplaceLazyTranslatePlugin)?h(p):p))',
  },
  {
    from: '(await n.listMarketplacePlugins({marketplaceId:o.id})).plugins].map(l2)',
    to: '(await n.listMarketplacePlugins({marketplaceId:o.id})).plugins].map(p=>l2((h=globalThis.__cursorZhMarketplaceLazyTranslatePlugin)?h(p):p))',
  },
  {
    from: '(await t.listMarketplacePlugins(new I_n({}),{headers:Vb(Yr())})).plugins].map(l2)',
    to: '(await t.listMarketplacePlugins(new I_n({}),{headers:Vb(Yr())})).plugins].map(p=>l2((h=globalThis.__cursorZhMarketplaceLazyTranslatePlugin)?h(p):p))',
  },
  {
    from: 'Df(cQf,{plugins:zt,installedPluginIdSet:n.installedPluginIdSet',
    to: 'try{globalThis.__cursorZhMarketplaceLazy?.activate?.()}catch(e){}Df(cQf,{plugins:zt,installedPluginIdSet:n.installedPluginIdSet',
  },
  {
    from: 'loadingAction:"Reading",completedAction:"Read",details:"terminal"',
    to: 'loadingAction:"正在读取",completedAction:"读取",details:"终端"',
    applyBeforeStatic: true,
  },
  {
    from: 'loadingAction:"Reading",completedAction:"Read",details:"agent transcript"',
    to: 'loadingAction:"正在读取",completedAction:"读取",details:"智能体记录"',
    applyBeforeStatic: true,
  },
  {
    from: 'loadingVerb:"Waiting",get completedVerb(){return ye()},get argument(){return Se()}',
    to: 'loadingVerb:"正在等待",get completedVerb(){return ye()},get argument(){return Se()}',
  },
  {
    from: 'ye=be(()=>pe()?"Wait skipped":"Waited")',
    to: 'ye=be(()=>pe()?"已跳过等待":"已等待")',
  },
  {
    from: 'return Le?`for ${/^[0-9]+$/.test(Le.trim())?"shell":"agent"}`',
    to: 'return Le?`${/^[0-9]+$/.test(Le.trim())?"shell":"agent"}`',
  },
  {
    from: 'return n?e&&e.length>0?`for ${e} in ${n}`:`for ${n}`:""',
    to: 'return n?e&&e.length>0?`${e} in ${n}`:`${n}`:""',
  },
  { from: 'action:"Waiting"', to: 'action:"正在等待"' },
  { from: 'action:"Waited"', to: 'action:"已等待"' },
  { from: 'action:"Wait skipped"', to: 'action:"已跳过等待"' },
  { from: 'loadingVerb:"Waiting"', to: 'loadingVerb:"正在等待"' },
  {
    from: 'action:`Completed ${l} of ${e.length} to-dos`',
    to: 'action:`已完成 ${l}/${e.length} 项待办`',
    applyBeforeStatic: true,
  },
  {
    from: 'action:`Completed ${l} of ${e.length}`',
    to: 'action:`已完成 ${l}/${e.length} 项`',
    applyBeforeStatic: true,
  },
  { from: 'action:"Started to-do"', to: 'action:"已启动待办"', applyBeforeStatic: true },
  {
    from: 'action:`Started ${r.length} to-dos`',
    to: 'action:`已启动 ${r.length} 项待办`',
    applyBeforeStatic: true,
  },
  { from: 'action:"Added to-do"', to: 'action:"已添加待办"', applyBeforeStatic: true },
  {
    from: 'action:`Added ${o.length} to-dos`',
    to: 'action:`已添加 ${o.length} 项待办`',
    applyBeforeStatic: true,
  },
  { from: 'action:"Cancelled to-do"', to: 'action:"已取消待办"', applyBeforeStatic: true },
  {
    from: 'action:`Cancelled ${a.length} to-dos`',
    to: 'action:`已取消 ${a.length} 项待办`',
    applyBeforeStatic: true,
  },
  {
    from: 'action:"Checked",details:"to-do list"',
    to: 'action:"已查看",details:"待办列表"',
    applyBeforeStatic: true,
  },
  {
    from: 'verb:`Completed ${d} of ${e.length} to-dos`',
    to: 'verb:`已完成 ${d}/${e.length} 项待办`',
    applyBeforeStatic: true,
  },
  {
    from: 'verb:`Completed ${d} of ${e.length}`',
    to: 'verb:`已完成 ${d}/${e.length} 项`',
    applyBeforeStatic: true,
  },
  {
    from: 'verb:`Completed ${m} of ${e.length} to-dos`',
    to: 'verb:`已完成 ${m}/${e.length} 项待办`',
    applyBeforeStatic: true,
  },
  {
    from: 'verb:`Completed ${m} of ${e.length}`',
    to: 'verb:`已完成 ${m}/${e.length} 项`',
    applyBeforeStatic: true,
  },
  { from: 'verb:"Started to-do"', to: 'verb:"已启动待办"', applyBeforeStatic: true },
  {
    from: 'verb:`Started ${a} to-dos`',
    to: 'verb:`已启动 ${a} 项待办`',
    applyBeforeStatic: true,
  },
  { from: 'verb:"Added to-do"', to: 'verb:"已添加待办"', applyBeforeStatic: true },
  {
    from: 'verb:`Added ${u} to-dos`',
    to: 'verb:`已添加 ${u} 项待办`',
    applyBeforeStatic: true,
  },
  {
    from: 'verb:`Added ${d} to-dos`',
    to: 'verb:`已添加 ${d} 项待办`',
    applyBeforeStatic: true,
  },
  { from: 'verb:"Cancelled to-do"', to: 'verb:"已取消待办"', applyBeforeStatic: true },
  {
    from: 'verb:`Cancelled ${c} to-dos`',
    to: 'verb:`已取消 ${c} 项待办`',
    applyBeforeStatic: true,
  },
  { from: 'argument:"to-do list"', to: 'argument:"待办列表"', applyBeforeStatic: true },
  {
    from: 'case yt.TODO_WRITE:return["Updating todos","Updated todos","Update todos attempted"]',
    to: 'case yt.TODO_WRITE:return["正在更新待办","已更新待办","尝试更新待办"]',
    applyBeforeStatic: true,
  },
];

/** Agent transcript shell wait, terminal read, summarization, and background task labels (round 30). */
const CRITICAL_GLASS_ROUND30_UI_TARGETS = [
  { originalText: 'Reading terminal', changeText: '正在读取终端', forceRuntime: true },
  { originalText: 'Read terminal attempted', changeText: '尝试读取终端', forceRuntime: true },
  { originalText: 'Chat context summarized.', changeText: '聊天上下文已总结。', forceRuntime: true },
  { originalText: 'Monitoring background task', changeText: '正在监控后台任务', forceRuntime: true },
  { originalText: 'Monitoring background tasks', changeText: '正在监控后台任务', forceRuntime: true },
  { originalText: 'Monitored', changeText: '已监控', forceRuntime: true },
];

/** Developer command palette, SSH config, and background task completion (round 31). */
const CRITICAL_GLASS_ROUND31_UI_TARGETS = [
  { originalText: 'Open SSH Configuration File', changeText: '打开 SSH 配置文件', forceRuntime: true },
  { originalText: 'Delete Cloud-Agent Cache', changeText: '删除 Cloud Agent 缓存', forceRuntime: true },
  {
    originalText: 'Developer: Delete Old Chats…',
    changeText: '开发者：删除旧对话…',
    forceRuntime: true,
  },
  { originalText: 'Delete Old Chats...', changeText: '删除旧对话...', forceRuntime: true },
];

/** Billing, automation editor, customize migration, and template gallery (round 32). */
const CRITICAL_GLASS_ROUND32_UI_TARGETS = [
  { originalText: 'Inactive', changeText: '未激活', forceRuntime: true },
  { originalText: 'Active', changeText: '已激活', forceRuntime: true },
  { originalText: 'Disabled', changeText: '已禁用', forceRuntime: true },
  { originalText: 'Manage', changeText: '管理', forceRuntime: true },
  { originalText: 'Open Plan', changeText: '打开计划', forceRuntime: true },
  { originalText: 'Edit Details', changeText: '编辑详情', forceRuntime: true },
  { originalText: 'Delete automation', changeText: '删除自动化', forceRuntime: true },
  { originalText: 'Add Tool or MCP', changeText: '添加工具或 MCP', forceRuntime: true },
  {
    originalText: 'Enter instructions for the agent before saving.',
    changeText: '保存前请输入智能体指令。',
    forceRuntime: true,
  },
  {
    originalText: 'Add a trigger before saving.',
    changeText: '保存前请添加触发器。',
    forceRuntime: true,
  },
  {
    originalText: 'Customize is the new home for managing this page',
    changeText: '自定义页面是统一管理此页功能的新入口',
    forceRuntime: true,
  },
  {
    originalText: 'Hooks are moving to Customize',
    changeText: '钩子已迁移至「自定义」',
    forceRuntime: true,
  },
  { originalText: 'Memories', changeText: '记忆', forceRuntime: true },
  { originalText: 'Suggested', changeText: '推荐', forceRuntime: true },
  { originalText: 'More', changeText: '更多', forceRuntime: true },
  ...CRITICAL_GLASS_ROUND32_AUTOMATION_TEMPLATES,
];

/** Rules onboarding card and plugin source menu (round 33). */
const CRITICAL_GLASS_ROUND33_UI_TARGETS = [
  { originalText: 'Guide Agent with Rules', changeText: '用规则引导 Agent', forceRuntime: true },
  {
    originalText:
      'Rules give Agent persistent, system-level instructions for your coding standards and workflows.',
    changeText: '规则为 Agent 提供持久、系统级的编码标准与工作流指令。',
    forceRuntime: true,
  },
  { originalText: 'From Marketplace', changeText: '从 Marketplace 添加', forceRuntime: true },
  { originalText: 'From Local Repo', changeText: '从本地仓库添加', forceRuntime: true },
];

/** Workspace task picker and run task command (round 34). */
const CRITICAL_GLASS_ROUND34_UI_TARGETS = [
  { originalText: 'Run Task', changeText: '运行任务', forceRuntime: true },
  {
    originalText: 'Select the task to run...',
    changeText: '选择要运行的任务...',
    forceRuntime: true,
  },
  {
    originalText: 'No runnable workspace tasks found.',
    changeText: '未找到可运行的工作区任务。',
    forceRuntime: true,
  },
];

/** User rules empty state, quick input dialog, and load errors (round 35). */
const CRITICAL_GLASS_ROUND35_UI_TARGETS = [
  { originalText: 'New User Rule', changeText: '新建用户规则', forceRuntime: true },
  {
    originalText: 'User Rules apply to all of your chats',
    changeText: '用户规则适用于你的所有对话',
    forceRuntime: true,
  },
  {
    originalText: 'Style request, response language, tone...',
    changeText: '风格要求、回复语言、语气…',
    forceRuntime: true,
  },
  { originalText: 'No Rules Yet', changeText: '暂无规则', forceRuntime: true },
  {
    originalText: 'Create rules to guide Agent behavior',
    changeText: '创建规则以引导 Agent 行为',
    forceRuntime: true,
  },
  { originalText: 'New Project Rule', changeText: '新建项目规则', forceRuntime: true },
  { originalText: 'Could Not Load Rules', changeText: '无法加载规则', forceRuntime: true },
  {
    originalText: 'Failed to load workspace rules.',
    changeText: '无法加载工作区规则。',
    forceRuntime: true,
  },
];

/** Automation editor dialogs, validation modal, and lazy-chunk gaps (round 36). */
const CRITICAL_GLASS_ROUND36_UI_TARGETS = [
  { originalText: 'Save and Enable', changeText: '保存并启用', forceRuntime: true },
  {
    originalText:
      'This automation is currently disabled. Enable it to start running on its triggers.',
    changeText: '此自动化当前已禁用。启用后将随触发器开始运行。',
    forceRuntime: true,
  },
  {
    originalText:
      'This automation is currently disabled. You can save it as-is, or review the warnings before enabling it.',
    changeText: '此自动化当前已禁用。你可以直接保存，或启用前先查看警告。',
    forceRuntime: true,
  },
  {
    originalText: 'Resolve these issues to activate',
    changeText: '请先解决以下问题后再激活',
    forceRuntime: true,
  },
  {
    originalText: 'Fix the blocking issues to activate.',
    changeText: '请先修复以下阻塞项后再激活。',
    forceRuntime: true,
  },
  {
    originalText: 'Fix the blocking issue to activate.',
    changeText: '请先修复阻塞项后再激活。',
    forceRuntime: true,
  },
  { originalText: 'Got it', changeText: '知道了', forceRuntime: true },
  { originalText: 'Go back', changeText: '返回', forceRuntime: true },
  {
    originalText: 'Add a prompt before saving.',
    changeText: '保存前请添加提示词。',
    forceRuntime: true,
  },
];

/** Todo write status labels with dynamic counts (round 38). */
const CRITICAL_GLASS_ROUND38_UI_TARGETS = [
  { originalText: 'Updating todos', changeText: '正在更新待办', forceRuntime: true },
  { originalText: 'Updated todos', changeText: '已更新待办', forceRuntime: true },
  { originalText: 'Started to-do', changeText: '已启动待办', forceRuntime: true },
  { originalText: 'Added to-do', changeText: '已添加待办', forceRuntime: true },
  { originalText: 'Cancelled to-do', changeText: '已取消待办', forceRuntime: true },
  { originalText: 'Checked', changeText: '已查看', forceRuntime: true },
  { originalText: 'to-do list', changeText: '待办列表', forceRuntime: true },
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
  ...CRITICAL_GLASS_ROUND23_UI_TARGETS,
  ...CRITICAL_GLASS_ROUND24_UI_TARGETS,
  ...CRITICAL_GLASS_ROUND26_UI_TARGETS,
  ...CRITICAL_GLASS_ROUND27_UI_TARGETS,
  ...CRITICAL_GLASS_ROUND28_UI_TARGETS,
  ...CRITICAL_GLASS_ROUND29_UI_TARGETS,
  ...CRITICAL_GLASS_ROUND30_UI_TARGETS,
  ...CRITICAL_GLASS_ROUND31_UI_TARGETS,
  ...CRITICAL_GLASS_ROUND32_UI_TARGETS,
  ...CRITICAL_GLASS_ROUND33_UI_TARGETS,
  ...CRITICAL_GLASS_ROUND34_UI_TARGETS,
  ...CRITICAL_GLASS_ROUND35_UI_TARGETS,
  ...CRITICAL_GLASS_ROUND36_UI_TARGETS,
  ...CRITICAL_GLASS_ROUND38_UI_TARGETS,
  ...CRITICAL_GLASS_BROWSER_UI_TARGETS,
  ...CRITICAL_MARKETPLACE_UI_SHELL_TARGETS,
];

const {
  LEGACY_ROUND_UI_TARGET_GROUP_NAMES,
} = require('./surface-contracts');

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
  CRITICAL_GLASS_ROUND23_UI_TARGETS,
  CRITICAL_GLASS_ROUND24_UI_TARGETS,
  CRITICAL_GLASS_ROUND26_UI_TARGETS,
  CRITICAL_GLASS_ROUND27_UI_TARGETS,
  CRITICAL_GLASS_ROUND28_UI_TARGETS,
  CRITICAL_GLASS_ROUND29_UI_TARGETS,
  CRITICAL_GLASS_ROUND30_UI_TARGETS,
  CRITICAL_GLASS_ROUND31_UI_TARGETS,
  CRITICAL_GLASS_ROUND32_UI_TARGETS,
  CRITICAL_GLASS_ROUND33_UI_TARGETS,
  CRITICAL_GLASS_ROUND34_UI_TARGETS,
  CRITICAL_GLASS_ROUND35_UI_TARGETS,
  CRITICAL_GLASS_ROUND36_UI_TARGETS,
  CRITICAL_GLASS_ROUND38_UI_TARGETS,
  CRITICAL_GLASS_BROWSER_UI_TARGETS,
  CRITICAL_MARKETPLACE_UI_SHELL_TARGETS,
  CRITICAL_EMBEDDED_UI_PATCHES,
  CRITICAL_UI_ALL_TARGETS,
  LEGACY_ROUND_UI_TARGET_GROUP_NAMES,
};
