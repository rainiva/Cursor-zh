const test = require('node:test');
const assert = require('node:assert/strict');

const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');
const { sourceHasQuotedLiteral } = require('../../lib/patcher/runtime-selector.js');
const { createWorkbenchIndex } = require('../../lib/patcher/workbench-index.js');

test('sourceHasQuotedLiteral falls back to regex when authoritative index misses quoted literal', () => {
  const source = 'children:"Start Multitasking"';
  const index = {
    sourceText: source,
    isAuthoritative: true,
    hasQuotedLiteral() {
      return false;
    },
  };

  assert.equal(sourceHasQuotedLiteral(source, 'Start Multitasking', index), true);
});

test('applyStaticSourceTranslations rewrites literals missed by corrupted quoted-literal index', () => {
  const source = [
    'children:"Start Multitasking"',
    'title:"Run tasks in parallel"',
    'var skS="Search Settings"',
  ].join(',');
  const mappings = [
    { originalText: 'Start Multitasking', changeText: '开始多任务处理', searchType: 'exact' },
    { originalText: 'Run tasks in parallel', changeText: '并行运行任务', searchType: 'exact' },
    { originalText: 'Search Settings', changeText: '搜索设置', searchType: 'exact' },
  ];
  const brokenIndex = {
    sourceText: source,
    isAuthoritative: true,
    hasQuotedLiteral() {
      return false;
    },
  };

  const translated = applyStaticSourceTranslations(source, mappings, brokenIndex);

  assert.match(translated, /开始多任务处理/);
  assert.match(translated, /并行运行任务/);
  assert.match(translated, /搜索设置/);
  assert.doesNotMatch(translated, /Start Multitasking/);
});

test('createWorkbenchIndex on real glass bundle still allows regex fallback for Start Multitasking', () => {
  const fs = require('fs');
  const glassPath =
    process.env.CURSOR_GLASS_WORKBENCH_PATH ||
    'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.glass.main.js';
  if (!fs.existsSync(glassPath)) {
    return;
  }

  const source = fs.readFileSync(glassPath, 'utf8');
  const index = createWorkbenchIndex(source);
  assert.equal(index.hasQuotedLiteral('Start Multitasking'), false);
  assert.equal(sourceHasQuotedLiteral(source, 'Start Multitasking', index), true);
});
