const test = require('node:test');
const assert = require('node:assert/strict');

const { createCoverageWorkbenchContext } = require('../../lib/analyzer/workbench-coverage-context.js');
const { analyzeCursorWinCoverage } = require('../../lib/analyzer/cursor-win-coverage.js');

test('createCoverageWorkbenchContext detects quoted targets without repeated full scans', () => {
  const context = createCoverageWorkbenchContext('const label = "Search models";');
  assert.equal(context.isTargetPresent('Search models'), true);
  assert.equal(context.isTargetPresent('Missing label'), false);
});

test('analyzeCursorWinCoverage uses coverageContext to avoid per-target workbench.includes', () => {
  const workbenchSource = '"Search models" "General" "Settings"';
  const context = createCoverageWorkbenchContext(workbenchSource);
  let includesCalls = 0;
  const trackedSource = new String(workbenchSource);
  Object.defineProperty(trackedSource, 'includes', {
    value(searchString) {
      includesCalls += 1;
      return workbenchSource.includes(searchString);
    },
  });
  context.workbenchSource = trackedSource;

  const targets = Array.from({ length: 400 }, (_entry, index) => `Label ${index}`);
  targets.push('Search models', 'General', 'Settings');

  const coverage = analyzeCursorWinCoverage({
    workbenchSource: trackedSource,
    mappings: [
      { originalText: 'Search models', changeText: '搜索模型', searchType: 'exact' },
      { originalText: 'General', changeText: '常规', searchType: 'exact' },
      { originalText: 'Settings', changeText: '设置', searchType: 'exact' },
    ],
    targets,
    coverageContext: context,
  });

  assert.equal(coverage.bundleTargetCount, 3);
  assert.ok(includesCalls <= 400, `expected includes only for non-quoted targets, got ${includesCalls}`);
});
