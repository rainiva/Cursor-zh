const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const {
  CRITICAL_GLASS_ROUND33_UI_TARGETS,
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

const ROUND33_EMBEDDED = [
  {
    from: 'title:"Guide Agent with Rules"',
    to: 'title:"用规则引导 Agent"',
  },
  {
    from:
      'description:"Rules give Agent persistent, system-level instructions for your coding standards and workflows."',
    to: 'description:"规则为 Agent 提供持久、系统级的编码标准与工作流指令。"',
  },
  { from: 'children:"From Marketplace"', to: 'children:"从 Marketplace 添加"' },
  { from: 'children:"From Local Repo"', to: 'children:"从本地仓库添加"' },
  {
    from: 'return["Reading terminal","Read terminal","Read terminal attempted"]',
    to: 'return["正在读取终端","读取终端","尝试读取终端"]',
    applyBeforeStatic: true,
  },
];

test('round 33 defines rules onboarding and plugin source menu targets', () => {
  const originals = CRITICAL_GLASS_ROUND33_UI_TARGETS.map((entry) => entry.originalText);
  assert.ok(originals.includes('Guide Agent with Rules'));
  assert.ok(originals.includes('From Marketplace'));
  assert.ok(originals.includes('From Local Repo'));
});

test('round 33 embedded patches are registered', () => {
  for (const patch of ROUND33_EMBEDDED) {
    const match = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === patch.from);
    assert.ok(match, `missing embedded patch: ${patch.from}`);
    assert.equal(match.to, patch.to);
    if (patch.applyBeforeStatic) {
      assert.equal(match.applyBeforeStatic, true, patch.from);
    }
  }
});

test('merged mappings translate rules onboarding and plugin source labels', () => {
  const mappings = loadMergedMappings();
  assert.equal(
    translateTextWithMappings('Guide Agent with Rules', mappings, { scopeMatched: true }),
    '用规则引导 Agent'
  );
  assert.equal(
    translateTextWithMappings(
      'Rules give Agent persistent, system-level instructions for your coding standards and workflows.',
      mappings,
      { scopeMatched: true }
    ),
    '规则为 Agent 提供持久、系统级的编码标准与工作流指令。'
  );
  assert.equal(
    translateTextWithMappings('From Marketplace', mappings, { scopeMatched: true }),
    '从 Marketplace 添加'
  );
  assert.equal(
    translateTextWithMappings('From Local Repo', mappings, { scopeMatched: true }),
    '从本地仓库添加'
  );
});

test('merged mappings repair semi-translated read terminal labels', () => {
  const mappings = loadMergedMappings();
  for (const input of ['Read terminal', '读取 terminal', 'Reading terminal', '正在读取 terminal']) {
    assert.equal(
      translateTextWithMappings(input, mappings, { scopeMatched: true }),
      input.startsWith('Reading') || input.startsWith('正在')
        ? '正在读取终端'
        : input.startsWith('尝试') || input.includes('attempted')
          ? '尝试读取终端'
          : '读取终端',
      `${input} should not keep the English word terminal`
    );
  }
});

test('runtime DOM renders read terminal label without English fragments', () => {
  const mappings = loadMergedMappings();
  const harness = createRuntimeDomHarness({
    workbenchSource: '读取 terminal',
    runtimeMappings: mappings.filter((entry) => entry.forceRuntime !== false),
  });
  harness.runDueTimers(Infinity);

  const { menu } = harness.mountMenuItem('读取 terminal');
  harness.flushMicrotasks();

  assert.equal(harness.getMenuItemText(menu), '读取终端');
  assert.doesNotMatch(harness.getMenuItemText(menu), /terminal/i);
});

test('static translation applies round 33 rules and terminal snippets before read word rules', () => {
  const source = [
    'rules:{title:"Guide Agent with Rules",description:"Rules give Agent persistent, system-level instructions for your coding standards and workflows.",docsUrl:',
    '{onSelect:()=>r?.(),children:"From Marketplace"}',
    'sA(fn.Item,{onSelect:s,children:"From Local Repo"})',
    'if(Xlt(e.relativeWorkspacePath))return["Reading terminal","Read terminal","Read terminal attempted"]',
  ].join('\n');

  const translated = applyStaticSourceTranslations(source, loadMergedMappings());

  assert.match(translated, /title:"用规则引导 Agent"/);
  assert.match(translated, /规则为 Agent 提供持久、系统级的编码标准与工作流指令。/);
  assert.match(translated, /children:"从 Marketplace 添加"/);
  assert.match(translated, /children:"从本地仓库添加"/);
  assert.match(translated, /return\["正在读取终端","读取终端","尝试读取终端"\]/);
  assert.equal(translated.includes('Read terminal'), false);
  assert.equal(translated.includes('读取 terminal'), false);
});
