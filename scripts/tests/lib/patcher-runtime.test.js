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
