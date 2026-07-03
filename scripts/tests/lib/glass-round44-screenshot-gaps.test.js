const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const {
  CRITICAL_GLASS_ROUND44_UI_TARGETS,
  CRITICAL_EMBEDDED_UI_PATCHES,
} = require('../../lib/mapping/critical-ui-targets.js');
const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');
const { mergeMappings, translateTextWithMappings } = require('../../cursor-zh-lib');
const { readJsonIfExists } = require('../../tool/io');
const { createToolPaths } = require('../../tool/paths');

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

const ROUND44_EMBEDDED = [
  {
    from: 'return["Grepping","Grepped","Grep attempted"]',
    to: 'return["搜索中","已搜索","尝试搜索"]',
  },
  {
    from: 'return["Editing","Edited","Edit attempted"]',
    to: 'return["编辑中","已编辑","尝试编辑"]',
  },
  {
    from: 'return["Running command","Ran command","Run command attempted"]',
    to: 'return["正在运行命令","已运行命令","尝试运行命令"]',
  },
  {
    from: 'shellToolCall:{loading:"Running",completed:"Ran",error:"Run"}',
    to: 'shellToolCall:{loading:"运行中",completed:"已运行",error:"运行"}',
  },
  {
    from: 'grepToolCall:{loading:"Grepping",completed:"Grepped",error:"Grep"}',
    to: 'grepToolCall:{loading:"搜索中",completed:"已搜索",error:"搜索"}',
  },
  {
    from: 'editToolCall:{loading:"Editing",completed:"Edited",error:"Edit"}',
    to: 'editToolCall:{loading:"编辑中",completed:"已编辑",error:"编辑"}',
  },
  {
    from: 'const r=e&&!t?"Running":"Ran"',
    to: 'const r=e&&!t?"运行中":"已运行"',
  },
  {
    from: 'Me("<span>Running Terminal Command")',
    to: 'Me("<span>正在运行终端命令")',
  },
  {
    from: '"glass.agentPanel.terminalTabPill.label.single","1 Terminal"',
    to: '"glass.agentPanel.terminalTabPill.label.single","1 个终端"',
  },
  {
    from: '?"Running command":"Ran command"',
    to: '?"正在运行命令":"已运行命令"',
  },
];

test('round 44 defines tool-call attempted and terminal status targets', () => {
  const originals = CRITICAL_GLASS_ROUND44_UI_TARGETS.map((entry) => entry.originalText);
  assert.ok(originals.includes('Grep attempted'));
  assert.ok(originals.includes('Edit attempted'));
  assert.ok(originals.includes('Run command attempted'));
  assert.ok(originals.includes('Running command'));
  assert.ok(originals.includes('Running Terminal Command'));
});

test('round 44 embedded patches are registered', () => {
  for (const patch of ROUND44_EMBEDDED) {
    const match = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === patch.from);
    assert.ok(match, `missing embedded patch: ${patch.from}`);
    assert.equal(match.to, patch.to);
  }
});

test('cursor-win.common.json defines round 44 tool-call mappings', () => {
  const mappings = readJsonIfExists(toolPaths.cursorWinCommonPath, []);
  const byOriginal = new Map(mappings.map((entry) => [entry.originalText, entry]));

  for (const critical of CRITICAL_GLASS_ROUND44_UI_TARGETS) {
    const entry = byOriginal.get(critical.originalText);
    assert.ok(entry, `missing mapping: ${critical.originalText}`);
    assert.equal(entry.changeText, critical.changeText, critical.originalText);
    if (critical.forceRuntime) {
      assert.equal(entry.forceRuntime, true, `${critical.originalText} should use runtime`);
    }
  }
});

test('merged mappings translate tool-call attempted and terminal status copy', () => {
  const mappings = loadMergedMappings();
  assert.equal(
    translateTextWithMappings('Grep attempted', mappings, { scopeMatched: true }),
    '尝试搜索'
  );
  assert.equal(
    translateTextWithMappings('Edit attempted', mappings, { scopeMatched: true }),
    '尝试编辑'
  );
  assert.equal(
    translateTextWithMappings('Running command', mappings, { scopeMatched: true }),
    '正在运行命令'
  );
  assert.equal(
    translateTextWithMappings('Running Terminal Command', mappings, { scopeMatched: true }),
    '正在运行终端命令'
  );
});

test('static translation applies round 44 tool-call and terminal snippets', () => {
  const source = [
    'case yt.RIPGREP_SEARCH:case yt.RIPGREP_RAW_SEARCH:return["Grepping","Grepped","Grep attempted"];',
    'case yt.EDIT_FILE:return["Editing","Edited","Edit attempted"];',
    'case yt.RUN_TERMINAL_COMMAND_V2:return["Running command","Ran command","Run command attempted"];',
    'LMv={shellToolCall:{loading:"Running",completed:"Ran",error:"Run"},grepToolCall:{loading:"Grepping",completed:"Grepped",error:"Grep"},editToolCall:{loading:"Editing",completed:"Edited",error:"Edit"}}',
    'function GBg(n,e,t,i){const r=e&&!t?"Running":"Ran",s=Kii(n);',
    'ka0=Me("<span>Running Terminal Command"),Ca0=Me("<span>Waiting for Review")',
    'x("glass.agentPanel.terminalTabPill.label.single","1 Terminal"):x("glass.agentPanel.terminalTabPill.label.multiple"',
    'oh=c??(B&&!ne?"Running command":"Ran command");',
  ].join('\n');

  const translated = applyStaticSourceTranslations(source, loadMergedMappings());

  assert.match(translated, /return\["搜索中","已搜索","尝试搜索"\]/);
  assert.match(translated, /return\["编辑中","已编辑","尝试编辑"\]/);
  assert.match(translated, /return\["正在运行命令","已运行命令","尝试运行命令"\]/);
  assert.match(translated, /shellToolCall:\{loading:"运行中",completed:"已运行",error:"运行"\}/);
  assert.match(translated, /const r=e&&!t\?"运行中":"已运行"/);
  assert.match(translated, /Me\("<span>正在运行终端命令"\)/);
  assert.match(translated, /"glass.agentPanel.terminalTabPill.label.single","1 个终端"/);
  assert.match(translated, /\?"正在运行命令":"已运行命令"/);
  assert.equal(translated.includes('Grep attempted'), false);
  assert.equal(translated.includes('Edit attempted'), false);
});
