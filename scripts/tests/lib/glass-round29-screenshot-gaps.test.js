const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const {
  CRITICAL_GLASS_ROUND29_UI_TARGETS,
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

const ROUND29_EMBEDDED = [
  { from: 'children:"MAX MODE"', to: 'children:"MAX 模式"' },
  { from: 'children:"Enable MAX Mode"', to: 'children:"启用 MAX 模式"' },
  { from: 'children:["View Pricing ', to: 'children:["查看定价 ' },
  { from: 'children:"Agent Instructions"', to: 'children:"智能体指令"' },
  { from: 'children:"Add Trigger"', to: 'children:"添加触发器"' },
  { from: 'label:"Copy as JSON"', to: 'label:"复制为 JSON"' },
  { from: 'label:"Send to Slack"', to: 'label:"发送到 Slack"' },
  { from: 'label:"Read Public Slack Channels"', to: 'label:"读取公共 Slack 频道"' },
  { from: 'label:"Send to Microsoft Teams"', to: 'label:"发送到 Microsoft Teams"' },
  { from: 'label:"Read Microsoft Teams Channels"', to: 'label:"读取 Microsoft Teams 频道"' },
  { from: 'label:"Comment on Pull Request"', to: 'label:"评论拉取请求"' },
  { from: 'label:"Request Reviewers"', to: 'label:"请求审查者"' },
  { from: 'placeHolder:"Select repository"', to: 'placeHolder:"选择仓库"' },
  {
    from: 'message:"GitHub returned an unexpected connection state."',
    to: 'message:"GitHub 返回了意外的连接状态。"',
  },
  {
    from: 'Maxes out context windows and tool calls. For advanced users that are cost insensitive. Billed at API-pricing.',
    to: '最大化上下文窗口与工具调用次数。面向不太在意成本的高级用户。按 API 定价计费。',
  },
  {
    from: 'GitHub app access updated. Cloud Agent setup is refreshing.',
    to: 'GitHub 应用访问权限已更新。云 Agent 设置正在刷新。',
  },
];

test('round 29 defines plan, automations, max mode, and github screenshot targets', () => {
  const originals = CRITICAL_GLASS_ROUND29_UI_TARGETS.map((entry) => entry.originalText);
  assert.ok(originals.includes('MAX MODE'));
  assert.ok(originals.includes('Enable MAX Mode'));
  assert.ok(originals.includes('Agent Instructions'));
  assert.ok(originals.includes('Copy as JSON'));
  assert.ok(originals.includes('Select repository'));
  assert.ok(originals.includes('Ask before running'));
  assert.ok(originals.includes('GitHub returned an unexpected connection state.'));
  assert.ok(originals.includes('Waiting for shell'));
});

test('round 29 embedded patches are registered', () => {
  for (const patch of ROUND29_EMBEDDED) {
    const match = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === patch.from);
    assert.ok(match, `missing embedded patch: ${patch.from}`);
    assert.equal(match.to, patch.to);
  }
});

test('static translation applies round 29 max mode and automations snippets', () => {
  const source = [
    'e:E.style,children:"MAX MODE"})}),n[21]=G',
    'irmed"})},children:"Enable MAX Mode"}),n[25]=e',
    'cked"})},children:["View Pricing ",nR(Xn,{name:"arrow-right-up"',
    'n-title"),children:"Agent Instructions"})}),K,WS("div"',
    'w__main"),children:"Add Trigger"})]})}),e[13]=z',
    'onSelect")},{label:"Copy as JSON",onSelect:a(()=>Q(ie)',
    'label:"Send to Slack",description:"Allows the agent to send"',
    'y:yi.Error,message:"GitHub returned an unexpected connection state."}),this._clearPendingFlow()',
    'placeHolder:"Select repository",title:"Score Commit for AI Content"',
  ].join('\n');

  const translated = applyStaticSourceTranslations(source, mergedMappings);

  assert.match(translated, /children:"MAX 模式"/);
  assert.match(translated, /children:"启用 MAX 模式"/);
  assert.match(translated, /children:\["查看定价 /);
  assert.match(translated, /children:"智能体指令"/);
  assert.match(translated, /children:"添加触发器"/);
  assert.match(translated, /label:"复制为 JSON"/);
  assert.match(translated, /label:"发送到 Slack"/);
  assert.match(translated, /message:"GitHub 返回了意外的连接状态。"/);
  assert.match(translated, /placeHolder:"选择仓库"/);
  assert.equal(translated.includes('MAX MODE'), false);
  assert.equal(translated.includes('Agent Instructions'), false);
});
