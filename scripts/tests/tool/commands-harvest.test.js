const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const childProcess = require('child_process');

const HARVEST_SNIPPET = require('../lib/fixtures/harvest-workbench-snippet.js');
const { createHarvestModule } = require('../../tool/commands-harvest.js');
const { createToolPaths } = require('../../tool/paths.js');

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, 'utf8');
}

function createLayeredMappings(rules = []) {
  return {
    baseMappings: [],
    overlayMappings: [],
    cursorWinCommonMappings: rules,
    anchorMappings: [],
    dynamicMappings: [],
    mergedMappings: rules,
  };
}

function createHarvestFixture(tempRoot) {
  const workspaceRoot = path.join(tempRoot, 'workspace');
  const installDir = path.join(tempRoot, 'cursor-install');
  const resourcesAppDir = path.join(installDir, 'resources', 'app');
  const workbenchDir = path.join(resourcesAppDir, 'out', 'vs', 'workbench');

  fs.mkdirSync(workspaceRoot, { recursive: true });
  writeJson(path.join(resourcesAppDir, 'package.json'), {
    name: 'cursor',
    version: '3.9.8',
    main: './out/main.js',
  });
  writeJson(path.join(resourcesAppDir, 'product.json'), {
    vscodeVersion: '1.105.1',
  });
  writeText(path.join(workbenchDir, 'workbench.glass.main.js'), HARVEST_SNIPPET);

  return {
    workspaceRoot,
    installDir,
    resourcesAppDir,
    context: {
      paths: { resourcesAppDir },
      options: {},
    },
  };
}

test('runHarvest writes report and optional snapshot for fixture install', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-harvest-'));
  const fixture = createHarvestFixture(tempRoot);
  const toolPaths = createToolPaths(fixture.workspaceRoot);
  const output = [];

  const harvest = createHarvestModule({
    toolPaths,
    fs,
    readText: (filePath) => fs.readFileSync(filePath, 'utf8'),
    writeJson: writeJson,
    writeText: writeText,
    readJsonIfExists: (filePath, fallback) =>
      fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : fallback,
    loadMergedMappings: () =>
      createLayeredMappings([
        { originalText: 'Copy as Markdown', changeText: '复制为 Markdown', searchType: 'exact' },
      ]),
    loadInstallMetadata: () => ({
      pkg: { version: '3.9.8' },
      product: { vscodeVersion: '1.105.1' },
    }),
    ensureDir: (dirPath) => fs.mkdirSync(dirPath, { recursive: true }),
  });

  const originalLog = console.log;
  console.log = (line) => output.push(String(line));

  try {
    const report = harvest.runHarvest(fixture.context, { saveSnapshot: true, diff: false });
    assert.ok(report.reverseCoverage.summary.unmapped >= 1);
    assert.ok(fs.existsSync(path.join(toolPaths.harvestReportsDir, 'harvest-3.9.8.json')));
    assert.ok(fs.existsSync(path.join(toolPaths.harvestReportsDir, 'harvest-3.9.8.md')));
    assert.ok(fs.existsSync(path.join(toolPaths.harvestReportsDir, 'coverage-ledger-3.9.8.json')));
    assert.ok(fs.existsSync(path.join(toolPaths.harvestSnapshotsDir, '3.9.8.json')));
    const copyEntry = report.reverseCoverage.entries.find((entry) => entry.text === 'Copy as Markdown');
    assert.equal(copyEntry.matchedRules[0].layer, 'cursor-win.common');
    assert.match(output.join('\n'), /Harvest summary:/);
    assert.match(output.join('\n'), /\[harvest\]/);
    assert.match(output.join('\n'), /reverse coverage/i);
  } finally {
    console.log = originalLog;
  }
});

test('harvest CLI is official and supports --help', () => {
  const toolPath = path.join(__dirname, '..', '..', 'cursor-zh-tool.js');
  const result = childProcess.spawnSync(process.execPath, [toolPath, 'harvest', '--help'], {
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /harvest/i);
  assert.match(result.stdout, /--save-snapshot/);
  assert.match(result.stdout, /--ledger-only/);
  assert.match(result.stdout, /--orphans/);
});

test('verify prints harvest summary when report exists', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-harvest-verify-'));
  const fixture = createHarvestFixture(tempRoot);
  const toolPaths = createToolPaths(fixture.workspaceRoot);
  writeJson(path.join(toolPaths.harvestReportsDir, 'harvest-3.9.8.json'), {
    reverseCoverage: {
      summary: { unmapped: 7, covered_static: 2 },
      ruleUsage: [{ status: 'orphan' }, { status: 'active' }],
      contractStatus: [{ status: 'missing' }, { status: 'satisfied' }],
    },
    diff: { added: [{ text: 'Toggle Expand Agent' }] },
  });

  const harvest = createHarvestModule({
    toolPaths,
    fs,
    readText: () => '',
    writeJson,
    writeText,
    readJsonIfExists: (filePath, fallback) =>
      fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : fallback,
    loadMergedMappings: () => ({ mergedMappings: [] }),
    loadInstallMetadata: () => ({ pkg: { version: '3.9.8' }, product: {} }),
    ensureDir: (dirPath) => fs.mkdirSync(dirPath, { recursive: true }),
  });

  const summary = harvest.summarizeHarvestForVerify('3.9.8');
  assert.match(summary.message, /未覆盖 7 条/);
  assert.match(summary.message, /已建档命中/);
  assert.match(summary.message, /孤儿规则 1 条/);
});

test('runHarvest ledger-only writes coverage ledger without harvest report', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-harvest-ledger-'));
  const fixture = createHarvestFixture(tempRoot);
  const toolPaths = createToolPaths(fixture.workspaceRoot);

  const harvest = createHarvestModule({
    toolPaths,
    fs,
    readText: (filePath) => fs.readFileSync(filePath, 'utf8'),
    writeJson,
    writeText,
    readJsonIfExists: (filePath, fallback) =>
      fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : fallback,
    loadMergedMappings: () => createLayeredMappings([]),
    loadInstallMetadata: () => ({
      pkg: { version: '3.9.8' },
      product: { vscodeVersion: '1.105.1' },
    }),
    ensureDir: (dirPath) => fs.mkdirSync(dirPath, { recursive: true }),
  });

  harvest.runHarvest(fixture.context, { ledgerOnly: true, quiet: true });
  assert.ok(fs.existsSync(path.join(toolPaths.harvestReportsDir, 'coverage-ledger-3.9.8.json')));
  assert.equal(fs.existsSync(path.join(toolPaths.harvestReportsDir, 'harvest-3.9.8.json')), false);
});

test('runHarvest supports quiet mode without progress logs', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-harvest-quiet-'));
  const fixture = createHarvestFixture(tempRoot);
  const toolPaths = createToolPaths(fixture.workspaceRoot);
  const output = [];

  const harvest = createHarvestModule({
    toolPaths,
    fs,
    readText: (filePath) => fs.readFileSync(filePath, 'utf8'),
    writeJson: writeJson,
    writeText: writeText,
    readJsonIfExists: (filePath, fallback) =>
      fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : fallback,
    loadMergedMappings: () =>
      createLayeredMappings([
        { originalText: 'Copy as Markdown', changeText: '复制为 Markdown', searchType: 'exact' },
      ]),
    loadInstallMetadata: () => ({
      pkg: { version: '3.9.8' },
      product: { vscodeVersion: '1.105.1' },
    }),
    ensureDir: (dirPath) => fs.mkdirSync(dirPath, { recursive: true }),
  });

  const originalLog = console.log;
  console.log = (line) => output.push(String(line));

  try {
    harvest.runHarvest(fixture.context, { saveSnapshot: false, diff: false, quiet: true });
    assert.equal(output.filter((line) => line.includes('[harvest]')).length, 0);
    assert.ok(output.some((line) => line.includes('Harvest summary:')));
  } finally {
    console.log = originalLog;
  }
});
