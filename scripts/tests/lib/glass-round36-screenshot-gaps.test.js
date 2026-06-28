const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const {
  CRITICAL_GLASS_ROUND36_UI_TARGETS,
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

const ROUND36_EMBEDDED = [
  { from: 'title:"Save and Enable"', to: 'title:"保存并启用"' },
  { from: 'children:"Save and Enable"', to: 'children:"保存并启用"' },
  {
    from:
      'This automation is currently disabled. Enable it to start running on its triggers.',
    to: '此自动化当前已禁用。启用后将随触发器开始运行。',
  },
  {
    from:
      'This automation is currently disabled. You can save it as-is, or review the warnings before enabling it.',
    to: '此自动化当前已禁用。你可以直接保存，或启用前先查看警告。',
  },
  {
    from: 'children:["Are you sure you want to delete \\u201C",t,"\\u201D? This cannot be undone."]',
    to: 'children:["确定要删除 \\u201C",t,"\\u201D？此操作无法撤销。"]',
  },
  { from: '"Resolve these issues to activate"', to: '"请先解决以下问题后再激活"' },
  { from: '"Fix the blocking issues to activate."', to: '"请先修复以下阻塞项后再激活。"' },
  { from: '"Fix the blocking issue to activate."', to: '"请先修复阻塞项后再激活。"' },
  { from: 'children:"Got it"', to: 'children:"知道了"' },
  { from: 'children:"Go back"', to: 'children:"返回"' },
  {
    from: 'Mi["agent-prompts-section"]="Add a prompt before saving."',
    to: 'Mi["agent-prompts-section"]="保存前请添加提示词。"',
  },
];

test('round 36 defines automation editor dialog and validation targets', () => {
  const originals = CRITICAL_GLASS_ROUND36_UI_TARGETS.map((entry) => entry.originalText);
  assert.ok(originals.includes('Save and Enable'));
  assert.ok(
    originals.includes(
      'This automation is currently disabled. Enable it to start running on its triggers.'
    )
  );
  assert.ok(originals.includes('Resolve these issues to activate'));
  assert.ok(originals.includes('Fix the blocking issues to activate.'));
  assert.ok(originals.includes('Got it'));
  assert.ok(originals.includes('Add a prompt before saving.'));
});

test('round 36 embedded patches are registered', () => {
  for (const patch of ROUND36_EMBEDDED) {
    const match = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === patch.from);
    assert.ok(match, `missing embedded patch: ${patch.from}`);
    assert.equal(match.to, patch.to);
  }
});

test('merged mappings translate automation editor dialogs and validation copy', () => {
  const mappings = loadMergedMappings();
  assert.equal(
    translateTextWithMappings('Save and Enable', mappings, { scopeMatched: true }),
    '保存并启用'
  );
  assert.equal(
    translateTextWithMappings(
      'This automation is currently disabled. Enable it to start running on its triggers.',
      mappings,
      { scopeMatched: true }
    ),
    '此自动化当前已禁用。启用后将随触发器开始运行。'
  );
  assert.equal(
    translateTextWithMappings('Resolve these issues to activate', mappings, {
      scopeMatched: true,
    }),
    '请先解决以下问题后再激活'
  );
  assert.equal(
    translateTextWithMappings('Fix the blocking issues to activate.', mappings, {
      scopeMatched: true,
    }),
    '请先修复以下阻塞项后再激活。'
  );
  assert.equal(
    translateTextWithMappings('Got it', mappings, { scopeMatched: true }),
    '知道了'
  );
  assert.equal(
    translateTextWithMappings('Add a trigger before saving.', mappings, { scopeMatched: true }),
    '保存前请添加触发器。'
  );
  assert.equal(
    translateTextWithMappings('Enter instructions for the agent before saving.', mappings, {
      scopeMatched: true,
    }),
    '保存前请输入智能体指令。'
  );
});

test('dynamic regex maps automation delete confirmation with curly quotes', () => {
  const mappings = loadMergedMappings();
  assert.equal(
    translateTextWithMappings(
      'Are you sure you want to delete \u201CUntitled\u201D? This cannot be undone.',
      mappings,
      { scopeMatched: true }
    ),
    '确定要删除「Untitled」吗？此操作无法撤销。'
  );
});

test('runtime DOM renders save and enable label without English fragments', () => {
  const mappings = loadMergedMappings();
  const harness = createRuntimeDomHarness({
    workbenchSource: 'Save and Enable',
    runtimeMappings: mappings.filter((entry) => entry.forceRuntime !== false),
  });
  harness.runDueTimers(Infinity);

  const { menu } = harness.mountMenuItem('Save and Enable');
  harness.flushMicrotasks();

  assert.equal(harness.getMenuItemText(menu), '保存并启用');
  assert.doesNotMatch(harness.getMenuItemText(menu), /Save and Enable/i);
});

test('static translation applies round 36 automations lazy-chunk snippets', () => {
  const source = [
    'Ote(c3,{title:"Save and Enable",description:L',
    'onClick:m,children:"Save and Enable"}',
    'v?"This automation is currently disabled. You can save it as-is, or review the warnings before enabling it.":"This automation is currently disabled. Enable it to start running on its triggers."',
    'lqn(c3,{title:"Delete automation",description:H0i(Sxo,{children:["Are you sure you want to delete \\u201C",t,"\\u201D? This cannot be undone."]})})',
    'Object.keys(vl).length>0||BR?"Resolve these issues to activate":"Review before activating"',
    'R.length===1?"Fix the blocking issue to activate.":"Fix the blocking issues to activate."',
    'onClick:o,children:"Got it"}',
    'onClick:o,children:"Go back"}',
    'Mi["agent-triggers-section"]="Add a trigger before saving."',
    'Mi["agent-prompts-section"]="Add a prompt before saving."',
    'Mi["agent-prompts-section"]="Enter instructions for the agent before saving."',
  ].join('\n');

  const translated = applyStaticSourceTranslations(source, loadMergedMappings());

  assert.match(translated, /title:"保存并启用"/);
  assert.match(translated, /children:"保存并启用"/);
  assert.match(translated, /此自动化当前已禁用。启用后将随触发器开始运行。/);
  assert.match(translated, /确定要删除 \\u201C/);
  assert.match(translated, /请先解决以下问题后再激活/);
  assert.match(translated, /请先修复以下阻塞项后再激活。/);
  assert.match(translated, /children:"知道了"/);
  assert.match(translated, /children:"返回"/);
  assert.match(translated, /保存前请添加触发器。/);
  assert.match(translated, /保存前请添加提示词。/);
  assert.match(translated, /保存前请输入智能体指令。/);
  assert.equal(translated.includes('Save and Enable'), false);
  assert.equal(translated.includes('Resolve these issues to activate'), false);
});
