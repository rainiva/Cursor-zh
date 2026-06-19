const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createCoverageModule } = require('../../tool/coverage.js');

test('buildCursorWinCoverage uses preloaded workbenchSource without reading disk', () => {
  let readCalls = 0;
  const { buildCursorWinCoverage } = createCoverageModule({
    readText: () => {
      readCalls += 1;
      return 'disk-source';
    },
    analyzeCursorWinCoverage: ({ workbenchSource }) => ({
      totalTargetCount: 1,
      bundleTargetCount: workbenchSource.includes('preloaded') ? 1 : 0,
      mappedTargetCount: 1,
      missingTargets: [],
    }),
    cursorWinCoverageTargets: () => [{ keyword: 'Sign In' }],
    analyzeDynamicRuleCoverage: () => ({}),
    analyzeProductTipsCoverage: () => ({}),
    productTipsCoverageTargets: () => [],
  });

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-coverage-'));
  const workbenchPath = path.join(tempDir, 'workbench.js');
  fs.writeFileSync(workbenchPath, 'disk-source');

  const context = { paths: { workbenchOriginalPath: workbenchPath } };
  const coverage = buildCursorWinCoverage(context, [], {
    workbenchSource: 'preloaded-source',
  });

  assert.equal(readCalls, 0);
  assert.equal(coverage.bundleTargetCount, 1);
  assert.equal(coverage.sourceAvailable, true);
});

test('buildDynamicCoverage uses preloaded workbenchSource without reading disk', () => {
  let readCalls = 0;
  const { buildDynamicCoverage } = createCoverageModule({
    readText: () => {
      readCalls += 1;
      return 'disk-source';
    },
    analyzeCursorWinCoverage: () => ({}),
    cursorWinCoverageTargets: () => [],
    analyzeDynamicRuleCoverage: ({ workbenchSource }) => ({
      totalRuleCount: 1,
      bundleRuleCount: workbenchSource.includes('preloaded') ? 1 : 0,
      mappedRuleCount: 1,
      missingRules: [],
    }),
    analyzeProductTipsCoverage: () => ({}),
    productTipsCoverageTargets: () => [],
  });

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-coverage-'));
  const workbenchPath = path.join(tempDir, 'workbench.js');
  fs.writeFileSync(workbenchPath, 'disk-source');

  const context = { paths: { workbenchOriginalPath: workbenchPath } };
  const coverage = buildDynamicCoverage(context, [], [{ rule: 'A' }], {
    workbenchSource: 'preloaded-source',
  });

  assert.equal(readCalls, 0);
  assert.equal(coverage.bundleRuleCount, 1);
  assert.equal(coverage.sourceAvailable, true);
});
