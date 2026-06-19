const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const {
  CRITICAL_GLASS_ROUND24_UI_TARGETS,
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

const ROUND24_EMBEDDED = [
  {
    from: 'description:"Automate repetitive tasks with always-on cloud agents that respond to environment triggers."',
    to: 'description:"借助始终在线的云端智能体自动执行重复任务，并响应环境触发器。"',
  },
  {
    from: 'P8P="Automate repetitive tasks with always-on cloud agents that respond to environment triggers."',
    to: 'P8P="借助始终在线的云端智能体自动执行重复任务，并响应环境触发器。"',
  },
  { from: 'children:"Always Run"', to: 'children:"始终运行"' },
  { from: '?"Always Run":', to: '?"始终运行":' },
  { from: 'Always Run \'', to: '始终运行 \'' },
  { from: 'label:"Always run"', to: 'label:"始终运行"' },
  { from: 'label:"Auto-Run"', to: 'label:"自动运行"' },
  { from: 'label:"Change run mode"', to: 'label:"更改运行模式"' },
  { from: 'Always run selected commands', to: '始终运行所选命令' },
  { from: 'Always run these commands', to: '始终运行这些命令' },
  { from: 'Will allow:', to: '将允许：' },
  { from: ' more...`]:', to: ' 项...`]:' },
];

test('round 24 defines automation subtitle, web search, and always-run UI targets', () => {
  const originals = CRITICAL_GLASS_ROUND24_UI_TARGETS.map((entry) => entry.originalText);
  assert.ok(
    originals.includes(
      'Enabled by Run Everything Auto-Run Mode: Agent bypasses approval prompts for tools including Web Search.'
    )
  );
  assert.ok(originals.includes('Always Run'));
  assert.ok(originals.includes('Always run selected commands'));
  assert.ok(originals.includes('Change run mode'));
});

test('round 24 embedded patches are registered', () => {
  for (const patch of ROUND24_EMBEDDED) {
    const match = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === patch.from);
    assert.ok(match, `missing embedded patch: ${patch.from}`);
    assert.equal(match.to, patch.to);
  }
});

test('static translation applies round 24 automation subtitle and always-run snippets', () => {
  const source = [
    'P8P="Automate repetitive tasks with always-on cloud agents that respond to environment triggers.";function R3C',
    'description:"Automate repetitive tasks with always-on cloud agents that respond to environment triggers."}),Ie("div"',
    'r()?"Enabled by Run Everything Auto-Run Mode: Agent bypasses approval prompts for tools including Web Search.":"Skip approval dialog',
    'return`Always Run \'${n}\'}`}function rDy(n){return n?.length?n.length===1?`Always Run \'${n[0].label}\'`:`Always Run \'${n[0].label}\' + ${n.length-1}`:null}',
    'x=s?`Always run selected commands (${c})`:`Always run these commands (${c})`;let R;e[18]!==C||e[19]!==x?(R=rMy(x,C)',
    'return[n,"","Will allow:",...i.map(s=>`- ${s}`),...r>0?[`- ${r} more...`]:[]].join',
    'children:U(co,{variant:"primary",size:"sm",disabled:n.disabled,className:o,style:a,onClick:c,children:"Always Run"})',
    'yn?"Always Run":Bt||gt===null?bt:U(eOf,{labelParts:gt',
    'R={label:"Always run",items:x},t[26]=x,t[27]=R):R=t[27],_.push(R)}',
    'label:"Auto-Run",items:n.availableAutorunModes.map',
    'label:"Change run mode",items:x},t[17]=x,t[18]=R):R=t[18],_.push(R)}',
  ].join(';');

  const translated = applyStaticSourceTranslations(source, mergedMappings);

  assert.match(translated, /P8P="借助始终在线的云端智能体/);
  assert.match(translated, /description:"借助始终在线的云端智能体/);
  assert.match(translated, /由「全部运行」自动运行模式启用：智能体会跳过包括网页搜索在内的工具审批提示/);
  assert.match(translated, /始终运行 '/);
  assert.match(translated, /始终运行所选命令/);
  assert.match(translated, /始终运行这些命令/);
  assert.match(translated, /将允许：/);
  assert.match(translated, /children:"始终运行"/);
  assert.match(translated, /\?"始终运行":/);
  assert.match(translated, /label:"始终运行"/);
  assert.match(translated, /label:"自动运行"/);
  assert.match(translated, /label:"更改运行模式"/);
  assert.equal(translated.includes('Automate repetitive tasks'), false);
  assert.equal(translated.includes('Enabled by Run Everything Auto-Run Mode'), false);
  assert.equal(translated.includes('children:"Always Run"'), false);
  assert.equal(translated.includes('Always Run \''), false);
});
