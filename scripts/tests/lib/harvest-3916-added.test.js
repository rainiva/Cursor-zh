const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const {
  CRITICAL_HARVEST_3916_ADDED_TARGETS,
  CRITICAL_EMBEDDED_UI_PATCHES,
} = require('../../lib/mapping/critical-ui-targets.js');
const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');
const { mergeMappings, translateTextWithMappings } = require('../../cursor-zh-lib');
const { readJsonIfExists } = require('../../tool/io');
const { createToolPaths } = require('../../tool/paths');

const toolPaths = createToolPaths(path.join(__dirname, '../../..'));

const HARVEST_3916_EMBEDDED = [
  { from: 'label:"Open Agent"', to: 'label:"打开 Agent"' },
  { from: 'label:"Fix All in Cursor"', to: 'label:"在 Cursor 中全部修复"' },
  { from: 'label:"Automation ID"', to: 'label:"自动化 ID"' },
  { from: 'label:"Run ID"', to: 'label:"运行 ID"' },
  { from: 'label:"Agent ID"', to: 'label:"Agent ID"' },
  { from: 'label:"Agent URL"', to: 'label:"Agent URL"' },
  { from: 'label:"Automation URL"', to: 'label:"自动化 URL"' },
  {
    from: 'n.kind==="agent"?"View on web":n.label',
    to: 'n.kind==="agent"?"在 Web 中查看":n.label',
  },
  { from: 'children:[u,"Add to chat"]', to: 'children:[u,"添加到对话"]' },
  {
    from: 'children:["Sent by Cursor Automation:"," ',
    to: 'children:["由 Cursor 自动化发送："," ',
  },
  {
    from: 'children:["Create PR with fixes"',
    to: 'children:["创建包含修复的 PR"',
  },
  {
    from: 'title:Ze?"Mark file as not viewed":"Mark as viewed"',
    to: 'title:Ze?"标记文件为未查看":"标记为已查看"',
  },
  { from: 'children:"View on Web"', to: 'children:"在 Web 中查看"' },
];

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

test('harvest 3916 added defines 13 unique automation and composer strings', () => {
  const originals = CRITICAL_HARVEST_3916_ADDED_TARGETS.map((entry) => entry.originalText);
  assert.equal(originals.length, 13);
  assert.ok(originals.includes('Open Agent'));
  assert.ok(originals.includes('Fix All in Cursor'));
  assert.ok(originals.includes('Sent by Cursor Automation:'));
  assert.ok(originals.includes('Mark as viewed'));
});

test('harvest 3916 embedded patches are registered', () => {
  for (const patch of HARVEST_3916_EMBEDDED) {
    const match = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === patch.from);
    assert.ok(match, `missing embedded patch: ${patch.from}`);
    assert.equal(match.to, patch.to);
  }
});

test('cursor-win.common.json defines harvest 3916 added mappings without forceRuntime', () => {
  const mappings = readJsonIfExists(toolPaths.cursorWinCommonPath, []);
  const byOriginal = new Map(mappings.map((entry) => [entry.originalText, entry]));

  for (const critical of CRITICAL_HARVEST_3916_ADDED_TARGETS) {
    const entry = byOriginal.get(critical.originalText);
    assert.ok(entry, `missing mapping: ${critical.originalText}`);
    assert.equal(entry.changeText, critical.changeText, critical.originalText);
    assert.equal(entry.forceRuntime, false, `${critical.originalText} should opt out of L3 forceRuntime`);
    assert.ok(entry.surface, `${critical.originalText} should declare surface`);
    assert.ok(
      Array.isArray(entry.scopeSelectors) && entry.scopeSelectors.length > 0,
      `${critical.originalText} should use scopeSelectors`
    );
  }
});

test('merged mappings translate harvest 3916 automation attribution labels', () => {
  const mappings = loadMergedMappings();
  assert.equal(
    translateTextWithMappings('Open Agent', mappings, { scopeMatched: true }),
    '打开 Agent'
  );
  assert.equal(
    translateTextWithMappings('Sent by Cursor Automation:', mappings, { scopeMatched: true }),
    '由 Cursor 自动化发送：'
  );
  assert.equal(
    translateTextWithMappings('Add to chat', mappings, { scopeMatched: true }),
    '添加到对话'
  );
});

test('static translation applies harvest 3916 glass automation snippets', () => {
  const source = [
    'r.push({kind:"agent",label:"Open Agent",url:t,...s?{agentId:s}:{}})',
    'a.push({kind:"fixAll",label:"Fix All in Cursor",url:r,fixInCursorPayload:SX_(r)});',
    'D4n({label:"Automation ID",value:n.automationId}),D4n({label:"Run ID",value:n.runId})',
    'return rWu(AX_,{children:[n.kind==="agent"?"View on web":n.label,obs(Yn,',
    'JZh($Zh,{actions:BB1(vcs,{onClick:c,variant:"secondary",children:[u,"Add to chat"]})})',
    'children:["Sent by Cursor Automation:"," ",obs("span",{className:"pr-cursor-comment-footer__meta-strong"',
    'case"createPr":return Lxp(DX_,{children:["Create PR with fixes",abs(Yn,',
    'content:vgt(nl,{title:Ze?"Mark file as not viewed":"Mark as viewed"}),openDelay:400',
    'A=oWu(wr,{onClick:w,variant:"secondary",children:"View on Web"}),e[23]=w',
  ].join('\n');

  const translated = applyStaticSourceTranslations(source, loadMergedMappings());

  assert.match(translated, /label:"打开 Agent"/);
  assert.match(translated, /label:"在 Cursor 中全部修复"/);
  assert.match(translated, /label:"自动化 ID"/);
  assert.match(translated, /label:"运行 ID"/);
  assert.match(translated, /\?"在 Web 中查看":n\.label/);
  assert.match(translated, /children:\[u,"添加到对话"\]/);
  assert.match(translated, /children:\["由 Cursor 自动化发送："," /);
  assert.match(translated, /children:\["创建包含修复的 PR"/);
  assert.match(translated, /title:Ze\?"标记文件为未查看":"标记为已查看"/);
  assert.match(translated, /children:"在 Web 中查看"/);
  assert.equal(translated.includes('label:"Open Agent"'), false);
  assert.equal(translated.includes('Add to chat'), false);
});
