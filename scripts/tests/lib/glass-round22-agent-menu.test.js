const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const {
  CRITICAL_GLASS_ROUND22_UI_TARGETS,
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

const ROUND22_EMBEDDED = [
  { from: 'children:"Move to"', to: 'children:"移动到"' },
];

test('round 22 defines agent context menu move submenu target', () => {
  const originals = CRITICAL_GLASS_ROUND22_UI_TARGETS.map((entry) => entry.originalText);
  assert.ok(originals.includes('Move to'));
});

test('round 22 embedded patches are registered', () => {
  for (const patch of ROUND22_EMBEDDED) {
    const match = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === patch.from);
    assert.ok(match, `missing embedded patch: ${patch.from}`);
    assert.equal(match.to, patch.to);
  }
});

test('static translation applies round 22 move submenu snippets', () => {
  const source = [
    'Ie(Iu.SubMenu,{children:[U(Iu.SubMenuTrigger,{children:"Move to"}),Ie(Iu.SubMenuContent,{maxWidth:TI,minWidth:nP,size:"md",children:[',
    'Ie(Iu.SubMenu,{children:[U(Iu.SubMenuTrigger,{leftSection:U(Xi,{name:"arrow-swap"}),children:"Move to"}),U(Iu.SubMenuContent,{"aria-label":"Move agent",maxWidth:TI,minWidth:nP,size:"md",children:Ti?.map',
    'label:"Move to Local",showStepper:!1}),e[4]=C,e[5]=x):x=e[5];',
  ].join(';');

  const translated = applyStaticSourceTranslations(source, mergedMappings);

  assert.match(translated, /children:"移动到"/);
  assert.equal((translated.match(/children:"移动到"/g) || []).length, 2);
  assert.match(translated, /label:"移到本地"/);
  assert.equal(translated.includes('children:"Move to"'), false);
});
