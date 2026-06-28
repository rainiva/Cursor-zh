const test = require('node:test');
const assert = require('node:assert/strict');

const {
compareLanguagePackVersion,
defaultCursorWinCommonMappings,
defaultCursorWinDynamicMappings,
defaultOverlayMappings,
mergeMappings,
parseJsonc,
parseLegacyWorktreeMappings,
translateTextWithMappings,
withLocaleSetting,
} = require('../../cursor-zh-lib.js');

test('parseLegacyWorktreeMappings extracts mappings from legacy translated bundle', () => {
  const source = `
    (() => {
      const translationMappings = [
        {"originalText":"General","changeText":"\\u5e38\\u89c4","searchType":"exact"},
        {"originalText":"Browser Tab: (.+)","changeText":"\\u6d4f\\u89c8\\u5668\\u6807\\u7b7e\\u9875\\uff1a$1","searchType":"regex","flags":"i"}
      ]; // don't modify string
      console.log('bootstrap');
    })();
  `;

  const mappings = parseLegacyWorktreeMappings(source);

  assert.equal(mappings.length, 2);
  assert.deepEqual(mappings[0], {
    originalText: 'General',
    changeText: '\u5e38\u89c4',
    searchType: 'exact',
  });
  assert.deepEqual(mappings[1], {
    originalText: 'Browser Tab: (.+)',
    changeText: '\u6d4f\u89c8\u5668\u6807\u7b7e\u9875\uff1a$1',
    searchType: 'regex',
    flags: 'i',
  });
});

test('mergeMappings keeps overlay entries and removes duplicates', () => {
  const merged = mergeMappings(
    [
      { originalText: 'General', changeText: '\u5e38\u89c4', searchType: 'exact' },
      { originalText: 'Chat', changeText: '\u804a\u5929', searchType: 'exact' },
    ],
    [
      { originalText: 'General', changeText: '\u901a\u7528', searchType: 'exact' },
      {
        originalText: 'Agents Window',
        changeText: '\u667a\u80fd\u4f53\u7a97\u53e3',
        searchType: 'exact',
      },
    ]
  );

  assert.equal(merged.length, 3);
  assert.deepEqual(merged[0], {
    originalText: 'General',
    changeText: '\u901a\u7528',
    searchType: 'exact',
  });
  assert.deepEqual(merged[2], {
    originalText: 'Agents Window',
    changeText: '\u667a\u80fd\u4f53\u7a97\u53e3',
    searchType: 'exact',
  });
});

test('compareLanguagePackVersion treats matching major minor as compatible', () => {
  assert.deepEqual(compareLanguagePackVersion('1.105.0', '1.105.1'), {
    compatible: true,
    reason: 'major-minor-match',
  });
});

test('parseJsonc supports comments in argv.json', () => {
  const parsed = parseJsonc(`
    {
      // comment
      "enable-crash-reporter": true,
      "locale": "en"
    }
  `);

  assert.deepEqual(parsed, {
    'enable-crash-reporter': true,
    locale: 'en',
  });
});

test('withLocaleSetting merges locale without dropping other argv keys', () => {
  const updated = withLocaleSetting(
    {
      'enable-crash-reporter': true,
      'crash-reporter-id': 'abc',
    },
    'zh-cn'
  );

  assert.deepEqual(updated, {
    'enable-crash-reporter': true,
    'crash-reporter-id': 'abc',
    locale: 'zh-cn',
  });
});

test('defaultOverlayMappings seeds Cursor specific window translations', () => {
  const mappings = defaultOverlayMappings();
  const originals = new Set(mappings.map((item) => item.originalText));

  assert.ok(originals.has('Agents Window'));
  assert.ok(originals.has('Open Editor Window'));
  assert.ok(originals.has('Design Mode'));
});

test('defaultCursorWinCommonMappings includes common settings and marketplace labels', () => {
  const mappings = defaultCursorWinCommonMappings();
  const originals = new Set(mappings.map((item) => item.originalText));

  assert.ok(originals.has('Appearance'));
  assert.ok(originals.has('Total Automations'));
  assert.ok(originals.has('No Automations Yet'));
  assert.ok(originals.has('Manage plugins'));
  assert.ok(originals.has('Error loading plugin'));
  assert.ok(originals.has('Open MCP Settings'));
  assert.ok(originals.has('New project'));
  assert.ok(originals.has('Worktrees'));
  assert.ok(originals.has('No Cursor-managed worktrees on this machine.'));
  assert.ok(originals.has('New Agent'));
  assert.ok(originals.has('Marketplace'));
  assert.ok(originals.has('Quick Chat'));
  assert.ok(originals.has('Settings...'));
  assert.ok(originals.has('Close Window'));
  assert.ok(originals.has('Exit'));
  assert.ok(originals.has('New Terminal'));
  assert.ok(originals.has('New Browser'));
  assert.ok(originals.has('New Browser Tab'));
  assert.ok(originals.has('Command Palette'));
  assert.ok(originals.has('View License'));
  assert.ok(originals.has('Upgrade to Pro'));
  assert.ok(originals.has('Upgrade to a Pro account'));
  assert.ok(originals.has('Free Plan'));
  assert.ok(originals.has('Connect GitHub'));
  assert.ok(
    originals.has(
      'Connect GitHub to create, update, and merge pull requests directly in Cursor.'
    )
  );
  assert.ok(
    originals.has(
      'Entry-level plan with access to premium models, unlimited Tab completions, and more.'
    )
  );
  assert.ok(originals.has('Update'));
  assert.ok(originals.has('Open Cursor Settings'));
  assert.ok(originals.has('Cursor Settings'));
  assert.ok(originals.has('VS Code Settings'));
  assert.ok(originals.has('Split Right'));
  assert.ok(originals.has('Split Down'));
  assert.ok(originals.has('About Cursor'));
  assert.ok(originals.has('Check for Updates...'));
  assert.ok(originals.has('Search Settings'));
  assert.ok(originals.has('Fork'));
  assert.ok(originals.has('Export'));
  assert.ok(originals.has('Find in Changes'));
  assert.ok(originals.has('Open any file, URL, ...'));
  assert.ok(originals.has('Canvas'));
  assert.ok(originals.has('Open Tabs'));
  assert.ok(originals.has('Unified'));
  assert.ok(originals.has('Shortcuts'));
  assert.ok(originals.has('Contact Us'));
  assert.ok(originals.has('Open Files'));
  assert.ok(originals.has('Customize'));
  assert.ok(originals.has('Auto'));
  assert.ok(originals.has('Plan, Build, / for skills, @ for context'));
  assert.ok(originals.has('Plan and design before coding...'));
  assert.ok(originals.has('Coordinate parallel tasks...'));
  assert.ok(originals.has('Debug and troubleshoot issues...'));
  assert.ok(originals.has('Run Cursor anywhere...'));
  assert.ok(originals.has('Recents'));
  assert.ok(originals.has('Run On'));
  assert.ok(originals.has('This PC'));
  assert.ok(originals.has('Repos'));
  assert.ok(originals.has('Set Up Workspace'));
  assert.ok(originals.has('Connect SSH'));
  assert.ok(originals.has('Upgrade to unlock premium models'));
  assert.ok(originals.has('Premium models are only available on paid plans.'));
  assert.ok(
    originals.has(
      'Use /loop to run a prompt on a schedule or keep a local agent running continuously'
    )
  );
  assert.ok(originals.has('Use /in-cloud for cloud subagents'));
  assert.ok(
    originals.has(
      'Build a plan before starting code to improve agent execution. Use /plan to get started'
    )
  );
  assert.ok(
    originals.has(
      'Use /multi-model-review to get an adversarial code review from several models'
    )
  );
  assert.ok(
    originals.has(
      'After long sessions, use /split-to-prs to turn your work into small, reviewable PRs'
    )
  );
  assert.ok(
    originals.has(
      'Plugins help you customize Cursor for your workflows. Use /add-plugin to get started'
    )
  );
  assert.ok(
    originals.has(
      'Skills extend Cursor with specialized knowledge. Use /create-skill to get started'
    )
  );
  assert.ok(
    originals.has(
      'Use /create-skill to customize Cursor for your workflows'
    )
  );
  assert.ok(
    originals.has(
      'Use /canvas to get interactive visualizations like dashboards from Cursor'
    )
  );
  assert.ok(
    originals.has(
      'Cursor can respond with interactive visualizations alongside text. Use /canvas to get started'
    )
  );
  assert.ok(
    originals.has(
      'Plan Mode improves agent outcomes and accuracy. Use shift+tab to enable'
    )
  );
  assert.ok(
    originals.has(
      'Use MCPs to give Cursor access to tools and data. Configure MCPs in your Cursor Settings'
    )
  );
  assert.ok(originals.has('Use /shell to run commands in the terminal'));
  assert.ok(
    originals.has('Drag and drop agent chats to split your view into tiled panes')
  );
  assert.ok(
    originals.has(
      'Use /multitask to run subagents to parallelize your requests instead of queuing them'
    )
  );
  assert.ok(
    originals.has(
      'Voice mode lets you dictate better prompts. Click or hold ctrl+M to enable'
    )
  );
  assert.ok(originals.has('Use ctrl + D to split your view into tiled panes'));
  assert.ok(
    originals.has(
      'Use /create-rule to control agent behavior through system-level instructions'
    )
  );
  assert.ok(
    originals.has('Use /debug to solve bugs that are hard to reproduce or understand')
  );
  assert.ok(
    originals.has(
      'Use /bisect to find the exact commit that introduced a certain bug'
    )
  );
  assert.ok(
    originals.has(
      'Use /create-subagent to set up specialized agents that Cursor can use to parallelize work'
    )
  );
  assert.ok(
    originals.has(
      'Create a multi-root workspace so Cursor can work across many repos at once'
    )
  );
  assert.ok(
    originals.has(
      'Use /model to pick the best model for your task. Composer offers a great balance for cost vs. capability'
    )
  );
  assert.ok(
    originals.has(
      'Use cloud agents for better parallelization and durable execution. Go to cursor.com/agents'
    )
  );
  assert.ok(
    originals.has('Debug Mode reproduces and solves hard bugs. Use shift+tab to enable')
  );
  assert.ok(originals.has('Recent Agents'));
  assert.ok(originals.has('Clear All Notifications'));
  assert.ok(originals.has('Open Cursor'));
  assert.ok(originals.has('Settings'));
  assert.ok(originals.has('Editor Window'));
  assert.ok(originals.has('Motion'));
  assert.ok(originals.has('Reduce Motion'));
  assert.ok(originals.has('Web Fetch Tool'));
  assert.ok(originals.has('Hierarchical Cursor Ignore'));
  assert.ok(originals.has('Approvals & Execution for commands, MCP and more'));
  assert.ok(originals.has('Run Mode'));
  assert.ok(originals.has('Command Allowlist'));
  assert.ok(originals.has('Legacy Terminal Tool'));
  assert.ok(originals.has('Voice Mode'));
  assert.ok(originals.has('Commit Attribution'));
  assert.ok(originals.has('Branch Prefix'));
  assert.ok(originals.has('Open User Settings'));
  assert.ok(originals.has('Open Layout Settings Menu'));
  assert.ok(originals.has('Switch Layout'));
  assert.ok(originals.has('Agent Review Settings'));
  assert.ok(originals.has('Open Workspace'));
  assert.ok(originals.has('Ask questions without making changes...'));
  assert.ok(originals.has('Add for Myself'));
  assert.ok(originals.has('More actions'));
  assert.ok(originals.has('Tool Call Density'));
  assert.ok(originals.has('Queue Messages'));
  assert.ok(originals.has('Agent Autocomplete'));
  assert.ok(originals.has('Ignored Files'));
  assert.ok(originals.has('Connected to Browser Tab'));
  assert.ok(originals.has('Execution Log'));
  assert.ok(originals.has('Index Repositories for Instant Grep'));
  assert.ok(originals.has('Check network connectivity to all Cursor services'));
});

test('defaultCursorWinCommonMappings includes chat context menu actions', () => {
  const mappings = defaultCursorWinCommonMappings();
  const byOriginal = new Map(mappings.map((item) => [item.originalText, item]));

  assert.equal(byOriginal.get('Pin')?.changeText, '固定');
  assert.equal(byOriginal.get('Rename')?.changeText, '重命名');
  assert.equal(byOriginal.get('Mark as Unread')?.changeText, '标记为未读');
  assert.equal(byOriginal.get('Archive')?.changeText, '归档');
  assert.equal(byOriginal.get('Split')?.changeText, '拆分');
  assert.equal(byOriginal.get('Export Chat')?.changeText, '导出对话');
  assert.equal(byOriginal.get('Fork Chat')?.changeText, '分叉对话');
  assert.equal(byOriginal.get('Copy')?.changeText, '复制');

  for (const key of [
    'Pin',
    'Rename',
    'Mark as Unread',
    'Archive',
    'Split',
    'Export Chat',
    'Copy',
  ]) {
    assert.equal(byOriginal.get(key)?.forceRuntime, true, `${key} should use runtime translation`);
  }
});

test('defaultCursorWinDynamicMappings seeds normalized, scoped and regex rules', () => {
  const mappings = defaultCursorWinDynamicMappings();
  const byOriginal = new Map(mappings.map((item) => [item.originalText, item]));

  assert.equal(byOriginal.get('Sign In').searchType, 'normalizedExact');
  assert.equal(byOriginal.get('Sign in').changeText, '\u767b\u5f55');
  assert.equal(byOriginal.get('Learn More').changeText, '\u4e86\u89e3\u66f4\u591a');
  assert.equal(byOriginal.get('Browser Mode').searchType, 'exact');
  assert.equal(byOriginal.get('System').changeText, '\u8ddf\u968f\u7cfb\u7edf');
  assert.equal(byOriginal.get('Compact').changeText, '\u7d27\u51d1');
  assert.equal(byOriginal.get('Plan').changeText, '\u89c4\u5212');
  assert.equal(byOriginal.get('Multitask').changeText, '\u591a\u4efb\u52a1');
  assert.equal(byOriginal.get('Debug').changeText, '\u8c03\u8bd5');
  assert.equal(byOriginal.get('Tools').changeText, '\u5de5\u5177');
  assert.equal(
    byOriginal.get('^Configured Hooks\\s*\\((.+)\\)$').changeText,
    '\u5df2\u914d\u7f6e Hook\uff08$1\uff09'
  );
  assert.equal(
    byOriginal.get('^Something went wrong:\\s*(.+)$').changeText,
    '\u51fa\u9519\u4e86\uff1a$1'
  );
});

test('defaultCursorWinDynamicMappings includes activity timeline and composer exact mappings', () => {
  const mappings = defaultCursorWinDynamicMappings();
  const byOriginal = new Map(mappings.map((item) => [item.originalText, item]));

  assert.equal(byOriginal.get('Search models').changeText, '\u641c\u7d22\u6a21\u578b');
  assert.equal(
    byOriginal.get('Balanced quality and speed, recommended for most tasks').changeText,
    '\u8d28\u91cf\u4e0e\u901f\u5ea6\u5747\u8861\uff0c\u9002\u5408\u5927\u591a\u6570\u4efb\u52a1'
  );
  assert.equal(byOriginal.get('Send follow-up').changeText, '\u7ee7\u7eed\u8ffd\u95ee');
  assert.equal(byOriginal.get('Add a follow-up').changeText, '\u6dfb\u52a0\u8ffd\u95ee');
  assert.equal(
    byOriginal.get('Send follow-up with subagent').changeText,
    '\u5411\u5b50 Agent \u7ee7\u7eed\u8ffd\u95ee'
  );
  assert.equal(
    byOriginal.get('Continue chatting in Cursor').changeText,
    '\u5728 Cursor \u4e2d\u7ee7\u7eed\u804a\u5929'
  );
  assert.equal(
    byOriginal.get('Drop here to attach...').changeText,
    '\u62d6\u653e\u5230\u6b64\u5904\u4ee5\u9644\u52a0...'
  );
  assert.equal(byOriginal.get('No agents yet').changeText, '\u6682\u65e0 Agent');
  assert.equal(
    byOriginal.get('Create an agent to start working on tasks').changeText,
    '\u521b\u5efa\u4e00\u4e2a Agent\uff0c\u5f00\u59cb\u5904\u7406\u4efb\u52a1'
  );
  assert.equal(
    byOriginal.get('Planning next moves').changeText,
    '\u6b63\u5728\u89c4\u5212\u4e0b\u4e00\u6b65'
  );
  assert.equal(byOriginal.get('Worked for ${q9p(n)}').searchType, 'exact');
  assert.equal(
    byOriginal.get('Worked for ${q9p(n)}').changeText,
    '\u5904\u7406\u7528\u65f6 ${q9p(n)}'
  );
  assert.equal(byOriginal.get('${n.searches} search${n.searches===1?"":"es"}').searchType, 'exact');
  assert.equal(
    byOriginal.get('${n.searches} search${n.searches===1?"":"es"}').changeText,
    '${n.searches} \u6b21\u641c\u7d22'
  );
  assert.equal(
    byOriginal.get('${r} L${s.startLine}-${s.endLine}').changeText,
    '${r} \u7b2c ${s.startLine}-${s.endLine} \u884c'
  );
  assert.equal(
    byOriginal.get('${r} in ${Pat(i)}').changeText,
    '\u5728 ${Pat(i)} \u4e2d\u641c\u7d22 ${r}'
  );
});

test('defaultCursorWinDynamicMappings translates current product tip variants', () => {
  const mappings = defaultCursorWinDynamicMappings();

  assert.equal(
    translateTextWithMappings(
      'Cursor can respond with interactive visualizations alongside text. Use /canvas to get started',
      mappings,
      { scopeMatched: true }
    ),
    'Cursor \u53ef\u4ee5\u5728\u6587\u672c\u65c1\u751f\u6210\u4ea4\u4e92\u5f0f\u53ef\u89c6\u5316\u3002\u4f7f\u7528 /canvas \u5f00\u59cb\u3002'
  );
  assert.equal(
    translateTextWithMappings(
      'Composer offers a great balance of intelligence and cost. Try it out from the model picker',
      mappings,
      { scopeMatched: true }
    ),
    '\u4f7f\u7528 /model \u4e3a\u4f60\u7684\u4efb\u52a1\u9009\u62e9\u6700\u5408\u9002\u7684\u6a21\u578b\u3002Composer \u5728\u667a\u80fd\u4e0e\u6210\u672c\u4e4b\u95f4\u53d6\u5f97\u4e86\u5f88\u597d\u7684\u5e73\u8861\u3002\u53ef\u5728\u6a21\u578b\u9009\u62e9\u5668\u4e2d\u8bd5\u7528\u3002'
  );
  assert.equal(
    translateTextWithMappings(
      'Ask mode uses read-only agents to research your codebase. Use shift+tab to enable',
      mappings,
      { scopeMatched: true }
    ),
    'Ask \u6a21\u5f0f\u4f1a\u4f7f\u7528\u53ea\u8bfb\u667a\u80fd\u4f53\u7814\u7a76\u4f60\u7684\u4ee3\u7801\u5e93\u3002\u4f7f\u7528 shift+tab \u542f\u7528\u3002'
  );
  assert.equal(
    translateTextWithMappings(
      'Ask mode uses read-only agents to research your codebase. Use shift+tab to enable',
      mappings,
      { scopeMatched: false }
    ),
    'Ask mode uses read-only agents to research your codebase. Use shift+tab to enable'
  );
  assert.equal(
    translateTextWithMappings(
      'Use /loop to run a prompt on a schedule or keep a local agent running continuously',
      mappings,
      { scopeMatched: true }
    ),
    '\u4f7f\u7528 /loop \u6309\u65f6\u8c03\u5ea6 Prompt\uff0c\u6216\u8ba9\u672c\u5730 Agent \u6301\u7eed\u8fd0\u884c\u3002'
  );
  assert.equal(
    translateTextWithMappings(
      'Use /add-plugin to install a plugin from the Cursor Marketplace',
      mappings,
      { scopeMatched: true }
    ),
    '\u4f7f\u7528 /add-plugin \u4ece Cursor Marketplace \u5b89\u88c5\u63d2\u4ef6\u3002'
  );
  assert.equal(
    translateTextWithMappings(
      'Use cloud agents for better parallelization and durable execution. Go to cursor.com/agents',
      mappings,
      { scopeMatched: true }
    ),
    '\u4f7f\u7528\u4e91\u7aef Agent \u53ef\u83b7\u5f97\u66f4\u597d\u7684\u5e76\u884c\u5316\u4e0e\u6301\u4e45\u6267\u884c\u80fd\u529b\u3002\u524d\u5f80 cursor.com/agents\u3002'
  );
  assert.equal(translateTextWithMappings('Repositories', mappings), '\u4ed3\u5e93');
});

test('defaultCursorWinCommonMappings includes harvest 3.9.8 priority and multitask onboarding strings', () => {
  const mappings = defaultCursorWinCommonMappings();
  const byOriginal = new Map(mappings.map((item) => [item.originalText, item]));

  const priorityPairs = [
    ['Register Close Tooltip', '\u6ce8\u518c\u5173\u95ed\u5de5\u5177\u63d0\u793a'],
    ['Tooltip', '\u5de5\u5177\u63d0\u793a'],
    ['Expanded', '\u5df2\u5c55\u5f00'],
    ['Compare', '\u6bd4\u8f83'],
    ['Toggle Collapse Unchanged Regions', '\u5207\u6362\u6298\u53e0\u672a\u66f4\u6539\u533a\u57df'],
    ['Toggle Show Moved Code Blocks', '\u5207\u6362\u663e\u793a\u79fb\u52a8\u7684\u4ee3\u7801\u5757'],
    ['Switch Side', '\u5207\u6362\u4fa7\u9762'],
    ['Go to Next Difference', '\u8f6c\u5230\u4e0b\u4e00\u5904\u5dee\u5f02'],
    ['Go to Previous Difference', '\u8f6c\u5230\u4e0a\u4e00\u5904\u5dee\u5f02'],
    ["Don't ask again", '\u4e0d\u518d\u8be2\u95ee'],
    ['View Changes', '\u67e5\u770b\u66f4\u6539'],
    ['Always run', '\u59cb\u7ec8\u8fd0\u884c'],
    ['Log out?', '\u9000\u51fa\u767b\u5f55\uff1f'],
    ['Now Available', '\u73b0\u5df2\u63a8\u51fa'],
    ['Parallelize Your Work', '\u5e76\u884c\u5904\u7406\u4f60\u7684\u5de5\u4f5c'],
    [
      'Run async subagents to parallelize your requests instead of adding them to the queue',
      '\u8fd0\u884c\u5f02\u6b65\u5b50\u667a\u80fd\u4f53\u4ee5\u5e76\u884c\u5904\u7406\u4f60\u7684\u8bf7\u6c42\uff0c\u800c\u4e0d\u662f\u5c06\u5b83\u4eec\u52a0\u5165\u961f\u5217',
    ],
    ['Get Unblocked', '\u6446\u8131\u963b\u585e'],
    [
      'Ask Cursor to multitask on queued messages instead of waiting for the run to finish',
      '\u8ba9 Cursor \u5bf9\u961f\u5217\u4e2d\u7684\u6d88\u606f\u8fdb\u884c\u591a\u4efb\u52a1\u5904\u7406\uff0c\u800c\u4e0d\u662f\u7b49\u5f85\u5f53\u524d\u8fd0\u884c\u7ed3\u675f',
    ],
    ['Try now', '\u7acb\u5373\u8bd5\u7528'],
    ['Refactor code generator', '\u91cd\u6784\u4ee3\u7801\u751f\u6210\u5668'],
    ['Add tabs to leaderboard', '\u4e3a\u6392\u884c\u699c\u6dfb\u52a0\u6807\u7b7e\u9875'],
    ['Implement navigation menu', '\u5b9e\u73b0\u5bfc\u822a\u83dc\u5355'],
  ];

  for (const [originalText, changeText] of priorityPairs) {
    const entry = byOriginal.get(originalText);
    assert.ok(entry, `missing mapping: ${originalText}`);
    assert.equal(entry.changeText, changeText, originalText);
  }

  assert.equal(byOriginal.get('Search Settings')?.surface, 'settings_search');
  assert.equal(byOriginal.get('Ask Mode')?.surface, 'mode_menu');
  assert.equal(byOriginal.get('Log out?')?.surface, 'logout_dialog');
});

