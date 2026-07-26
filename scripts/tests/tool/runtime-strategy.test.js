const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createRuntimeStrategyModule } = require('../../tool/runtime-strategy.js');
const { createToolPaths } = require('../../tool/paths.js');
const { parseInstalledRuntimeArtifact } = require('../../tool/runtime-artifact.js');
const { normalizeRuntimeMode } = require('../../tool/context.js');
const { createRuntimeConfigModule } = require('../../tool/runtime-config.js');

const { buildRuntimeConfig } = createRuntimeConfigModule({ normalizeRuntimeMode });

function createHarness(tempDir) {
  const installDir = path.join(tempDir, 'cursor');
  const manifestPath = path.join(tempDir, 'state', 'build-manifest.json');
  const workbenchTranslatedPath = path.join(
    installDir,
    'resources/app/out/vs/workbench/workbench.desktop.main_translated.js'
  );

  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.mkdirSync(path.dirname(workbenchTranslatedPath), { recursive: true });

  const context = {
    paths: {
      installDir,
      workbenchOriginalPath: path.join(
        installDir,
        'resources/app/out/vs/workbench/workbench.desktop.main.js'
      ),
      workbenchTranslatedPath,
    },
  };

  const toolPaths = { buildManifestPath: manifestPath };

  const { detectAppliedRuntimeMode, buildRuntimeMappingsInfo } = createRuntimeStrategyModule({
    toolPaths,
    fs,
    readText: (filePath) => fs.readFileSync(filePath, 'utf8'),
    readJsonIfExists: (filePath, fallback) => {
      if (!fs.existsSync(filePath)) {
        return fallback;
      }
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    },
    selectRuntimeMappings: () => [],
    buildRuntimeConfig,
    parseInstalledRuntimeArtifact,
  });

  return { context, toolPaths, detectAppliedRuntimeMode, buildRuntimeMappingsInfo };
}

test('detectAppliedRuntimeMode prefers installed workbench over tampered manifest', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-runtime-strategy-'));
  const { context, toolPaths, detectAppliedRuntimeMode } = createHarness(tempDir);

  const bundleText = `/* Cursor ZH generated runtime: do not edit generated file directly. */
(function(){
  const translationMetadata = {"runtimeConfig":{"mode":"compatibility"}};
  const translationMappings = [{"source":"A","target":"B"}];
  const productTipMappings = [];
})();
tail`;

  fs.writeFileSync(context.paths.workbenchTranslatedPath, bundleText);
  fs.writeFileSync(
    toolPaths.buildManifestPath,
    JSON.stringify({ runtimeStrategy: { mode: 'performance' } })
  );

  assert.equal(detectAppliedRuntimeMode(context), 'compatibility');
});

test('detectAppliedRuntimeMode uses installedRuntimeArtifact option without re-reading manifest', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-runtime-strategy-'));
  const { context, toolPaths, detectAppliedRuntimeMode } = createHarness(tempDir);

  fs.writeFileSync(
    toolPaths.buildManifestPath,
    JSON.stringify({ runtimeStrategy: { mode: 'performance' } })
  );

  assert.equal(
    detectAppliedRuntimeMode(context, {
      installedRuntimeArtifact: {
        runtimeStrategy: { mode: 'compatibility' },
      },
    }),
    'compatibility'
  );
});

test('buildRuntimeMappingsInfo accepts preloaded workbenchSource', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-runtime-strategy-'));
  const { context, buildRuntimeMappingsInfo } = createHarness(tempDir);

  let readCalls = 0;
  const { buildRuntimeMappingsInfo: buildWithCounter } = createRuntimeStrategyModule({
    toolPaths: { buildManifestPath: path.join(tempDir, 'manifest.json') },
    fs,
    readText: () => {
      readCalls += 1;
      return 'should-not-be-used';
    },
    readJsonIfExists: (_filePath, fallback) => fallback,
    selectRuntimeMappings: (_workbenchSource, mappings) => mappings,
    buildRuntimeConfig,
    parseInstalledRuntimeArtifact,
  });

  const mappingInfo = { mergedMappings: [{ source: 'A', target: 'B' }] };
  const result = buildWithCounter(context, mappingInfo, 'performance', {
    workbenchSource: 'preloaded-workbench',
  });

  assert.equal(result.workbenchSource, 'preloaded-workbench');
  assert.equal(readCalls, 0);
});

test('buildRuntimeMappingsInfo passes workbenchIndex to selectRuntimeMappings', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-runtime-strategy-'));
  const { context } = createHarness(tempDir);

  let capturedIndex = null;
  const { buildRuntimeMappingsInfo: buildWithIndexCapture } = createRuntimeStrategyModule({
    toolPaths: { buildManifestPath: path.join(tempDir, 'manifest.json') },
    fs,
    readText: (filePath) => fs.readFileSync(filePath, 'utf8'),
    readJsonIfExists: (_filePath, fallback) => fallback,
    selectRuntimeMappings: (_workbenchSource, mappings, workbenchIndex) => {
      capturedIndex = workbenchIndex;
      return mappings;
    },
    buildRuntimeConfig,
    parseInstalledRuntimeArtifact,
  });

  const workbenchSource = 'const label = "General";';
  buildWithIndexCapture(
    context,
    { mergedMappings: [{ originalText: 'General', changeText: '常规', searchType: 'exact' }] },
    'performance',
    { workbenchSource }
  );

  assert.ok(capturedIndex);
  assert.equal(typeof capturedIndex.hasQuotedLiteral, 'function');
  assert.equal(capturedIndex.hasQuotedLiteral('General'), true);
  assert.equal(capturedIndex.hasQuotedLiteral('Appearance'), false);
});

test('buildRuntimeMappingsInfo reuses provided workbenchIndex without rebuilding', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-runtime-strategy-'));
  const { context } = createHarness(tempDir);

  let indexBuildCalls = 0;
  const reusedIndex = {
    sourceText: 'const label = "General";',
    hasQuotedLiteral(text) {
      return text === 'General';
    },
    quotedLiterals: new Set(['General']),
  };

  const { buildRuntimeMappingsInfo: buildWithReuse } = createRuntimeStrategyModule({
    toolPaths: { buildManifestPath: path.join(tempDir, 'manifest.json') },
    fs,
    readText: (filePath) => fs.readFileSync(filePath, 'utf8'),
    readJsonIfExists: (_filePath, fallback) => fallback,
    selectRuntimeMappings: (_workbenchSource, mappings) => mappings,
    buildRuntimeConfig,
    parseInstalledRuntimeArtifact,
    createWorkbenchIndex: () => {
      indexBuildCalls += 1;
      return reusedIndex;
    },
  });

  const result = buildWithReuse(
    context,
    { mergedMappings: [{ originalText: 'General', changeText: '常规', searchType: 'exact' }] },
    'performance',
    { workbenchSource: reusedIndex.sourceText, workbenchIndex: reusedIndex }
  );

  assert.equal(indexBuildCalls, 0);
  assert.equal(result.workbenchIndex, reusedIndex);
});

test('buildRuntimeStrategyReport includes runtime pool counts', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-runtime-pools-'));
  const workspaceRoot = path.join(__dirname, '../../..');
  const realToolPaths = createToolPaths(workspaceRoot);
  const { context } = createHarness(tempDir);

  const { buildRuntimeStrategyReport } = createRuntimeStrategyModule({
    toolPaths: {
      buildManifestPath: path.join(tempDir, 'manifest.json'),
      runtimeGovernancePath: realToolPaths.runtimeGovernancePath,
    },
    fs,
    readText: (filePath) => fs.readFileSync(filePath, 'utf8'),
    readJsonIfExists: (filePath, fallback) => {
      if (filePath === realToolPaths.runtimeGovernancePath) {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }
      return fallback;
    },
    selectRuntimeMappings: () => [],
    buildRuntimeConfig,
    parseInstalledRuntimeArtifact,
  });

  const mappingInfo = {
    mergedMappings: [
      { originalText: 'Search models', searchType: 'exact', surface: 'model_picker' },
      { originalText: 'Toggle Expand Agent', searchType: 'exact', surface: 'command_palette' },
    ],
  };
  const runtimeMappings = [
    { originalText: 'Toggle Expand Agent', searchType: 'exact', surface: 'command_palette' },
  ];
  const workbenchIndex = {
    hasQuotedLiteral(text) {
      return text === 'Search models';
    },
  };

  const report = buildRuntimeStrategyReport(
    mappingInfo,
    runtimeMappings,
    { runtimeMappingCount: 1, runtimeHeaderChars: 100, runtimeHeaderKB: 0.1 },
    'performance',
    { workbenchIndex }
  );

  assert.deepEqual(report.runtimePoolCounts, {
    'static-only': 0,
    'runtime-by-surface': 1,
    'runtime-regex': 0,
    'runtime-scoped': 0,
    'runtime-anchor': 0,
    'runtime-force': 0,
    'legacy-global-exact': 0,
  });
  assert.equal(report.runtimeGovernancePhase, 'phase2');
});

test('assertRuntimeFootprintBudget warns by default and fails only when strict', () => {
  const { assertRuntimeFootprintBudget } = require('../../tool/runtime-strategy.js');

  const warnOnly = assertRuntimeFootprintBudget(
    { mode: 'performance', runtimeHeaderKB: 400, runtimeMappingCount: 10 },
    { strict: false, baselineMappingCount: 100 }
  );
  assert.equal(warnOnly.issues.length, 0);
  assert.ok(warnOnly.warnings.length >= 1);

  const strict = assertRuntimeFootprintBudget(
    { mode: 'performance', runtimeHeaderKB: 400, runtimeMappingCount: 10 },
    { strict: true, baselineMappingCount: 100 }
  );
  assert.ok(strict.issues.length >= 1);
});

test('assertRuntimeFootprintBudget enforces governance caps without baseline', () => {
  const { assertRuntimeFootprintBudget } = require('../../tool/runtime-strategy.js');

  const evaluation = assertRuntimeFootprintBudget(
    { mode: 'performance', runtimeHeaderKB: 1, runtimeMappingCount: 9999 },
    { strict: true }
  );

  assert.deepEqual(evaluation.issues, [
    'Performance budget exceeded: runtime mappings (9999 > 1090)',
  ]);
  assert.equal(evaluation.governancePhase, 'phase1');
});

test('assertRuntimeFootprintBudget blocks phase1 growth beyond the captured baseline', () => {
  const { assertRuntimeFootprintBudget } = require('../../tool/runtime-strategy.js');

  const result = assertRuntimeFootprintBudget(
    {
      mode: 'performance',
      runtimeMappingCount: 1091,
      runtimeHeaderKB: 184.8,
      runtimePoolCounts: { 'legacy-global-exact': 907 },
    },
    { strict: true, governancePhase: 'phase1' }
  );

  assert.deepEqual(result.issues, [
    'Performance budget exceeded: runtime header KB (184.8 > 184.7)',
    'Performance budget exceeded: runtime mappings (1091 > 1090)',
    'Performance budget exceeded: legacy global exact runtime entries (907 > 906)',
  ]);
});

test('assertRuntimeFootprintBudget blocks phase2 growth beyond ratcheted caps', () => {
  const { assertRuntimeFootprintBudget } = require('../../tool/runtime-strategy.js');

  const result = assertRuntimeFootprintBudget(
    {
      mode: 'performance',
      runtimeMappingCount: 801,
      runtimeHeaderKB: 136,
      runtimePoolCounts: { 'legacy-global-exact': 451, 'runtime-force': 229 },
    },
    { strict: true, governancePhase: 'phase2' }
  );

  assert.deepEqual(result.issues, [
    'Performance budget exceeded: runtime header KB (136 > 135)',
    'Performance budget exceeded: runtime mappings (801 > 800)',
    'Performance budget exceeded: legacy global exact runtime entries (451 > 450)',
    'Performance budget exceeded: forceRuntime entries (229 > 228)',
  ]);
  assert.equal(result.governancePhase, 'phase2');
});

test('assertRuntimeFootprintBudget enforces maxForceRuntime from governance policy', () => {
  const { assertRuntimeFootprintBudget } = require('../../tool/runtime-strategy.js');

  const result = assertRuntimeFootprintBudget(
    {
      mode: 'performance',
      runtimeMappingCount: 10,
      runtimeHeaderKB: 1,
      runtimePoolCounts: { 'runtime-force': 229 },
    },
    { strict: true, governancePhase: 'phase1' }
  );

  assert.deepEqual(result.issues, [
    'Performance budget exceeded: forceRuntime entries (229 > 228)',
  ]);
});
