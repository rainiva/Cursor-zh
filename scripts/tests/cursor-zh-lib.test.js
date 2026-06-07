const test = require('node:test');
const assert = require('node:assert/strict');

const {
  applyStaticSourceTranslations,
  applyStaticSourceTranslationsDetailed,
  analyzeCursorWinCoverage,
  analyzeProductTipsCoverage,
  analyzeDynamicRuleCoverage,
  parseLegacyWorktreeMappings,
  mergeMappings,
  compareLanguagePackVersion,
  buildTranslatedWorkbenchBundle,
  cursorWinCoverageTargets,
  defaultCursorWinCommonMappings,
  defaultCursorWinDynamicMappings,
  defaultOverlayMappings,
  evaluatePatchContracts,
  normalizeTextForComparison,
  productTipsCoverageTargets,
  selectRuntimeMappings,
  summarizeRuntimeFootprint,
  translateTextWithMappings,
  parseJsonc,
  withLocaleSetting,
} = require('../cursor-zh-lib.js');

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

test('normalizeTextForComparison normalizes casing spaces and ellipsis', () => {
  assert.equal(
    normalizeTextForComparison('  Learn   More\u2026  '),
    'learn more...'
  );
  assert.equal(normalizeTextForComparison('Sign In'), 'sign in');
  assert.equal(normalizeTextForComparison('Clos&&e Window'), 'close window');
  assert.equal(normalizeTextForComparison('E&&xit'), 'exit');
  assert.equal(normalizeTextForComparison('&&VS Code Settings'), 'vs code settings');
});

test('buildTranslatedWorkbenchBundle prepends runtime translator code and runtime config', () => {
  const bundle = buildTranslatedWorkbenchBundle({
    workbenchSource: 'console.log("workbench");',
    mappings: [{ originalText: 'General', changeText: '\u5e38\u89c4', searchType: 'exact' }],
    metadata: {
      version: '3.0.12',
      distro: 'abc123',
      runtimeConfig: {
        mode: 'balanced',
        rescanDelaysMs: [600, 1800],
        observeScopeSelectors: ['[class*="settings"]', '[class*="marketplace"]'],
        marketplaceRemoteTranslationEnabled: false,
      },
    },
  });

  assert.match(bundle, /Cursor ZH generated runtime/);
  assert.match(bundle, /const translationMappings =/);
  assert.match(bundle, /__cursorZhTranslateProductTipText/);
  assert.match(bundle, /mode":"balanced"/);
  assert.match(bundle, /rescanDelaysMs/);
  assert.match(bundle, /observeScopeSelectors/);
  assert.match(bundle, /observeDiscoveryRoot/);
  assert.match(bundle, /const documentRoot = document\.body \|\| document\.documentElement;/);
  assert.match(bundle, /this\.stageDocumentRoot = config\.stageDocumentRoot !== false;/);
  assert.match(bundle, /this\.shortExactTextFallback = config\.shortExactTextFallback !== false;/);
  assert.match(
    bundle,
    /if \(this\.stageDocumentRoot && documentRoot\) this\._stageRootForTranslation\(documentRoot\);/
  );
  assert.match(bundle, /runShortExactTextFallback\(exactFallbackRoot\)/);
  assert.match(bundle, /runShortExactTextFallback\(fallbackRoot\)/);
  assert.match(bundle, /translateExactTextNode\(node\)/);
  assert.match(
    bundle,
    /const shouldStageRoot = Boolean\(\s*root &&\s*\(root\.nodeType === Node\.ELEMENT_NODE \|\| root\.nodeType === Node\.DOCUMENT_FRAGMENT_NODE\) &&\s*!this\.hasScopedObservation\(\)\s*\);/
  );
  assert.match(bundle, /if \(shouldStageRoot\) this\._stageRootForTranslation\(root\);/);
  assert.match(bundle, /_translatedSubtrees\.delete\(specialRoot\)/);
  assert.match(bundle, /segmentedTipRoots\.add\(specialRoot\)/);
  assert.match(bundle, /this\._stagedRootSet = new WeakSet\(\);/);
  assert.match(bundle, /glass-empty-state-rotating-tips__text/);
  assert.match(bundle, /glass-empty-state-rotating-tips__chip/);
  assert.match(bundle, /cursor-zh-tip-inline/);
  assert.match(bundle, /_translatedSubtrees/);
  assert.match(bundle, /_pendingIdleRoots/);
  assert.doesNotMatch(bundle, /__cursorZhTranslateMarketplacePlugins/);
  assert.doesNotMatch(bundle, /__cursorZhTranslateMarketplaceResponse/);
  assert.match(bundle, /console\.log\("workbench"\);/);
});

test('buildTranslatedWorkbenchBundle uses lightweight rescans instead of interval polling', () => {
  const bundle = buildTranslatedWorkbenchBundle({
    workbenchSource: 'console.log("workbench");',
    mappings: [],
    metadata: {
      runtimeConfig: {
        mode: 'balanced',
        rescanDelaysMs: [600, 1800],
        observeScopeSelectors: ['[class*="settings"]', '[class*="marketplace"]'],
        marketplaceRemoteTranslationEnabled: false,
      },
    },
  });

  assert.doesNotMatch(bundle, /setInterval\(periodicScan, 2000\)/);
  assert.match(bundle, /setTimeout\(\(\) => periodicScan\(\), delay\)/);
  assert.match(bundle, /Array\.isArray\(translationMetadata\.runtimeConfig\.rescanDelaysMs\)/);
  assert.doesNotMatch(bundle, /cursor-zh:\/\/translate\?q=/);
});

test('buildTranslatedWorkbenchBundle omits runtime toggle machinery by default', () => {
  const bundle = buildTranslatedWorkbenchBundle({
    workbenchSource: 'console.log("workbench");',
    mappings: [{ originalText: 'General', changeText: '\u5e38\u89c4', searchType: 'exact' }],
    metadata: {
      runtimeConfig: {
        mode: 'balanced',
        rescanDelaysMs: [5000],
        observeScopeSelectors: ['[class*="settings"]'],
        marketplaceRemoteTranslationEnabled: false,
      },
    },
  });

  assert.doesNotMatch(bundle, /data-cursor-zh-origins/);
  assert.doesNotMatch(bundle, /restoreOriginalText/);
  assert.doesNotMatch(bundle, /clearTranslationState/);
  assert.doesNotMatch(bundle, /retranslateAll/);
  assert.doesNotMatch(bundle, /_startTogglePolling/);
  assert.doesNotMatch(bundle, /toggleSignalPath/);
  assert.doesNotMatch(bundle, /__cursorZhEnabled/);
});

test('buildTranslatedWorkbenchBundle omits runtime diagnostics in production mode by default', () => {
  const bundle = buildTranslatedWorkbenchBundle({
    workbenchSource: 'console.log("workbench");',
    mappings: [{ originalText: 'General', changeText: '\u5e38\u89c4', searchType: 'exact' }],
    metadata: {
      runtimeConfig: {
        mode: 'performance',
        stageDocumentRoot: false,
        shortExactTextFallback: false,
        rescanDelaysMs: [],
        observeScopeSelectors: ['[role="dialog"]'],
        observeAttributesOnly: true,
        observeDiscoveryAttributes: false,
        skipSubtreeOnBusy: true,
        marketplaceRemoteTranslationEnabled: false,
      },
    },
  });

  assert.doesNotMatch(bundle, /window\.__cursorZhPerf/);
  assert.doesNotMatch(bundle, /console\.table/);
  assert.doesNotMatch(bundle, /snapshot\(\) \{/);
  assert.doesNotMatch(bundle, /report\(\) \{/);
  assert.doesNotMatch(bundle, /reset\(\) \{/);
});

test('buildTranslatedWorkbenchBundle can still include runtime diagnostics when explicitly requested', () => {
  const bundle = buildTranslatedWorkbenchBundle({
    workbenchSource: 'console.log("workbench");',
    mappings: [],
    metadata: {
      runtimeDiagnosticsEnabled: true,
      runtimeConfig: {
        mode: 'profile',
        stageDocumentRoot: false,
        shortExactTextFallback: false,
        rescanDelaysMs: [],
        observeScopeSelectors: ['[role="dialog"]'],
        observeAttributesOnly: true,
        observeDiscoveryAttributes: false,
        skipSubtreeOnBusy: true,
        marketplaceRemoteTranslationEnabled: false,
      },
    },
  });

  assert.match(bundle, /window\.__cursorZhPerf/);
  assert.match(bundle, /console\.table/);
  assert.match(bundle, /this\._perf = createCursorZhPerf\(\);/);
  assert.match(bundle, /window\.__cursorZhPerf = this\._perf;/);
  assert.ok(
    bundle.indexOf('this._perf = createCursorZhPerf();') <
      bundle.indexOf('const run = () => {')
  );
});

test('buildTranslatedWorkbenchBundle initializes diagnostics before install-time scans begin', () => {
  const bundle = buildTranslatedWorkbenchBundle({
    workbenchSource: 'console.log("workbench");',
    mappings: [],
    metadata: {
      runtimeDiagnosticsEnabled: true,
      runtimeConfig: {
        mode: 'profile',
        stageDocumentRoot: false,
        shortExactTextFallback: false,
        rescanDelaysMs: [],
        observeScopeSelectors: ['[role="dialog"]'],
        observeAttributesOnly: true,
        observeDiscoveryAttributes: false,
        skipSubtreeOnBusy: true,
        marketplaceRemoteTranslationEnabled: false,
      },
    },
  });

  assert.ok(bundle.indexOf('this._perf = createCursorZhPerf();') !== -1);
  assert.ok(bundle.indexOf('this._perf.reset();') !== -1);
  assert.ok(bundle.indexOf('const run = () => {') !== -1);
  assert.ok(bundle.indexOf('periodicScan();') !== -1);
  assert.ok(bundle.indexOf('this._perf = createCursorZhPerf();') < bundle.indexOf('const run = () => {'));
  assert.ok(bundle.indexOf('this._perf.reset();') < bundle.indexOf('periodicScan();'));
});

test('summarizeRuntimeFootprint reports deterministic runtime header metrics', () => {
  const translatedSource = 'console.log("workbench");';
  const bundleText = `/* runtime */\n${translatedSource}`;
  const runtimeMappings = [{ originalText: 'Agent', changeText: 'Agent', searchType: 'exact' }];

  assert.deepEqual(
    summarizeRuntimeFootprint(bundleText, translatedSource, runtimeMappings),
    {
      runtimeHeaderChars: 14,
      runtimeHeaderKB: 0,
      runtimeMappingCount: 1,
    }
  );
});

test('buildTranslatedWorkbenchBundle includes toggle restore and retranslate functions only for experimental builds', () => {
  const bundle = buildTranslatedWorkbenchBundle({
    workbenchSource: 'console.log("workbench");',
    mappings: [{ originalText: 'General', changeText: '\u5e38\u89c4', searchType: 'exact' }],
    metadata: {
      experimentalRuntimeToggleEnabled: true,
      toggleSignalPath: '/tmp/runtime-toggle.json',
      runtimeConfig: {
        mode: 'balanced',
        rescanDelaysMs: [5000],
        observeScopeSelectors: ['[class*="settings"]'],
        marketplaceRemoteTranslationEnabled: false,
      },
    },
  });

  assert.match(bundle, /_saveOriginalText/);
  assert.match(bundle, /_saveOriginalAttr/);
  assert.match(bundle, /restoreOriginalText/);
  assert.match(bundle, /clearTranslationState/);
  assert.match(bundle, /retranslateAll/);
  assert.match(bundle, /_startTogglePolling/);
  assert.match(bundle, /toggleSignalPath/);
});

test('buildTranslatedWorkbenchBundle rewrites safe exact string literals in source', () => {
  const bundle = buildTranslatedWorkbenchBundle({
    workbenchSource: 'const labels = ["File", "Marketplace", "New Agent"];',
    mappings: [
      { originalText: 'File', changeText: '\u6587\u4ef6', searchType: 'exact' },
      { originalText: 'Marketplace', changeText: '\u5e02\u573a', searchType: 'exact' },
      { originalText: 'New Agent', changeText: '\u65b0\u5efa\u667a\u80fd\u4f53', searchType: 'exact' },
    ],
    metadata: {},
  });

  assert.match(
    bundle,
    /const labels = \["文件", "市场", "新建智能体"\];/
  );
});

test('selectRuntimeMappings prunes static exact rules and product tip scoped rules', () => {
  const runtimeMappings = selectRuntimeMappings(
    [
      'const search = "Search models";',
      'const worked = `Worked for ${q9p(n)}`;',
      'const tip = ne?.text??"";',
    ].join('\n'),
    [
      {
        originalText: 'Search models',
        changeText: '鎼滅储妯″瀷',
        searchType: 'exact',
      },
      {
        originalText: 'Worked for ${q9p(n)}',
        changeText: '澶勭悊鐢ㄦ椂 ${q9p(n)}',
        searchType: 'exact',
      },
      {
        originalText: 'No agents yet',
        changeText: '鏆傛棤 Agent',
        searchType: 'exact',
      },
      {
        originalText:
          'Use /loop to run a prompt on a schedule or keep a local agent running continuously',
        changeText:
          '浣跨敤 /loop 鍙寜璁″垝杩愯 prompt锛屾垨璁╂湰鍦?Agent鎸佺画杩愯銆?',
        searchType: 'normalizedExact',
        scopeSelectors: ['[class*="empty-state-rotating-tips"]'],
      },
      {
        originalText: 'Agent',
        changeText: '鏅鸿兘浣?',
        searchType: 'regex',
        flags: 'g',
      },
    ]
  );

  assert.deepEqual(
    runtimeMappings.map((entry) => entry.originalText),
    ['No agents yet', 'Agent']
  );
});

test('buildTranslatedWorkbenchBundle injects only runtime-relevant mappings into the general translator', () => {
  const bundle = buildTranslatedWorkbenchBundle({
    workbenchSource: [
      'const search = "Search models";',
      'const tip = ne?.text??"";',
      'const regexTarget = "Agent";',
    ].join('\n'),
    mappings: [
      {
        originalText: 'Search models',
        changeText: '鎼滅储妯″瀷',
        searchType: 'exact',
      },
      {
        originalText: 'Agent',
        changeText: '鏅鸿兘浣?',
        searchType: 'regex',
        flags: 'g',
      },
      {
        originalText:
          'Use /loop to run a prompt on a schedule or keep a local agent running continuously',
        changeText:
          '浣跨敤 /loop 鍙寜璁″垝杩愯 prompt锛屾垨璁╂湰鍦?Agent鎸佺画杩愯銆?',
        searchType: 'normalizedExact',
        scopeSelectors: ['[class*="empty-state-rotating-tips"]'],
      },
    ],
    metadata: {},
  });

  assert.match(bundle, /const search = "鎼滅储妯″瀷";/);
  assert.doesNotMatch(bundle, /"originalText": "Search models"/);
  assert.match(bundle, /"originalText": "Agent"/);
  assert.match(bundle, /const productTipMappings = \[[\s\S]*Use \/loop/);
});

test('applyStaticSourceTranslations rewrites safe exact literals for non-workbench bundles', () => {
  const translated = applyStaticSourceTranslations(
    'const menu = ["File", "Edit", "View", "Window", "Help"];',
    [
      { originalText: 'File', changeText: '\u6587\u4ef6', searchType: 'exact' },
      { originalText: 'Edit', changeText: '\u7f16\u8f91', searchType: 'exact' },
      { originalText: 'View', changeText: '\u89c6\u56fe', searchType: 'exact' },
      { originalText: 'Window', changeText: '\u7a97\u53e3', searchType: 'exact' },
      { originalText: 'Help', changeText: '\u5e2e\u52a9', searchType: 'exact' },
    ]
  );

  assert.match(
    translated,
    /const menu = \["文件", "编辑", "视图", "窗口", "帮助"\];/
  );
});

test('applyStaticSourceTranslations rewrites placeholder-based show-all templates', () => {
  const translated = applyStaticSourceTranslations(
    'const template = "<button>Show all (<!> more)</button><button>Show less</button>";',
    [
      {
        originalText: 'Show all (<!> more)',
        changeText: '显示全部（还有 <!> 项）',
        searchType: 'exact',
      },
      {
        originalText: 'Show less',
        changeText: '收起',
        searchType: 'exact',
      },
    ]
  );

  assert.match(translated, /显示全部（还有 <!> 项）/);
  assert.match(translated, /收起/);
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

test('translateTextWithMappings applies exact mappings', () => {
  const mappings = [{ originalText: 'Appearance', changeText: '\u5916\u89c2', searchType: 'exact' }];
  assert.equal(translateTextWithMappings('Appearance', mappings), '\u5916\u89c2');
});

test('translateTextWithMappings applies normalizedExact mappings', () => {
  const mappings = [
    {
      originalText: 'Sign In',
      changeText: '\u767b\u5f55',
      searchType: 'normalizedExact',
    },
  ];
  assert.equal(translateTextWithMappings('sign   in', mappings), '\u767b\u5f55');
});

test('translateTextWithMappings applies normalizedExact mappings to mnemonic menu labels', () => {
  const mappings = [
    {
      originalText: 'Close Window',
      changeText: '\u5173\u95ed\u7a97\u53e3',
      searchType: 'normalizedExact',
    },
    {
      originalText: 'VS Code Settings',
      changeText: 'VS Code \u8bbe\u7f6e',
      searchType: 'normalizedExact',
    },
  ];

  assert.equal(
    translateTextWithMappings('Clos&&e Window', mappings),
    '\u5173\u95ed\u7a97\u53e3'
  );
  assert.equal(
    translateTextWithMappings('&&VS Code Settings', mappings),
    'VS Code \u8bbe\u7f6e'
  );
});

test('translateTextWithMappings applies regex mappings', () => {
  const mappings = [
    {
      originalText: '^Something went wrong:\\s*(.+)$',
      changeText: '\u51fa\u9519\u4e86\uff1a$1',
      searchType: 'regex',
      flags: 'i',
    },
  ];
  assert.equal(
    translateTextWithMappings('Something went wrong: boom', mappings),
    '\u51fa\u9519\u4e86\uff1aboom'
  );
});

test('translateTextWithMappings respects scoped rules', () => {
  const mappings = [
    {
      originalText: 'System',
      changeText: '\u8ddf\u968f\u7cfb\u7edf',
      searchType: 'normalizedExact',
      scopeContainsText: ['Theme'],
    },
  ];

  assert.equal(
    translateTextWithMappings('System', mappings, { scopeMatched: false }),
    'System'
  );
  assert.equal(
    translateTextWithMappings('System', mappings, { scopeMatched: true }),
    '\u8ddf\u968f\u7cfb\u7edf'
  );
  assert.equal(
    translateTextWithMappings('System', mappings, { scopeText: 'Theme Light Dark' }),
    '\u8ddf\u968f\u7cfb\u7edf'
  );
});

test('analyzeProductTipsCoverage reports missing product tip mappings', () => {
  const mappings = defaultCursorWinDynamicMappings().filter(
    (entry) => !String(entry.originalText).includes('Ask mode')
  );
  const coverage = analyzeProductTipsCoverage({
    mappings,
    targets: productTipsCoverageTargets(),
  });

  assert.equal(coverage.totalTipCount, 9);
  assert.equal(coverage.mappedTipCount, 8);
  assert.deepEqual(coverage.missingTips, [
    'Ask mode uses read-only agents to research your codebase. Use shift+tab to enable',
  ]);
});

test('analyzeCursorWinCoverage reports missing mappings against workbench source', () => {
  const workbenchSource = [
    'General',
    'Appearance',
    'Plan & Usage',
    'System Notifications',
    'Show system notifications when Agent completes or needs attention',
    'Share Data',
  ].join('\n');
  const mappings = [
    { originalText: 'General', changeText: '\u5e38\u89c4', searchType: 'exact' },
    { originalText: 'Appearance', changeText: '\u5916\u89c2', searchType: 'exact' },
    { originalText: 'Notifications', changeText: '\u901a\u77e5', searchType: 'exact' },
    {
      originalText: 'System Notifications',
      changeText: '\u7cfb\u7edf\u901a\u77e5',
      searchType: 'exact',
    },
  ];

  const coverage = analyzeCursorWinCoverage({
    workbenchSource,
    mappings,
    targets: cursorWinCoverageTargets(),
  });

  assert.equal(coverage.bundleTargetCount, 7);
  assert.equal(coverage.mappedTargetCount, 4);
  assert.deepEqual(coverage.missingTargets, [
    'Plan & Usage',
    'Show system notifications when Agent completes or needs attention',
    'Share Data',
  ]);
});

test('analyzeDynamicRuleCoverage reports missing dynamic rules in bundle', () => {
  const targets = defaultCursorWinDynamicMappings();
  const mappings = targets.filter(
    (item) => item.originalText !== '^Something went wrong:\\s*(.+)$'
  );
  const coverage = analyzeDynamicRuleCoverage({
    workbenchSource: [
      'Sign in',
      'Learn More',
      'Browser Tab: Example',
      'Something went wrong: Boom',
      'Theme',
      'System',
    ].join('\n'),
    mappings,
    targets,
  });

  assert.deepEqual(coverage.missingRules, ['Something went wrong:']);
  assert.equal(coverage.mappedRuleCount, coverage.bundleRuleCount - coverage.missingRules.length);
  assert.ok(coverage.bundleRuleCount > 0);
});

test('applyStaticSourceTranslations leaves marketplace data loading call sites unchanged', () => {
  const translated = applyStaticSourceTranslations(
    [
      'async function FXy(n){const t=[...(await n.listMarketplacePlugins({})).plugins].map(l2);try{const i=await n.listMarketplaces({}),r=await Promise.all(i.marketplaces.map(async o=>[...(await n.listMarketplacePlugins({marketplaceId:o.id})).plugins].map(l2))),s=new Map;return t}}',
      'async function refresh(t){const r=[...(await t.listMarketplacePlugins(new I_n({}),{headers:Vb(Yr())})).plugins].map(l2),s=await t.listMarketplaces(new N9a({}),{headers:Vb(Yr())});return {r,s}}',
      'function JNt(n){return{async listMarketplacePlugins(e){return await(await n.dashboardClient()).listMarketplacePlugins(new I_n(e),{headers:Vb(Yr())})},async getPlugin(e){return await(await n.dashboardClient()).getPlugin(new OFu(e),{headers:Vb(Yr())})}}}',
    ].join('\n'),
    []
  );

  assert.match(
    translated,
    /const t=\[\.\.\.\(await n\.listMarketplacePlugins\(\{\}\)\)\.plugins\]\.map\(l2\);/
  );
  assert.doesNotMatch(translated, /__cursorZhTranslateMarketplacePlugins/);
  assert.doesNotMatch(translated, /__cursorZhTranslateMarketplaceResponse/);
});

test('applyStaticSourceTranslations rewrites product tip render path to use runtime helper', () => {
  const translated = applyStaticSourceTranslations(
    'const Re=z?U?"":mkE:U?"":ne?.text??"",Be=z?U?"tip-dismissed-exiting":"tip-dismissed";',
    []
  );

  assert.match(
    translated,
    /window\.__cursorZhTranslateProductTipText\?window\.__cursorZhTranslateProductTipText\(ne\?\.text\?\?"\"\):ne\?\.text\?\?""/
  );
});

test('applyStaticSourceTranslationsDetailed reports static patch contracts for key surfaces', () => {
  const result = applyStaticSourceTranslationsDetailed(
    [
      'const search = "Search models";',
      'const followUp = "Send follow-up";',
      'const Re=z?U?"":mkE:U?"":ne?.text??"",Be=',
    ].join('\n'),
    defaultCursorWinDynamicMappings()
  );

  assert.equal(result.contracts.search_models.matchCount, 1);
  assert.equal(result.contracts.search_models.severityOnMiss, 'error');
  assert.equal(result.contracts.send_follow_up.matchCount, 1);
  assert.equal(result.contracts.product_tips_render_hook.matchCount, 1);
  assert.equal(result.contracts.product_tips_render_hook.fallbackMode, 'runtime');
  assert.equal(result.contracts.product_tips_render_hook.severityOnMiss, 'warning');
});

test('evaluatePatchContracts blocks performance output when a required no-fallback contract misses', () => {
  const evaluation = evaluatePatchContracts({
    runtimeMode: 'performance',
    contracts: {
      search_models: {
        required: true,
        matchCount: 0,
        fallbackMode: 'none',
        surface: 'composer',
      },
    },
  });

  assert.deepEqual(evaluation.issues, [
    'Required static patch contract failed: search_models',
  ]);
});

test('applyStaticSourceTranslations rewrites activity timeline and composer literals', () => {
  const translated = applyStaticSourceTranslations(
    [
      'const search = "Search models";',
      'const subtitle = "Balanced quality and speed, recommended for most tasks";',
      'const followUp = "Send follow-up";',
      'const emptyTitle = "No agents yet";',
      'const emptyDescription = "Create an agent to start working on tasks";',
      'const planning = "Planning next moves";',
      'const thought = "Thought";',
      'const thinking = "Thinking";',
      'const worked = `Worked for ${q9p(n)}`;',
      'const duration = `for ${n}s`;',
      'const brief = "briefly";',
      'const files = `${i} file${i===1?"":"s"}`;',
      'const searches = `${n.searches} search${n.searches===1?"":"es"}`;',
      'const commands = `ran ${e} command${e===1?"":"s"}`;',
      'const browser = `${i} browser action${i===1?"":"s"}`;',
      'const read = `${r} L${s.startLine}-${s.endLine}`;',
      'const grepSuffix = ` in ${Pat(t.path)}`;',
      'const glob = `${r} in ${Pat(i)}`;',
      'const switched = "Switched workspace root";',
    ].join('\n'),
    defaultCursorWinDynamicMappings()
  );

  assert.match(translated, /const search = "搜索模型";/);
  assert.match(translated, /const subtitle = "质量与速度均衡，适合大多数任务";/);
  assert.match(translated, /const followUp = "继续追问";/);
  assert.match(translated, /const emptyTitle = "暂无 Agent";/);
  assert.match(translated, /const emptyDescription = "创建一个 Agent，开始处理任务";/);
  assert.match(translated, /const planning = "正在规划下一步";/);
  assert.ok(translated.includes('const thought = "思考";'));
  assert.ok(translated.includes('const thinking = "思考中";'));
  assert.ok(translated.includes('const worked = `处理用时 ${q9p(n)}`;'));
  assert.ok(translated.includes('const duration = `${n} 秒`;'));
  assert.ok(translated.includes('const brief = "片刻";'));
  assert.ok(translated.includes('const files = `${i} 个文件`;'));
  assert.ok(translated.includes('const searches = `${n.searches} 次搜索`;'));
  assert.ok(translated.includes('const commands = `已运行 ${e} 个命令`;'));
  assert.ok(translated.includes('const browser = `${i} 个浏览器操作`;'));
  assert.ok(translated.includes('const read = `${r} 第 ${s.startLine}-${s.endLine} 行`;'));
  assert.ok(translated.includes('const grepSuffix = ` 在 ${Pat(t.path)}`;'));
  assert.ok(translated.includes('const glob = `在 ${Pat(i)} 中搜索 ${r}`;'));
  assert.match(translated, /const switched = "已切换工作区根目录";/);
});
