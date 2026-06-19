const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const {
  CRITICAL_GLASS_ROUND21_UI_TARGETS,
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

const ROUND21_EMBEDDED = [
  { from: 'children:"Archive All"', to: 'children:"全部归档"' },
  { from: 'children:"Remove from Sidebar"', to: 'children:"从侧边栏移除"' },
  { from: '?"Confirm":"全部归档"', to: '?"确认":"全部归档"' },
];

test('round 21 defines agent sidebar overflow menu UI targets', () => {
  const originals = CRITICAL_GLASS_ROUND21_UI_TARGETS.map((entry) => entry.originalText);
  assert.ok(originals.includes('Archive All'));
  assert.ok(originals.includes('Remove from Sidebar'));
});

test('round 21 embedded patches are registered', () => {
  for (const patch of ROUND21_EMBEDDED) {
    const match = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === patch.from);
    assert.ok(match, `missing embedded patch: ${patch.from}`);
    assert.equal(match.to, patch.to);
  }
});

test('static translation applies round 21 sidebar menu snippets', () => {
  const source = [
    'leftSection:U(Xi,{name:"bell"}),onSelect:xi,children:"Mark All as Read"}),en&&u&&U(Iu.Item,{leftSection:U(Xi,{name:"archive"}),onSelect:wi,children:"Archive All"})]}),jt&&U(Iu.Section,{children:U(Iu.Item,{leftSection:U(Xi,{name:"trash"}),onSelect:mi,children:"Remove from Sidebar"})})]});',
    'u.addEventListener("click",o),we(u,()=>t()?"Confirm":"Archive All"),un(()=>si(u,`agent-sidebar-section-clear-button',
  ].join(';');

  const translated = applyStaticSourceTranslations(source, mergedMappings);

  assert.match(translated, /children:"全部标记为已读"/);
  assert.match(translated, /children:"全部归档"/);
  assert.match(translated, /children:"从侧边栏移除"/);
  assert.match(translated, /\?"确认":"全部归档"/);
  assert.equal(translated.includes('Archive All'), false);
  assert.equal(translated.includes('Remove from Sidebar'), false);
});
