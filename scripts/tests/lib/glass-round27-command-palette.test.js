const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const {
  CRITICAL_GLASS_ROUND27_UI_TARGETS,
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

const ROUND27_EMBEDDED = [
  { from: 'glassCategory:"Mode"', to: 'glassCategory:"模式"' },
  { from: 'glassCategory:"Agent"', to: 'glassCategory:"智能体"' },
];

test('round 27 defines command palette and glass menu UI targets', () => {
  const originals = CRITICAL_GLASS_ROUND27_UI_TARGETS.map((entry) => entry.originalText);
  assert.ok(originals.includes('Toggle Expand Agent'));
  assert.ok(originals.includes('Show Apps Panel'));
  assert.ok(originals.includes('Open Automations'));
  assert.ok(originals.includes('Skills & Commands'));
  assert.ok(originals.includes('Search files, actions, agents...'));
  assert.ok(originals.includes('Developer: Open Logs Folder'));
});

test('round 27 embedded patches are registered', () => {
  for (const patch of ROUND27_EMBEDDED) {
    const match = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === patch.from);
    assert.ok(match, `missing embedded patch: ${patch.from}`);
    assert.equal(match.to, patch.to);
  }
});

test('static translation applies round 27 command palette snippets', () => {
  const source = [
    'Ns({id:D5h,title:"Toggle Expand Agent",icon:"layers",glassCategory:"View",f1:!0',
    'Ns({id:N5h,title:"Open Automations",icon:"robot",glassCategory:"View"',
    'heading:"Skills & Commands",children:[dn?(K.trim()||Z?ln:ln.slice(0,3)).map',
    'children:l?"Show less":"Show more"})]}),e[7]=l',
    'placeholder:re.placeholder??(W?"Search files...":$?"Search actions...":G?"Search agents...":"Search files, actions, agents...")',
    'Ns({id:x9h,title:"Plan Mode",icon:"list-todo",glassCategory:"Mode",keywords:["plan","mode","planning"]',
    'heading:"New Agent with Model",children:en?qe.map',
    'title:"Start Electron Trace"',
    'title:"Workspace Diagnostics"',
    'title:"Update Cursor"',
    'title:"High Contrast Theme"',
    'title:"Toggle Developer Tools"',
    'title:"Developer: Open Logs Folder"',
    'title:"GC Agent KV Blobs"',
  ].join('\n');

  const translated = applyStaticSourceTranslations(source, mergedMappings);

  assert.match(translated, /title:"切换展开智能体"/);
  assert.match(translated, /title:"打开自动化"/);
  assert.match(translated, /heading:"技能与命令"/);
  assert.match(translated, /"显示更多"/);
  assert.match(translated, /"搜索文件、操作和智能体\.\.\."/);
  assert.match(translated, /glassCategory:"模式"/);
  assert.match(translated, /heading:"使用模型新建智能体"/);
  assert.match(translated, /title:"启动 Electron 跟踪"/);
  assert.match(translated, /title:"工作区诊断"/);
  assert.match(translated, /title:"更新 Cursor"/);
  assert.match(translated, /title:"高对比度主题"/);
  assert.match(translated, /title:"切换开发者工具"/);
  assert.match(translated, /title:"开发者：打开日志文件夹"/);
  assert.match(translated, /title:"回收 Agent KV Blob"/);
  assert.equal(translated.includes('Toggle Expand Agent'), false);
  assert.equal(translated.includes('Skills & Commands'), false);
});
