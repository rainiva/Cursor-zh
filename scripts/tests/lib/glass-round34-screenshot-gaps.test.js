const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const {
  CRITICAL_GLASS_ROUND34_UI_TARGETS,
  CRITICAL_EMBEDDED_UI_PATCHES,
} = require('../../lib/mapping/critical-ui-targets.js');
const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');
const { mergeMappings, translateTextWithMappings } = require('../../cursor-zh-lib');
const { readJsonIfExists } = require('../../tool/io');
const { createToolPaths } = require('../../tool/paths');
const { createRuntimeDomHarness } = require('./helpers/runtime-dom-harness.js');

const toolPaths = createToolPaths(path.join(__dirname, '../../..'));

function loadMergedMappings() {
  return mergeMappings(
    mergeMappings(
      mergeMappings(
        readJsonIfExists(toolPaths.baseMappingPath, []),
        readJsonIfExists(toolPaths.overlayMappingPath, [])
      ),
      readJsonIfExists(toolPaths.cursorWinCommonPath, [])
    ),
    readJsonIfExists(toolPaths.dynamicMappingPath, [])
  );
}

const ROUND34_EMBEDDED = [
  { from: 'metadata:{description:"Run Task"', to: 'metadata:{description:"运行任务"' },
  {
    from: 'placeholder:"Select the task to run..."',
    to: 'placeholder:"选择要运行的任务..."',
  },
  {
    from: 'children:"No runnable workspace tasks found."',
    to: 'children:"未找到可运行的工作区任务。"',
  },
];

test('round 34 defines workspace task picker targets', () => {
  const originals = CRITICAL_GLASS_ROUND34_UI_TARGETS.map((entry) => entry.originalText);
  assert.ok(originals.includes('Run Task'));
  assert.ok(originals.includes('Select the task to run...'));
  assert.ok(originals.includes('No runnable workspace tasks found.'));
});

test('round 34 embedded patches are registered', () => {
  for (const patch of ROUND34_EMBEDDED) {
    const match = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === patch.from);
    assert.ok(match, `missing embedded patch: ${patch.from}`);
    assert.equal(match.to, patch.to);
  }
});

test('merged mappings translate workspace task picker labels', () => {
  const mappings = loadMergedMappings();
  assert.equal(
    translateTextWithMappings('Run Task', mappings, { scopeMatched: true }),
    '运行任务'
  );
  assert.equal(
    translateTextWithMappings('Select the task to run...', mappings, { scopeMatched: true }),
    '选择要运行的任务...'
  );
  assert.equal(
    translateTextWithMappings('No runnable workspace tasks found.', mappings, {
      scopeMatched: true,
    }),
    '未找到可运行的工作区任务。'
  );
});

test('runtime DOM renders run task label without English fragments', () => {
  const mappings = loadMergedMappings();
  const harness = createRuntimeDomHarness({
    workbenchSource: 'Run Task',
    runtimeMappings: mappings.filter((entry) => entry.forceRuntime !== false),
  });
  harness.runDueTimers(Infinity);

  const { menu } = harness.mountMenuItem('Run Task');
  harness.flushMicrotasks();

  assert.equal(harness.getMenuItemText(menu), '运行任务');
  assert.doesNotMatch(harness.getMenuItemText(menu), /Run Task/i);
});

test('static translation applies round 34 workspace task snippets', () => {
  const source = [
    'metadata:{description:"Run Task",args:[{name:"args",isOptional:!0',
    'id:"workspace-tasks",placeholder:"Select the task to run...",render:e=>',
    'Dgt(Fu.Empty,{children:"No runnable workspace tasks found."})',
  ].join('\n');

  const translated = applyStaticSourceTranslations(source, loadMergedMappings());

  assert.match(translated, /description:"运行任务"/);
  assert.match(translated, /placeholder:"选择要运行的任务..."/);
  assert.match(translated, /children:"未找到可运行的工作区任务。"/);
  assert.equal(translated.includes('Run Task'), false);
  assert.equal(translated.includes('Select the task to run'), false);
  assert.equal(translated.includes('No runnable workspace tasks found'), false);
});
