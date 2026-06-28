const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const {
  CRITICAL_GLASS_ROUND32_UI_TARGETS,
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

const ROUND32_EMBEDDED = [
  { from: 'title:"Open Plan"', to: 'title:"打开计划"' },
  { from: 'z(Ec,{title:"Manage",size:"small",type:"tertiary"', to: 'z(Ec,{title:"管理",size:"small",type:"tertiary"' },
  { from: 'children:"Inactive"', to: 'children:"未激活"' },
  { from: 'o=t?"Active":"Inactive"', to: 'o=t?"已激活":"未激活"' },
  { from: 'title:"Delete automation"', to: 'title:"删除自动化"' },
  { from: 'label:"Edit Details"', to: 'label:"编辑详情"' },
  { from: 'children:"Add Tool or MCP"', to: 'children:"添加工具或 MCP"' },
  {
    from: 'Mi["agent-prompts-section"]="Enter instructions for the agent before saving."',
    to: 'Mi["agent-prompts-section"]="保存前请输入智能体指令。"',
  },
  {
    from: 'Mi["agent-triggers-section"]="Add a trigger before saving."',
    to: 'Mi["agent-triggers-section"]="保存前请添加触发器。"',
  },
  {
    from: 'return"Get maximum value with 20x usage limits and early access to advanced features."',
    to: 'return"获取 20 倍用量上限与高级功能的抢先体验，价值最大化。"',
  },
  {
    from: 'se(Oe,()=>`Included in ${le().planName}`)',
    to: 'se(Oe,()=>`已包含于 ${le().planName}`)',
  },
  {
    from: 'description:"Customize is the new home for managing this page"',
    to: 'description:"自定义页面是统一管理此页功能的新入口"',
  },
  { from: '[Es.MEMORIES]:"Memories"', to: '[Es.MEMORIES]:"记忆"' },
];

test('round 32 defines billing, automation editor, and template gallery targets', () => {
  const originals = CRITICAL_GLASS_ROUND32_UI_TARGETS.map((entry) => entry.originalText);
  assert.ok(originals.includes('Inactive'));
  assert.ok(originals.includes('Open Plan'));
  assert.ok(originals.includes('Delete automation'));
  assert.ok(originals.includes('Edit Details'));
  assert.ok(originals.includes('Add Tool or MCP'));
  assert.ok(originals.includes('Scan codebase for vulnerabilities'));
  assert.ok(originals.includes('Find vulnerabilities'));
  assert.ok(originals.includes('Customer Health Monitoring Agent'));
});

test('round 32 embedded patches are registered', () => {
  for (const patch of ROUND32_EMBEDDED) {
    const match = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === patch.from);
    assert.ok(match, `missing embedded patch: ${patch.from}`);
    assert.equal(match.to, patch.to);
  }
});

test('merged mappings translate billing and automation editor labels', () => {
  const mappings = loadMergedMappings();
  assert.equal(
    translateTextWithMappings('Inactive', mappings, { scopeMatched: true }),
    '未激活'
  );
  assert.equal(
    translateTextWithMappings('Open Plan', mappings, { scopeMatched: true }),
    '打开计划'
  );
  assert.equal(
    translateTextWithMappings('Delete automation', mappings, { scopeMatched: true }),
    '删除自动化'
  );
  assert.equal(
    translateTextWithMappings('Edit Details', mappings, { scopeMatched: true }),
    '编辑详情'
  );
  assert.equal(
    translateTextWithMappings('Add Tool or MCP', mappings, { scopeMatched: true }),
    '添加工具或 MCP'
  );
  assert.equal(
    translateTextWithMappings('Enter instructions for the agent before saving.', mappings, {
      scopeMatched: true,
    }),
    '保存前请输入智能体指令。'
  );
  assert.equal(
    translateTextWithMappings('Add a trigger before saving.', mappings, { scopeMatched: true }),
    '保存前请添加触发器。'
  );
  assert.equal(
    translateTextWithMappings('Customize is the new home for managing this page', mappings, {
      scopeMatched: true,
    }),
    '自定义页面是统一管理此页功能的新入口'
  );
  assert.equal(
    translateTextWithMappings('Scan codebase for vulnerabilities', mappings, {
      scopeMatched: true,
    }),
    '扫描代码库漏洞'
  );
  assert.equal(
    translateTextWithMappings('Fix bugs reported in Slack', mappings, { scopeMatched: true }),
    '修复 Slack 报告的 Bug'
  );
});

test('dynamic regex mappings preserve plan names, multipliers, day counts, and automation names', () => {
  const mappings = loadMergedMappings();

  assert.equal(
    translateTextWithMappings('Included in Pro+', mappings, { scopeMatched: true }),
    '已包含于 Pro+'
  );
  assert.equal(
    translateTextWithMappings('Included in Ultra Plan', mappings, { scopeMatched: true }),
    'Ultra 套餐已包含'
  );
  assert.equal(
    translateTextWithMappings(
      'Get maximum value with 20x usage limits and early access to advanced features.',
      mappings,
      { scopeMatched: true }
    ),
    '获取 20 倍用量上限与高级功能的抢先体验，价值最大化。'
  );
  assert.equal(
    translateTextWithMappings(
      'Get maximum value with 50x usage limits and early access to advanced features.',
      mappings,
      { scopeMatched: true }
    ),
    '获取 50 倍用量上限与高级功能的抢先体验，价值最大化。'
  );
  assert.equal(
    translateTextWithMappings('(30 days)', mappings, { scopeMatched: true }),
    '（30 天）'
  );
  assert.equal(
    translateTextWithMappings(
      'Are you sure you want to delete "Untitled"? This cannot be undone.',
      mappings,
      { scopeMatched: true }
    ),
    '确定要删除「Untitled」吗？此操作无法撤销。'
  );
  assert.equal(
    translateTextWithMappings('Hooks are moving to Customize', mappings, { scopeMatched: true }),
    '钩子已迁移至「自定义」'
  );
});

test('runtime DOM renders inactive automation status without English fragments', () => {
  const mappings = loadMergedMappings();
  const harness = createRuntimeDomHarness({
    workbenchSource: 'Inactive',
    runtimeMappings: mappings.filter((entry) => entry.forceRuntime !== false),
  });
  harness.runDueTimers(Infinity);

  const { menu } = harness.mountMenuItem('Inactive');
  harness.flushMicrotasks();

  assert.equal(harness.getMenuItemText(menu), '未激活');
  assert.doesNotMatch(harness.getMenuItemText(menu), /Inactive/i);
});

test('static translation applies round 32 automations and billing snippets', () => {
  const source = [
    'Ns({id:J5w,title:"Open Plan",icon:"list-todo",glassCategory:"View"',
    'z(Ec,{title:"Manage",size:"small",type:"tertiary",onClick:ye',
    'list-table__badge"),children:"Inactive"})',
    'lqn(c3,{title:"Delete automation",description:H0i(Sxo',
    '{label:"Edit Details",onSelect:a(()=>t(ie)',
    'children:"Add Tool or MCP"})',
    'Mi["agent-prompts-section"]="Enter instructions for the agent before saving."',
    'return"Get maximum value with 20x usage limits and early access to advanced features."',
    'se(Oe,()=>`Included in ${le().planName}`)',
  ].join('\n');

  const translated = applyStaticSourceTranslations(source, loadMergedMappings());

  assert.match(translated, /title:"打开计划"/);
  assert.match(translated, /title:"管理"/);
  assert.match(translated, /children:"未激活"/);
  assert.match(translated, /title:"删除自动化"/);
  assert.match(translated, /label:"编辑详情"/);
  assert.match(translated, /children:"添加工具或 MCP"/);
  assert.match(translated, /保存前请输入智能体指令。/);
  assert.match(translated, /获取 20 倍用量上限/);
  assert.match(translated, /已包含于 \$\{le\(\)\.planName\}/);
  assert.equal(translated.includes('Open Plan'), false);
  assert.equal(translated.includes('Delete automation'), false);
});
