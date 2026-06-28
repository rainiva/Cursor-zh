const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const {
  CRITICAL_GLASS_ROUND28_UI_TARGETS,
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

const ROUND28_EMBEDDED = [
  { from: 'children:[t.length," Queued"]', to: 'children:[t.length," 个排队"]' },
];

test('round 28 defines queued badge and plan menu targets', () => {
  const originals = CRITICAL_GLASS_ROUND28_UI_TARGETS.map((entry) => entry.originalText);
  assert.ok(originals.includes(' Queued'));
  assert.ok(originals.includes('Copy as Markdown'));
  assert.ok(originals.includes('Find in Plan'));
  assert.ok(originals.includes('Extend Cursor with Plugins'));
});

test('round 28 embedded patches are registered', () => {
  for (const patch of ROUND28_EMBEDDED) {
    const match = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === patch.from);
    assert.ok(match, `missing embedded patch: ${patch.from}`);
    assert.equal(match.to, patch.to);
  }
});

test('static translation applies round 28 queued badge and plan menu snippets', () => {
  const source = [
    'className:"queue-tray__header-count",children:[t.length," Queued"]}),e[69]=t.length',
    'children:"Copy as Markdown"}),E&&Vz(fn.Item,{onSelect:E,rightSection:A,children:"Find in Plan"}',
    'cIe={plugins:{title:"Extend Cursor with Plugins",description:"Plugins bundle rules, skills, subagents, commands, MCP servers, and hooks into one installable package.",docsUrl:',
  ].join('\n');

  const translated = applyStaticSourceTranslations(source, mergedMappings);

  assert.match(translated, /children:\[t\.length," 个排队"\]/);
  assert.match(translated, /children:"复制为 Markdown"/);
  assert.match(translated, /children:"在计划中查找"/);
  assert.match(translated, /title:"使用插件扩展 Cursor"/);
  assert.match(
    translated,
    /description:"插件将规则、技能、子智能体、命令、MCP 服务器和钩子打包为一个可安装包。"/
  );
  assert.equal(translated.includes('Copy as Markdown'), false);
  assert.equal(translated.includes('Find in Plan'), false);
});
