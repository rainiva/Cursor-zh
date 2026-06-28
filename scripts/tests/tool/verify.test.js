const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createToolPaths } = require('../../tool/paths.js');
const { createVerifyModule } = require('../../tool/verify.js');
const { createStageTimer } = require('../../tool/timing.js');
const {
  createSessionCache,
  canReuseManifestCoverage,
  canReuseManifestStaticContracts,
  createMappingInfoFromManifest,
  collectMappingSourceSnapshots,
} = require('../../tool/session-cache.js');

function createMinimalVerifyHarness(workspaceRoot, overrides = {}) {
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

  let loadMergedMappingsCalls = 0;
  let buildCursorWinCoverageCalls = 0;

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
    loadMergedMappings: () => {
      loadMergedMappingsCalls += 1;
      return {
        baseMappings: [1],
        overlayMappings: [2],
        cursorWinCommonMappings: [3],
        dynamicMappings: [4],
        mergedMappings: [1, 2, 3, 4],
      };
    },
    buildCursorWinCoverage: () => {
      buildCursorWinCoverageCalls += 1;
      return {
        totalTargetCount: 99,
        bundleTargetCount: 1,
        mappedTargetCount: 1,
        missingTargets: [],
        sourceAvailable: true,
      };
    },
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
    ...overrides,
  });

  return {
    toolPaths,
    context,
    verifyModule,
    getLoadMergedMappingsCalls: () => loadMergedMappingsCalls,
    getBuildCursorWinCoverageCalls: () => buildCursorWinCoverageCalls,
  };
}

function seedInstalledFixture(context, toolPaths) {
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

test('verifyState reuses manifest coverage and skips expensive analysis', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-verify-'));
  const { toolPaths, context, verifyModule, getLoadMergedMappingsCalls, getBuildCursorWinCoverageCalls } =
    createMinimalVerifyHarness(workspaceRoot);

  seedInstalledFixture(context, toolPaths);

  const manifest = {
    generatedAt: new Date().toISOString(),
    cursorWinCoverage: {
      totalTargetCount: 5,
      bundleTargetCount: 5,
      mappedTargetCount: 5,
      missingTargets: [],
      sourceAvailable: true,
    },
    dynamicCoverage: {
      totalRuleCount: 2,
      bundleRuleCount: 2,
      mappedRuleCount: 2,
      missingRules: [],
      sourceAvailable: true,
    },
    productTipsCoverage: {
      totalTipCount: 3,
      mappedTipCount: 3,
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
    staticPatchContracts: { contractA: { matchCount: 1 } },
    staticPatchContractEvaluation: { issues: [], warnings: [] },
    mappingCounts: {
      base: 1,
      overlay: 1,
      cursorWinCommon: 1,
      dynamic: 1,
      merged: 4,
    },
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

  assert.equal(getBuildCursorWinCoverageCalls(), 0);
  assert.equal(getLoadMergedMappingsCalls(), 0);
  assert.equal(result.cursorWinCoverage.totalTargetCount, 5);
  assert.equal(result.staticPatchContracts.contractA.matchCount, 1);
});

test('verifyState recomputes coverage when manifest coverageDeferred is true', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-verify-'));
  const { toolPaths, context, verifyModule, getBuildCursorWinCoverageCalls } =
    createMinimalVerifyHarness(workspaceRoot);

  seedInstalledFixture(context, toolPaths);

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
      totalTipCount: 3,
      mappedTipCount: 3,
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
    staticPatchContracts: { contractA: { matchCount: 1 } },
    staticPatchContractEvaluation: { issues: [], warnings: [] },
    mappingCounts: {
      base: 1,
      overlay: 1,
      cursorWinCommon: 1,
      dynamic: 1,
      merged: 4,
    },
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

  assert.equal(getBuildCursorWinCoverageCalls(), 1);
  assert.equal(result.cursorWinCoverage.totalTargetCount, 99);
});

test('verifyState passes shared workbenchSource from buildRuntimeMappingsInfo to coverage', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-verify-'));
  let coverageWorkbenchSource;
  const { toolPaths, context, verifyModule } = createMinimalVerifyHarness(workspaceRoot, {
    buildRuntimeMappingsInfo: () => ({
      workbenchSource: 'shared-from-runtime',
      workbenchIndex: { hasQuotedLiteral: () => true },
      runtimeMappings: [],
    }),
    buildCursorWinCoverage: (_context, _mappings, options = {}) => {
      coverageWorkbenchSource = options.workbenchSource;
      return {
        totalTargetCount: 1,
        bundleTargetCount: 1,
        mappedTargetCount: 1,
        missingTargets: [],
        sourceAvailable: true,
      };
    },
  });

  seedInstalledFixture(context, toolPaths);

  verifyModule.verifyState(
    context,
    { pkg: { main: './out/cursorTranslatorMain.js' }, product: { vscodeVersion: '1.99.0' } },
    { version: '1.99.0' },
    { profile: false }
  );

  assert.equal(coverageWorkbenchSource, 'shared-from-runtime');
});

test('verifyState persists computed coverage back to manifest', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-verify-'));
  let writtenManifest = null;
  const { toolPaths, context, verifyModule } = createMinimalVerifyHarness(workspaceRoot, {
    writeManifest: (manifest) => {
      writtenManifest = manifest;
    },
  });

  seedInstalledFixture(context, toolPaths);

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
    mappingCounts: { base: 1, overlay: 1, cursorWinCommon: 1, dynamic: 1, merged: 4 },
    mappingSourceSnapshots: collectMappingSourceSnapshots(fs, toolPaths),
    hashes: {
      workbenchOriginal: 'same-hash',
      workbenchTranslated: 'same-hash',
    },
  };

  fs.mkdirSync(path.dirname(toolPaths.buildManifestPath), { recursive: true });
  fs.writeFileSync(toolPaths.buildManifestPath, JSON.stringify(manifest));

  verifyModule.verifyState(
    context,
    { pkg: { main: './out/cursorTranslatorMain.js' }, product: { vscodeVersion: '1.99.0' } },
    { version: '1.99.0' },
    { profile: false }
  );

  assert.ok(writtenManifest);
  assert.equal(writtenManifest.coverageDeferred, false);
  assert.equal(writtenManifest.cursorWinCoverage.totalTargetCount, 99);
});

test('verifyState skips timing summary when summaryOnly is true', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-verify-'));
  const { toolPaths, context, verifyModule } = createMinimalVerifyHarness(workspaceRoot);
  seedInstalledFixture(context, toolPaths);

  const lines = [];
  const originalLog = console.log;
  console.log = (line) => lines.push(String(line));

  let result;
  try {
    result = verifyModule.verifyState(
      context,
      { pkg: { main: './out/cursorTranslatorMain.js' }, product: { vscodeVersion: '1.99.0' } },
      { version: '1.99.0' },
      { summaryOnly: true }
    );
  } finally {
    console.log = originalLog;
  }

  assert.equal(result.timing, null);
  assert.doesNotMatch(lines.join('\n'), /\[Verify 耗时\]/);
});

test('verifyState prints staged timing summary by default', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-verify-'));
  const { toolPaths, context, verifyModule } = createMinimalVerifyHarness(workspaceRoot);
  seedInstalledFixture(context, toolPaths);

  const lines = [];
  const originalLog = console.log;
  console.log = (line) => lines.push(String(line));

  try {
    verifyModule.verifyState(
      context,
      { pkg: { main: './out/cursorTranslatorMain.js' }, product: { vscodeVersion: '1.99.0' } },
      { version: '1.99.0' }
    );
  } finally {
    console.log = originalLog;
  }

  assert.match(lines.join('\n'), /\[Verify 耗时\]/);
  assert.match(lines.join('\n'), /01 安装与 locale 检查/);
});

test('verifyState reports bootstrap drift when installed bootstrap does not match current module-aware output', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-verify-bootstrap-'));
  const { toolPaths, context, verifyModule } = createMinimalVerifyHarness(workspaceRoot, {
    createBootstrapSource: () => 'expected-bootstrap',
  });
  seedInstalledFixture(context, toolPaths);

  const result = verifyModule.verifyState(
    context,
    { pkg: { main: './out/cursorTranslatorMain.js', type: 'module' }, product: { vscodeVersion: '1.99.0' } },
    { version: '1.99.0' }
  );

  assert.ok(
    result.issues.includes('已安装的 cursorTranslatorMain.js 与当前生成 bootstrap 不一致。'),
    `expected bootstrap drift issue, got: ${JSON.stringify(result.issues)}`
  );
});

test('verifyState reports unsuppressed extension cache reload prompt in installed workbench', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-verify-ext-cache-'));
  const { toolPaths, context, verifyModule } = createMinimalVerifyHarness(workspaceRoot);
  seedInstalledFixture(context, toolPaths);

  const unsuppressedPrompt =
    'onDidChangeCache(()=>{h.dispose(),this._notificationService.prompt(jo.Error,x(13355,null),[{label:x(13356,null),run:()=>this._hostService.reload()}])})';
  fs.writeFileSync(
    context.paths.workbenchTranslatedPath,
    `/* Cursor ZH generated runtime: do not edit generated file directly. */\n${unsuppressedPrompt}`
  );

  const result = verifyModule.verifyState(
    context,
    { pkg: { main: './out/cursorTranslatorMain.js' }, product: { vscodeVersion: '1.99.0' } },
    { version: '1.99.0' }
  );

  assert.ok(
    result.issues.some((issue) => issue.includes('扩展在磁盘上已被修改')),
    `expected extension cache issue, got: ${JSON.stringify(result.issues)}`
  );
});

test('verifyState reports fragile marketplace map hook in installed glass workbench', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-verify-mkt-hook-'));
  const { toolPaths, context, verifyModule } = createMinimalVerifyHarness(workspaceRoot);
  seedInstalledFixture(context, toolPaths);

  context.paths.workbenchGlassOriginalPath = path.join(
    context.paths.resourcesAppDir,
    'out/vs/workbench/workbench.glass.main.js'
  );
  context.paths.workbenchGlassTranslatedPath = path.join(
    context.paths.resourcesAppDir,
    'out/vs/workbench/workbench.glass.main_translated.js'
  );

  const fragileHook =
    'const i=((await $k(n.listMarketplacePlugins({}),e))?.plugins??[]).map(p=>r1((h=globalThis.__cursorZhMarketplaceLazyTranslatePlugin)?h(p):p));';
  fs.mkdirSync(path.dirname(context.paths.workbenchGlassOriginalPath), { recursive: true });
  fs.writeFileSync(context.paths.workbenchGlassOriginalPath, 'glass-original');
  fs.writeFileSync(
    context.paths.workbenchGlassTranslatedPath,
    `/* Cursor ZH generated runtime: do not edit generated file directly. */\n${fragileHook}`
  );
  fs.writeFileSync(
    toolPaths.generatedGlassWorkbenchPath,
    `/* Cursor ZH generated runtime: do not edit generated file directly. */\n${fragileHook}`
  );

  const result = verifyModule.verifyState(
    context,
    { pkg: { main: './out/cursorTranslatorMain.js' }, product: { vscodeVersion: '1.99.0' } },
    { version: '1.99.0' }
  );

  assert.ok(
    result.issues.some((issue) => issue.includes('脆弱的 Marketplace map hook')),
    `expected fragile marketplace hook issue, got: ${JSON.stringify(result.issues)}`
  );
});
