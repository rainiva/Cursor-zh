const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const {
  CRITICAL_GLASS_ROUND52_MODEL_PICKER_V6_TARGETS,
  CRITICAL_INLINE_TEXT_TARGETS,
  CRITICAL_EMBEDDED_UI_PATCHES,
} = require('../../lib/mapping/critical-ui-targets.js');
const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');
const { mergeMappings } = require('../../cursor-zh-lib');
const { readJsonIfExists } = require('../../tool/io');
const { createToolPaths } = require('../../tool/paths');

const toolPaths = createToolPaths(path.join(__dirname, '../../..'));

const VEO_SWITCH_PATCH = {
  from: 'label:n.name,tooltip:l,children:n.name',
  to: 'label:globalThis.__cursorZhTranslateInlineText?globalThis.__cursorZhTranslateInlineText(n.name):n.name,tooltip:l,children:globalThis.__cursorZhTranslateInlineText?globalThis.__cursorZhTranslateInlineText(n.name):n.name',
};

const RVD_SECTION_PATCH = {
  from: 'Jt.Section,{title:l,tooltip:c,children:u})',
  to: 'Jt.Section,{title:globalThis.__cursorZhTranslateInlineText?globalThis.__cursorZhTranslateInlineText(l):l,tooltip:c,children:u})',
};

const RVD_ENUM_PATCH = {
  from: 'children:m.displayName??m.value},m.value)},"t5")',
  to: 'children:globalThis.__cursorZhTranslateInlineText?globalThis.__cursorZhTranslateInlineText(m.displayName??m.value):(m.displayName??m.value)},m.value)},"t5")',
};

const OPTIONS_V6_PATCH = {
  from: 'title:"Options",children:l.map(k=>j9(vEo,{parameter:k',
  to: 'title:"选项",children:l.map(k=>j9(vEo,{parameter:k',
};

const MODEL_CONFIG_HELPERS_PATCH = {
  from: 'function xEt(t,e,n){const i=e.find(s=>s.name===t.modelId);return i?EEt(i,t.parameters,n)?.displayName??i.clientDisplayName??i.name:t.modelId}function AYi(t,e,n){const i=e.find(s=>s.name===t.modelId);if(!i)return t.modelId;const r=EEt(i,t.parameters,n);return r?.displayNameOutsidePicker??r?.displayName??i.inputboxShortModelName??i.clientDisplayName??i.name}function iEo(t){return t.clientDisplayName??t.name}',
  to: 'function xEt(t,e,n){const i=e.find(s=>s.name===t.modelId),r=i?EEt(i,t.parameters,n)?.displayName??i.clientDisplayName??i.name:t.modelId;return globalThis.__cursorZhTranslateModelPickerDisplayName?globalThis.__cursorZhTranslateModelPickerDisplayName(r):r}function AYi(t,e,n){const i=e.find(s=>s.name===t.modelId);if(!i)return globalThis.__cursorZhTranslateModelPickerDisplayName?globalThis.__cursorZhTranslateModelPickerDisplayName(t.modelId):t.modelId;const r=EEt(i,t.parameters,n),s=r?.displayNameOutsidePicker??r?.displayName??i.inputboxShortModelName??i.clientDisplayName??i.name;return globalThis.__cursorZhTranslateModelPickerDisplayName?globalThis.__cursorZhTranslateModelPickerDisplayName(s):s}function iEo(t){const e=t.clientDisplayName??t.name;return globalThis.__cursorZhTranslateModelPickerDisplayName?globalThis.__cursorZhTranslateModelPickerDisplayName(e):e}',
};

const VEO_SNIPPET =
  'c=j9(Jt.SwitchItem,{checked:s,onChange:a,label:n.name,tooltip:l,children:n.name}),e[5]=s';
const RVD_SNIPPET = 'd=j9(Jt.Section,{title:l,tooltip:c,children:u}),e[11]=n.name';
const RVD_ENUM_SNIPPET =
  'children:m.displayName??m.value},m.value)},"t5"),e[8]=i,e[9]=r,e[10]=p';
const OPTIONS_SNIPPET =
  'j9(Jt.Section,{title:"Options",children:l.map(k=>j9(vEo,{parameter:k,currentValue:d(k.id)';
const MODEL_CONFIG_HELPERS_SNIPPET = MODEL_CONFIG_HELPERS_PATCH.from;

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

test('round 52 defines Context, Reasoning, and None parameter labels', () => {
  const originals = CRITICAL_GLASS_ROUND52_MODEL_PICKER_V6_TARGETS.map(
    (entry) => entry.originalText
  );
  assert.ok(originals.includes('Context'));
  assert.ok(originals.includes('Reasoning'));
  assert.ok(originals.includes('None'));
});

test('round 52 glass v6 embedded patches are registered', () => {
  for (const patch of [
    VEO_SWITCH_PATCH,
    RVD_SECTION_PATCH,
    RVD_ENUM_PATCH,
    OPTIONS_V6_PATCH,
    MODEL_CONFIG_HELPERS_PATCH,
  ]) {
    const match = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === patch.from);
    assert.ok(match, `missing embedded patch: ${patch.from}`);
    assert.equal(match.to, patch.to);
  }
});

test('round 52 inline text targets cover API parameter section labels', () => {
  const byOriginal = new Map(CRITICAL_INLINE_TEXT_TARGETS.map((entry) => [entry.originalText, entry]));
  for (const critical of CRITICAL_GLASS_ROUND52_MODEL_PICKER_V6_TARGETS) {
    const entry = byOriginal.get(critical.originalText);
    assert.ok(entry, `missing inline target: ${critical.originalText}`);
    assert.equal(entry.changeText, critical.changeText);
  }
});

test('static translation injects glass v6 model picker parameter hooks', () => {
  const translated = applyStaticSourceTranslations(
    [VEO_SNIPPET, RVD_SNIPPET, RVD_ENUM_SNIPPET, OPTIONS_SNIPPET].join('\n'),
    loadMergedMappings()
  );
  assert.match(translated, /__cursorZhTranslateInlineText\(n\.name\)/);
  assert.match(translated, /__cursorZhTranslateInlineText\(l\)/);
  assert.match(translated, /__cursorZhTranslateInlineText\(m\.displayName/);
  assert.match(translated, /title:"选项",children:l\.map/);
  assert.equal(translated.includes('title:"Options"'), false);
});

test('static translation hooks glass v6 model config display-name helpers', () => {
  const translated = applyStaticSourceTranslations(MODEL_CONFIG_HELPERS_SNIPPET, loadMergedMappings());
  assert.match(translated, /__cursorZhTranslateModelPickerDisplayName\(r\):r/);
  assert.match(translated, /__cursorZhTranslateModelPickerDisplayName\(s\):s/);
  assert.match(translated, /__cursorZhTranslateModelPickerDisplayName\(e\):e/);
});
