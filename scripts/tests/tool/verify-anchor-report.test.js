const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createToolPaths } = require('../../tool/paths.js');
const { assertRuntimeFootprintBudget } = require('../../tool/runtime-strategy.js');
const { createVerifyModule } = require('../../tool/verify.js');
const { createStageTimer } = require('../../tool/timing.js');
const {
  createSessionCache,
  canReuseManifestCoverage,
  canReuseManifestStaticContracts,
  createMappingInfoFromManifest,
  collectMappingSourceSnapshots,
} = require('../../tool/session-cache.js');

const RUNTIME_HEADER_COMMENT =
  '/* Cursor ZH generated runtime: do not edit generated file directly. */';

function createHarness(workspaceRoot, overrides = {}) {
  const toolPaths = createToolPaths(workspaceRoot);
  const installDir = path.join(workspaceRoot, 'cursor');
  const context = {
    paths: {
      installDir,
      resourcesAppDir: path.join(installDir, 'resources/app'),
      packageJsonPath: path.join(installDir, 'resources/app/package.json'),
      translatorBootstrapPath: path.join(installDir, 'resources/app/out/cursorTranslatorMain.js'),
      mainOriginalPath: path.join(installDir, 'resources/app/out/main.js'),
      mainTranslatedPath: path.join(installDir, 'resources/app/out/main_translated.js'),
      nlsMessagesPath: path.join(installDir, 'resources/app/out/nls.messages.json'),
      workbenchOriginalPath: path.join(
        installDir,
        'resources/app/out/vs/workbench/workbench.desktop.main.js'
      ),
      workbenchTranslatedPath: path.join(
        installDir,
        'resources/app/out/vs/workbench/workbench.desktop.main_translated.js'
      ),
      argvPath: path.join(installDir, 'data/argv.json'),
      userLocaleMirrorPath: path.join(installDir, 'data/locale.json'),
    },
  };

  const verifyModule = createVerifyModule({
    toolPaths,
    fs,
    readText: (filePath) => fs.readFileSync(filePath, 'utf8'),
    readJson: (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8')),
    readJsonIfExists: (filePath, fallback) => {
      if (!fs.existsSync(filePath)) {
        return fallback;
      }
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    },
    sha256OfFile: () => 'same-hash',
    compareLanguagePackVersion: () => ({ compatible: true }),
    readArgvConfig: () => ({ locale: 'zh-cn' }),
    loadMergedMappings: () => ({
      baseMappings: [],
      overlayMappings: [],
      cursorWinCommonMappings: [],
      dynamicMappings: [],
      mergedMappings: [],
    }),
    buildCursorWinCoverage: () => ({
      totalTargetCount: 1,
      bundleTargetCount: 1,
      mappedTargetCount: 1,
      missingTargets: [],
      sourceAvailable: true,
    }),
    buildDynamicCoverage: () => ({
      totalRuleCount: 1,
      bundleRuleCount: 1,
      mappedRuleCount: 1,
      missingRules: [],
      sourceAvailable: true,
    }),
    buildProductTipsCoverage: () => ({
      totalTipCount: 1,
      mappedTipCount: 1,
      missingTips: [],
    }),
    defaultCursorWinDynamicMappings: () => [],
    detectAppliedRuntimeMode: () => 'performance',
    buildRuntimeMappingsInfo: () => ({
      workbenchSource: 'workbench',
      runtimeMappings: [],
    }),
    buildRuntimeStrategyReport: (_mappingInfo, _runtimeMappings, footprint) => ({
      mode: 'performance',
      rescanDelaysMs: [],
      scopeSelectorCount: 1,
      marketplaceRemoteTranslationEnabled: false,
      runtimeMappingCount: footprint?.runtimeMappingCount ?? 0,
      runtimeHeaderChars: footprint?.runtimeHeaderChars ?? 0,
      runtimeHeaderKB: footprint?.runtimeHeaderKB ?? 0,
      prunedMappingCount: 0,
    }),
    parseInstalledRuntimeArtifact: () => null,
    summarizeStaticPatchContractsFromTranslatedSource: () => ({}),
    evaluatePatchContracts: () => ({ issues: [], warnings: [] }),
    summarizeRuntimeFootprint: () => ({
      runtimeMappingCount: 0,
      runtimeHeaderChars: 0,
      runtimeHeaderKB: 0,
    }),
    isTranslatorBootstrapSource: () => true,
    createBootstrapSource: () => 'bootstrap',
    hasInstalledRuntimeHeader: () => true,
    createStageTimer,
    createSessionCache,
    canReuseManifestCoverage,
    canReuseManifestStaticContracts,
    createMappingInfoFromManifest,
    assertRuntimeFootprintBudget,
    ...overrides,
  });

  return { toolPaths, context, verifyModule };
}

function seedInstalledFixture(context, toolPaths, { translatedWorkbenchText }) {
  const files = {
    [context.paths.packageJsonPath]: JSON.stringify({ main: './out/cursorTranslatorMain.js' }),
    [context.paths.translatorBootstrapPath]: 'bootstrap',
    [context.paths.mainTranslatedPath]: 'main-translated',
    [context.paths.nlsMessagesPath]: '{}',
    [context.paths.workbenchTranslatedPath]: translatedWorkbenchText,
    [context.paths.workbenchOriginalPath]: 'workbench-original',
    [context.paths.argvPath]: '{}',
    [toolPaths.baseMappingPath]: '[]',
    [toolPaths.overlayMappingPath]: '[]',
    [toolPaths.cursorWinCommonPath]: '[]',
    [toolPaths.dynamicMappingPath]: '[]',
    [toolPaths.generatedMainPath]: 'main-translated',
    [toolPaths.generatedNlsMessagesPath]: '{}',
    [toolPaths.generatedWorkbenchPath]: translatedWorkbenchText,
  };
  for (const [filePath, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  }
}

function seedAnchors(toolPaths, anchors) {
  fs.mkdirSync(path.dirname(toolPaths.cursorWinAnchorsPath), { recursive: true });
  fs.writeFileSync(toolPaths.cursorWinAnchorsPath, JSON.stringify(anchors, null, 2));
}

function runVerify(harness) {
  return harness.verifyModule.verifyState(
    harness.context,
    { pkg: { main: './out/cursorTranslatorMain.js' }, product: { vscodeVersion: '1.99.0' } },
    { version: '1.99.0' },
    { profile: false, persistVerifySession: false }
  );
}

function landingReportPath(toolPaths) {
  return path.join(toolPaths.harvestReportsDir, 'verify-landing-report.json');
}

const STABLE_GLASS_ANCHOR = {
  anchorType: 'glassCommand',
  anchorId: 'copy-messages',
  field: 'label',
  changeText: '复制会话记录',
  searchType: 'anchor',
  surface: 'context_menu',
};
const UNSTABLE_SLUG_ANCHOR = {
  anchorType: 'settingsSlug',
  anchorId: 'gone-legacy-slug',
  field: 'label',
  changeText: '不会命中',
  searchType: 'anchor',
  surface: 'settings_search',
  unstable: true,
};

test('verify 07：稳定锚点缺席产 issue、unstable 缺席降级 warning、报告落盘', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-anchor-'));
  const harness = createHarness(workspaceRoot);
  seedInstalledFixture(harness.context, harness.toolPaths, {
    translatedWorkbenchText: `${RUNTIME_HEADER_COMMENT}\nconst body = 1;`,
  });
  seedAnchors(harness.toolPaths, [STABLE_GLASS_ANCHOR, UNSTABLE_SLUG_ANCHOR]);

  const result = runVerify(harness);

  assert.ok(
    result.issues.some((line) => line.includes('copy-messages')),
    `稳定锚点缺席应产 issue，实际 issues: ${JSON.stringify(result.issues)}`
  );
  assert.ok(
    !result.issues.some((line) => line.includes('gone-legacy-slug')),
    'unstable 锚点缺席不得产 issue'
  );
  assert.ok(
    result.warnings.some((line) => line.includes('unstable')),
    `unstable 锚点缺席应降级 warning，实际 warnings: ${JSON.stringify(result.warnings)}`
  );
  assert.ok(
    fs.existsSync(landingReportPath(harness.toolPaths)),
    '锚点落地报告应写入 state/reports/verify-landing-report.json'
  );
});

test('verify 07：全部 found + applied 产 info 命中率统计且无锚点 issue', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-anchor-'));
  const harness = createHarness(workspaceRoot);
  const body = `${RUNTIME_HEADER_COMMENT}\nregisterAction({id:"copy-messages",label:"复制会话记录"});`;
  seedInstalledFixture(harness.context, harness.toolPaths, { translatedWorkbenchText: body });
  seedAnchors(harness.toolPaths, [STABLE_GLASS_ANCHOR]);

  const result = runVerify(harness);

  assert.ok(
    result.info.some((line) => /锚点命中/.test(line)),
    `全部命中应产 info 命中率统计，实际 info: ${JSON.stringify(result.info)}`
  );
  assert.ok(
    !result.issues.some((line) => line.includes('copy-messages')),
    `锚点已落地不应产 issue，实际 issues: ${JSON.stringify(result.issues)}`
  );
});

test('verify 07：锚点在场但 changeText 未落地产 issue 且清单落盘', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-anchor-'));
  const harness = createHarness(workspaceRoot);
  const body = `${RUNTIME_HEADER_COMMENT}\nregisterAction({id:"copy-messages",label:"Copy Transcript"});`;
  seedInstalledFixture(harness.context, harness.toolPaths, { translatedWorkbenchText: body });
  seedAnchors(harness.toolPaths, [STABLE_GLASS_ANCHOR]);

  const result = runVerify(harness);

  assert.ok(
    result.issues.some((line) => line.includes('copy-messages')),
    `found 但未落地应产 issue，实际 issues: ${JSON.stringify(result.issues)}`
  );
  const report = JSON.parse(fs.readFileSync(landingReportPath(harness.toolPaths), 'utf8'));
  assert.ok(
    (report.anchors?.foundNotApplied || []).some((e) => e.anchorId === 'copy-messages'),
    '未落地锚点应出现在报告 foundNotApplied 清单'
  );
});

test('verify 07：static-only exact 条目 changeText 缺失产 issue 且清单落盘', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-anchor-'));
  const harness = createHarness(workspaceRoot, {
    loadMergedMappings: () => ({
      baseMappings: [],
      overlayMappings: [],
      cursorWinCommonMappings: [],
      dynamicMappings: [],
      mergedMappings: [
        {
          searchType: 'exact',
          originalText: 'Stale Exact Target',
          changeText: '陈旧词条',
          surface: 'command_palette',
        },
      ],
    }),
  });
  const body = `${RUNTIME_HEADER_COMMENT}\nregisterAction({id:"copy-messages",label:"复制会话记录"});const t="Stale Exact Target";`;
  seedInstalledFixture(harness.context, harness.toolPaths, { translatedWorkbenchText: body });
  seedAnchors(harness.toolPaths, [STABLE_GLASS_ANCHOR]);

  const result = runVerify(harness);

  assert.ok(
    result.issues.some((line) => line.includes('Stale Exact Target')),
    `exact 静态未落地应产 issue，实际 issues: ${JSON.stringify(result.issues)}`
  );
  const report = JSON.parse(fs.readFileSync(landingReportPath(harness.toolPaths), 'utf8'));
  assert.ok(
    (report.exact?.failures || []).some((e) => e.originalText === 'Stale Exact Target'),
    'exact 落地失败应出现在报告 failures 清单'
  );
});

test('verify 07：manifest anchors 快照哈希不一致产 issue（防未重新 apply 假阳性）', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-anchor-'));
  const harness = createHarness(workspaceRoot);
  const body = `${RUNTIME_HEADER_COMMENT}\nregisterAction({id:"copy-messages",label:"复制会话记录"});`;
  seedInstalledFixture(harness.context, harness.toolPaths, { translatedWorkbenchText: body });
  seedAnchors(harness.toolPaths, [STABLE_GLASS_ANCHOR]);

  const manifest = {
    generatedAt: new Date().toISOString(),
    hashes: { cursorWinAnchors: 'stale-anchors-hash' },
  };
  fs.mkdirSync(path.dirname(harness.toolPaths.buildManifestPath), { recursive: true });
  fs.writeFileSync(harness.toolPaths.buildManifestPath, JSON.stringify(manifest));

  const result = runVerify(harness);

  assert.ok(
    result.issues.some((line) => /anchors/.test(line) && /apply/.test(line)),
    `anchors 快照哈希不一致应产 issue，实际 issues: ${JSON.stringify(result.issues)}`
  );
});

// 任务 11（RC-2 + 验收加固）：runtime 死数据判定删除——运行时头部含 changeText
// 不再构成落地（历史上 [null,"继续工作"] 死数据被误判 runtime-applied）。
// forceRuntime 标记对 anchor 失效，一律按静态严苛口径核验。
test('anchor-landing 模块：运行时头部死数据不得再判 runtime-applied（按静态口径核验）', () => {
  const { evaluateAnchorLanding } = require('../../lib/analyzer/anchor-landing.js');
  const runtimeAnchor = {
    anchorType: 'i18nKey',
    anchorId: 'glass.panel.keepWorking',
    changeText: '继续工作',
    searchType: 'anchor',
    surface: 'agent_panel',
    forceRuntime: true,
  };
  const { verdicts, stats } = evaluateAnchorLanding({
    anchors: [runtimeAnchor],
    bundles: [
      {
        name: 'desktop',
        // 正文默认文案仍英文（静态未落地），头部虽含 changeText 但属引擎不执行的死数据。
        bodyText: 'x("glass.panel.keepWorking","Keep Working")',
        headerText: '/* runtime */ [[null,"继续工作"]]',
      },
    ],
  });
  assert.equal(verdicts[0].status, 'found-not-applied');
  assert.equal(stats.stableApplied, 0);
});

test('anchor-landing 模块：i18nKey 静态落地在正确邻域内判 applied（forceRuntime 不再分叉）', () => {
  const { evaluateAnchorLanding } = require('../../lib/analyzer/anchor-landing.js');
  const runtimeAnchor = {
    anchorType: 'i18nKey',
    anchorId: 'glass.panel.keepWorking',
    changeText: '继续工作',
    searchType: 'anchor',
    forceRuntime: true,
  };
  const { verdicts, stats } = evaluateAnchorLanding({
    anchors: [runtimeAnchor],
    bundles: [
      { name: 'desktop', bodyText: 'x("glass.panel.keepWorking","继续工作")', headerText: '' },
    ],
  });
  assert.equal(verdicts[0].status, 'applied');
  assert.equal(stats.stableApplied, 1);
});

test('anchor-landing 模块：中文写在相邻对象（RC-1 错位产物）必须判 found-not-applied', () => {
  const { evaluateAnchorLanding } = require('../../lib/analyzer/anchor-landing.js');
  const anchor = {
    anchorType: 'settingsSlug',
    anchorId: 'open-agents-on-startup',
    field: 'label',
    changeText: '窗口恢复',
    searchType: 'anchor',
    surface: 'settings_search',
  };
  const { verdicts, stats } = evaluateAnchorLanding({
    anchors: [anchor],
    bundles: [
      {
        name: 'desktop',
        // 带病正则的真实产物：目标条目仍英文，changeText 被写进相邻 notifications 条目。
        bodyText:
          'nu("general","open-agents-on-startup",{label:"Window Restoration",description:"Controls which windows Cursor restores on startup",aliases:["startup"]}),nu("general","notifications",{label:"窗口恢复"})',
        headerText: '',
      },
    ],
  });
  assert.equal(
    verdicts[0].status,
    'found-not-applied',
    `错误位置的 changeText 不得确认为 applied，实际 ${verdicts[0].status}`
  );
  assert.equal(stats.stableApplied, 0);
});

test('anchor-landing 模块：changeText 超出锚点 ID 受限邻域（600 字符）不得判 applied', () => {
  const { evaluateAnchorLanding, MAX_LANDING_TEXT_DISTANCE } = require('../../lib/analyzer/anchor-landing.js');
  assert.equal(MAX_LANDING_TEXT_DISTANCE, 600, '邻域上限：生产模式字段间隙 ≤500 字符 + 字段名与结构余量');
  // glassCommand 的 field 来自锚点资产数据：构造超长字段名把 changeText 推出 600 字符邻域，
  // 模式本身可命中（500 间隙 + 长字段名），距离护栏必须独立拒绝——防未来模式回归再次跨界。
  const longField = `f${'x'.repeat(150)}`;
  const anchor = {
    anchorType: 'glassCommand',
    anchorId: 'far-cmd',
    field: longField,
    changeText: '远端中文',
    searchType: 'anchor',
  };
  const { verdicts } = evaluateAnchorLanding({
    anchors: [anchor],
    bundles: [
      {
        name: 'desktop',
        bodyText: `{id:"far-cmd",${'a:1,'.repeat(120)}${longField}:"远端中文"}`,
        headerText: '',
      },
    ],
  });
  assert.equal(verdicts[0].status, 'found-not-applied');
});

test('anchor-landing 模块：落地模式匹配必须锚定在当前 ID 出现点（不吞窗口内下一次出现）', () => {
  const { evaluateAnchorLanding } = require('../../lib/analyzer/anchor-landing.js');
  const anchor = {
    anchorType: 'settingsSlug',
    anchorId: 'dup-slug',
    field: 'label',
    changeText: '重复槽位',
    searchType: 'anchor',
  };
  const { verdicts } = evaluateAnchorLanding({
    anchors: [anchor],
    bundles: [
      {
        name: 'desktop',
        // 第一处：引号在场但非注册结构（presence 点）；第二处：已落地的注册结构。
        // 第一处的窗口 exec 不得把第二处的命中记到自己头上——但整体判定应为 applied
        // （与 apply 侧 collectAnchorEdits 的逐出现点窗口语义一致，第二处真实落地）。
        bodyText: 'if(x==="dup-slug"){y()};nu("g","dup-slug",{label:"重复槽位"})',
        headerText: '',
      },
    ],
  });
  assert.equal(verdicts[0].status, 'applied');
});

test('anchor-landing 模块：多 bundle 同锚点部分未落地不得判 applied（fail-closed）', () => {
  const { evaluateAnchorLanding } = require('../../lib/analyzer/anchor-landing.js');
  const anchor = {
    anchorType: 'glassCommand',
    anchorId: 'workbench.action.openCanvas',
    field: 'title',
    changeText: '打开画布',
    searchType: 'anchor',
    surface: 'command_palette',
  };
  const { verdicts, stats } = evaluateAnchorLanding({
    anchors: [anchor],
    bundles: [
      {
        name: 'desktop',
        // desktop 结构点文案被篡改/回退为非 changeText → 未落地
        bodyText: '{id:"workbench.action.openCanvas",title:"打开画板"}',
        headerText: '',
      },
      {
        name: 'glass',
        // glass 结构点已落地
        bodyText: '{id:"workbench.action.openCanvas",title:"打开画布"}',
        headerText: '',
      },
    ],
  });
  assert.equal(
    verdicts[0].status,
    'found-not-applied',
    `任一在场结构点未落地必须 fail-closed，实际 ${verdicts[0].status}`
  );
  assert.equal(stats.stableApplied, 0);
});

test('anchor-landing 模块：裸字符串噪音不构成 glassCommand 结构命中', () => {
  const { evaluateAnchorLanding } = require('../../lib/analyzer/anchor-landing.js');
  const anchor = {
    anchorType: 'glassCommand',
    anchorId: 'setLogLevel',
    field: 'label',
    changeText: '设置日志级别',
    searchType: 'anchor',
    surface: 'command_palette',
    unstable: true,
  };
  const { verdicts } = evaluateAnchorLanding({
    anchors: [anchor],
    bundles: [
      {
        name: 'desktop',
        // 裸 id 字符串在场，但不在 id: 结构中——生产口径不可命中
        bodyText: 'const cmd = "setLogLevel"; run(cmd);',
        headerText: '',
      },
    ],
  });
  assert.equal(verdicts[0].status, 'missing');
});

test('anchor-landing 模块：exact 落地失败以「原文残留且同 bundle 译文缺席」为判据', () => {
  const { evaluateExactLanding } = require('../../lib/analyzer/anchor-landing.js');
  const { failures, checkedCount } = evaluateExactLanding({
    mappings: [
      { searchType: 'exact', originalText: 'Broken One', changeText: '坏一' },
      { searchType: 'exact', originalText: 'Partial Two', changeText: '好二' },
      { searchType: 'exact', originalText: 'Landed Three', changeText: '好三' },
    ],
    bundles: [
      {
        name: 'desktop',
        // Broken One：原文残留且译文缺席 → 失败；
        // Partial Two：原文残留但译文同 bundle 在场（多出现点部分替换）→ 不算失败；
        // Landed Three：原文消失 → 落地。
        bodyText: 'a="Broken One";b="Partial Two";c="好二";d="好三";',
        headerText: '',
      },
    ],
  });
  assert.equal(checkedCount, 3);
  assert.deepEqual(
    failures.map((f) => f.originalText),
    ['Broken One']
  );
});

test('anchor-landing 模块：runtime 头部承接的 exact 原文残留不算失败', () => {
  const { evaluateExactLanding } = require('../../lib/analyzer/anchor-landing.js');
  const { failures } = evaluateExactLanding({
    mappings: [{ searchType: 'exact', originalText: 'Runtime Kept', changeText: '运行时接管' }],
    bundles: [
      {
        name: 'desktop',
        bodyText: 'a="Runtime Kept";',
        headerText: '/* runtime */ [["Runtime Kept","运行时接管"]]',
      },
    ],
    exemptOriginals: new Set(),
  });
  assert.deepEqual(failures, []);
});

test('verify 07：coverage 复用路径（占位 mappingInfo）下 exact 抽验仍生效', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-anchor-'));
  const harness = createHarness(workspaceRoot, {
    loadMergedMappings: () => ({
      baseMappings: [],
      overlayMappings: [],
      cursorWinCommonMappings: [],
      dynamicMappings: [],
      mergedMappings: [
        {
          searchType: 'exact',
          originalText: 'Stale Reused Target',
          changeText: '复用陈旧词条',
          surface: 'command_palette',
        },
      ],
    }),
  });
  const body = `${RUNTIME_HEADER_COMMENT}\nregisterAction({id:"copy-messages",label:"复制会话记录"});const t="Stale Reused Target";`;
  seedInstalledFixture(harness.context, harness.toolPaths, { translatedWorkbenchText: body });
  seedAnchors(harness.toolPaths, [STABLE_GLASS_ANCHOR]);

  // 构造满足 canReuseManifestCoverage 的 manifest → verify 走
  // createMappingInfoFromManifest 占位数组（真实生产 verify 的常态路径）。
  const manifest = {
    generatedAt: new Date().toISOString(),
    cursorWinCoverage: {
      totalTargetCount: 1,
      bundleTargetCount: 1,
      mappedTargetCount: 1,
      missingTargets: [],
      sourceAvailable: true,
    },
    dynamicCoverage: {
      totalRuleCount: 1,
      bundleRuleCount: 1,
      mappedRuleCount: 1,
      missingRules: [],
      sourceAvailable: true,
    },
    productTipsCoverage: { totalTipCount: 0, mappedTipCount: 0, missingTips: [] },
    mappingCounts: { base: 0, overlay: 0, cursorWinCommon: 0, dynamic: 0, merged: 1 },
    mappingSourceSnapshots: collectMappingSourceSnapshots(fs, harness.toolPaths),
    hashes: { workbenchOriginal: 'same-hash', workbenchTranslated: 'same-hash' },
  };
  fs.mkdirSync(path.dirname(harness.toolPaths.buildManifestPath), { recursive: true });
  fs.writeFileSync(harness.toolPaths.buildManifestPath, JSON.stringify(manifest));

  const result = runVerify(harness);

  assert.ok(
    result.info.some((line) => line.includes('覆盖率结果已从最近一次构建 manifest 复用')),
    `前置条件：本测试必须走 coverage 复用路径，实际 info: ${JSON.stringify(result.info)}`
  );
  assert.ok(
    result.issues.some((line) => line.includes('Stale Reused Target')),
    `复用路径下 exact 静态未落地仍应产 issue，实际 issues: ${JSON.stringify(result.issues)}`
  );
  const report = JSON.parse(fs.readFileSync(landingReportPath(harness.toolPaths), 'utf8'));
  assert.ok(
    (report.exact?.checkedCount || 0) > 0,
    `复用路径下 exact 抽验数不得为 0，实际报告 exact: ${JSON.stringify(report.exact)}`
  );
});
