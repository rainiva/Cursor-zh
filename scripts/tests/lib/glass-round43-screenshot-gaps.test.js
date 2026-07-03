const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const {
  CRITICAL_GLASS_ROUND43_UI_TARGETS,
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

const ROUND43_EMBEDDED = [
  {
    from:
      'primaryButton:{id:"ok",label:"OK"},extraButtons:[{id:fW.PRIMARY_BUTTON_ID,label:"Copy"}],dialogIcon:Fe.dialogInfo',
    to: 'primaryButton:{id:"ok",label:"确定"},extraButtons:[{id:fW.PRIMARY_BUTTON_ID,label:"复制"}],dialogIcon:Fe.dialogInfo',
  },
  { from: 'primaryButton:{id:"ok",label:"OK"}', to: 'primaryButton:{id:"ok",label:"确定"}' },
  { from: 'label:Ne?"Discard":"Archive"', to: 'label:Ne?"丢弃":"归档"' },
  { from: 'primaryButton:{id:pvS,label:"Discard"}', to: 'primaryButton:{id:pvS,label:"丢弃"}' },
  { from: 'children:"Claim handle"', to: 'children:"认领 handle"' },
  { from: 'title:"Profile"', to: 'title:"个人资料"' },
];

test('round 43 defines profile, about, and discard targets', () => {
  const originals = CRITICAL_GLASS_ROUND43_UI_TARGETS.map((entry) => entry.originalText);
  assert.ok(originals.includes('Profile'));
  assert.ok(originals.includes('Create your public profile'));
  assert.ok(originals.includes('Create your profile'));
  assert.ok(
    originals.includes(
      'Claim a handle to get a profile page showing your token, model, and agent usage.'
    )
  );
  assert.ok(originals.includes('Claim handle'));
  assert.ok(originals.includes('Claiming handle'));
  assert.ok(originals.includes('Discard'));
});

test('round 43 embedded patches are registered', () => {
  for (const patch of ROUND43_EMBEDDED) {
    const match = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === patch.from);
    assert.ok(match, `missing embedded patch: ${patch.from}`);
    assert.equal(match.to, patch.to);
  }
});

test('cursor-win.common.json defines profile and discard mappings', () => {
  const mappings = readJsonIfExists(toolPaths.cursorWinCommonPath, []);
  const byOriginal = new Map(mappings.map((entry) => [entry.originalText, entry]));

  for (const critical of CRITICAL_GLASS_ROUND43_UI_TARGETS) {
    if (critical.originalText === 'OK') {
      continue;
    }
    const entry = byOriginal.get(critical.originalText);
    assert.ok(entry, `missing mapping: ${critical.originalText}`);
    assert.equal(entry.changeText, critical.changeText, critical.originalText);
    if (critical.forceRuntime) {
      assert.equal(entry.forceRuntime, true, `${critical.originalText} should use runtime`);
    }
  }
});

test('merged mappings translate profile and discard menu copy', () => {
  const mappings = loadMergedMappings();
  assert.equal(
    translateTextWithMappings('Profile', mappings, { scopeMatched: true }),
    '个人资料'
  );
  assert.equal(
    translateTextWithMappings('Create your public profile', mappings, { scopeMatched: true }),
    '创建你的公开个人资料'
  );
  assert.equal(
    translateTextWithMappings('Claim handle', mappings, { scopeMatched: true }),
    '认领 handle'
  );
  assert.equal(
    translateTextWithMappings(
      'Claim a handle to get a profile page showing your token, model, and agent usage.',
      mappings,
      { scopeMatched: true }
    ),
    '认领一个 handle，即可获得展示 token、模型与智能体用量的个人主页。'
  );
  assert.equal(
    translateTextWithMappings('Discard', mappings, { scopeMatched: true }),
    '丢弃'
  );
});

test('static translation applies round 43 about, discard, and profile snippets', () => {
  const source = [
    'title:this._productService.nameLong,message:n,primaryButton:{id:"ok",label:"OK"},extraButtons:[{id:fW.PRIMARY_BUTTON_ID,label:"Copy"}],dialogIcon:Fe.dialogInfo',
    'initialize Git in this repository.",primaryButton:{id:"ok",label:"OK"}}),!1',
    'ye.archive&&L&&!X){const Ne=n.source==="draft";le.push({id:"archive",section:"top",label:Ne?"Discard":"Archive",icon:Ne?"x":"archive",onSelect:L,shortcut:M})',
    'message:e,cancelButton:{id:"cancel-discard-changes",label:"Cancel"},primaryButton:{id:pvS,label:"Discard"}})===pvS',
    'Tk(a0e,{title:"Profile",children:hae("div",{className:"flex flex-col items-start gap-2 px-1 py-4",children:[k,A]})})',
    'children:u?"Create your public profile":"Create your profile"}),Tk("span",{className:"text-[13px]',
    'children:"Claim a handle to get a profile page showing your token, model, and agent usage."})]}),Tk(wr,{className:"shrink-0",color:"monochrome",disabled:Z,onClick:de,size:"sm",variant:"primary",children:"Claim handle"})',
  ].join('\n');

  const translated = applyStaticSourceTranslations(source, loadMergedMappings());

  assert.match(translated, /primaryButton:\{id:"ok",label:"确定"\}/);
  assert.match(translated, /label:"复制"\}/);
  assert.match(translated, /label:Ne\?"丢弃":"归档"/);
  assert.match(translated, /primaryButton:\{id:pvS,label:"丢弃"\}/);
  assert.match(translated, /title:"个人资料"/);
  assert.match(translated, /children:"认领 handle"/);
  assert.match(translated, /创建你的公开个人资料/);
  assert.match(translated, /认领一个 handle，即可获得展示 token、模型与智能体用量的个人主页。/);
  assert.equal(translated.includes('children:"Claim handle"'), false);
  assert.equal(translated.includes('label:"OK"'), false);
  assert.equal(translated.includes('label:Ne?"Discard":"Archive"'), false);
});
