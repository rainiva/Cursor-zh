const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  applyStaticSourceTranslationsDetailed,
} = require('../../lib/patcher/contracts.js');
const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');
const { createWorkbenchIndex } = require('../../lib/patcher/workbench-index.js');
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

test('applyStaticSourceTranslationsDetailed can skip contract summarization when deferContractsToVerify is true', () => {
  const source = 'const title = "General";';
  const mappings = [{ originalText: 'General', changeText: '常规', searchType: 'exact' }];
  const index = createWorkbenchIndex(source);

  const deferred = applyStaticSourceTranslationsDetailed(source, mappings, index, {
    deferContractsToVerify: true,
  });
  const full = applyStaticSourceTranslationsDetailed(source, mappings, index);

  assert.equal(deferred.translatedSource, full.translatedSource);
  assert.equal(deferred.contractsDeferred, true);
  assert.deepEqual(deferred.contracts, {});
  assert.ok(full.contracts && Object.keys(full.contracts).length > 0);
});

test('applyStaticSourceTranslations still translates without contract payload', () => {
  const source = 'const title = "General";';
  const mappings = [{ originalText: 'General', changeText: '常规', searchType: 'exact' }];
  const translated = applyStaticSourceTranslations(source, mappings, createWorkbenchIndex(source));

  assert.match(translated, /常规/);
  assert.doesNotMatch(translated, /"General"/);
});

// —— 任务 1.3：coverage deferred 失效 fail-closed（verifyState 级） ——

const MISSING_TARGETS = Array.from({ length: 12 }, (_, i) =>
  `Target ${String(i + 1).padStart(2, '0')}`
);
const MISSING_RULES = ['rule-alpha', 'rule-beta'];

function createDeferVerifyHarness(workspaceRoot) {
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
      baseMappings: [1],
      overlayMappings: [2],
      cursorWinCommonMappings: [3],
      dynamicMappings: [4],
      mergedMappings: [1, 2, 3, 4],
    }),
    buildCursorWinCoverage: () => ({
      totalTargetCount: 20,
      bundleTargetCount: 20,
      mappedTargetCount: 8,
      missingTargets: [...MISSING_TARGETS],
      sourceAvailable: true,
    }),
    buildDynamicCoverage: () => ({
      totalRuleCount: 5,
      bundleRuleCount: 5,
      mappedRuleCount: 3,
      missingRules: [...MISSING_RULES],
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
  });

  return { toolPaths, context, verifyModule };
}

function seedDeferInstalledFixture(context, toolPaths) {
  const files = {
    [context.paths.packageJsonPath]: JSON.stringify({ main: './out/cursorTranslatorMain.js' }),
    [context.paths.translatorBootstrapPath]: 'bootstrap',
    [context.paths.mainTranslatedPath]: 'main-translated',
    [context.paths.nlsMessagesPath]: '{}',
    [context.paths.workbenchTranslatedPath]:
      '/* Cursor ZH generated runtime: do not edit generated file directly. */',
    [context.paths.workbenchOriginalPath]: 'workbench-original',
    [context.paths.argvPath]: '{}',
    [toolPaths.baseMappingPath]: '[]',
    [toolPaths.overlayMappingPath]: '[]',
    [toolPaths.cursorWinCommonPath]: '[]',
    [toolPaths.dynamicMappingPath]: '[]',
    [toolPaths.generatedMainPath]: 'main-translated',
    [toolPaths.generatedNlsMessagesPath]: '{}',
    [toolPaths.generatedWorkbenchPath]:
      '/* Cursor ZH generated runtime: do not edit generated file directly. */',
  };

  for (const [filePath, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  }
}

test('verifyState fails closed when deferred coverage recompute finds missing targets', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-defer-verify-'));
  const { toolPaths, context, verifyModule } = createDeferVerifyHarness(workspaceRoot);

  seedDeferInstalledFixture(context, toolPaths);

  const manifest = {
    generatedAt: new Date().toISOString(),
    coverageDeferred: true,
    cursorWinCoverage: {
      deferred: true,
      totalTargetCount: 0,
      bundleTargetCount: 0,
      mappedTargetCount: 0,
      missingTargets: [],
      sourceAvailable: true,
    },
    dynamicCoverage: {
      deferred: true,
      totalRuleCount: 0,
      bundleRuleCount: 0,
      mappedRuleCount: 0,
      missingRules: [],
      sourceAvailable: true,
    },
    productTipsCoverage: {
      totalTipCount: 0,
      mappedTipCount: 0,
      missingTips: [],
    },
    runtimeStrategy: {
      mode: 'performance',
      rescanDelaysMs: [],
      scopeSelectorCount: 1,
      marketplaceRemoteTranslationEnabled: false,
      runtimeMappingCount: 10,
      runtimeHeaderChars: 100,
      runtimeHeaderKB: 0.1,
      prunedMappingCount: 2,
    },
    staticPatchContracts: {},
    staticPatchContractEvaluation: { issues: [], warnings: [] },
    mappingCounts: { base: 1, overlay: 1, cursorWinCommon: 1, dynamic: 1, merged: 4 },
    mappingSourceSnapshots: collectMappingSourceSnapshots(fs, toolPaths),
    hashes: {
      workbenchOriginal: 'same-hash',
      workbenchTranslated: 'same-hash',
    },
  };

  fs.mkdirSync(path.dirname(toolPaths.buildManifestPath), { recursive: true });
  fs.writeFileSync(toolPaths.buildManifestPath, JSON.stringify(manifest));

  const result = verifyModule.verifyState(
    context,
    { pkg: { main: './out/cursorTranslatorMain.js' }, product: { vscodeVersion: '1.99.0' } },
    { version: '1.99.0' },
    { profile: false }
  );

  const cursorWinIssue = result.issues.find((issue) => issue.includes('未覆盖关键词'));
  assert.ok(cursorWinIssue, 'coverageDeferred 首次重算发现缺失关键词必须产 issue（fail-closed）');
  assert.match(cursorWinIssue, /12/, 'issue 文案必须包含缺失数量');
  for (const target of MISSING_TARGETS.slice(0, 10)) {
    assert.ok(cursorWinIssue.includes(target), `issue 文案必须包含前 10 条样例：${target}`);
  }
  assert.ok(
    !cursorWinIssue.includes('Target 11'),
    'issue 文案样例只保留前 10 条'
  );

  const dynamicIssue = result.issues.find((issue) => issue.includes('动态规则'));
  assert.ok(dynamicIssue, 'coverageDeferred 首次重算发现动态规则缺失必须产 issue（fail-closed）');
  assert.match(dynamicIssue, /2/, 'issue 文案必须包含缺失数量');
  for (const rule of MISSING_RULES) {
    assert.ok(dynamicIssue.includes(rule), `issue 文案必须包含样例：${rule}`);
  }
});
