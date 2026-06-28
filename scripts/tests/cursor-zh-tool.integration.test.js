const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const childProcess = require('child_process');

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, 'utf8');
}

function createFixtureCursorExecutable(targetPath) {
  const candidates = [
    path.join(process.env.SystemRoot || '', 'System32', 'where.exe'),
    path.join(process.env.WINDIR || '', 'System32', 'where.exe'),
  ].filter(Boolean);

  const sourcePath = candidates.find((candidate) => fs.existsSync(candidate));
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });

  if (sourcePath) {
    fs.copyFileSync(sourcePath, targetPath);
    return;
  }

  writeText(targetPath, '');
}

function createFixture(tempRoot) {
  const workspaceRoot = path.join(tempRoot, 'workspace');
  const installDir = path.join(tempRoot, 'cursor-install');
  const homeRoot = path.join(tempRoot, 'home');
  const appDataRoot = path.join(tempRoot, 'appdata');
  const resourcesAppDir = path.join(installDir, 'resources', 'app');
  const outDir = path.join(resourcesAppDir, 'out');
  const workbenchDir = path.join(resourcesAppDir, 'out', 'vs', 'workbench');

  fs.mkdirSync(workspaceRoot, { recursive: true });
  createFixtureCursorExecutable(path.join(installDir, 'Cursor.exe'));

  writeJson(path.join(resourcesAppDir, 'package.json'), {
    name: 'cursor',
    version: '3.9.8',
    main: './out/main.js',
    distro: 'fixture-distro',
  });
  writeJson(path.join(resourcesAppDir, 'product.json'), {
    nameShort: 'Cursor',
    vscodeVersion: '1.105.0',
  });
  writeJson(path.join(outDir, 'nls.keys.json'), [
    ['vs/platform/menubar/electron-main/menubar', ['mFile', 'mEdit', 'mView', 'mWindow', 'mHelp']],
    [
      'vs/workbench/electron-sandbox/actions/windowActions',
      [
        'miCloseWindow',
        'closeWindow',
        'miZoomIn',
        'miSetZoomLevel',
        'miZoomOut',
        'miZoomReset',
        'current',
        'switchWindowPlaceHolder',
        'switchWindow',
        'quickSwitchWindow',
        'quitDialogTitle',
        'closeDialogTitle',
        'quitDialogMessage',
        'closeDialogMessage',
        'quitAction',
      ],
    ],
    ['vs/workbench/electron-sandbox/desktop.contribution', ['miExit']],
    [
      'vs/workbench/contrib/preferences/browser/preferences.contribution',
      ['miOpenVSCodeSettings'],
    ],
    [
      'vs/workbench/services/preferences/browser/preferencesService',
      ['settingsEditor2InputNameVSCode'],
    ],
    [
      'vs/workbench/browser/parts/titlebar/titlebarPart',
      [
        'titlebarOpenCursorSettings',
        'cursorSettings',
        'movePrimarySideBarRight',
        'movePrimarySideBarLeft',
        'ideTitlebarUpdateAction',
        'chatHistoryTitlebarMaximized',
        'openAgentsWindowTitlebar',
        'moreActionsTitlebarMaximized',
        'togglePrimarySidebar',
        'toggleAgents',
        'goBack',
        'goForward',
        'leftActionsLabel',
        'navigationActionsLabel',
      ],
    ],
    [
      'vs/workbench/browser/actions/layoutActions',
      [
        'openLayoutSettingsMenu',
        'openLayoutSwitcher',
        'maximizeChatSize',
        'minimizeChatSize',
        'toggleInlineDiffs',
        'toggleUnifiedSideBar',
      ],
    ],
    ['vs/workbench/contrib/extensions/browser/extensionsViews', ['openUserSettings']],
    [
      'vs/workbench/contrib/scm/browser/scm.contribution',
      ['agentReview', 'agentReviewSettings', 'startAgentReview'],
    ],
    [
      'vs/workbench/test/menu',
      [
        'close',
        'newWindow',
        'newChat',
        'quickChat',
        'openFolder',
        'settingsDots',
        'logOutItem',
        'exitItem',
      ],
    ],
    ['vs/editor/common/standaloneStrings', ['quickCommandActionLabel']],
    ['vs/workbench/browser/actions/helpActions', ['openLicenseUrl']],
    ['vs/workbench/contrib/terminal/common/terminalStrings', ['terminal.new']],
    ['vs/platform/update/common/update.config.contribution', ['updateConfigurationTitle']],
  ]);
  writeJson(path.join(outDir, 'nls.messages.json'), [
    '&&File',
    '&&Edit',
    '&&View',
    'Window',
    '&&Help',
    'Clos&&e Window',
    'Close Window',
    '&&Zoom In',
    '&&Set Zoom Level',
    '&&Zoom Out',
    '&&Reset Zoom',
    'Current Window',
    'Select a window to switch to',
    'Switch Window...',
    'Quick Switch Window...',
    'Quit Cursor?',
    'Close this window?',
    'Are you sure you want to quit?',
    'Are you sure you want to close this window?',
    'Quit',
    'E&&xit',
    '&&VS Code Settings',
    'VS Code Settings',
    'Open Cursor Settings',
    'Cursor Settings',
    'Move Side Bar Right',
    'Move Side Bar Left',
    'Restart to Update',
    'Chat History',
    'Open Agents Window',
    'More Actions',
    'Toggle Primary Side Bar',
    'Toggle Agents',
    'Go Back',
    'Go Forward',
    'Left title actions',
    'Navigation actions',
    'Open Layout Settings Menu',
    'Switch Layout',
    'Maximize Chat Size',
    'Minimize Chat',
    'Toggle Inline Diffs',
    'Toggle Agents Side Bar',
    'Open User Settings',
    'Agent Review',
    'Agent Review Settings',
    'Start Agent Review',
    'Close',
    'New Window',
    'New Chat',
    'Quick Chat',
    'Open Folder...',
    'Settings...',
    'Log Out',
    'Exit',
    'Command Palette',
    'View License',
    'New Terminal',
    'Update',
  ]);
  writeText(
    path.join(resourcesAppDir, 'out', 'main.js'),
    [
      'const menuLabels = ["File", "Edit", "View", "Window", "Help"];',
      'const trayLabels = ["Recent Agents", "Clear All Notifications", "New Agent", "Open Cursor", "Settings", "Quit"];',
      'const appSettingsHome = ["User"];',
      'console.log(menuLabels);',
      'console.log(trayLabels);',
      '',
    ].join('\n')
  );
  writeText(
    path.join(workbenchDir, 'workbench.desktop.main.js'),
    [
      'const settingsLabels = [',
      "  'General',",
      "  'Appearance',",
      "  'Plan & Usage',",
      "  'Agents',",
      "  'Cloud Agents',",
      "  'Skills',",
      "  'Loading skills...',",
      "  'No skills available',",
      "  'Connect',",
      "  'Theme',",
      "  'Colors',",
      "  'Typography',",
      "  'UI Font Size',",
      "  'Hide Email Address',",
      "  'Open MCP Settings',",
      "  'Search the marketplace',",
      "  'Manage plugins',",
      "  'Show Panel',",
      "  'Subagents',",
      "  'Show all (<!> more)',",
      "  'Show less',",
      "  'Hue',",
      "  'Choose a tint color',",
      "  'Intensity',",
      "  'Control how strongly the tint is applied',",
      "  'Reset to default font size',",
      "  'Decrease font size',",
      "  'Increase font size',",
      "  'MCP Servers',",
      "  'Browser Automation',",
      "  'Browser automation disabled',",
      "  'Add a custom MCP tool in your user MCP config.',",
      "  'Add Custom MCP',",
      "  'Configured in the dashboard',",
      "  'Configure MCP servers in the dashboard to make them available in Cursor on desktop and in the cloud.',",
      "  'Configure Team MCP Servers',",
      "  'Required Domains',",
      "  'Copy Domains',",
      "  'Extension RPC Tracer',",
      "  'Cursor Account',",
      "  'Manage your account and billing',",
      "  'Automate repetitive tasks with always-on cloud agents that respond to environment triggers.',",
      "  'Total Automations',",
      "  'Successful · 7d',",
      "  'Failed · 7d',",
      "  'Run History',",
      "  'Mine',",
      "  'New Automation',",
      "  'No Automations Yet',",
      "  'Run agents on a schedule or automatically in response to events. Billed at plan rates.',",
      "  'Popular',",
      "  'Code Review',",
      "  'Security',",
      "  'Incidents & Triage',",
      "  'Data & Research',",
      "  'Find critical bugs',",
      "  'Analyze recent commits for high-severity correctness bugs and submit safe fixes',",
      "  'Summarize changes daily',",
      "  'Post a daily Slack digest summarizing notable repository changes and risks from the previous day',",
      "  'System Notifications',",
      "  'Show system notifications when Agent completes or needs attention',",
      "  'Warning Notifications',",
      "  'Show warning-level in-app toasts',",
      "  'System Tray Icon',",
      "  'Show Cursor in system tray',",
      "  'Data Sharing Enabled',",
      "  'Share Data',",
      "  'Worktrees',",
      "  'Cleanup',",
      "  'Cursor periodically removes old worktrees to free disk space. Tune how aggressively cleanup runs.',",
      "  'Max worktrees',",
      "  'Maximum number of Cursor-managed worktrees to retain across all workspaces. Older worktrees are removed first.',",
      "  'Max total size (GB)',",
      "  'Maximum total size in GB across all Cursor-managed worktrees. Set to 0 to disable the size limit.',",
      "  'Cursor-managed worktrees',",
      "  'No Cursor-managed worktrees on this machine.',",
      "  'New project',",
      "  'Error loading plugin',",
      "  'Command Palette',",
      "  'View License',",
      "  'New Terminal',",
      "  'New Browser',",
      "  'New Browser Tab',",
      "  'Upgrade to Pro',",
      "  'Upgrade to unlock premium models',",
      "  'Premium models are only available on paid plans.',",
      "  'Upgrade to a Pro account',",
      "  'Free Plan',",
      "  'Update',",
      "  'Connect GitHub',",
      "  'Connect GitHub to create, update, and merge pull requests directly in Cursor.',",
      "  'Entry-level plan with access to premium models, unlimited Tab completions, and more.',",
      "  'Quick Chat',",
      "  'Settings...',",
      "  'Close Window',",
      "  'Exit',",
      "  'Quit Cursor?',",
      "  'Close this window?',",
      "  'Are you sure you want to quit?',",
      "  'Are you sure you want to close this window?',",
      "  'Quit',",
      "  'Zoom In',",
      "  'Set Zoom Level',",
      "  'Zoom Out',",
      "  'Reset Zoom',",
      "  'Current Window',",
      "  'Select a window to switch to',",
      "  'Switch Window...',",
      "  'Quick Switch Window...',",
      "  'Open Cursor Settings',",
      "  'Cursor Settings',",
      "  'Split Right',",
      "  'Split Down',",
      "  'About Cursor',",
      "  'Check for Updates...',",
      "  'Open Files',",
      "  'Open Layout Settings Menu',",
      "  'Switch Layout',",
      "  'Maximize Chat Size',",
      "  'Minimize Chat',",
      "  'Toggle Inline Diffs',",
      "  'Toggle Agents Side Bar',",
      "  'Move Side Bar Right',",
      "  'Move Side Bar Left',",
      "  'Restart to Update',",
      "  'Chat History',",
      "  'Open Agents Window',",
      "  'More Actions',",
      "  'Toggle Primary Side Bar',",
      "  'Toggle Agents',",
      "  'Go Back',",
      "  'Go Forward',",
      "  'Left title actions',",
      "  'Navigation actions',",
      "  'Open Settings (UI)',",
      "  'Open Settings (JSON)',",
      "  'Open User Settings',",
      "  'Open User Settings (JSON)',",
      "  'Open Workspace Settings',",
      "  'Open Workspace Settings (JSON)',",
      "  'Open Application Settings (JSON)',",
      "  'Open Folder Settings',",
      "  'Open Folder Settings (JSON)',",
      "  'Show Settings',",
      "  'Focus Settings Search',",
      "  'Focus Settings Table of Contents',",
      "  'Clear Settings Search Results',",
      "  'Settings Sync',",
      "  'VS Code Settings',",
      "  'Agent Review',",
      "  'Agent Review Settings',",
      "  'Start Agent Review',",
      "  'Sign in',",
      "  'Learn More',",
      "  'Browser Tab: Example',",
      "  'Something went wrong: Boom',",
      "  'View all (12)',",
      "  'Theme',",
      "  'System',",
      "  'Tool Call Density',",
      "  'Adjust how much detail is shown for tool calls',",
      "  'Compact',",
      "  'Detailed',",
      "  'Submit with Ctrl + Enter',",
      "  'When enabled, Ctrl + Enter submits chat and Enter inserts a newline',",
      "  'Queue Messages',",
      "  'Adjust the default behavior of sending a message while Agent is running',",
      "  'Send after current message',",
      "  'Agent Autocomplete',",
      "  'Contextual suggestions while prompting Agent',",
      "  'Tips',",
      "  'Show rotating tips on the empty screen',",
      "  'Auto-Approve Mode Transitions',",
      "  'Allow Agent to switch modes without asking first, such as Agent to Plan or Agent to Debug. When off, Cursor asks before switching.',",
      "  'Explore subagent model',",
      "  'The Explore subagent is used to do initial research for the main agent',",
      "  'Auto-Accept Web Search',",
      "  'Skip approval dialog; Agent may run web searches automatically',",
      "  'Ignored Files',",
      "  'Glob patterns for files where Cursor Tab will not suggest',",
      "  'Tools',",
      "  'Cloud',",
      "  'Connected to Browser Tab',",
      "  'Open Web Links in Browser',",
      "  'Automatically open http and https links in the Browser Tab',",
      "  'Servers available in this workspace.',",
      "  'Configured Hooks (2)',",
      "  'Hooks let you run custom scripts at specific points during the agent\\'s execution to modify behavior, enforce policies, or add custom logging.',",
      "  'Execution Log',",
      "  'Clear log',",
      "  'No hook executions yet',",
      "  'Index New Folders',",
      "  'Automatically index any new folders with fewer than',",
      "  'files',",
      "  'Index Repositories for Instant Grep',",
      "  'Automatically index repositories to speed up Grep searches. All data is stored locally.',",
      "  'These domains must be accessible for Cursor to function. Add them to your firewall or proxy allowlist.',",
      "  'Check network connectivity to all Cursor services',",
      "  'Default',",
      "  'Log extension host RPC messages to JSON files viewable in Perfetto for performance analysis. Requires a restart to take effect.',",
      "  'Customize',",
      "  'Auto',",
      "  'Plan',",
      "  'Multitask',",
      "  'Debug',",
      "  'Repositories',",
      "  'Plan, Build, / for skills, @ for context',",
      "  'Plan and design before coding...',",
      "  'Coordinate parallel tasks...',",
      "  'Debug and troubleshoot issues...',",
      "  'Build a plan before starting code to improve agent execution. Use /plan to get started',",
      "  'Use /multi-model-review to get an adversarial code review from several models',",
      "  'After long sessions, use /split-to-prs to turn your work into small, reviewable PRs',",
      "  'Plugins help you customize Cursor for your workflows. Use /add-plugin to get started',",
      "  'Skills extend Cursor with specialized knowledge. Use /create-skill to get started',",
      "  'Use /create-skill to customize Cursor for your workflows',",
      "  'Use /canvas to get interactive visualizations like dashboards from Cursor',",
      "  'Cursor can respond with interactive visualizations alongside text. Use /canvas to get started',",
      "  'Plan Mode improves agent outcomes and accuracy. Use shift+tab to enable',",
      "  'Use MCPs to give Cursor access to tools and data. Configure MCPs in your Cursor Settings',",
      "  'Use /shell to run commands in the terminal',",
      "  'Drag and drop agent chats to split your view into tiled panes',",
      "  'Use /multitask to run subagents to parallelize your requests instead of queuing them',",
      "  'Use /in-cloud for cloud subagents',",
      "  'Voice mode lets you dictate better prompts. Click or hold ctrl+M to enable',",
      "  'Use ctrl + D to split your view into tiled panes',",
      "  'Use /create-rule to control agent behavior through system-level instructions',",
      "  'Use /debug to solve bugs that are hard to reproduce or understand',",
      "  'Use /bisect to find the exact commit that introduced a certain bug',",
      "  'Use /create-subagent to set up specialized agents that Cursor can use to parallelize work',",
      "  'Create a multi-root workspace so Cursor can work across many repos at once',",
      "  'Use /model to pick the best model for your task. Composer offers a great balance for cost vs. capability',",
      "  'Composer offers a great balance of intelligence and cost. Try it out from the model picker',",
      "  'Ask mode uses read-only agents to research your codebase. Use shift+tab to enable',",
      "  'Use cloud agents for better parallelization and durable execution. Go to cursor.com/agents',",
      "  'Debug Mode reproduces and solves hard bugs. Use shift+tab to enable',",
      "  'Run Cursor anywhere...',",
      "  'Recents',",
      "  'Run On',",
      "  'This PC',",
      "  'Repos',",
      "  'Set Up Workspace',",
      "  'Connect SSH',",
      "  'Editor Window',",
      "  'Motion',",
      "  'Reduce Motion',",
      "  'Minimize interface animations. System follows your OS preference.',",
      "  'Web Fetch Tool',",
      "  'Allow Agent to fetch content from URLs',",
      "  'Hierarchical Cursor Ignore',",
      "  'Apply .cursorignore files to all subdirectories. Changing this setting will require a restart of Cursor.',",
      "  '\\u26A0\\uFE0F Use with caution. Skip symlinks during .cursorignore file discovery. Only enable if your repository has many symlinks and all .cursorignore files are reachable without them. Changing this setting will require a restart of Cursor.',",
      "  'Approvals & Execution for commands, MCP and more',",
      "  'Run Mode',",
      "  'Choose how Agents run tools like command execution, MCP, and file writes.',",
      "  'Many commands will run automatically inside the sandbox, and you can also allowlist other actions.',",
      "  'Allowlist (with Sandbox)',",
      "  'Auto-Run Network Access',",
      "  'Control which network requests are allowed when commands run in the sandbox.',",
      "  'Edit allowed/denied domains in sandbox.json in your workspace.',",
      "  'sandbox.json + Defaults',",
      "  'Command Allowlist',",
      "  'Commands that can run automatically',",
      "  'Add commands...',",
      "  'Add Suggestions',",
      "  'MCP Allowlist',",
      "  'MCP tools that can run automatically. Format: \\'server:tool\\', \\'server:*\\' for all tools from a server, \\'*:tool\\' for a tool from any server, or *:* for all tools from all servers',",
      "  'Add MCP tools...',",
      "  'Fetch Domain Allowlist',",
      "  'Domains that Agent can fetch from automatically. Use \\'*\\' for all domains, \\'*.example.com\\' for wildcard subdomains.',",
      "  'Add domains...',",
      "  'Browser Protection',",
      "  'Prevent Agent from automatically running Browser tools',",
      "  'MCP Tools Protection',",
      "  'Prevent Agent from automatically running MCP tools',",
      "  'File-Deletion Protection',",
      "  'Prevent Agent from deleting files automatically',",
      "  'External-File Protection',",
      "  'Prevent Agent from creating or modifying files outside of the workspace automatically',",
      "  'Inline Editing & Terminal',",
      "  'Legacy Terminal Tool',",
      "  'Use the legacy terminal tool in agent mode, for use on systems with unsupported shell configurations',",
      "  'Voice Mode',",
      "  'Submit Keywords',",
      "  'Custom keywords that trigger auto-submit in voice mode. Only single words (no spaces) are allowed. Punctuation and capitalization are ignored.',",
      "  'Attribution',",
      "  'Commit Attribution',",
      "  'Mark Agent commits as \\'Made with Cursor\\'',",
      "  'PR Attribution',",
      "  'Mark pull requests as made with Cursor',",
      "  'Branch Prefix',",
      "  'Prefix for new branches created by Agent (e.g., cursor/, username/)',",
      "  'Browser Mode',",
      "  'Off',",
      "  'Search models',",
      "  'Add a follow-up',",
      "  'Log Out'",
      '];',
      'const Re=z?U?"":mkE:U?"":ne?.text??"",Be=',
      'async function g7k(n,e=KAn){const i=((await $k(n.listMarketplacePlugins({}),e))?.plugins??[]).map(r1);try{const s=(await $k(n.listMarketplaces({}),e))?.marketplaces??[],o=[];for(const c of s){const u=Vsi(c);u!==void 0&&o.push(u)}const a=await xzy(s.map(c=>c.id),async c=>[...(await n.listMarketplacePlugins({marketplaceId:c})).plugins].map(r1),e),l=new Map;return i}catch{return[]}}',
      'async function refreshMarketplace(e){const t=lsu(this._experimentService),r=((await $k(e.listMarketplacePlugins(new fPt({}),{headers:np($i())}),t))?.plugins??[]).map(r1),o=(await $k(e.listMarketplaces(new k$r({}),{headers:np($i())}),t))?.marketplaces??[];return {r,o}}',
      'function JNt(n){return{async listMarketplacePlugins(e){return await(await n.dashboardClient()).listMarketplacePlugins(new fPt(e),{headers:np($i())})},async getPlugin(e){return await(await n.dashboardClient()).getPlugin(new OFu(e),{headers:np($i())})}}}',
      'console.log(settingsLabels);',
      '',
    ].join('\n')
  );
  writeText(
    path.join(workbenchDir, 'workbench.desktop.main_translated.js'),
    [
      'const translationMappings = [',
      "  { originalText: 'General', changeText: '\\u5e38\\u89c4', searchType: 'exact' },",
      "  { originalText: 'Agents Window', changeText: '\\u667a\\u80fd\\u4f53\\u7a97\\u53e3', searchType: 'exact' }",
      "]; // don't modify string",
      "console.log('legacy translated workbench');",
      '',
    ].join('\n')
  );

  writeJson(
    path.join(
      homeRoot,
      '.cursor',
      'extensions',
      'ms-ceintl.vscode-language-pack-zh-hans-1.105.0-universal',
      'package.json'
    ),
    {
      name: 'ms-ceintl.vscode-language-pack-zh-hans',
      version: '1.105.0',
    }
  );
  writeJson(
    path.join(
      homeRoot,
      '.cursor',
      'extensions',
      'ms-ceintl.vscode-language-pack-zh-hans-1.105.0-universal',
      'translations',
      'main.i18n.json'
    ),
    {
      version: '1.0.0',
      contents: {
        'vs/platform/menubar/electron-main/menubar': {
          mFile: '\u6587\u4ef6(&&F)',
          mEdit: '\u7f16\u8f91(&&E)',
          mView: '\u67e5\u770b(&&V)',
          mWindow: '\u7a97\u53e3',
          mHelp: '\u5e2e\u52a9(&&H)',
        },
      },
    }
  );

  writeText(
    path.join(resourcesAppDir, 'extensions', 'cursor-always-local', 'package.nls.json'),
    JSON.stringify({
      displayName: 'Cursor Always Local',
      description: 'Experimentation @ cursor.sh',
    })
  );

  return {
    appDataRoot,
    homeRoot,
    installDir,
    workspaceRoot,
  };
}

function runTool(command, fixture, extraEnv = {}, extraArgs = []) {
  return childProcess.spawnSync(
    process.execPath,
    [
      path.join(__dirname, '..', 'cursor-zh-tool.js'),
      command,
      '--install-dir',
      fixture.installDir,
      '--no-shortcut',
      ...extraArgs,
    ],
    {
      cwd: fixture.workspaceRoot,
      env: {
        ...process.env,
        APPDATA: fixture.appDataRoot,
        ...extraEnv,
        CURSOR_ZH_WORKSPACE_ROOT: fixture.workspaceRoot,
        HOME: fixture.homeRoot,
        USERPROFILE: fixture.homeRoot,
      },
      encoding: 'utf8',
    }
  );
}

function extractInjectedTranslationMappings(workbenchText) {
  const match = workbenchText.match(/const translationMappings = (\[[\s\S]*?\]);/);
  assert.ok(match, 'expected generated bundle to contain translationMappings array');
  return JSON.parse(match[1]);
}

function extractInstalledRuntimeArtifact(workbenchText) {
  const metadataMatch = workbenchText.match(/const translationMetadata = (.+);\n/);
  const mappings = extractInjectedTranslationMappings(workbenchText);
  const headerMatch = workbenchText.match(
    /^\/\* Cursor ZH generated runtime: do not edit generated file directly\. \*\/[\s\S]*?\n\}\)\(\);\n?/
  );

  assert.ok(metadataMatch, 'expected generated bundle to contain translationMetadata');
  assert.ok(headerMatch, 'expected generated bundle to contain a runtime header block');

  const runtimeHeaderChars = headerMatch[0].length;

  return {
    metadata: JSON.parse(metadataMatch[1]),
    runtimeMappings: mappings,
    runtimeStrategy: {
      mode: JSON.parse(metadataMatch[1]).runtimeConfig.mode,
      runtimeMappingCount: mappings.length,
      runtimeHeaderChars,
      runtimeHeaderKB: +(runtimeHeaderChars / 1024).toFixed(1),
    },
  };
}

function runUninstall(fixture) {
  return childProcess.spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      path.join(__dirname, '..', 'uninstall.ps1'),
      '-InstallDir',
      fixture.installDir,
    ],
    {
      cwd: fixture.workspaceRoot,
      env: {
        ...process.env,
        APPDATA: fixture.appDataRoot,
        CURSOR_ZH_WORKSPACE_ROOT: fixture.workspaceRoot,
        HOME: fixture.homeRoot,
        USERPROFILE: fixture.homeRoot,
      },
      encoding: 'utf8',
    }
  );
}

function runInstall(fixture) {
  return childProcess.spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      path.join(__dirname, '..', 'install.ps1'),
      '-InstallDir',
      fixture.installDir,
      '-NoShortcut',
    ],
    {
      cwd: fixture.workspaceRoot,
      env: {
        ...process.env,
        APPDATA: fixture.appDataRoot,
        CURSOR_ZH_WORKSPACE_ROOT: fixture.workspaceRoot,
        HOME: fixture.homeRoot,
        USERPROFILE: fixture.homeRoot,
      },
      encoding: 'utf8',
    }
  );
}

function runInvoke(command, fixture) {
  return childProcess.spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      path.join(__dirname, '..', 'invoke-cursor-zh.ps1'),
      '-Command',
      command,
      '-InstallDir',
      fixture.installDir,
    ],
    {
      cwd: fixture.workspaceRoot,
      env: {
        ...process.env,
        APPDATA: fixture.appDataRoot,
        CURSOR_ZH_WORKSPACE_ROOT: fixture.workspaceRoot,
        HOME: fixture.homeRoot,
        USERPROFILE: fixture.homeRoot,
      },
      encoding: 'utf8',
    }
  );
}

test('install script prints environment details before applying changes', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-install-script-'));
  const fixture = createFixture(tempRoot);

  const installResult = runInstall(fixture);
  assert.equal(installResult.status, 0, installResult.stderr || installResult.stdout);
  assert.match(installResult.stdout, /\[Environment\]/);
  assert.match(installResult.stdout, /Workspace root:/);
  assert.match(installResult.stdout, /Requested install dir:/);
  assert.match(installResult.stdout, /Cursor path:/);
  assert.match(installResult.stdout, /Node path:/);
  assert.match(installResult.stdout, /\[Install complete\]/);
});

test('start wrapper delegates to the hidden VBS launcher', () => {
  const startWrapperPath = path.join(
    __dirname,
    '..',
    '..',
    'templates',
    'start-cursor-zh.cmd'
  );
  const startWrapperText = fs.readFileSync(startWrapperPath, 'utf8');

  assert.match(startWrapperText, /wscript\.exe/i);
  assert.match(startWrapperText, /scripts\\start-cursor-zh\.vbs/i);
  assert.doesNotMatch(startWrapperText, /invoke-cursor-zh\.ps1/i);

  const startLauncherPath = path.join(__dirname, '..', 'start-cursor-zh.vbs');
  const startLauncherText = fs.readFileSync(startLauncherPath, 'utf8');
  assert.match(startLauncherText, /state\\start-cursor-path\.txt/i);
  assert.match(startLauncherText, /invoke-cursor-zh\.ps1/i);
});

test('start launches Cursor without running ensure or mutating install state', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-start-fast-'));
  const fixture = createFixture(tempRoot);
  const packageJsonPath = path.join(
    fixture.installDir,
    'resources',
    'app',
    'package.json'
  );
  const argvPath = path.join(fixture.homeRoot, '.cursor', 'argv.json');
  const translatorBootstrapPath = path.join(
    fixture.installDir,
    'resources',
    'app',
    'out',
    'cursorTranslatorMain.js'
  );

  const startResult = runTool('start', fixture);
  assert.equal(startResult.status, 0, startResult.stderr || startResult.stdout);
  assert.match(startResult.stdout, /已启动 Cursor:/);
  assert.equal(JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')).main, './out/main.js');
  assert.equal(fs.existsSync(argvPath), false);
  assert.equal(fs.existsSync(translatorBootstrapPath), false);
});

test('apply then verify succeeds against an isolated fixture install', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-tool-'));
  const fixture = createFixture(tempRoot);

  const applyResult = runTool('apply', fixture);
  assert.equal(applyResult.status, 0, applyResult.stderr || applyResult.stdout);

  const verifyResult = runTool('verify', fixture);
  assert.equal(verifyResult.status, 0, verifyResult.stderr || verifyResult.stdout);

  const translatedWorkbenchPath = path.join(
    fixture.installDir,
    'resources',
    'app',
    'out',
    'vs',
    'workbench',
    'workbench.desktop.main_translated.js'
  );
  const generatedWorkbenchPath = path.join(
    fixture.workspaceRoot,
    'state',
    'generated',
    'workbench.desktop.main_translated.generated.js'
  );
  const translatedMainPath = path.join(
    fixture.installDir,
    'resources',
    'app',
    'out',
    'main_translated.js'
  );
  const generatedMainPath = path.join(
    fixture.workspaceRoot,
    'state',
    'generated',
    'main_translated.generated.js'
  );
  const translatorBootstrapPath = path.join(
    fixture.installDir,
    'resources',
    'app',
    'out',
    'cursorTranslatorMain.js'
  );
  const nlsMessagesPath = path.join(
    fixture.installDir,
    'resources',
    'app',
    'out',
    'nls.messages.json'
  );
  const generatedNlsMessagesPath = path.join(
    fixture.workspaceRoot,
    'state',
    'generated',
    'nls.messages.generated.json'
  );
  const buildManifestPath = path.join(fixture.workspaceRoot, 'state', 'build-manifest.json');
  const argvPath = path.join(fixture.homeRoot, '.cursor', 'argv.json');
  const localeMirrorPath = path.join(fixture.appDataRoot, 'Cursor', 'User', 'locale.json');
  const extensionTranslationPath = path.join(
    fixture.installDir,
    'resources',
    'app',
    'extensions',
    'cursor-always-local',
    'package.nls.zh-cn.json'
  );
  const cursorWinOverlayPath = path.join(
    fixture.workspaceRoot,
    'translations',
    'overlay',
    'cursor-win.common.json'
  );
  const cursorWinDynamicPath = path.join(
    fixture.workspaceRoot,
    'translations',
    'overlay',
    'cursor-win.dynamic.json'
  );
  const translatedMainText = fs.readFileSync(translatedMainPath, 'utf8');
  const translatorBootstrapText = fs.readFileSync(translatorBootstrapPath, 'utf8');
  const translatedNlsMessages = JSON.parse(fs.readFileSync(nlsMessagesPath, 'utf8'));
  const translatedWorkbenchText = fs.readFileSync(translatedWorkbenchPath, 'utf8');
  const buildManifest = JSON.parse(fs.readFileSync(buildManifestPath, 'utf8'));
  const installedRuntimeArtifact = extractInstalledRuntimeArtifact(translatedWorkbenchText);
  const startLauncherPath = path.join(
    fixture.workspaceRoot,
    'state',
    'start-cursor-path.txt'
  );

  assert.match(translatedMainText, /const menuLabels = \["File", "Edit", "View", "Window", "Help"\];/);
  assert.match(translatedMainText, /const appSettingsHome = \["User"\];/);
  assert.doesNotMatch(translatedMainText, /const appSettingsHome = \["用户"\];/);
  assert.deepEqual(translatedNlsMessages.slice(0, 5), [
    '\u6587\u4ef6(&&F)',
    '\u7f16\u8f91(&&E)',
    '\u67e5\u770b(&&V)',
    '\u7a97\u53e3',
    '\u5e2e\u52a9(&&H)',
  ]);
  assert.ok(translatedNlsMessages.includes('\u5173\u95ed\u7a97\u53e3'));
  assert.ok(translatedNlsMessages.includes('\u5feb\u901f\u5bf9\u8bdd'));
  assert.ok(translatedNlsMessages.includes('\u8bbe\u7f6e...'));
  assert.ok(translatedNlsMessages.includes('\u9000\u51fa'));
  assert.ok(translatedNlsMessages.includes('\u547d\u4ee4\u9762\u677f'));
  assert.ok(translatedNlsMessages.includes('\u67e5\u770b\u8bb8\u53ef'));
  assert.ok(translatedNlsMessages.includes('\u65b0\u5efa\u7ec8\u7aef'));
  assert.ok(translatedNlsMessages.includes('\u66f4\u65b0'));
  assert.ok(translatedNlsMessages.includes('VS Code \u8bbe\u7f6e'));
  assert.ok(translatedNlsMessages.includes('\u6253\u5f00 Cursor \u8bbe\u7f6e'));
  assert.ok(translatedNlsMessages.includes('Cursor \u8bbe\u7f6e'));
  assert.ok(translatedNlsMessages.includes('\u6253\u5f00\u7528\u6237\u8bbe\u7f6e'));
  assert.ok(translatedNlsMessages.includes('\u6253\u5f00\u5e03\u5c40\u8bbe\u7f6e\u83dc\u5355'));
  assert.ok(translatedNlsMessages.includes('\u5207\u6362\u5e03\u5c40'));
  assert.ok(translatedNlsMessages.includes('\u667a\u80fd\u4f53\u5ba1\u67e5\u8bbe\u7f6e'));
  assert.ok(!translatedNlsMessages.includes('Clos&&e Window'));
  assert.ok(!translatedNlsMessages.includes('&&VS Code Settings'));
  assert.ok(!translatedNlsMessages.includes('Open Cursor Settings'));
  assert.ok(!translatedNlsMessages.includes('Quick Chat'));
  assert.ok(!translatedNlsMessages.includes('Settings...'));
  assert.ok(!translatedNlsMessages.includes('Exit'));
  assert.ok(!translatedNlsMessages.includes('Command Palette'));
  assert.ok(!translatedNlsMessages.includes('View License'));
  assert.ok(!translatedNlsMessages.includes('New Terminal'));
  assert.ok(!translatedNlsMessages.includes('Update'));
  assert.match(translatedMainText, /最近智能体/);
  assert.match(translatedMainText, /清除所有通知/);
  assert.match(translatedMainText, /新建智能体/);
  assert.match(translatedMainText, /打开 Cursor/);
  assert.match(translatedMainText, /设置/);
  assert.match(translatedMainText, /退出/);
  assert.match(translatedWorkbenchText, /Cursor ZH generated runtime/);
  assert.match(translatedWorkbenchText, /normalizedExact/);
  assert.match(translatedWorkbenchText, /replace\(\/&&\/g, ""\)/);
  assert.match(translatedWorkbenchText, /"mode":"performance"/);
  assert.match(translatedWorkbenchText, /"stageDocumentRoot":false/);
  assert.match(translatedWorkbenchText, /"shortExactTextFallback":false/);
  assert.match(translatedWorkbenchText, /rescanDelaysMs/);
  assert.match(translatedWorkbenchText, /observeScopeSelectors/);
  assert.doesNotMatch(
    translatedWorkbenchText,
    /"observeScopeSelectors":\[[^\]]*empty-state-rotating-tips/
  );
  assert.match(translatedWorkbenchText, /marketplaceRemoteTranslationEnabled/);
  assert.match(translatedWorkbenchText, /setTimeout\(\(\) => periodicScan\(\), delay\)/);
  assert.doesNotMatch(translatedWorkbenchText, /setInterval\(periodicScan, 2000\)/);
  assert.match(translatedWorkbenchText, /attachShadow/);
  assert.match(translatedWorkbenchText, /observeExistingShadowRoots/);
  assert.match(translatedWorkbenchText, /bindFrame/);
  assert.match(translatedWorkbenchText, /observeExistingFrames/);
  assert.match(translatedWorkbenchText, /observeDiscoveryRoot/);
  assert.match(
    translatedWorkbenchText,
    /const documentRoot = document\.body \|\| document\.documentElement;/
  );
  assert.match(
    translatedWorkbenchText,
    /if \(this\.stageDocumentRoot && documentRoot\) this\._stageRootForTranslation\(documentRoot\);/
  );
  assert.doesNotMatch(translatedWorkbenchText, /runShortExactTextFallback\(documentRoot\)/);
  assert.match(translatedWorkbenchText, /__cursorZhTranslateProductTipText/);
  assert.match(translatedWorkbenchText, /translateExactTextNode\(node\)/);
  assert.match(
    translatedWorkbenchText,
    /const shouldStageRoot = Boolean\(\s*root &&\s*\(root\.nodeType === Node\.ELEMENT_NODE \|\| root\.nodeType === Node\.DOCUMENT_FRAGMENT_NODE\) &&\s*!this\.hasScopedObservation\(\)\s*\);/
  );
  assert.match(
    translatedWorkbenchText,
    /if \(shouldStageRoot\) this\._stageRootForTranslation\(root\);/
  );
  assert.match(translatedWorkbenchText, /_scheduleFlush/);
  assert.match(translatedWorkbenchText, /_flushMutations/);
  assert.match(translatedWorkbenchText, /_translatedSubtrees/);
  assert.match(translatedWorkbenchText, /_pendingIdleRoots/);
  assert.doesNotMatch(translatedWorkbenchText, /__cursorZhTranslateMarketplacePlugins/);
  assert.doesNotMatch(translatedWorkbenchText, /__cursorZhTranslateMarketplaceResponse/);
  assert.match(translatedWorkbenchText, /精选/);
  assert.match(translatedWorkbenchText, /基础设施/);
  assert.match(translatedWorkbenchText, /数据与分析/);
  assert.doesNotMatch(translatedWorkbenchText, /"New project"/);
  assert.match(translatedWorkbenchText, /新建项目/);
  assert.doesNotMatch(translatedWorkbenchText, /"Error loading plugin"/);
  assert.match(translatedWorkbenchText, /加载插件失败/);
  assert.match(translatedWorkbenchText, /"Sign In"/);
  assert.match(translatedWorkbenchText, /Browser Tab:/);
  assert.match(translatedWorkbenchText, /\u5feb\u901f\u5bf9\u8bdd/);
  assert.match(translatedWorkbenchText, /\u547d\u4ee4\u9762\u677f/);
  assert.match(translatedWorkbenchText, /\u67e5\u770b\u8bb8\u53ef/);
  assert.match(translatedWorkbenchText, /\u65b0\u5efa\u7ec8\u7aef/);
  assert.match(translatedWorkbenchText, /\u65b0\u5efa\u6d4f\u89c8\u5668/);
  assert.match(translatedWorkbenchText, /\u65b0\u5efa\u6d4f\u89c8\u5668\u6807\u7b7e\u9875/);
  assert.match(translatedWorkbenchText, /\u5347\u7ea7\u5230 Pro/);
  assert.match(translatedWorkbenchText, /\u5347\u7ea7\u4ee5\u89e3\u9501\u9ad8\u7ea7\u6a21\u578b/);
  assert.match(translatedWorkbenchText, /\u9ad8\u7ea7\u6a21\u578b\u4ec5\u5728\u4ed8\u8d39\u5957\u9910\u4e2d\u53ef\u7528\u3002/);
  assert.match(translatedWorkbenchText, /\u5347\u7ea7\u5230 Pro \u8d26\u6237/);
  assert.match(translatedWorkbenchText, /\u514d\u8d39\u7248/);
  assert.match(translatedWorkbenchText, /\u66f4\u65b0/);
  assert.match(translatedWorkbenchText, /\u8fde\u63a5 GitHub/);
  assert.match(
    translatedWorkbenchText,
    /\u8fde\u63a5 GitHub\uff0c\u5373\u53ef\u76f4\u63a5\u5728 Cursor \u4e2d\u521b\u5efa\u3001\u66f4\u65b0\u548c\u5408\u5e76\u62c9\u53d6\u8bf7\u6c42\u3002/
  );
  assert.match(
    translatedWorkbenchText,
    /\u5165\u95e8\u7248\u8ba1\u5212\uff0c\u652f\u6301\u9ad8\u7ea7\u6a21\u578b\u3001\u65e0\u9650 Tab \u8865\u5168\u7b49\u66f4\u591a\u529f\u80fd\u3002/
  );
  assert.match(translatedWorkbenchText, /\u8bbe\u7f6e\.\.\./);
  assert.match(translatedWorkbenchText, /\u5173\u95ed\u7a97\u53e3/);
  assert.match(translatedWorkbenchText, /\u9000\u51fa/);
  assert.match(translatedWorkbenchText, /\u9000\u51fa Cursor\uff1f/);
  assert.match(translatedWorkbenchText, /\u5173\u95ed\u6b64\u7a97\u53e3\uff1f/);
  assert.match(translatedWorkbenchText, /\u4f60\u786e\u5b9a\u8981\u9000\u51fa\u5417\uff1f/);
  assert.match(translatedWorkbenchText, /\u4f60\u786e\u5b9a\u8981\u5173\u95ed\u6b64\u7a97\u53e3\u5417\uff1f/);
  assert.match(translatedWorkbenchText, /\u653e\u5927/);
  assert.match(translatedWorkbenchText, /\u8bbe\u7f6e\u7f29\u653e\u7ea7\u522b/);
  assert.match(translatedWorkbenchText, /\u7f29\u5c0f/);
  assert.match(translatedWorkbenchText, /\u91cd\u7f6e\u7f29\u653e/);
  assert.match(translatedWorkbenchText, /\u5f53\u524d\u7a97\u53e3/);
  assert.match(translatedWorkbenchText, /\u9009\u62e9\u8981\u5207\u6362\u5230\u7684\u7a97\u53e3/);
  assert.match(translatedWorkbenchText, /\u5207\u6362\u7a97\u53e3\.\.\./);
  assert.match(translatedWorkbenchText, /\u5feb\u901f\u5207\u6362\u7a97\u53e3\.\.\./);
  assert.match(translatedWorkbenchText, /VS Code \u8bbe\u7f6e/);
  assert.match(translatedWorkbenchText, /\u6253\u5f00 Cursor \u8bbe\u7f6e/);
  assert.match(translatedWorkbenchText, /Cursor \u8bbe\u7f6e/);
  assert.match(translatedWorkbenchText, /\u5411\u53f3\u62c6\u5206/);
  assert.match(translatedWorkbenchText, /\u5411\u4e0b\u62c6\u5206/);
  assert.match(translatedWorkbenchText, /关于 Cursor/);
  assert.match(translatedWorkbenchText, /检查更新\.\.\./);
  assert.match(translatedWorkbenchText, /打开文件/);
  assert.match(translatedWorkbenchText, /\u6253\u5f00\u5e03\u5c40\u8bbe\u7f6e\u83dc\u5355/);
  assert.match(translatedWorkbenchText, /\u5207\u6362\u5e03\u5c40/);
  assert.match(translatedWorkbenchText, /\u6700\u5927\u5316\u5bf9\u8bdd\u533a\u57df/);
  assert.match(translatedWorkbenchText, /\u6700\u5c0f\u5316\u5bf9\u8bdd/);
  assert.match(translatedWorkbenchText, /\u5207\u6362\u5185\u8054\u5dee\u5f02/);
  assert.match(translatedWorkbenchText, /\u5207\u6362\u667a\u80fd\u4f53\u4fa7\u8fb9\u680f/);
  assert.match(translatedWorkbenchText, /\u5c06\u4fa7\u8fb9\u680f\u79fb\u5230\u53f3\u4fa7/);
  assert.match(translatedWorkbenchText, /\u5c06\u4fa7\u8fb9\u680f\u79fb\u5230\u5de6\u4fa7/);
  assert.match(translatedWorkbenchText, /\u91cd\u542f\u4ee5\u66f4\u65b0/);
  assert.match(translatedWorkbenchText, /\u804a\u5929\u8bb0\u5f55/);
  assert.match(translatedWorkbenchText, /\u6253\u5f00\u667a\u80fd\u4f53\u7a97\u53e3/);
  assert.match(translatedWorkbenchText, /\u89c4\u5212\u3001\u6784\u5efa\uff0c\/ \u7528\u4e8e\u6280\u80fd\uff0c@ \u7528\u4e8e\u4e0a\u4e0b\u6587/);
  assert.match(translatedWorkbenchText, /\u81ea\u52a8/);
  assert.match(translatedWorkbenchText, /\u89c4\u5212/);
  assert.match(translatedWorkbenchText, /\u591a\u4efb\u52a1/);
  assert.match(translatedWorkbenchText, /\u8c03\u8bd5/);
  assert.match(translatedWorkbenchText, /\u7f16\u7801\u524d\u5148\u89c4\u5212\u548c\u8bbe\u8ba1\.\.\./);
  assert.match(translatedWorkbenchText, /\u534f\u8c03\u5e76\u884c\u4efb\u52a1\.\.\./);
  assert.match(translatedWorkbenchText, /\u8c03\u8bd5\u5e76\u6392\u67e5\u95ee\u9898\.\.\./);
  assert.match(translatedWorkbenchText, /\u5728\u5f00\u59cb\u7f16\u5199\u4ee3\u7801\u524d\u5148\u5236\u5b9a\u8ba1\u5212\uff0c\u4ee5\u63d0\u5347\u667a\u80fd\u4f53\u6267\u884c\u6548\u679c\u3002\u4f7f\u7528 \/plan \u5f00\u59cb\u3002/);
  assert.match(translatedWorkbenchText, /\u4f7f\u7528 \/multi-model-review \u53ef\u4ece\u591a\u4e2a\u6a21\u578b\u83b7\u5f97\u5bf9\u6297\u5f0f\u4ee3\u7801\u5ba1\u67e5/);
  assert.match(translatedWorkbenchText, /\u957f\u65f6\u95f4\u4f1a\u8bdd\u540e\uff0c\u4f7f\u7528 \/split-to-prs \u5c06\u4f60\u7684\u5de5\u4f5c\u62c6\u5206\u4e3a\u5c0f\u578b\u3001\u6613\u4e8e\u5ba1\u67e5\u7684 PR/);
  assert.match(translatedWorkbenchText, /\u63d2\u4ef6\u53ef\u5e2e\u52a9\u4f60\u6309\u5de5\u4f5c\u6d41\u81ea\u5b9a\u4e49 Cursor\u3002\u4f7f\u7528 \/add-plugin \u5f00\u59cb\u3002/);
  assert.match(translatedWorkbenchText, /\u6280\u80fd\u53ef\u4e3a Cursor \u6269\u5c55\u4e13\u4e1a\u5316\u77e5\u8bc6\u3002\u4f7f\u7528 \/create-skill \u5f00\u59cb\u3002/);
  assert.match(translatedWorkbenchText, /\u4f7f\u7528 \/create-skill \u6309\u4f60\u7684\u5de5\u4f5c\u6d41\u81ea\u5b9a\u4e49 Cursor/);
  assert.match(translatedWorkbenchText, /\u4f7f\u7528 \/canvas \u4ece Cursor \u83b7\u53d6\u4eea\u8868\u76d8\u7b49\u4ea4\u4e92\u5f0f\u53ef\u89c6\u5316/);
  assert.match(translatedWorkbenchText, /Cursor \u53ef\u4ee5\u5728\u6587\u672c\u65c1\u751f\u6210\u4ea4\u4e92\u5f0f\u53ef\u89c6\u5316\u3002\u4f7f\u7528 \/canvas \u5f00\u59cb\u3002/);
  assert.match(translatedWorkbenchText, /\u89c4\u5212\u6a21\u5f0f\u53ef\u63d0\u5347\u667a\u80fd\u4f53\u7ed3\u679c\u4e0e\u51c6\u786e\u6027\u3002\u4f7f\u7528 shift\+tab \u542f\u7528/);
  assert.match(translatedWorkbenchText, /\u4f7f\u7528 MCP \u8ba9 Cursor \u8bbf\u95ee\u5de5\u5177\u548c\u6570\u636e\u3002\u8bf7\u5728 Cursor \u8bbe\u7f6e\u4e2d\u914d\u7f6e MCP/);
  assert.match(translatedWorkbenchText, /\u4f7f\u7528 \/shell \u5728\u7ec8\u7aef\u4e2d\u8fd0\u884c\u547d\u4ee4/);
  assert.match(translatedWorkbenchText, /\u62d6\u653e\u667a\u80fd\u4f53\u5bf9\u8bdd\u5373\u53ef\u5c06\u89c6\u56fe\u62c6\u5206\u4e3a\u5e73\u94fa\u7a97\u683c/);
  assert.match(translatedWorkbenchText, /\u4f7f\u7528 \/multitask \u8fd0\u884c\u5b50\u667a\u80fd\u4f53\uff0c\u4ee5\u5e76\u884c\u5904\u7406\u4f60\u7684\u8bf7\u6c42\uff0c\u800c\u4e0d\u662f\u5c06\u5b83\u4eec\u6392\u961f\u7b49\u5f85/);
  assert.match(translatedWorkbenchText, /\u4f7f\u7528 \/in-cloud \u542f\u7528\u4e91\u7aef\u5b50\u667a\u80fd\u4f53/);
  assert.match(translatedWorkbenchText, /\u8bed\u97f3\u6a21\u5f0f\u53ef\u5e2e\u52a9\u4f60\u53e3\u8ff0\u51fa\u66f4\u597d\u7684\u63d0\u793a\u8bcd\u3002\u70b9\u51fb\u6216\u6309\u4f4f ctrl\+M \u542f\u7528/);
  assert.match(translatedWorkbenchText, /\u4f7f\u7528 ctrl \+ D \u5c06\u89c6\u56fe\u62c6\u5206\u4e3a\u5e73\u94fa\u7a97\u683c/);
  assert.match(translatedWorkbenchText, /\u4f7f\u7528 \/create-rule \u901a\u8fc7\u7cfb\u7edf\u7ea7\u6307\u4ee4\u63a7\u5236\u667a\u80fd\u4f53\u884c\u4e3a/);
  assert.match(translatedWorkbenchText, /\u4f7f\u7528 \/debug \u89e3\u51b3\u96be\u4ee5\u590d\u73b0\u6216\u7406\u89e3\u7684 Bug/);
  assert.match(translatedWorkbenchText, /\u4f7f\u7528 \/bisect \u627e\u5230\u5f15\u5165\u67d0\u4e2a\u7f3a\u9677\u7684\u51c6\u786e\u63d0\u4ea4/);
  assert.match(translatedWorkbenchText, /\u4f7f\u7528 \/create-subagent \u8bbe\u7f6e Cursor \u53ef\u7528\u4e8e\u5e76\u884c\u5de5\u4f5c\u7684\u4e13\u7528\u667a\u80fd\u4f53/);
  assert.match(translatedWorkbenchText, /\u521b\u5efa\u591a\u6839\u5de5\u4f5c\u533a\uff0c\u8ba9 Cursor \u53ef\u4ee5\u4e00\u6b21\u5904\u7406\u591a\u4e2a\u4ed3\u5e93/);
  assert.match(translatedWorkbenchText, /\u4f7f\u7528 \/model \u4e3a\u4f60\u7684\u4efb\u52a1\u9009\u62e9\u6700\u5408\u9002\u7684\u6a21\u578b\u3002Composer \u5728\u6210\u672c\u4e0e\u80fd\u529b\u4e4b\u95f4\u63d0\u4f9b\u4e86\u5f88\u597d\u7684\u5e73\u8861/);
  assert.match(translatedWorkbenchText, /\u4f7f\u7528 \/model \u4e3a\u4f60\u7684\u4efb\u52a1\u9009\u62e9\u6700\u5408\u9002\u7684\u6a21\u578b\u3002Composer \u5728\u667a\u80fd\u4e0e\u6210\u672c\u4e4b\u95f4\u53d6\u5f97\u4e86\u5f88\u597d\u7684\u5e73\u8861\u3002\u53ef\u5728\u6a21\u578b\u9009\u62e9\u5668\u4e2d\u8bd5\u7528\u3002/);
  assert.match(translatedWorkbenchText, /\u0041\u0073\u006b \u6a21\u5f0f\u4f1a\u4f7f\u7528\u53ea\u8bfb\u667a\u80fd\u4f53\u7814\u7a76\u4f60\u7684\u4ee3\u7801\u5e93\u3002\u4f7f\u7528 shift\+tab \u542f\u7528\u3002/);
  assert.match(translatedWorkbenchText, /\u4f7f\u7528\u4e91\u7aef\u667a\u80fd\u4f53\u53ef\u83b7\u5f97\u66f4\u597d\u7684\u5e76\u884c\u5316\u4e0e\u6301\u4e45\u6267\u884c\u80fd\u529b\u3002\u524d\u5f80 cursor\.com\/agents/);
  assert.match(translatedWorkbenchText, /\u8c03\u8bd5\u6a21\u5f0f\u53ef\u590d\u73b0\u5e76\u89e3\u51b3\u68d8\u624b\u7684 Bug\u3002\u4f7f\u7528 shift\+tab \u542f\u7528/);
  assert.match(translatedWorkbenchText, /\u968f\u5904\u8fd0\u884c Cursor\.\.\./);
  assert.match(translatedWorkbenchText, /\u6700\u8fd1/);
  assert.match(translatedWorkbenchText, /\u8fd0\u884c\u4f4d\u7f6e/);
  assert.match(translatedWorkbenchText, /\u6b64\u7535\u8111/);
  assert.match(translatedWorkbenchText, /\u4ed3\u5e93/);
  assert.match(translatedWorkbenchText, /\u8bbe\u7f6e\u5de5\u4f5c\u533a/);
  assert.match(translatedWorkbenchText, /\u8fde\u63a5 SSH/);
  assert.match(translatedWorkbenchText, /\u66f4\u591a\u64cd\u4f5c/);
  assert.match(translatedWorkbenchText, /\u5207\u6362\u4e3b\u4fa7\u8fb9\u680f/);
  assert.match(translatedWorkbenchText, /\u5207\u6362\u667a\u80fd\u4f53/);
  assert.match(translatedWorkbenchText, /\u540e\u9000/);
  assert.match(translatedWorkbenchText, /\u524d\u8fdb/);
  assert.match(translatedWorkbenchText, /\u5de6\u4fa7\u6807\u9898\u680f\u64cd\u4f5c/);
  assert.match(translatedWorkbenchText, /\u5bfc\u822a\u64cd\u4f5c/);
  assert.match(translatedWorkbenchText, /\u6253\u5f00\u8bbe\u7f6e\uff08UI\uff09/);
  assert.match(translatedWorkbenchText, /\u6253\u5f00\u8bbe\u7f6e\uff08JSON\uff09/);
  assert.match(translatedWorkbenchText, /\u6253\u5f00\u7528\u6237\u8bbe\u7f6e/);
  assert.match(translatedWorkbenchText, /\u6253\u5f00\u7528\u6237\u8bbe\u7f6e\uff08JSON\uff09/);
  assert.match(translatedWorkbenchText, /\u6253\u5f00\u5de5\u4f5c\u533a\u8bbe\u7f6e/);
  assert.match(translatedWorkbenchText, /\u6253\u5f00\u5de5\u4f5c\u533a\u8bbe\u7f6e\uff08JSON\uff09/);
  assert.match(translatedWorkbenchText, /\u6253\u5f00\u5e94\u7528\u8bbe\u7f6e\uff08JSON\uff09/);
  assert.match(translatedWorkbenchText, /\u6253\u5f00\u6587\u4ef6\u5939\u8bbe\u7f6e/);
  assert.match(translatedWorkbenchText, /\u6253\u5f00\u6587\u4ef6\u5939\u8bbe\u7f6e\uff08JSON\uff09/);
  assert.match(translatedWorkbenchText, /\u663e\u793a\u8bbe\u7f6e/);
  assert.match(translatedWorkbenchText, /\u805a\u7126\u8bbe\u7f6e\u641c\u7d22/);
  assert.match(translatedWorkbenchText, /\u805a\u7126\u8bbe\u7f6e\u76ee\u5f55/);
  assert.match(translatedWorkbenchText, /\u6e05\u9664\u8bbe\u7f6e\u641c\u7d22\u7ed3\u679c/);
  assert.match(translatedWorkbenchText, /\u8bbe\u7f6e\u540c\u6b65/);
  assert.match(translatedWorkbenchText, /\u667a\u80fd\u4f53\u5ba1\u67e5/);
  assert.match(translatedWorkbenchText, /\u667a\u80fd\u4f53\u5ba1\u67e5\u8bbe\u7f6e/);
  assert.match(translatedWorkbenchText, /\u5f00\u59cb\u667a\u80fd\u4f53\u5ba1\u67e5/);
  assert.match(translatedWorkbenchText, /显示面板/);
  assert.match(translatedWorkbenchText, /子智能体/);
  assert.match(translatedWorkbenchText, /显示全部（还有 <!> 项）/);
  assert.match(translatedWorkbenchText, /收起/);
  assert.match(translatedWorkbenchText, /色相/);
  assert.match(translatedWorkbenchText, /选择强调色/);
  assert.match(translatedWorkbenchText, /强度/);
  assert.match(translatedWorkbenchText, /控制强调色应用强度/);
  assert.match(translatedWorkbenchText, /恢复默认字体大小/);
  assert.match(translatedWorkbenchText, /减小字体大小/);
  assert.match(translatedWorkbenchText, /增大字体大小/);
  assert.match(translatedWorkbenchText, /MCP 服务器/);
  assert.match(translatedWorkbenchText, /浏览器自动化/);
  assert.match(translatedWorkbenchText, /浏览器自动化已关闭/);
  assert.match(translatedWorkbenchText, /添加自定义 MCP/);
  assert.match(translatedWorkbenchText, /已在控制台中配置/);
  assert.match(translatedWorkbenchText, /配置团队 MCP 服务器/);
  assert.match(translatedWorkbenchText, /必需域名/);
  assert.match(translatedWorkbenchText, /复制域名/);
  assert.match(translatedWorkbenchText, /扩展 RPC 跟踪器/);
  assert.match(translatedWorkbenchText, /\u5de5\u5177\u8c03\u7528\u5bc6\u5ea6/);
  assert.match(
    translatedWorkbenchText,
    /\u8c03\u6574\u5de5\u5177\u8c03\u7528\u663e\u793a\u7684\u7ec6\u8282\u7a0b\u5ea6/
  );
  assert.ok(translatedWorkbenchText.includes('\u4f7f\u7528 $1 \u53d1\u9001'));
  assert.ok(
    translatedWorkbenchText.includes(
      '\u542f\u7528\u540e\uff0c$1 \u53d1\u9001\u5bf9\u8bdd\uff0cEnter \u63d2\u5165\u6362\u884c'
    )
  );
  assert.match(translatedWorkbenchText, /\u6d88\u606f\u6392\u961f/);
  assert.match(
    translatedWorkbenchText,
    /\u8c03\u6574 Agent \u8fd0\u884c\u65f6\u53d1\u9001\u6d88\u606f\u7684\u9ed8\u8ba4\u884c\u4e3a/
  );
  assert.match(translatedWorkbenchText, /\u5728\u5f53\u524d\u6d88\u606f\u540e\u53d1\u9001/);
  assert.match(translatedWorkbenchText, /Agent \u81ea\u52a8\u8865\u5168/);
  assert.match(
    translatedWorkbenchText,
    /\u5728\u63d0\u793a Agent \u65f6\u63d0\u4f9b\u4e0a\u4e0b\u6587\u5efa\u8bae/
  );
  assert.match(translatedWorkbenchText, /\u63d0\u793a/);
  assert.match(
    translatedWorkbenchText,
    /\u5728\u7a7a\u767d\u754c\u9762\u8f6e\u6362\u663e\u793a\u63d0\u793a/
  );
  assert.match(translatedWorkbenchText, /\u81ea\u52a8\u6279\u51c6\u6a21\u5f0f\u5207\u6362/);
  assert.match(
    translatedWorkbenchText,
    /\u5141\u8bb8 Agent \u65e0\u9700\u4e8b\u5148\u8be2\u95ee\u5373\u53ef\u5207\u6362\u6a21\u5f0f\uff0c\u4f8b\u5982\u4ece Agent \u5207\u6362\u5230 Plan \u6216\u4ece Agent \u5207\u6362\u5230 Debug\u3002\u5173\u95ed\u540e\uff0cCursor \u4f1a\u5728\u5207\u6362\u524d\u8be2\u95ee\u3002/
  );
  assert.match(translatedWorkbenchText, /Explore \u5b50\u667a\u80fd\u4f53\u6a21\u578b/);
  assert.match(
    translatedWorkbenchText,
    /Explore \u5b50\u667a\u80fd\u4f53\u7528\u4e8e\u4e3a\u4e3b\u667a\u80fd\u4f53\u6267\u884c\u521d\u6b65\u7814\u7a76/
  );
  assert.match(translatedWorkbenchText, /\u81ea\u52a8\u63a5\u53d7\u7f51\u9875\u641c\u7d22/);
  assert.match(
    translatedWorkbenchText,
    /\u8df3\u8fc7\u6279\u51c6\u5bf9\u8bdd\u6846\uff1bAgent \u53ef\u81ea\u52a8\u6267\u884c\u7f51\u9875\u641c\u7d22/
  );
  assert.match(translatedWorkbenchText, /\u5ffd\u7565\u7684\u6587\u4ef6/);
  assert.match(
    translatedWorkbenchText,
    /\u7528\u4e8e\u6307\u5b9a Cursor Tab \u4e0d\u63d0\u4f9b\u5efa\u8bae\u7684\u6587\u4ef6\u5339\u914d\u6a21\u5f0f/
  );
  assert.match(
    translatedWorkbenchText,
    /\u5df2\u8fde\u63a5\u5230\u6d4f\u89c8\u5668\u6807\u7b7e\u9875/
  );
  assert.match(
    translatedWorkbenchText,
    /\u5728\u6d4f\u89c8\u5668\u4e2d\u6253\u5f00\u7f51\u9875\u94fe\u63a5/
  );
  assert.match(
    translatedWorkbenchText,
    /\u81ea\u52a8\u5728\u6d4f\u89c8\u5668\u6807\u7b7e\u9875\u4e2d\u6253\u5f00 http \u548c https \u94fe\u63a5/
  );
  assert.match(
    translatedWorkbenchText,
    /\u6b64\u5de5\u4f5c\u533a\u4e2d\u53ef\u7528\u7684\u670d\u52a1\u5668\u3002/
  );
  assert.ok(translatedWorkbenchText.includes('\u5df2\u914d\u7f6e Hook\uff08$1\uff09'));
  assert.match(
    translatedWorkbenchText,
    /Hooks \u5141\u8bb8\u4f60\u5728\u667a\u80fd\u4f53\u6267\u884c\u8fc7\u7a0b\u4e2d\u7684\u7279\u5b9a\u65f6\u673a\u8fd0\u884c\u81ea\u5b9a\u4e49\u811a\u672c\uff0c\u4ee5\u4fee\u6539\u884c\u4e3a\u3001\u5f3a\u5236\u6267\u884c\u7b56\u7565\u6216\u6dfb\u52a0\u81ea\u5b9a\u4e49\u65e5\u5fd7\u3002/
  );
  assert.match(translatedWorkbenchText, /\u6267\u884c\u65e5\u5fd7/);
  assert.match(translatedWorkbenchText, /\u6e05\u7a7a\u65e5\u5fd7/);
  assert.match(translatedWorkbenchText, /\u6682\u65e0 Hook \u6267\u884c\u8bb0\u5f55/);
  assert.match(translatedWorkbenchText, /\u7d22\u5f15\u65b0\u6587\u4ef6\u5939/);
  assert.match(translatedWorkbenchText, /\u81ea\u52a8\u7d22\u5f15\u5c11\u4e8e/);
  assert.match(translatedWorkbenchText, /\u4e2a\u6587\u4ef6\u7684\u65b0\u6587\u4ef6\u5939/);
  assert.match(
    translatedWorkbenchText,
    /\u4e3a Instant Grep \u7d22\u5f15\u4ed3\u5e93/
  );
  assert.match(
    translatedWorkbenchText,
    /\u81ea\u52a8\u7d22\u5f15\u4ed3\u5e93\u4ee5\u52a0\u5feb Grep \u641c\u7d22\u3002\u6240\u6709\u6570\u636e\u5747\u5b58\u50a8\u5728\u672c\u5730\u3002/
  );
  assert.match(
    translatedWorkbenchText,
    /\u8fd9\u4e9b\u57df\u540d\u5fc5\u987b\u53ef\u8bbf\u95ee\uff0cCursor \u624d\u80fd\u6b63\u5e38\u8fd0\u884c\u3002\u8bf7\u5c06\u5b83\u4eec\u6dfb\u52a0\u5230\u9632\u706b\u5899\u6216\u4ee3\u7406\u7684\u5141\u8bb8\u5217\u8868\u4e2d\u3002/
  );
  assert.match(
    translatedWorkbenchText,
    /\u68c0\u67e5\u4e0e\u6240\u6709 Cursor \u670d\u52a1\u7684\u7f51\u7edc\u8fde\u63a5\u60c5\u51b5/
  );
  assert.match(
    translatedWorkbenchText,
    /\u5c06\u6269\u5c55\u5bbf\u4e3b RPC \u6d88\u606f\u8bb0\u5f55\u4e3a\u53ef\u5728 Perfetto \u4e2d\u67e5\u770b\u7684 JSON \u6587\u4ef6\u4ee5\u8fdb\u884c\u6027\u80fd\u5206\u6790\u3002\u9700\u8981\u91cd\u542f\u540e\u751f\u6548\u3002/
  );
  assert.match(translatedWorkbenchText, /\u81ea\u5b9a\u4e49/);
  assert.match(translatedWorkbenchText, /\u4ed3\u5e93/);
  assert.match(
    translatedWorkbenchText,
    /\u7f16\u8f91\u5668\u7a97\u53e3/
  );
  assert.match(translatedWorkbenchText, /\u52a8\u6548/);
  assert.match(translatedWorkbenchText, /\u51cf\u5c11\u52a8\u6548/);
  assert.match(
    translatedWorkbenchText,
    /\u5c3d\u91cf\u51cf\u5c11\u754c\u9762\u52a8\u753b\u3002\u8ddf\u968f\u7cfb\u7edf\u65f6\u4f1a\u9075\u5faa\u4f60\u7684\u64cd\u4f5c\u7cfb\u7edf\u504f\u597d\u3002/
  );
  assert.match(
    translatedWorkbenchText,
    /\u7f51\u9875\u6293\u53d6\u5de5\u5177/
  );
  assert.match(
    translatedWorkbenchText,
    /\u5141\u8bb8 Agent \u4ece URL \u6293\u53d6\u5185\u5bb9/
  );
  assert.match(
    translatedWorkbenchText,
    /\u5206\u5c42 Cursor Ignore/
  );
  assert.match(
    translatedWorkbenchText,
    /\u5c06 \.cursorignore \u6587\u4ef6\u5e94\u7528\u5230\u6240\u6709\u5b50\u76ee\u5f55\u3002\u66f4\u6539\u6b64\u8bbe\u7f6e\u9700\u8981\u91cd\u542f Cursor\u3002/
  );
  assert.match(
    translatedWorkbenchText,
    /\u8bf7\u8c28\u614e\u4f7f\u7528\u3002\u5728 \.cursorignore \u6587\u4ef6\u53d1\u73b0\u8fc7\u7a0b\u4e2d\u8df3\u8fc7\u7b26\u53f7\u94fe\u63a5\u3002/
  );
  assert.match(
    translatedWorkbenchText,
    /\u547d\u4ee4\u3001MCP \u7b49\u7684\u5ba1\u6279\u4e0e\u6267\u884c/
  );
  assert.match(translatedWorkbenchText, /\u8fd0\u884c\u6a21\u5f0f/);
  assert.match(
    translatedWorkbenchText,
    /\u9009\u62e9 Agent \u5982\u4f55\u8fd0\u884c\u547d\u4ee4\u6267\u884c\u3001MCP \u548c\u6587\u4ef6\u5199\u5165\u7b49\u5de5\u5177\u3002/
  );
  assert.match(
    translatedWorkbenchText,
    /\u8bb8\u591a\u547d\u4ee4\u4f1a\u5728\u6c99\u7bb1\u5185\u81ea\u52a8\u8fd0\u884c\uff0c\u4f60\u4e5f\u53ef\u4ee5\u5c06\u5176\u4ed6\u64cd\u4f5c\u52a0\u5165\u5141\u8bb8\u5217\u8868\u3002/
  );
  assert.match(
    translatedWorkbenchText,
    /\u5141\u8bb8\u5217\u8868\uff08\u542b\u6c99\u7bb1\uff09/
  );
  assert.match(
    translatedWorkbenchText,
    /\u81ea\u52a8\u8fd0\u884c\u7f51\u7edc\u8bbf\u95ee/
  );
  assert.match(
    translatedWorkbenchText,
    /\u63a7\u5236\u547d\u4ee4\u5728\u6c99\u7bb1\u4e2d\u8fd0\u884c\u65f6\u5141\u8bb8\u54ea\u4e9b\u7f51\u7edc\u8bf7\u6c42\u3002/
  );
  assert.match(
    translatedWorkbenchText,
    /sandbox\.json \+ \u9ed8\u8ba4\u503c/
  );
  assert.match(
    translatedWorkbenchText,
    /\u547d\u4ee4\u5141\u8bb8\u5217\u8868/
  );
  assert.match(
    translatedWorkbenchText,
    /\u53ef\u81ea\u52a8\u8fd0\u884c\u7684\u547d\u4ee4/
  );
  assert.match(
    translatedWorkbenchText,
    /\u6dfb\u52a0\u547d\u4ee4\.\.\./
  );
  assert.match(
    translatedWorkbenchText,
    /\u6dfb\u52a0\u5efa\u8bae/
  );
  assert.match(translatedWorkbenchText, /MCP \u5141\u8bb8\u5217\u8868/);
  assert.match(
    translatedWorkbenchText,
    /\u53ef\u81ea\u52a8\u8fd0\u884c\u7684 MCP \u5de5\u5177\u3002/
  );
  assert.match(
    translatedWorkbenchText,
    /\u6dfb\u52a0 MCP \u5de5\u5177\.\.\./
  );
  assert.match(
    translatedWorkbenchText,
    /\u6293\u53d6\u57df\u540d\u5141\u8bb8\u5217\u8868/
  );
  assert.match(
    translatedWorkbenchText,
    /Agent \u53ef\u81ea\u52a8\u6293\u53d6\u7684\u57df\u540d\u3002/
  );
  assert.match(translatedWorkbenchText, /\u6dfb\u52a0\u57df\u540d\.\.\./);
  assert.match(
    translatedWorkbenchText,
    /\u6d4f\u89c8\u5668\u4fdd\u62a4/
  );
  assert.match(
    translatedWorkbenchText,
    /\u9632\u6b62 Agent \u81ea\u52a8\u8fd0\u884c\u6d4f\u89c8\u5668\u5de5\u5177/
  );
  assert.match(
    translatedWorkbenchText,
    /MCP \u5de5\u5177\u4fdd\u62a4/
  );
  assert.match(
    translatedWorkbenchText,
    /\u9632\u6b62 Agent \u81ea\u52a8\u8fd0\u884c MCP \u5de5\u5177/
  );
  assert.match(
    translatedWorkbenchText,
    /\u6587\u4ef6\u5220\u9664\u4fdd\u62a4/
  );
  assert.match(
    translatedWorkbenchText,
    /\u9632\u6b62 Agent \u81ea\u52a8\u5220\u9664\u6587\u4ef6/
  );
  assert.match(
    translatedWorkbenchText,
    /\u5916\u90e8\u6587\u4ef6\u4fdd\u62a4/
  );
  assert.match(
    translatedWorkbenchText,
    /\u9632\u6b62 Agent \u81ea\u52a8\u5728\u5de5\u4f5c\u533a\u5916\u521b\u5efa\u6216\u4fee\u6539\u6587\u4ef6/
  );
  assert.match(
    translatedWorkbenchText,
    /\u884c\u5185\u7f16\u8f91\u4e0e\u7ec8\u7aef/
  );
  assert.match(
    translatedWorkbenchText,
    /\u65e7\u7248\u7ec8\u7aef\u5de5\u5177/
  );
  assert.match(
    translatedWorkbenchText,
    /\u5728 Agent \u6a21\u5f0f\u4e0b\u4f7f\u7528\u65e7\u7248\u7ec8\u7aef\u5de5\u5177\uff0c\u9002\u7528\u4e8e Shell \u914d\u7f6e\u4e0d\u53d7\u652f\u6301\u7684\u7cfb\u7edf/
  );
  assert.match(translatedWorkbenchText, /\u8bed\u97f3\u6a21\u5f0f/);
  assert.match(
    translatedWorkbenchText,
    /\u63d0\u4ea4\u5173\u952e\u8bcd/
  );
  assert.match(
    translatedWorkbenchText,
    /\u5728\u8bed\u97f3\u6a21\u5f0f\u4e0b\u89e6\u53d1\u81ea\u52a8\u63d0\u4ea4\u7684\u81ea\u5b9a\u4e49\u5173\u952e\u8bcd\u3002/
  );
  assert.match(translatedWorkbenchText, /\u7f72\u540d/);
  assert.match(translatedWorkbenchText, /\u63d0\u4ea4\u7f72\u540d/);
  assert.match(
    translatedWorkbenchText,
    /\u5c06 Agent \u63d0\u4ea4\u6807\u8bb0\u4e3a 'Made with Cursor'/
  );
  assert.match(translatedWorkbenchText, /PR \u7f72\u540d/);
  assert.match(
    translatedWorkbenchText,
    /\u5c06\u62c9\u53d6\u8bf7\u6c42\u6807\u8bb0\u4e3a\u7531 Cursor \u521b\u5efa/
  );
  assert.match(
    translatedWorkbenchText,
    /\u5206\u652f\u524d\u7f00/
  );
  assert.match(
    translatedWorkbenchText,
    /Agent \u521b\u5efa\u65b0\u5206\u652f\u65f6\u4f7f\u7528\u7684\u524d\u7f00/
  );
  assert.match(
    translatedWorkbenchText,
    /\u501f\u52a9\u59cb\u7ec8\u5728\u7ebf\u7684\u4e91\u7aef\u667a\u80fd\u4f53\u81ea\u52a8\u6267\u884c\u91cd\u590d\u4efb\u52a1\uff0c\u5e76\u54cd\u5e94\u73af\u5883\u89e6\u53d1\u5668\u3002/
  );
  assert.match(translatedWorkbenchText, /\u81ea\u52a8\u5316\u603b\u6570/);
  assert.match(translatedWorkbenchText, /\u6210\u529f \u00b7 7\u5929/);
  assert.match(translatedWorkbenchText, /\u5931\u8d25 \u00b7 7\u5929/);
  assert.match(translatedWorkbenchText, /\u8fd0\u884c\u5386\u53f2/);
  assert.match(translatedWorkbenchText, /\u6211\u7684/);
  assert.match(translatedWorkbenchText, /\u65b0\u5efa\u81ea\u52a8\u5316/);
  assert.match(translatedWorkbenchText, /\u6682\u65e0\u81ea\u52a8\u5316/);
  assert.match(
    translatedWorkbenchText,
    /\u6309\u8ba1\u5212\u8fd0\u884c\u667a\u80fd\u4f53\uff0c\u6216\u5728\u4e8b\u4ef6\u89e6\u53d1\u65f6\u81ea\u52a8\u8fd0\u884c\u3002\u6309\u5957\u9910\u6807\u51c6\u8ba1\u8d39\u3002/
  );
  assert.match(translatedWorkbenchText, /\u70ed\u95e8/);
  assert.match(translatedWorkbenchText, /\u4ee3\u7801\u5ba1\u67e5/);
  assert.match(translatedWorkbenchText, /\u5b89\u5168/);
  assert.match(translatedWorkbenchText, /\u4e8b\u4ef6\u4e0e\u5206\u8bca/);
  assert.match(translatedWorkbenchText, /\u6570\u636e\u4e0e\u7814\u7a76/);
  assert.match(translatedWorkbenchText, /\u67e5\u627e\u4e25\u91cd\u7f3a\u9677/);
  assert.match(
    translatedWorkbenchText,
    /\u5206\u6790\u6700\u8fd1\u63d0\u4ea4\u4e2d\u7684\u9ad8\u4e25\u91cd\u6027\u6b63\u786e\u6027\u7f3a\u9677\uff0c\u5e76\u63d0\u4ea4\u5b89\u5168\u4fee\u590d\u65b9\u6848/
  );
  assert.match(translatedWorkbenchText, /\u6bcf\u65e5\u6c47\u603b\u53d8\u66f4/);
  assert.match(
    translatedWorkbenchText,
    /\u5728 Slack \u4e2d\u53d1\u5e03\u6bcf\u65e5\u6458\u8981\uff0c\u603b\u7ed3\u524d\u4e00\u5929\u4ed3\u5e93\u7684\u91cd\u8981\u53d8\u66f4\u4e0e\u98ce\u9669/
  );
  assert.match(translatedWorkbenchText, /\u5de5\u4f5c\u6811/);
  assert.match(translatedWorkbenchText, /\u6e05\u7406/);
  assert.match(
    translatedWorkbenchText,
    /Cursor \u4f1a\u5b9a\u671f\u79fb\u9664\u65e7\u5de5\u4f5c\u6811\u4ee5\u91ca\u653e\u78c1\u76d8\u7a7a\u95f4\u3002\u53ef\u8c03\u6574\u6e05\u7406\u7684\u79ef\u6781\u7a0b\u5ea6\u3002/
  );
  assert.match(translatedWorkbenchText, /\u6700\u5927\u5de5\u4f5c\u6811\u6570\u91cf/);
  assert.match(
    translatedWorkbenchText,
    /\u8de8\u6240\u6709\u5de5\u4f5c\u533a\u4fdd\u7559\u7684 Cursor \u6258\u7ba1\u5de5\u4f5c\u6811\u6700\u5927\u6570\u91cf\u3002\u8f83\u65e7\u7684\u5de5\u4f5c\u6811\u4f1a\u4f18\u5148\u79fb\u9664\u3002/
  );
  assert.match(translatedWorkbenchText, /\u6700\u5927\u603b\u5927\u5c0f\uff08GB\uff09/);
  assert.match(
    translatedWorkbenchText,
    /\u6240\u6709 Cursor \u6258\u7ba1\u5de5\u4f5c\u6811\u7684\u603b\u5927\u5c0f\u4e0a\u9650\uff08GB\uff09\u3002\u8bbe\u4e3a 0 \u53ef\u7981\u7528\u5927\u5c0f\u9650\u5236\u3002/
  );
  assert.match(translatedWorkbenchText, /Cursor \u6258\u7ba1\u7684\u5de5\u4f5c\u6811/);
  assert.match(
    translatedWorkbenchText,
    /\u6b64\u673a\u5668\u4e0a\u6682\u65e0 Cursor \u6258\u7ba1\u7684\u5de5\u4f5c\u6811\u3002/
  );
  assert.match(
    translatedWorkbenchText,
    /__cursorZhMarketplaceLazyTranslatePlugin/
  );
  assert.ok(fs.existsSync(translatedMainPath));
  assert.ok(fs.existsSync(generatedMainPath));
  assert.ok(fs.existsSync(generatedNlsMessagesPath));
  assert.ok(fs.existsSync(generatedWorkbenchPath));
  assert.match(translatorBootstrapText, /MAIN_TRANSLATED_FILENAME/);
  assert.doesNotMatch(translatorBootstrapText, /TRANSLATE_SCHEME/);
  assert.doesNotMatch(translatorBootstrapText, /registerSchemesAsPrivileged/);
  assert.doesNotMatch(translatorBootstrapText, /REMOTE_TRANSLATE_ENDPOINT/);
  assert.doesNotMatch(translatorBootstrapText, /ensureTranslatePayload/);
  assert.match(translatorBootstrapText, /require\(MAIN_ENTRY\);/);
  assert.doesNotMatch(translatorBootstrapText, /await import\(MAIN_ENTRY\);/);
  assert.ok(fs.existsSync(cursorWinOverlayPath));
  assert.ok(fs.existsSync(cursorWinDynamicPath));
  const cursorWinDynamicRules = JSON.parse(fs.readFileSync(cursorWinDynamicPath, 'utf8'));
  assert.ok(
    cursorWinDynamicRules.some(
      (rule) =>
        rule.originalText === 'Use /canvas to get interactive visualizations like dashboards from Cursor' &&
        rule.changeText === '\u4f7f\u7528 /canvas \u4ece Cursor \u83b7\u53d6\u4eea\u8868\u76d8\u7b49\u4ea4\u4e92\u5f0f\u53ef\u89c6\u5316' &&
        rule.searchType === 'normalizedExact' &&
        Array.isArray(rule.scopeSelectors) &&
        rule.scopeSelectors.includes('[class*="empty-state-rotating-tips"]')
    )
  );
  assert.ok(
    cursorWinDynamicRules.some(
      (rule) =>
        rule.originalText === 'Use /shell to run commands in the terminal' &&
        rule.changeText === '\u4f7f\u7528 /shell \u5728\u7ec8\u7aef\u4e2d\u8fd0\u884c\u547d\u4ee4' &&
        rule.searchType === 'normalizedExact' &&
        Array.isArray(rule.scopeSelectors) &&
        rule.scopeSelectors.includes('[class*="empty-state-rotating-tips"]')
    )
  );
  assert.ok(
    cursorWinDynamicRules.some(
      (rule) =>
        rule.originalText === 'Voice mode lets you dictate better prompts. Click or hold ctrl+M to enable' &&
        rule.changeText === '\u8bed\u97f3\u6a21\u5f0f\u53ef\u5e2e\u52a9\u4f60\u53e3\u8ff0\u51fa\u66f4\u597d\u7684\u63d0\u793a\u8bcd\u3002\u70b9\u51fb\u6216\u6309\u4f4f ctrl+M \u542f\u7528\u3002' &&
        rule.searchType === 'normalizedExact' &&
        Array.isArray(rule.scopeSelectors) &&
        rule.scopeSelectors.includes('[class*="empty-state-rotating-tips"]')
    )
  );
  assert.ok(
    cursorWinDynamicRules.some(
      (rule) =>
        rule.originalText ===
          'Cursor can respond with interactive visualizations alongside text. Use /canvas to get started' &&
        rule.changeText ===
          'Cursor \u53ef\u4ee5\u5728\u6587\u672c\u65c1\u751f\u6210\u4ea4\u4e92\u5f0f\u53ef\u89c6\u5316\u3002\u4f7f\u7528 /canvas \u5f00\u59cb\u3002' &&
        rule.searchType === 'normalizedExact' &&
        Array.isArray(rule.scopeSelectors) &&
        rule.scopeSelectors.includes('[class*="empty-state-rotating-tips"]')
    )
  );
  assert.ok(
    cursorWinDynamicRules.some(
      (rule) =>
        rule.originalText ===
          '^(?:Use /model to pick the best model for your task\\.\\s*)?Composer offers a great balance (?:of intelligence and cost|for cost vs\\. capability)\\.(?:\\s*Try it out from the model picker)?$' &&
        rule.changeText ===
          '\u4f7f\u7528 /model \u4e3a\u4f60\u7684\u4efb\u52a1\u9009\u62e9\u6700\u5408\u9002\u7684\u6a21\u578b\u3002Composer \u5728\u667a\u80fd\u4e0e\u6210\u672c\u4e4b\u95f4\u53d6\u5f97\u4e86\u5f88\u597d\u7684\u5e73\u8861\u3002\u53ef\u5728\u6a21\u578b\u9009\u62e9\u5668\u4e2d\u8bd5\u7528\u3002' &&
        rule.searchType === 'regex' &&
        rule.flags === 'i' &&
        Array.isArray(rule.scopeSelectors) &&
        rule.scopeSelectors.includes('[class*="empty-state-rotating-tips"]') &&
        Array.isArray(rule.coverageHints) &&
        rule.coverageHints.includes('Use /model to pick the best model for your task. Composer offers a great balance for cost vs. capability') &&
        rule.coverageHints.includes('Composer offers a great balance of intelligence and cost. Try it out from the model picker')
    )
  );
  assert.ok(
    cursorWinDynamicRules.some(
      (rule) =>
        rule.originalText === 'Ask mode uses read-only agents to research your codebase. Use shift+tab to enable' &&
        rule.changeText === 'Ask \u6a21\u5f0f\u4f1a\u4f7f\u7528\u53ea\u8bfb\u667a\u80fd\u4f53\u7814\u7a76\u4f60\u7684\u4ee3\u7801\u5e93\u3002\u4f7f\u7528 shift+tab \u542f\u7528\u3002' &&
        rule.searchType === 'normalizedExact' &&
        Array.isArray(rule.scopeSelectors) &&
        rule.scopeSelectors.includes('[class*="empty-state-rotating-tips"]')
    )
  );
  assert.ok(
    cursorWinDynamicRules.some(
      (rule) =>
        rule.originalText ===
          'Use /loop to run a prompt on a schedule or keep a local agent running continuously' &&
        rule.changeText ===
          '\u4f7f\u7528 /loop \u6309\u65f6\u8c03\u5ea6 Prompt\uff0c\u6216\u8ba9\u672c\u5730 Agent \u6301\u7eed\u8fd0\u884c\u3002' &&
        rule.searchType === 'normalizedExact' &&
        Array.isArray(rule.scopeSelectors) &&
        rule.scopeSelectors.includes('[class*="empty-state-rotating-tips"]')
    )
  );
  assert.ok(
    cursorWinDynamicRules.some(
      (rule) =>
        rule.originalText ===
          '^(?:Plugins help you customize Cursor for your workflows\\.\\s*)?Use /add-plugin (?:to get started|to install a plugin from the Cursor Marketplace)$' &&
        rule.changeText ===
          '\u4f7f\u7528 /add-plugin \u4ece Cursor Marketplace \u5b89\u88c5\u63d2\u4ef6\u3002' &&
        rule.searchType === 'regex' &&
        rule.flags === 'i' &&
        Array.isArray(rule.scopeSelectors) &&
        rule.scopeSelectors.includes('[class*="empty-state-rotating-tips"]') &&
        Array.isArray(rule.coverageHints) &&
        rule.coverageHints.includes('Plugins help you customize Cursor for your workflows. Use /add-plugin to get started') &&
        rule.coverageHints.includes('Use /add-plugin to install a plugin from the Cursor Marketplace')
    )
  );
  assert.ok(
    cursorWinDynamicRules.some(
      (rule) =>
        rule.originalText ===
          'Use cloud agents for better parallelization and durable execution. Go to cursor.com/agents' &&
        rule.changeText ===
          '\u4f7f\u7528\u4e91\u7aef Agent \u53ef\u83b7\u5f97\u66f4\u597d\u7684\u5e76\u884c\u5316\u4e0e\u6301\u4e45\u6267\u884c\u80fd\u529b\u3002\u524d\u5f80 cursor.com/agents\u3002' &&
        rule.searchType === 'normalizedExact' &&
        Array.isArray(rule.scopeSelectors) &&
        rule.scopeSelectors.includes('[class*="empty-state-rotating-tips"]')
    )
  );
  assert.equal(JSON.parse(fs.readFileSync(argvPath, 'utf8')).locale, 'zh-cn');
  assert.equal(JSON.parse(fs.readFileSync(localeMirrorPath, 'utf8')).locale, 'zh-cn');
  assert.equal(
    JSON.parse(fs.readFileSync(extensionTranslationPath, 'utf8')).displayName,
    'Cursor 本地优先'
  );
  assert.deepEqual(buildManifest.productTipsCoverage, {
    totalTipCount: 54,
    mappedTipCount: 54,
    missingTips: [],
  });
  assert.equal(buildManifest.staticPatchContracts.search_models.matchCount, 1);
  assert.equal(buildManifest.staticPatchContracts.send_follow_up.matchCount, 1);
  assert.equal(
    buildManifest.staticPatchContracts.product_tips_render_hook.matchCount,
    1
  );
  assert.deepEqual(buildManifest.staticPatchContractEvaluation, {
    issues: [],
    warnings: [],
  });
  assert.equal(buildManifest.runtimeStrategy.mode, 'performance');
  assert.ok(installedRuntimeArtifact.runtimeStrategy.runtimeMappingCount > 0);
  assert.equal(
    buildManifest.runtimeStrategy.runtimeMappingCount,
    installedRuntimeArtifact.runtimeStrategy.runtimeMappingCount
  );
  assert.equal(
    buildManifest.runtimeStrategy.runtimeHeaderChars,
    installedRuntimeArtifact.runtimeStrategy.runtimeHeaderChars
  );
  assert.equal(
    buildManifest.runtimeStrategy.runtimeHeaderKB,
    installedRuntimeArtifact.runtimeStrategy.runtimeHeaderKB
  );
  assert.equal(
    buildManifest.mappingCounts.runtime,
    installedRuntimeArtifact.runtimeStrategy.runtimeMappingCount
  );
  assert.deepEqual(buildManifest.runtimeStrategy.rescanDelaysMs, []);
  assert.ok(buildManifest.mappingCounts.runtime < buildManifest.mappingCounts.merged);
  assert.equal(
    buildManifest.mappingCounts.prunedForRuntime,
    buildManifest.mappingCounts.merged -
      installedRuntimeArtifact.runtimeStrategy.runtimeMappingCount
  );
  const dynamicMappingPath = path.join(
    fixture.workspaceRoot,
    'translations',
    'overlay',
    'cursor-win.dynamic.json'
  );
  const mutatedManifest = {
    ...buildManifest,
    runtimeStrategy: {
      ...buildManifest.runtimeStrategy,
      mode: 'compatibility',
      runtimeMappingCount: 1,
      runtimeHeaderChars: 1,
      runtimeHeaderKB: 0,
    },
  };
  writeJson(dynamicMappingPath, []);
  writeJson(buildManifestPath, mutatedManifest);
  const verifyAfterWorkspaceDrift = runTool('verify', fixture);
  assert.equal(
    verifyAfterWorkspaceDrift.status,
    0,
    verifyAfterWorkspaceDrift.stderr || verifyAfterWorkspaceDrift.stdout
  );
  assert.match(
    verifyAfterWorkspaceDrift.stdout,
    new RegExp(`Runtime mapping count: ${installedRuntimeArtifact.runtimeStrategy.runtimeMappingCount}`)
  );
  assert.match(
    verifyAfterWorkspaceDrift.stdout,
    new RegExp(`Runtime header chars: ${installedRuntimeArtifact.runtimeStrategy.runtimeHeaderChars}`)
  );
  assert.match(
    verifyAfterWorkspaceDrift.stdout,
    new RegExp(`Runtime header KB: ${installedRuntimeArtifact.runtimeStrategy.runtimeHeaderKB}`)
  );
  assert.match(verifyAfterWorkspaceDrift.stdout, /performance/);
  assert.doesNotMatch(verifyAfterWorkspaceDrift.stdout, /^Runtime mapping count: 1$/m);
  assert.doesNotMatch(verifyAfterWorkspaceDrift.stdout, /^Runtime header chars: 1$/m);
  assert.doesNotMatch(verifyAfterWorkspaceDrift.stdout, /^Runtime header KB: 0$/m);
  assert.equal(fs.readFileSync(startLauncherPath, 'utf8').trim(), path.join(fixture.installDir, 'Cursor.exe'));
  assert.match(applyResult.stdout, /Product tips total: 54/);
  assert.match(applyResult.stdout, /Product tips mapped: 54/);
  assert.match(applyResult.stdout, /Product tips missing: 0/);
  assert.match(applyResult.stdout, /\[Static Patch Contracts\]/);
  assert.match(applyResult.stdout, /search_models/);
  assert.match(applyResult.stdout, /send_follow_up/);
  assert.match(applyResult.stdout, /product_tips_render_hook/);
  assert.match(applyResult.stdout, /Runtime mapping count: \d+/);
  assert.match(applyResult.stdout, /Runtime header KB: \d+(\.\d+)?/);
  assert.match(applyResult.stdout, /Pruned from runtime: \d+/);
  assert.match(applyResult.stdout, /Cursor Win 动态规则条目/);
  assert.match(applyResult.stdout, /运行模式：performance/);
  assert.match(verifyResult.stdout, /\[Cursor Win 覆盖\]/);
  assert.match(verifyResult.stdout, /\[动态规则覆盖\]/);
  assert.match(verifyResult.stdout, /\[运行时策略\]/);
  assert.match(verifyResult.stdout, /\[Static Patch Contracts\]/);
  assert.match(verifyResult.stdout, /\[Product Tips Coverage\]/);
  assert.match(verifyResult.stdout, /Total tips: 54/);
  assert.match(verifyResult.stdout, /Missing tips: 0/);
  assert.match(verifyResult.stdout, /Runtime mapping count: \d+/);
  assert.match(verifyResult.stdout, /Runtime header KB: \d+(\.\d+)?/);
  assert.match(verifyResult.stdout, /Pruned from runtime: \d+/);
  assert.match(verifyResult.stdout, /translated nls 消息文件已生成。/);
  assert.match(verifyResult.stdout, /Marketplace 远端描述翻译: 关闭/);
  assert.match(translatedWorkbenchText, /"rescanDelaysMs":\[\]/);
  assert.match(translatedWorkbenchText, /"observeDiscoveryAttributes":false/);
  assert.match(translatedWorkbenchText, /"shortExactTextFallback":false/);
  assert.match(translatedWorkbenchText, /__cursorZhTranslateProductTipText/);
  assert.doesNotMatch(translatedWorkbenchText, /\[class\*="agent"\]/);
  assert.doesNotMatch(translatedWorkbenchText, /\[class\*="rule"\]/);
  assert.doesNotMatch(
    translatedWorkbenchText,
    /"observeScopeSelectors":\[[^\]]*empty-state-rotating-tips/
  );
  assert.doesNotMatch(translatedWorkbenchText, /runShortExactTextFallback\(documentRoot\)/);
  assert.doesNotMatch(translatedWorkbenchText, /runShortExactTextFallback\(node\)/);
  assert.doesNotMatch(translatedWorkbenchText, /data-cursor-zh-origins/);
  assert.doesNotMatch(translatedWorkbenchText, /restoreOriginalText/);
  assert.doesNotMatch(translatedWorkbenchText, /retranslateAll/);
  assert.doesNotMatch(translatedWorkbenchText, /_startTogglePolling/);
  assert.doesNotMatch(translatedWorkbenchText, /toggleSignalPath/);
  assert.doesNotMatch(translatedWorkbenchText, /__cursorZhEnabled/);
  assert.match(
    translatedWorkbenchText,
    /attributes: Boolean\(translationMetadata\.runtimeConfig\.observeDiscoveryAttributes\)/
  );
});

test('apply skips install when a required static patch target is absent from the workbench bundle', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-tool-contracts-'));
  const fixture = createFixture(tempRoot);
  const packageJsonPath = path.join(fixture.installDir, 'resources', 'app', 'package.json');
  const translatorBootstrapPath = path.join(
    fixture.installDir,
    'resources',
    'app',
    'out',
    'cursorTranslatorMain.js'
  );
  const workbenchOriginalPath = path.join(
    fixture.installDir,
    'resources',
    'app',
    'out',
    'vs',
    'workbench',
    'workbench.desktop.main.js'
  );
  const workbenchSource = fs.readFileSync(workbenchOriginalPath, 'utf8');

  writeText(
    workbenchOriginalPath,
    workbenchSource.replace("'Search models',", "'Search models renamed',")
  );

  const applyResult = runTool('apply', fixture);
  const combinedOutput = `${applyResult.stdout}\n${applyResult.stderr}`;

  assert.equal(applyResult.status, 0, combinedOutput);
  assert.match(combinedOutput, /已完成应用/);
  assert.equal(JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')).main, './out/cursorTranslatorMain.js');
  assert.equal(fs.existsSync(translatorBootstrapPath), true);
});

test('apply supports explicit compatibility runtime mode and reports it', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-tool-compatibility-'));
  const fixture = createFixture(tempRoot);

  const applyResult = runTool('apply', fixture, {}, ['--runtime-mode', 'compatibility']);
  assert.equal(applyResult.status, 0, applyResult.stderr || applyResult.stdout);

  const verifyResult = runTool('verify', fixture);
  assert.equal(verifyResult.status, 0, verifyResult.stderr || verifyResult.stdout);

  const buildManifestPath = path.join(fixture.workspaceRoot, 'state', 'build-manifest.json');
  const translatedWorkbenchPath = path.join(
    fixture.installDir,
    'resources',
    'app',
    'out',
    'vs',
    'workbench',
    'workbench.desktop.main_translated.js'
  );
  const buildManifest = JSON.parse(fs.readFileSync(buildManifestPath, 'utf8'));
  const translatedWorkbenchText = fs.readFileSync(translatedWorkbenchPath, 'utf8');
  const installedRuntimeArtifact = extractInstalledRuntimeArtifact(translatedWorkbenchText);

  assert.equal(buildManifest.runtimeStrategy.mode, 'compatibility');
  assert.deepEqual(buildManifest.runtimeStrategy.rescanDelaysMs, [300, 1500]);
  assert.ok(installedRuntimeArtifact.runtimeStrategy.runtimeMappingCount > 0);
  assert.equal(
    buildManifest.runtimeStrategy.runtimeMappingCount,
    installedRuntimeArtifact.runtimeStrategy.runtimeMappingCount
  );
  assert.equal(
    buildManifest.runtimeStrategy.runtimeHeaderChars,
    installedRuntimeArtifact.runtimeStrategy.runtimeHeaderChars
  );
  assert.equal(
    buildManifest.runtimeStrategy.runtimeHeaderKB,
    installedRuntimeArtifact.runtimeStrategy.runtimeHeaderKB
  );
  assert.equal(
    buildManifest.mappingCounts.runtime,
    installedRuntimeArtifact.runtimeStrategy.runtimeMappingCount
  );
  assert.equal(
    buildManifest.mappingCounts.prunedForRuntime,
    buildManifest.mappingCounts.merged -
      installedRuntimeArtifact.runtimeStrategy.runtimeMappingCount
  );
  const dynamicMappingPath = path.join(
    fixture.workspaceRoot,
    'translations',
    'overlay',
    'cursor-win.dynamic.json'
  );
  writeJson(dynamicMappingPath, []);
  writeJson(buildManifestPath, {
    ...buildManifest,
    runtimeStrategy: {
      ...buildManifest.runtimeStrategy,
      mode: 'performance',
      runtimeMappingCount: 2,
      runtimeHeaderChars: 2,
      runtimeHeaderKB: 0,
    },
  });
  const verifyAfterWorkspaceDrift = runTool('verify', fixture);
  assert.equal(
    verifyAfterWorkspaceDrift.status,
    0,
    verifyAfterWorkspaceDrift.stderr || verifyAfterWorkspaceDrift.stdout
  );
  assert.match(
    verifyAfterWorkspaceDrift.stdout,
    new RegExp(`Runtime mapping count: ${installedRuntimeArtifact.runtimeStrategy.runtimeMappingCount}`)
  );
  assert.match(
    verifyAfterWorkspaceDrift.stdout,
    new RegExp(`Runtime header chars: ${installedRuntimeArtifact.runtimeStrategy.runtimeHeaderChars}`)
  );
  assert.match(
    verifyAfterWorkspaceDrift.stdout,
    new RegExp(`Runtime header KB: ${installedRuntimeArtifact.runtimeStrategy.runtimeHeaderKB}`)
  );
  assert.match(verifyAfterWorkspaceDrift.stdout, /compatibility/);
  assert.doesNotMatch(verifyAfterWorkspaceDrift.stdout, /^Runtime mapping count: 2$/m);
  assert.doesNotMatch(verifyAfterWorkspaceDrift.stdout, /^Runtime header chars: 2$/m);
  assert.doesNotMatch(verifyAfterWorkspaceDrift.stdout, /^Runtime header KB: 0$/m);
  assert.match(applyResult.stdout, /Runtime mapping count: \d+/);
  assert.match(applyResult.stdout, /Runtime header KB: \d+(\.\d+)?/);
  assert.match(applyResult.stdout, /compatibility/);
  assert.match(verifyResult.stdout, /Runtime header KB: \d+(\.\d+)?/);
  assert.match(verifyResult.stdout, /compatibility/);
  assert.match(translatedWorkbenchText, /"mode":"compatibility"/);
  assert.match(translatedWorkbenchText, /"rescanDelaysMs":\[300,1500\]/);
});

test('runtime mode flag is rejected for non-apply commands', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-tool-runtime-mode-guard-'));
  const fixture = createFixture(tempRoot);

  const verifyResult = runTool('verify', fixture, {}, ['--runtime-mode', 'compatibility']);
  const combinedOutput = `${verifyResult.stdout}\n${verifyResult.stderr}`;

  assert.notEqual(verifyResult.status, 0);
  assert.match(combinedOutput, /--runtime-mode is only supported for the apply command/);
});

test('apply can still include runtime toggle machinery when explicitly requested for experiments', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-tool-experimental-'));
  const fixture = createFixture(tempRoot);

  const applyResult = runTool('apply', fixture, {
    CURSOR_ZH_INCLUDE_EXPERIMENTAL_RUNTIME_TOGGLE: '1',
  });
  assert.equal(applyResult.status, 0, applyResult.stderr || applyResult.stdout);

  const translatedWorkbenchPath = path.join(
    fixture.installDir,
    'resources',
    'app',
    'out',
    'vs',
    'workbench',
    'workbench.desktop.main_translated.js'
  );
  const translatedWorkbenchText = fs.readFileSync(translatedWorkbenchPath, 'utf8');

  assert.match(translatedWorkbenchText, /data-cursor-zh-origins/);
  assert.match(translatedWorkbenchText, /restoreOriginalText/);
  assert.match(translatedWorkbenchText, /retranslateAll/);
  assert.match(translatedWorkbenchText, /_startTogglePolling/);
  assert.match(translatedWorkbenchText, /toggleSignalPath/);
  assert.match(translatedWorkbenchText, /__cursorZhEnabled/);
});

test('verify warns when product tips coverage is missing maintained targets', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-product-tips-warning-'));
  const fixture = createFixture(tempRoot);

  const applyResult = runTool('apply', fixture);
  assert.equal(applyResult.status, 0, applyResult.stderr || applyResult.stdout);

  const dynamicMappingPath = path.join(
    fixture.workspaceRoot,
    'translations',
    'overlay',
    'cursor-win.dynamic.json'
  );
  const dynamicMappings = JSON.parse(fs.readFileSync(dynamicMappingPath, 'utf8'));
  assert.ok(
    dynamicMappings.some(
      (rule) =>
        rule.originalText ===
        'Ask mode uses read-only agents to research your codebase. Use shift+tab to enable'
    )
  );

  writeJson(
    dynamicMappingPath,
    dynamicMappings.filter(
      (rule) =>
        rule.originalText !==
        'Ask mode uses read-only agents to research your codebase. Use shift+tab to enable'
    )
  );

  const verifyResult = runTool('verify', fixture);
  assert.equal(verifyResult.status, 0, verifyResult.stderr || verifyResult.stdout);
  assert.match(verifyResult.stdout, /Warnings:/);
  assert.match(
    verifyResult.stdout,
    /Product tips coverage is missing maintained targets\./
  );
  assert.match(verifyResult.stdout, /\[Product Tips Coverage\]/);
  assert.match(verifyResult.stdout, /Total tips: 54/);
  assert.match(verifyResult.stdout, /Missing tips: 1/);
});

test('toggle command writes signal file and reports status', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-toggle-'));
  const workspaceRoot = path.join(tempRoot, 'workspace');
  const stateDir = path.join(workspaceRoot, 'state');

  fs.mkdirSync(workspaceRoot, { recursive: true });
  fs.mkdirSync(path.join(workspaceRoot, 'translations', 'base'), { recursive: true });
  fs.mkdirSync(path.join(workspaceRoot, 'translations', 'overlay'), { recursive: true });
  writeJson(path.join(workspaceRoot, 'translations', 'base', 'workbench.mappings.json'), []);
  writeJson(path.join(workspaceRoot, 'translations', 'overlay', 'workbench.overlay.json'), []);
  writeJson(path.join(workspaceRoot, 'translations', 'overlay', 'cursor-win.common.json'), []);
  writeJson(path.join(workspaceRoot, 'translations', 'overlay', 'cursor-win.dynamic.json'), []);

  const toolPath = path.join(__dirname, '..', 'cursor-zh-tool.js');

  const env = {
    ...process.env,
    CURSOR_ZH_ENABLE_EXPERIMENTAL_RUNTIME_TOGGLE: '1',
    CURSOR_ZH_WORKSPACE_ROOT: workspaceRoot,
  };

  const statusResult = childProcess.spawnSync(
    process.execPath,
    [toolPath, 'status', '--install-dir', path.join(tempRoot, 'cursor-install')],
    { cwd: workspaceRoot, encoding: 'utf8', env }
  );
  assert.equal(statusResult.status, 0);
  assert.match(statusResult.stdout, /当前信号状态/);

  const toggleResult = childProcess.spawnSync(
    process.execPath,
    [toolPath, 'toggle', '--install-dir', path.join(tempRoot, 'cursor-install')],
    { cwd: workspaceRoot, encoding: 'utf8', env }
  );
  assert.equal(toggleResult.status, 0);
  assert.match(toggleResult.stdout, /已发送切换信号/);

  const signalPath = path.join(stateDir, 'runtime-toggle.json');
  assert.ok(fs.existsSync(signalPath));
  const signal = JSON.parse(fs.readFileSync(signalPath, 'utf8'));
  assert.equal(signal.desiredState, 'en');
  assert.equal(signal.source, 'cli-toggle');

  const toggleBackResult = childProcess.spawnSync(
    process.execPath,
    [toolPath, 'toggle', '--install-dir', path.join(tempRoot, 'cursor-install')],
    { cwd: workspaceRoot, encoding: 'utf8', env }
  );
  assert.equal(toggleBackResult.status, 0);
  const signal2 = JSON.parse(fs.readFileSync(signalPath, 'utf8'));
  assert.equal(signal2.desiredState, 'zh');

  const disableResult = childProcess.spawnSync(
    process.execPath,
    [toolPath, 'disable', '--install-dir', path.join(tempRoot, 'cursor-install')],
    { cwd: workspaceRoot, encoding: 'utf8', env }
  );
  assert.equal(disableResult.status, 0);
  const signal3 = JSON.parse(fs.readFileSync(signalPath, 'utf8'));
  assert.equal(signal3.desiredState, 'en');

  const enableResult = childProcess.spawnSync(
    process.execPath,
    [toolPath, 'enable', '--install-dir', path.join(tempRoot, 'cursor-install')],
    { cwd: workspaceRoot, encoding: 'utf8', env }
  );
  assert.equal(enableResult.status, 0);
  const signal4 = JSON.parse(fs.readFileSync(signalPath, 'utf8'));
  assert.equal(signal4.desiredState, 'zh');
});

test('direct tool rejects legacy runtime toggle commands unless explicitly enabled', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-toggle-guard-'));
  const fixture = createFixture(tempRoot);
  const toolPath = path.join(__dirname, '..', 'cursor-zh-tool.js');

  const result = childProcess.spawnSync(
    process.execPath,
    [toolPath, 'toggle', '--install-dir', fixture.installDir],
    {
      cwd: fixture.workspaceRoot,
      env: {
        ...process.env,
        APPDATA: fixture.appDataRoot,
        CURSOR_ZH_WORKSPACE_ROOT: fixture.workspaceRoot,
        HOME: fixture.homeRoot,
        USERPROFILE: fixture.homeRoot,
      },
      encoding: 'utf8',
    }
  );

  const combinedOutput = `${result.stdout}\n${result.stderr}`;
  assert.notEqual(result.status, 0);
  assert.match(combinedOutput, /experimental/);
  assert.match(combinedOutput, /CURSOR_ZH_ENABLE_EXPERIMENTAL_RUNTIME_TOGGLE=1/);
});

test('invoke-cursor-zh only exposes official commands', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-invoke-'));
  const fixture = createFixture(tempRoot);

  const result = runInvoke('toggle', fixture);
  const combinedOutput = `${result.stdout}\n${result.stderr}`;
  // PowerShell ValidateSet errors may wrap across lines; normalize before matching
  const normalizedOutput = combinedOutput.replace(/\r?\n/g, '');

  assert.notEqual(result.status, 0);
  assert.match(normalizedOutput, /apply/);
  assert.match(normalizedOutput, /ensure/);
  assert.match(normalizedOutput, /verify/);
  assert.match(normalizedOutput, /start/);
  assert.match(normalizedOutput, /uninstall/);
});

test('verify does not recreate base mappings when they are missing', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-verify-readonly-'));
  const fixture = createFixture(tempRoot);

  const applyResult = runTool('apply', fixture);
  assert.equal(applyResult.status, 0, applyResult.stderr || applyResult.stdout);

  const baseMappingPath = path.join(
    fixture.workspaceRoot,
    'translations',
    'base',
    'workbench.mappings.json'
  );
  const translatedWorkbenchPath = path.join(
    fixture.installDir,
    'resources',
    'app',
    'out',
    'vs',
    'workbench',
    'workbench.desktop.main_translated.js'
  );
  assert.ok(fs.existsSync(baseMappingPath));
  writeText(
    translatedWorkbenchPath,
    [
      '(() => {',
      '  const translationMappings = [',
      '    {"originalText":"General","changeText":"常规","searchType":"exact"}',
      '  ];',
      "  console.log('legacy bundle');",
      '})();',
      '',
    ].join('\n')
  );
  fs.unlinkSync(baseMappingPath);

  const verifyResult = runTool('verify', fixture);
  assert.notEqual(verifyResult.status, 0, verifyResult.stderr || verifyResult.stdout);
  assert.equal(fs.existsSync(baseMappingPath), false);
});

test('uninstall removes locale overrides and extension zh-cn files created by apply', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-uninstall-'));
  const fixture = createFixture(tempRoot);

  const applyResult = runTool('apply', fixture);
  assert.equal(applyResult.status, 0, applyResult.stderr || applyResult.stdout);

  const argvPath = path.join(fixture.homeRoot, '.cursor', 'argv.json');
  const localeMirrorPath = path.join(fixture.appDataRoot, 'Cursor', 'User', 'locale.json');
  const extensionTranslationPath = path.join(
    fixture.installDir,
    'resources',
    'app',
    'extensions',
    'cursor-always-local',
    'package.nls.zh-cn.json'
  );
  const clpCacheDir = path.join(
    fixture.appDataRoot,
    'Cursor',
    'clp',
    'ms-ceintl.vscode-language-pack-zh-hans-1.105.0.zh-cn',
    '1.105.0'
  );
  const clpCacheMessagesPath = path.join(clpCacheDir, 'nls.messages.json');
  const cachedProfilesDataDir = path.join(
    fixture.appDataRoot,
    'Cursor',
    'CachedProfilesData'
  );
  const cachedExtensionVsixsDir = path.join(
    fixture.appDataRoot,
    'Cursor',
    'CachedExtensionVSIXs'
  );
  fs.mkdirSync(clpCacheDir, { recursive: true });
  fs.writeFileSync(clpCacheMessagesPath, '["original"]', 'utf8');
  fs.mkdirSync(cachedProfilesDataDir, { recursive: true });
  fs.writeFileSync(path.join(cachedProfilesDataDir, 'cache.json'), '{}', 'utf8');
  fs.mkdirSync(cachedExtensionVsixsDir, { recursive: true });
  fs.writeFileSync(path.join(cachedExtensionVsixsDir, 'cache.json'), '{}', 'utf8');

  const buildManifestPath = path.join(fixture.workspaceRoot, 'state', 'build-manifest.json');
  const generatedDir = path.join(fixture.workspaceRoot, 'state', 'generated');
  const startCursorPathFile = path.join(fixture.workspaceRoot, 'state', 'start-cursor-path.txt');

  assert.ok(fs.existsSync(argvPath));
  assert.ok(fs.existsSync(localeMirrorPath));
  assert.ok(fs.existsSync(extensionTranslationPath));
  assert.ok(fs.existsSync(clpCacheMessagesPath));
  assert.ok(fs.existsSync(cachedProfilesDataDir));
  assert.ok(fs.existsSync(cachedExtensionVsixsDir));
  assert.ok(fs.existsSync(buildManifestPath));
  assert.ok(fs.existsSync(generatedDir));
  assert.ok(fs.existsSync(startCursorPathFile));

  const uninstallResult = runUninstall(fixture);
  assert.equal(uninstallResult.status, 0, uninstallResult.stderr || uninstallResult.stdout);

  assert.equal(fs.existsSync(localeMirrorPath), false);
  assert.equal(fs.existsSync(extensionTranslationPath), false);
  assert.equal(fs.existsSync(argvPath), false);
  assert.equal(fs.existsSync(clpCacheMessagesPath), false);
  assert.equal(fs.existsSync(cachedProfilesDataDir), false);
  assert.equal(fs.existsSync(cachedExtensionVsixsDir), false);
  assert.equal(fs.existsSync(buildManifestPath), false);
  assert.equal(fs.existsSync(generatedDir), false);
  assert.equal(fs.existsSync(startCursorPathFile), false);
});

test('uninstall removes desktop shortcut from the current user profile desktop', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-uninstall-shortcut-'));
  const fixture = createFixture(tempRoot);
  const desktopShortcutPath = path.join(fixture.homeRoot, 'Desktop', 'Cursor 中文版.lnk');

  const applyResult = runTool('apply', fixture);
  assert.equal(applyResult.status, 0, applyResult.stderr || applyResult.stdout);

  fs.mkdirSync(path.dirname(desktopShortcutPath), { recursive: true });
  writeText(desktopShortcutPath, 'shortcut placeholder');
  assert.ok(fs.existsSync(desktopShortcutPath));

  const uninstallResult = runUninstall(fixture);
  assert.equal(uninstallResult.status, 0, uninstallResult.stderr || uninstallResult.stdout);

  assert.equal(
    fs.existsSync(desktopShortcutPath),
    false,
    'desktop shortcut should be removed by uninstall'
  );
});

test('apply preflight prevents partial install when NLS payload fails', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-preflight-nls-'));
  const fixture = createFixture(tempRoot);
  const packageJsonPath = path.join(fixture.installDir, 'resources', 'app', 'package.json');
  const translatorBootstrapPath = path.join(
    fixture.installDir,
    'resources',
    'app',
    'out',
    'cursorTranslatorMain.js'
  );
  const nlsMessagesPath = path.join(
    fixture.installDir,
    'resources',
    'app',
    'out',
    'nls.messages.json'
  );
  const mainTranslatedPath = path.join(
    fixture.installDir,
    'resources',
    'app',
    'out',
    'main_translated.js'
  );
  const workbenchTranslatedPath = path.join(
    fixture.installDir,
    'resources',
    'app',
    'out',
    'vs',
    'workbench',
    'workbench.desktop.main_translated.js'
  );

  // Corrupt the language pack so NLS payload preflight will fail
  const languagePackMainI18nPath = path.join(
    fixture.homeRoot,
    '.cursor',
    'extensions',
    'ms-ceintl.vscode-language-pack-zh-hans-1.105.0-universal',
    'translations',
    'main.i18n.json'
  );
  fs.unlinkSync(languagePackMainI18nPath);

  const applyResult = runTool('apply', fixture);
  const combinedOutput = `${applyResult.stdout}\n${applyResult.stderr}`;

  assert.notEqual(applyResult.status, 0);
  assert.match(combinedOutput, /main\.i18n\.json/);
  // None of the install files should have been written because preflight failed.
  // Note: workbenchTranslatedPath may already exist as a legacy fixture file;
  // we verify package.json and bootstrap/main were not touched.
  assert.equal(JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')).main, './out/main.js');
  assert.equal(fs.existsSync(translatorBootstrapPath), false);
  assert.equal(fs.existsSync(mainTranslatedPath), false);
  // The existing workbench translated file should remain untouched (still legacy content)
  const existingWorkbenchText = fs.readFileSync(workbenchTranslatedPath, 'utf8');
  assert.match(existingWorkbenchText, /legacy translated workbench/);
  assert.doesNotMatch(existingWorkbenchText, /Cursor ZH generated runtime/);
});

test('verify fails when installed main or workbench drifts from generated artifacts', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-drift-verify-'));
  const fixture = createFixture(tempRoot);

  const applyResult = runTool('apply', fixture);
  assert.equal(applyResult.status, 0, applyResult.stderr || applyResult.stdout);

  const generatedMainPath = path.join(
    fixture.workspaceRoot,
    'state',
    'generated',
    'main_translated.generated.js'
  );
  const generatedWorkbenchPath = path.join(
    fixture.workspaceRoot,
    'state',
    'generated',
    'workbench.desktop.main_translated.generated.js'
  );
  const installedMainPath = path.join(
    fixture.installDir,
    'resources',
    'app',
    'out',
    'main_translated.js'
  );
  const installedWorkbenchPath = path.join(
    fixture.installDir,
    'resources',
    'app',
    'out',
    'vs',
    'workbench',
    'workbench.desktop.main_translated.js'
  );

  // Simulate drift: mutate installed files without regenerating
  fs.writeFileSync(installedMainPath, fs.readFileSync(installedMainPath, 'utf8') + '\n// drift');
  fs.writeFileSync(
    installedWorkbenchPath,
    fs.readFileSync(installedWorkbenchPath, 'utf8') + '\n// drift'
  );

  const verifyResult = runTool('verify', fixture);
  assert.notEqual(verifyResult.status, 0, verifyResult.stderr || verifyResult.stdout);
  assert.match(
    verifyResult.stdout,
    /已安装的 main_translated\.js 与当前生成产物不一致/
  );
  assert.match(
    verifyResult.stdout,
    /已安装的 workbench\.desktop\.main_translated\.js 与当前生成产物不一致/
  );
});
test('uninstall removes glass workbench translated file when present', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-uninstall-glass-'));
  const fixture = createFixture(tempRoot);

  const glassOriginalPath = path.join(
    fixture.installDir,
    'resources',
    'app',
    'out',
    'vs',
    'workbench',
    'workbench.glass.main.js'
  );
  const glassTranslatedPath = path.join(
    fixture.installDir,
    'resources',
    'app',
    'out',
    'vs',
    'workbench',
    'workbench.glass.main_translated.js'
  );

  fs.mkdirSync(path.dirname(glassOriginalPath), { recursive: true });
  fs.writeFileSync(glassOriginalPath, "const label = 'Glass';\n", 'utf8');

  const applyResult = runTool('apply', fixture);
  assert.equal(applyResult.status, 0, applyResult.stderr || applyResult.stdout);
  assert.ok(fs.existsSync(glassTranslatedPath), 'glass translated bundle should exist after apply');

  const uninstallResult = runUninstall(fixture);
  assert.equal(uninstallResult.status, 0, uninstallResult.stderr || uninstallResult.stdout);

  assert.equal(
    fs.existsSync(glassTranslatedPath),
    false,
    'glass translated bundle should be removed by uninstall'
  );
});
test('invoke-cursor-zh uninstall removes localized files', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-invoke-uninstall-'));
  const fixture = createFixture(tempRoot);

  const applyResult = runTool('apply', fixture);
  assert.equal(applyResult.status, 0, applyResult.stderr || applyResult.stdout);

  const packageJsonPath = path.join(
    fixture.installDir,
    'resources',
    'app',
    'package.json'
  );
  const translatorBootstrapPath = path.join(
    fixture.installDir,
    'resources',
    'app',
    'out',
    'cursorTranslatorMain.js'
  );

  assert.equal(
    JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')).main,
    './out/cursorTranslatorMain.js'
  );
  assert.ok(fs.existsSync(translatorBootstrapPath));

  const uninstallResult = runInvoke('uninstall', fixture);
  assert.equal(
    uninstallResult.status,
    0,
    uninstallResult.stderr || uninstallResult.stdout
  );

  assert.equal(
    JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')).main,
    './out/main.js'
  );
  assert.equal(fs.existsSync(translatorBootstrapPath), false);
});

test('uninstall repairs a polluted backup package entry before removing translated files', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-uninstall-polluted-backup-'));
  const fixture = createFixture(tempRoot);

  const applyResult = runTool('apply', fixture);
  assert.equal(applyResult.status, 0, applyResult.stderr || applyResult.stdout);

  const backupRoot = path.join(fixture.workspaceRoot, 'state', 'backups');
  const [backupDirName] = fs
    .readdirSync(backupRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse();
  const backupPackageJsonPath = path.join(
    backupRoot,
    backupDirName,
    'resources',
    'app',
    'package.json'
  );
  const pollutedBackupPackage = JSON.parse(
    fs.readFileSync(backupPackageJsonPath, 'utf8')
  );
  writeJson(backupPackageJsonPath, {
    ...pollutedBackupPackage,
    main: './out/cursorTranslatorMain.js',
    main_original: './out/main.js',
  });

  const packageJsonPath = path.join(
    fixture.installDir,
    'resources',
    'app',
    'package.json'
  );
  const translatorBootstrapPath = path.join(
    fixture.installDir,
    'resources',
    'app',
    'out',
    'cursorTranslatorMain.js'
  );

  const uninstallResult = runUninstall(fixture);
  assert.equal(uninstallResult.status, 0, uninstallResult.stderr || uninstallResult.stdout);

  assert.equal(
    JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')).main,
    './out/main.js'
  );
  assert.equal(fs.existsSync(translatorBootstrapPath), false);
});
test('install script copies uninstall wrapper to workspace root', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-install-wrapper-'));
  const fixture = createFixture(tempRoot);

  const templateRoot = path.join(fixture.workspaceRoot, 'templates');
  fs.mkdirSync(templateRoot, { recursive: true });
  const wrapperNames = [
    'apply-cursor-zh.cmd',
    'ensure-cursor-zh.cmd',
    'verify-cursor-zh.cmd',
    'start-cursor-zh.cmd',
    'uninstall-cursor-zh.cmd',
  ];
  for (const name of wrapperNames) {
    fs.copyFileSync(
      path.join(__dirname, '..', '..', 'templates', name),
      path.join(templateRoot, name)
    );
  }

  const installResult = runInstall(fixture);
  assert.equal(installResult.status, 0, installResult.stderr || installResult.stdout);

  const wrapperPath = path.join(fixture.workspaceRoot, 'uninstall-cursor-zh.cmd');
  assert.ok(fs.existsSync(wrapperPath), 'uninstall-cursor-zh.cmd should be copied to workspace root');

  const wrapperText = fs.readFileSync(wrapperPath, 'utf8');
  assert.match(wrapperText, /invoke-cursor-zh\.ps1/);
  assert.match(wrapperText, /uninstall/);
});

test('uninstall removes root wrapper cmd files created by install', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-uninstall-wrappers-'));
  const fixture = createFixture(tempRoot);

  const templateRoot = path.join(fixture.workspaceRoot, 'templates');
  fs.mkdirSync(templateRoot, { recursive: true });
  const wrapperNames = [
    'apply-cursor-zh.cmd',
    'ensure-cursor-zh.cmd',
    'verify-cursor-zh.cmd',
    'start-cursor-zh.cmd',
    'uninstall-cursor-zh.cmd',
  ];
  for (const name of wrapperNames) {
    fs.copyFileSync(
      path.join(__dirname, '..', '..', 'templates', name),
      path.join(templateRoot, name)
    );
  }

  const installResult = runInstall(fixture);
  assert.equal(installResult.status, 0, installResult.stderr || installResult.stdout);

  for (const name of wrapperNames) {
    assert.ok(
      fs.existsSync(path.join(fixture.workspaceRoot, name)),
      `${name} should exist after install`
    );
  }

  const uninstallResult = runUninstall(fixture);
  assert.equal(uninstallResult.status, 0, uninstallResult.stderr || uninstallResult.stdout);

  for (const name of wrapperNames) {
    if (name === 'uninstall-cursor-zh.cmd') {
      // The uninstall wrapper may still be held by the running PowerShell process.
      continue;
    }
    assert.equal(
      fs.existsSync(path.join(fixture.workspaceRoot, name)),
      false,
      `${name} should be removed by uninstall`
    );
  }
});

test('uninstall removes runtime toggle signal file', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-uninstall-toggle-'));
  const fixture = createFixture(tempRoot);

  const applyResult = runTool('apply', fixture);
  assert.equal(applyResult.status, 0, applyResult.stderr || applyResult.stdout);

  const toggleSignalPath = path.join(fixture.workspaceRoot, 'state', 'runtime-toggle.json');
  writeJson(toggleSignalPath, {
    desiredState: 'zh',
    updatedAt: new Date().toISOString(),
    source: 'test',
  });
  assert.ok(fs.existsSync(toggleSignalPath));

  const uninstallResult = runUninstall(fixture);
  assert.equal(uninstallResult.status, 0, uninstallResult.stderr || uninstallResult.stdout);

  assert.equal(
    fs.existsSync(toggleSignalPath),
    false,
    'runtime toggle signal file should be removed by uninstall'
  );
});

test('apply then uninstall restores English nls and clean verify', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-uninstall-roundtrip-'));
  const fixture = createFixture(tempRoot);

  const nlsMessagesPath = path.join(
    fixture.installDir,
    'resources',
    'app',
    'out',
    'nls.messages.json'
  );
  const packageJsonPath = path.join(
    fixture.installDir,
    'resources',
    'app',
    'package.json'
  );
  const originalNls = JSON.parse(fs.readFileSync(nlsMessagesPath, 'utf8'));

  const applyResult = runTool('apply', fixture);
  assert.equal(applyResult.status, 0, applyResult.stderr || applyResult.stdout);

  const uninstallResult = runUninstall(fixture);
  assert.equal(uninstallResult.status, 0, uninstallResult.stderr || uninstallResult.stdout);

  const restoredNls = JSON.parse(fs.readFileSync(nlsMessagesPath, 'utf8'));
  assert.deepEqual(restoredNls.slice(0, 5), originalNls.slice(0, 5));
  assert.equal(JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')).main, './out/main.js');

  const verifyCleanResult = runTool('verify', fixture, {}, ['--expect-clean']);
  assert.equal(
    verifyCleanResult.status,
    0,
    verifyCleanResult.stderr || verifyCleanResult.stdout
  );
});

test('uninstall removes dynamically discovered auxiliary translated chunk', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-uninstall-aux-'));
  const fixture = createFixture(tempRoot);

  const fooOriginalPath = path.join(
    fixture.installDir,
    'resources',
    'app',
    'out',
    'vs',
    'workbench',
    'workbench.anysphere-ui-foo.js'
  );
  const fooTranslatedPath = path.join(
    fixture.installDir,
    'resources',
    'app',
    'out',
    'vs',
    'workbench',
    'workbench.anysphere-ui-foo_translated.js'
  );

  fs.mkdirSync(path.dirname(fooOriginalPath), { recursive: true });
  fs.writeFileSync(fooOriginalPath, "const label = 'Automations Foo';\n", 'utf8');

  const applyResult = runTool('apply', fixture);
  assert.equal(applyResult.status, 0, applyResult.stderr || applyResult.stdout);
  assert.ok(fs.existsSync(fooTranslatedPath), 'auxiliary translated chunk should exist after apply');

  const uninstallResult = runUninstall(fixture);
  assert.equal(uninstallResult.status, 0, uninstallResult.stderr || uninstallResult.stdout);

  assert.equal(
    fs.existsSync(fooTranslatedPath),
    false,
    'auxiliary translated chunk should be removed by uninstall'
  );
});

test('uninstall keeps manifest when post-uninstall nls hash verification fails', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-uninstall-hash-fail-'));
  const fixture = createFixture(tempRoot);
  const buildManifestPath = path.join(fixture.workspaceRoot, 'state', 'build-manifest.json');

  const applyResult = runTool('apply', fixture);
  assert.equal(applyResult.status, 0, applyResult.stderr || applyResult.stdout);

  const manifest = JSON.parse(fs.readFileSync(buildManifestPath, 'utf8'));
  const metadataPath = path.join(manifest.backupDir, 'backup-metadata.json');
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  metadata.snapshot = metadata.snapshot || {};
  metadata.snapshot.hashes = metadata.snapshot.hashes || {};
  metadata.snapshot.hashes.nlsMessages = 'deadbeef';
  writeJson(metadataPath, metadata);

  const uninstallResult = runUninstall(fixture);
  assert.notEqual(uninstallResult.status, 0, uninstallResult.stderr || uninstallResult.stdout);
  assert.ok(fs.existsSync(buildManifestPath), 'manifest should remain for retry after verify failure');
});

test('uninstall removes extension nls created after reuse apply via registry union', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-uninstall-reuse-ext-'));
  const fixture = createFixture(tempRoot);
  const extensionTranslationPath = path.join(
    fixture.installDir,
    'resources',
    'app',
    'extensions',
    'cursor-always-local',
    'package.nls.zh-cn.json'
  );

  const firstApply = runTool('apply', fixture);
  assert.equal(firstApply.status, 0, firstApply.stderr || firstApply.stdout);

  const ensureResult = runTool('ensure', fixture);
  assert.equal(ensureResult.status, 0, ensureResult.stderr || ensureResult.stdout);
  assert.ok(fs.existsSync(extensionTranslationPath));

  const uninstallResult = runUninstall(fixture);
  assert.equal(uninstallResult.status, 0, uninstallResult.stderr || uninstallResult.stdout);
  assert.equal(fs.existsSync(extensionTranslationPath), false);
});

test('uninstall throws when injected artifacts exist but nls backup is missing', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-uninstall-no-nls-backup-'));
  const fixture = createFixture(tempRoot);
  const glassTranslatedPath = path.join(
    fixture.installDir,
    'resources',
    'app',
    'out',
    'vs',
    'workbench',
    'workbench.glass.main_translated.js'
  );
  const glassOriginalPath = path.join(
    fixture.installDir,
    'resources',
    'app',
    'out',
    'vs',
    'workbench',
    'workbench.glass.main.js'
  );

  fs.mkdirSync(path.dirname(glassOriginalPath), { recursive: true });
  fs.writeFileSync(glassOriginalPath, "const label = 'Glass';\n", 'utf8');

  const applyResult = runTool('apply', fixture);
  assert.equal(applyResult.status, 0, applyResult.stderr || applyResult.stdout);
  assert.ok(fs.existsSync(glassTranslatedPath));

  const manifest = JSON.parse(
    fs.readFileSync(path.join(fixture.workspaceRoot, 'state', 'build-manifest.json'), 'utf8')
  );
  fs.unlinkSync(
    path.join(manifest.backupDir, 'resources', 'app', 'out', 'nls.messages.json')
  );

  const uninstallResult = runUninstall(fixture);
  assert.notEqual(uninstallResult.status, 0, uninstallResult.stderr || uninstallResult.stdout);
  const combined = `${uninstallResult.stdout}\n${uninstallResult.stderr}`;
  assert.match(combined, /nls\.messages\.json backup/i);
});

test('uninstall recovers clean English state after corrupted translated bundle', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-uninstall-p0-'));
  const fixture = createFixture(tempRoot);
  const glassTranslatedPath = path.join(
    fixture.installDir,
    'resources',
    'app',
    'out',
    'vs',
    'workbench',
    'workbench.glass.main_translated.js'
  );
  const glassOriginalPath = path.join(
    fixture.installDir,
    'resources',
    'app',
    'out',
    'vs',
    'workbench',
    'workbench.glass.main.js'
  );
  const packageJsonPath = path.join(fixture.installDir, 'resources', 'app', 'package.json');

  fs.mkdirSync(path.dirname(glassOriginalPath), { recursive: true });
  fs.writeFileSync(glassOriginalPath, "const label = 'Glass';\n", 'utf8');

  const applyResult = runTool('apply', fixture);
  assert.equal(applyResult.status, 0, applyResult.stderr || applyResult.stdout);

  fs.writeFileSync(glassTranslatedPath, '{{{invalid javascript', 'utf8');

  const uninstallResult = runUninstall(fixture);
  assert.equal(uninstallResult.status, 0, uninstallResult.stderr || uninstallResult.stdout);
  assert.equal(fs.existsSync(glassTranslatedPath), false);
  assert.equal(JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')).main, './out/main.js');

  const verifyCleanResult = runTool('verify', fixture, {}, ['--expect-clean']);
  assert.equal(verifyCleanResult.status, 0, verifyCleanResult.stderr || verifyCleanResult.stdout);
});

test('node uninstall command matches powershell uninstall entrypoint', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-uninstall-node-'));
  const fixture = createFixture(tempRoot);
  const packageJsonPath = path.join(fixture.installDir, 'resources', 'app', 'package.json');

  const applyResult = runTool('apply', fixture);
  assert.equal(applyResult.status, 0, applyResult.stderr || applyResult.stdout);

  const uninstallResult = runTool('uninstall', fixture);
  assert.equal(uninstallResult.status, 0, uninstallResult.stderr || uninstallResult.stdout);
  assert.equal(JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')).main, './out/main.js');
});
