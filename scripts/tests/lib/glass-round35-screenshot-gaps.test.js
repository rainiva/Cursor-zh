const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const {
  CRITICAL_GLASS_ROUND35_UI_TARGETS,
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

const ROUND35_EMBEDDED = [
  { from: 'title:"New User Rule"', to: 'title:"新建用户规则"' },
  {
    from: 'placeHolder:"Style request, response language, tone..."',
    to: 'placeHolder:"风格要求、回复语言、语气…"',
  },
  {
    from: 'prompt:"User Rules apply to all of your chats"',
    to: 'prompt:"用户规则适用于你的所有对话"',
  },
  { from: 'title:\\"No Rules Yet\\"', to: 'title:\\"暂无规则\\"' },
  {
    from: 'description:\\"Create rules to guide Agent behavior\\"',
    to: 'description:\\"创建规则以引导 Agent 行为\\"',
  },
  {
    from: '?\\"New User Rule\\":n.hasWorkspaceScopeSelected?\\"New Project Rule\\"',
    to: '?\\"新建用户规则\\":n.hasWorkspaceScopeSelected?\\"新建项目规则\\"',
  },
  { from: 'confirmLabel??\\"Confirm\\"', to: 'confirmLabel??\\"确认\\"' },
  { from: 'title:\\"Could Not Load Rules\\"', to: 'title:\\"无法加载规则\\"' },
  {
    from: 'Failed to load workspace rules.',
    to: '无法加载工作区规则。',
  },
];

test('round 35 defines user rules empty state and quick input targets', () => {
  const originals = CRITICAL_GLASS_ROUND35_UI_TARGETS.map((entry) => entry.originalText);
  assert.ok(originals.includes('New User Rule'));
  assert.ok(originals.includes('User Rules apply to all of your chats'));
  assert.ok(originals.includes('Style request, response language, tone...'));
  assert.ok(originals.includes('No Rules Yet'));
  assert.ok(originals.includes('Create rules to guide Agent behavior'));
  assert.ok(originals.includes('New Project Rule'));
  assert.ok(originals.includes('Could Not Load Rules'));
  assert.ok(originals.includes('Failed to load workspace rules.'));
});

test('round 35 embedded patches are registered', () => {
  for (const patch of ROUND35_EMBEDDED) {
    const match = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === patch.from);
    assert.ok(match, `missing embedded patch: ${patch.from}`);
    assert.equal(match.to, patch.to);
  }
});

test('merged mappings translate user rules labels for settings and quick input', () => {
  const mappings = loadMergedMappings();
  assert.equal(
    translateTextWithMappings('New User Rule', mappings, { scopeMatched: true }),
    '新建用户规则'
  );
  assert.equal(
    translateTextWithMappings('User Rules apply to all of your chats', mappings, {
      scopeMatched: true,
    }),
    '用户规则适用于你的所有对话'
  );
  assert.equal(
    translateTextWithMappings('Style request, response language, tone...', mappings, {
      scopeMatched: true,
    }),
    '风格要求、回复语言、语气…'
  );
  assert.equal(
    translateTextWithMappings('No Rules Yet', mappings, { scopeMatched: true }),
    '暂无规则'
  );
  assert.equal(
    translateTextWithMappings('Create rules to guide Agent behavior', mappings, {
      scopeMatched: true,
    }),
    '创建规则以引导 Agent 行为'
  );
  assert.equal(
    translateTextWithMappings('New Project Rule', mappings, { scopeMatched: true }),
    '新建项目规则'
  );
});

test('runtime DOM renders rules empty state without English fragments', () => {
  const mappings = loadMergedMappings();
  const harness = createRuntimeDomHarness({
    workbenchSource: 'No Rules Yet',
    runtimeMappings: mappings.filter((entry) => entry.forceRuntime !== false),
  });
  harness.runDueTimers(Infinity);

  const { menu } = harness.mountMenuItem('New User Rule');
  harness.flushMicrotasks();

  assert.equal(harness.getMenuItemText(menu), '新建用户规则');
  assert.doesNotMatch(harness.getMenuItemText(menu), /New User Rule/i);
});

test('static translation applies round 35 user rules snippets', () => {
  const source = [
    'quickInputService.input({title:"New User Rule",placeHolder:"Style request, response language, tone...",prompt:"User Rules apply to all of your chats"})',
    'return z(UL,{title:\\"No Rules Yet\\",description:\\"Create rules to guide Agent behavior\\",get actionTitle(){return n.canCreateUserContent?\\"New User Rule\\":n.hasWorkspaceScopeSelected?\\"New Project Rule\\":void 0}',
    'confirmLabel??\\"Confirm\\",cancelLabel??\\"Cancel\\"',
    'title:\\"Could Not Load Rules\\",get description(){return n.selectedWorkspaceError??\\"Failed to load workspace rules.\\"}',
  ].join('\n');

  const translated = applyStaticSourceTranslations(source, loadMergedMappings());

  assert.match(translated, /title:"新建用户规则"/);
  assert.match(translated, /placeHolder:"风格要求、回复语言、语气…"/);
  assert.match(translated, /prompt:"用户规则适用于你的所有对话"/);
  assert.match(translated, /title:\\"暂无规则\\"/);
  assert.match(translated, /description:\\"创建规则以引导 Agent 行为\\"/);
  assert.match(translated, /confirmLabel\?\?\\"确认\\"/);
  assert.match(translated, /title:\\"无法加载规则\\"/);
  assert.match(translated, /无法加载工作区规则。/);
  assert.equal(translated.includes('No Rules Yet'), false);
  assert.equal(translated.includes('Create rules to guide Agent behavior'), false);
});
