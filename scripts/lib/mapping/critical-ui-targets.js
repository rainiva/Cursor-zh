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
  { from: 'duration-100"> Queued', to: 'duration-100"> 排队' },
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
  CRITICAL_GLASS_BROWSER_UI_TARGETS,
  CRITICAL_EMBEDDED_UI_PATCHES,
  CRITICAL_UI_ALL_TARGETS,
};
