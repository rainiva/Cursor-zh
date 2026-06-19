const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const {
  CRITICAL_GLASS_ROUND20_UI_TARGETS,
  CRITICAL_EMBEDDED_UI_PATCHES,
} = require('../../lib/mapping/critical-ui-targets.js');
const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');
const { mergeMappings } = require('../../cursor-zh-lib');
const { readJsonIfExists } = require('../../tool/io');
const { createToolPaths } = require('../../tool/paths');

const toolPaths = createToolPaths(path.join(__dirname, '../../..'));
const mergedMappings = mergeMappings(
  mergeMappings(
    readJsonIfExists(toolPaths.baseMappingPath, []),
    readJsonIfExists(toolPaths.overlayMappingPath, [])
  ),
  readJsonIfExists(toolPaths.cursorWinCommonPath, [])
);

const ROUND20_EMBEDDED = [
  { from: 'label:"Successful \\xB7 7d"', to: 'label:"成功 · 7天"' },
  { from: 'label:"Failed \\xB7 7d"', to: 'label:"失败 · 7天"' },
  { from: 'label:"Successful \\xB7 24h"', to: 'label:"成功 · 24h"' },
  { from: 'label:"Failed \\xB7 24h"', to: 'label:"失败 · 24h"' },
  { from: 'children:"Total Automations"', to: 'children:"自动化总数"' },
  { from: 'children:["Run History"', to: 'children:["运行历史"' },
  { from: 'ariaLabel:"Run history"', to: 'ariaLabel:"运行历史"' },
  { from: ':c?"No Results Found":"No Automations Yet"', to: ':c?"未找到结果":"暂无自动化"' },
  { from: 'children:"New Automation"', to: 'children:"新建自动化"' },
  { from: 'title:"Enable Run Everything?"', to: 'title:"启用全部运行？"' },
  { from: 'label:"Enable Run Everything"', to: 'label:"启用全部运行"' },
  {
    from: 'label:i?"Use Sandbox instead":"Use Allowlist instead"',
    to: 'label:i?"改用沙箱":"改用允许列表"',
  },
];

test('round 20 defines automation page and approval dialog UI targets', () => {
  const originals = CRITICAL_GLASS_ROUND20_UI_TARGETS.map((entry) => entry.originalText);
  assert.ok(originals.includes('Reduce interruptions with Auto-review'));
  assert.ok(originals.includes('Switch to Auto-review'));
  assert.ok(originals.includes("Don't show again"));
  assert.ok(originals.includes('Enable Run Everything?'));
  assert.ok(originals.includes('Use Allowlist instead'));
  assert.ok(originals.includes('Total Automations'));
  assert.ok(originals.includes('Automate repetitive tasks with always-on cloud agents that respond to environment triggers.'));
});

test('round 20 embedded patches are registered', () => {
  for (const patch of ROUND20_EMBEDDED) {
    const match = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === patch.from);
    assert.ok(match, `missing embedded patch: ${patch.from}`);
    assert.equal(match.to, patch.to);
  }
});

test('static translation applies round 20 automation and approval dialog snippets', () => {
  const source = [
    'label:"Successful \\xB7 7d",children:K.summary.isLoading',
    'children:"Total Automations"})]}),e[16]=H',
    'children:["Run History"," ",U(Fa,{name:"arrow-right"',
    'ariaLabel:"Run history",columns:K.columns',
    ':c?"No Results Found":"No Automations Yet"}),!c&&Ie(ss,{children:[',
    'children:"New Automation"}):o!==void 0?U(_k,{className:vx',
    'title:"Enable Run Everything?",message:nOS(i),dialogIcon:st.warning',
    'label:"Enable Run Everything"},cancelButton:{id:GJg,label:"Cancel"',
    'label:i?"Use Sandbox instead":"Use Allowlist instead",type:"secondary"',
    'var pBA="Reduce interruptions with Auto-review",fBA="This mode allows Cursor to work for longer with fewer approval prompts and safer execution. Future commands and actions will go through this mode.",gBA="Switch to Auto-review",tg1="Don\'t show again"',
    'P8P="Automate repetitive tasks with always-on cloud agents that respond to environment triggers.";function R3C',
    'children:"Run agents on a schedule or automatically in response to events. Billed at plan rates."',
    'RUN_EVERYTHING_SANDBOX_UNAVAILABLE:"This allows the agent to execute any tool or shell command without approval. A prompt injection or a malicious tool could delete files or exfiltrate secrets from your machine. We recommend using Allowlist."',
  ].join(';');

  const translated = applyStaticSourceTranslations(source, mergedMappings);

  assert.match(translated, /成功 · 7天/);
  assert.match(translated, /children:"自动化总数"/);
  assert.match(translated, /children:\["运行历史"/);
  assert.match(translated, /ariaLabel:"运行历史"/);
  assert.match(translated, /暂无自动化/);
  assert.match(translated, /children:"新建自动化"/);
  assert.match(translated, /title:"启用全部运行？"/);
  assert.match(translated, /label:"启用全部运行"/);
  assert.match(translated, /改用允许列表/);
  assert.match(translated, /使用 Auto-review 减少打断/);
  assert.match(translated, /切换到 Auto-review/);
  assert.match(translated, /不再显示/);
  assert.match(translated, /借助始终在线的云端智能体/);
  assert.match(translated, /按计划运行智能体/);
  assert.match(translated, /建议使用允许列表/);
  assert.equal(translated.includes('Total Automations'), false);
  assert.equal(translated.includes('Enable Run Everything?'), false);
  assert.equal(translated.includes('Reduce interruptions with Auto-review'), false);
});
