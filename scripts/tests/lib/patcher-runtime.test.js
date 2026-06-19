const test = require('node:test');
const assert = require('node:assert/strict');

const {
applyStaticSourceTranslations,
applyStaticSourceTranslationsDetailed,
buildTranslatedWorkbenchBundle,
defaultCursorWinDynamicMappings,
evaluatePatchContracts,
selectRuntimeMappings,
summarizeRuntimeFootprint,
} = require('../../cursor-zh-lib.js');

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

test('sourceHasQuotedLiteral uses fast quoted-literal detection for common strings', () => {
  const { sourceHasQuotedLiteral } = require('../../lib/patcher/runtime-selector.js');

  assert.equal(sourceHasQuotedLiteral('const label = "Search models";', 'Search models'), true);
  assert.equal(sourceHasQuotedLiteral("const label = 'Sign In';", 'Sign In'), true);
  assert.equal(sourceHasQuotedLiteral('const label = "Other";', 'Search models'), false);
});

test('sourceHasQuotedLiteral uses workbenchIndex when provided', () => {
  const { sourceHasQuotedLiteral } = require('../../lib/patcher/runtime-selector.js');
  const { createWorkbenchIndex } = require('../../lib/patcher/workbench-index.js');

  const index = createWorkbenchIndex('const label = "Search models";');
  assert.equal(sourceHasQuotedLiteral('', 'Search models', index), true);
  assert.equal(sourceHasQuotedLiteral('', 'Other', index), false);
});

test('sourceHasQuotedLiteral avoids repeated full-source regex checks when workbench index is authoritative', () => {
  const { sourceHasQuotedLiteral } = require('../../lib/patcher/runtime-selector.js');
  const { createWorkbenchIndex } = require('../../lib/patcher/workbench-index.js');

  const padding = `"General";${'a'.repeat(5_000_000)};"File";`;
  const index = createWorkbenchIndex(padding);
  const startedAt = Date.now();

  for (let i = 0; i < 600; i += 1) {
    assert.equal(sourceHasQuotedLiteral(padding, 'a', index), false);
  }

  const elapsedMs = Date.now() - startedAt;
  assert.ok(elapsedMs < 200, `authoritative index checks took ${elapsedMs}ms`);
  assert.equal(sourceHasQuotedLiteral(padding, 'File', index), true);
});

test('applyStaticSourceTranslationsDetailed satisfies search_models when index misses quoted literal', () => {
  const { applyStaticSourceTranslationsDetailed } = require('../../lib/patcher/contracts.js');
  const incompleteIndex = {
    sourceText: 'const search = "Search models";',
    hasQuotedLiteral() {
      return false;
    },
  };

  const result = applyStaticSourceTranslationsDetailed(
    incompleteIndex.sourceText,
    [{ originalText: 'Search models', changeText: '搜索模型', searchType: 'exact' }],
    incompleteIndex
  );

  assert.equal(result.contracts.search_models.matchCount, 1);
  assert.match(result.translatedSource, /"搜索模型"/);
});

test('selectRuntimeMappings accepts workbenchIndex and matches unindexed behavior', () => {
  const { selectRuntimeMappings } = require('../../lib/patcher/runtime-selector.js');
  const { createWorkbenchIndex } = require('../../lib/patcher/workbench-index.js');

  const workbenchSource = [
    'const search = "Search models";',
    'const worked = `Worked for ${q9p(n)}`;',
    'const tip = ne?.text??"";',
  ].join('\n');
  const mappings = [
    { originalText: 'Search models', changeText: '搜索模型', searchType: 'exact' },
    { originalText: 'Worked for ${q9p(n)}', changeText: '处理用时', searchType: 'exact' },
    { originalText: 'No agents yet', changeText: '暂无 Agent', searchType: 'exact' },
  ];
  const index = createWorkbenchIndex(workbenchSource);

  assert.deepEqual(
    selectRuntimeMappings(workbenchSource, mappings, index).map((entry) => entry.originalText),
    selectRuntimeMappings(workbenchSource, mappings).map((entry) => entry.originalText)
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
  assert.match(bundle, /"originalText"\s*:\s*"Agent"/);
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

test('applyStaticSourceTranslations rewrites legacy product tip render path to use runtime helper', () => {
  const translated = applyStaticSourceTranslations(
    'const Re=z?U?"":mkE:U?"":ne?.text??"",Be=z?U?"tip-dismissed-exiting":"tip-dismissed";',
    []
  );

  assert.match(
    translated,
    /window\.__cursorZhTranslateProductTipText\?window\.__cursorZhTranslateProductTipText\(ne\?\.text\?\?"\"\):ne\?\.text\?\?""/
  );
});

test('applyStaticSourceTranslations applies glass round5 embedded patches', () => {
  const translated = applyStaticSourceTranslations(
    [
      'ge.push({id:"fork-chat",section:"actions",label:"Fork",icon:"split",onSelect:h})',
      'ge.push({id:"export-chat",section:"actions",label:"Export",icon:"file-arrow-right-up",onSelect:p})',
      'var z5C="Search Settings";placeholder:z5C',
      'children:"Find in Changes"',
      'placeholder:"Open any file, URL, ..."',
      'children:"Canvas"',
      'children:"Open Tabs"',
      'var k71=[{value:"unified",label:"Unified"},{value:"split",label:"Split"}]',
      'subtitle:"Balanced quality and speed, recommended for most tasks"',
      'sectionHeaderLabel:`On ${n.workspaceName.trim()||"workspace"}`',
      'var R9I={lastTurn:"Last Turn",uncommitted:"Uncommitted",unstaged:"Unstaged",staged:"Staged",branch:"Branch"}',
      'return n==="lastTurn"&&e===!0?"Current Turn":R9I[n]',
      'return t===0?"No committed changes":`No ${e} Changes`',
    ].join('\n'),
    []
  );

  assert.match(translated, /label:"分叉"/);
  assert.match(translated, /label:"导出"/);
  assert.match(translated, /z5C="搜索设置"/);
  assert.match(translated, /children:"在更改中查找"/);
  assert.match(translated, /placeholder:"打开任意文件、URL\.\.\."/);
  assert.match(translated, /children:"画布"/);
  assert.match(translated, /children:"打开的标签页"/);
  assert.match(translated, /label:"统一"/);
  assert.match(translated, /label:"拆分"/);
  assert.match(translated, /subtitle:"质量与速度均衡，适合大多数任务"/);
  assert.match(translated, /sectionHeaderLabel:`在 \$\{n\.workspaceName\.trim\(\)\|\|"工作区"\}`/);
  assert.match(translated, /uncommitted:"未提交"/);
  assert.match(translated, /"当前轮次"/);
  assert.match(translated, /"没有已提交的更改"/);
  assert.match(translated, /`没有\$\{e\}的更改`/);
});

test('applyStaticSourceTranslations applies glass round6 embedded patches', () => {
  const translated = applyStaticSourceTranslations(
    [
      'placeholder:"Add agents, context, tools..."',
      'description:"Generates a robust implementation plan prior to writing code, asking clarifying questions when needed."',
      'description:"Pinpoints the root cause of an issue by generating hypotheses and gathering runtime evidence."',
      'description:"Uses a fleet of subagents to parallelize requests, instead of adding them to a queue."',
      'description:"Explores the codebase and answer questions without making  edits."',
      'function Onh(n){return`${n} Mode`}',
      'function iAC(n){return`${n} Mode`}',
      'title:"Plan Mode"',
      'title:"Debug Mode"',
      'title:"Multitask Mode"',
      'title:"Ask Mode"',
      'children:"Manage View"',
      'se(fxe,{title:"Tools",get titleRowExtra(){return se(RB,',
    ].join('\n'),
    []
  );

  assert.match(translated, /placeholder:"添加智能体、上下文和工具\.\.\."/);
  assert.match(translated, /description:"在编写代码前生成可靠的实现计划，必要时提出澄清问题。"/);
  assert.match(translated, /description:"通过生成假设并收集运行时证据，定位问题的根本原因。"/);
  assert.match(translated, /description:"使用子智能体并行处理请求，而不是将它们加入队列。"/);
  assert.match(translated, /description:"探索代码库并回答问题，不进行编辑。"/);
  assert.match(translated, /function Onh\(n\)\{return`\$\{n\}模式`\}/);
  assert.match(translated, /function iAC\(n\)\{return`\$\{n\}模式`\}/);
  assert.match(translated, /title:"规划模式"/);
  assert.match(translated, /title:"调试模式"/);
  assert.match(translated, /title:"多任务模式"/);
  assert.match(translated, /title:"提问模式"/);
  assert.match(translated, /children:"管理视图"/);
  assert.match(translated, /title:"工具"/);
});

test('applyStaticSourceTranslations applies glass round7 embedded patches', () => {
  const translated = applyStaticSourceTranslations(
    [
      'title:"Good response"',
      'title:"Bad response"',
      'return t<dxh?"just now":t<mxh?',
      'return"just now"',
      'R=x==="now"?"Updated just now":x?',
      'sectionHeaderLabel:`On ${n.workspaceName.trim()||"workspace"}`',
    ].join('\n'),
    []
  );

  assert.match(translated, /title:"回答不错"/);
  assert.match(translated, /title:"回答不佳"/);
  assert.match(translated, /return t<dxh\?"刚刚":t<mxh\?/);
  assert.match(translated, /return"刚刚"/);
  assert.match(translated, /R=x==="now"\?"刚刚更新":x\?/);
  assert.match(translated, /sectionHeaderLabel:`在 \$\{n\.workspaceName\.trim\(\)\|\|"工作区"\}`/);
});

test('applyStaticSourceTranslations applies glass round8 embedded patches', () => {
  const translated = applyStaticSourceTranslations(
    [
      'title:"Home MCP Servers",description:"Servers available from Home."',
      'label:"Copy Messages"',
      'Waiting for <!> command<!> to finish',
      'rog="Agent is waiting for a command to finish."',
      'Lo_="Parallelize Build with Multitask Mode."',
      'e()?"Plan Mode":"Debug Mode"',
      'Jr(new Nr,JBe),""),"Debug Mode"),"Whether additional debug information shall be generated."',
      'return t<dxh?"just now":t<mxh?`${Math.floor(t/dxh)}m ago`:t<mOi?`${Math.floor(t/mxh)}h ago`:t<j3g?`${Math.floor(t/mOi)}d ago`',
      'R=x==="now"?"Updated just now":x?`Last updated ${x} ago`:void 0',
    ].join('\n'),
    []
  );

  assert.match(translated, /title:"Home MCP 服务器",description:"来自 Home 的可用服务器。"/);
  assert.match(translated, /label:"复制消息"/);
  assert.match(translated, /正在等待 <!> 个命令<!> 完成/);
  assert.match(translated, /rog="Agent 正在等待命令完成。"/);
  assert.match(translated, /Lo_="使用多任务模式并行构建。"/);
  assert.match(translated, /e\(\)\?"规划模式":"调试模式"/);
  assert.match(translated, /"调试模式"\),"是否应生成额外的调试信息。"/);
  assert.match(translated, /\$\{Math\.floor\(t\/dxh\)\}分钟前/);
  assert.match(translated, /\$\{Math\.floor\(t\/mxh\)\}小时前/);
  assert.match(translated, /\$\{Math\.floor\(t\/mOi\)\}天前/);
  assert.match(translated, /`上次更新于 \$\{x\} 前`/);
});

test('applyStaticSourceTranslations applies glass round9 embedded patches', () => {
  const translated = applyStaticSourceTranslations(
    [
      'return{action:"Waiting",details:_}}if(p)return{action:"Wait skipped",details:""}',
      'case Xt.AWAIT:return["Waiting","Waited","Wait skipped"]',
      'xe=Me(()=>Ae()?"Wait skipped":"Waited")',
    ].join('\n'),
    []
  );

  assert.match(translated, /action:"已跳过等待",details:""/);
  assert.match(translated, /\["等待中","已等待","已跳过等待"\]/);
  assert.match(translated, /\?"已跳过等待":"已等待"/);
});

test('applyStaticSourceTranslations applies glass app menu embedded patches', () => {
  const translated = applyStaticSourceTranslations(
    [
      'U(li.Item,{leftSection:p,onSelect:u,children:"Shortcuts"})',
      'U(li.Item,{leftSection:b,onSelect:()=>a(oXP),children:"Contact Us"})',
      'title:Ft(11756,"Check for Updates...")',
    ].join('\n'),
    []
  );

  assert.match(translated, /children:"快捷键"/);
  assert.match(translated, /children:"联系我们"/);
  assert.match(translated, /Ft\(11756,"检查更新\.\.\."\)/);
});

test('applyStaticSourceTranslations rewrites glass composer follow-up ternary literals', () => {
  const translated = applyStaticSourceTranslations(
    'const uv=xb?"Drop here to attach...":ze?"Send follow-up with subagent":be.header.source==="claude-code"?"Continue chatting in Cursor":"Send follow-up";',
    defaultCursorWinDynamicMappings()
  );

  assert.match(translated, /"拖放到此处以附加\.\.\."/);
  assert.match(translated, /"向子 Agent 继续追问"/);
  assert.match(translated, /"在 Cursor 中继续聊天"/);
  assert.match(translated, /"继续追问"/);
  assert.doesNotMatch(translated, /Send follow-up/);
  assert.doesNotMatch(translated, /Continue chatting in Cursor/);
  assert.doesNotMatch(translated, /Drop here to attach/);
});

test('applyStaticSourceTranslations rewrites glass v2 product tip render path to use runtime helper', () => {
  const translated = applyStaticSourceTranslations(
    'const Ue=j?W?"":QoI:W?"":le?.text??"",Pe=j?W?"tip-dismissed-exiting":"tip-dismissed":W?`${le?.id??"tip"}-exiting`:le?.id??"tip",Ge=!j,Ye=Ge&&!z&&',
    []
  );

  assert.match(
    translated,
    /window\.__cursorZhTranslateProductTipText\?window\.__cursorZhTranslateProductTipText\(le\?\.text\?\?"\"\):le\?\.text\?\?""/
  );
});

test('applyStaticSourceTranslationsDetailed reports static patch contracts for key surfaces', () => {
  const result = applyStaticSourceTranslationsDetailed(
    [
      'const search = "Search models";',
      'const followUp = "Add a follow-up";',
      'const Ue=j?W?"":QoI:W?"":le?.text??"",Pe=j?W?"tip-dismissed-exiting":"tip-dismissed"',
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

test('evaluatePatchContracts skips required contracts that are not applicable to the workbench', () => {
  const evaluation = evaluatePatchContracts({
    runtimeMode: 'performance',
    contracts: {
      send_follow_up: {
        required: true,
        matchCount: 0,
        notApplicable: true,
        fallbackMode: 'none',
        surface: 'composer',
      },
    },
  });

  assert.deepEqual(evaluation.issues, []);
});

test('applyStaticSourceTranslations rewrites activity timeline and composer literals', () => {
  const translated = applyStaticSourceTranslations(
    [
      'const search = "Search models";',
      'const subtitle = "Balanced quality and speed, recommended for most tasks";',
      'const followUp = "Add a follow-up";',
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
  assert.match(translated, /const followUp = "添加追问";/);
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
