const test = require('node:test');
const assert = require('node:assert/strict');

const { CRITICAL_EMBEDDED_UI_PATCHES } = require('../../lib/mapping/critical-ui-targets.js');
const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');

const TAGLINE_PATCH = {
  from: 'x=a&&yTe("span",{className:y.className,style:y.style,children:a})',
  to: 'x=a&&yTe("span",{className:y.className,style:y.style,children:globalThis.__cursorZhTranslateInlineText?globalThis.__cursorZhTranslateInlineText(a):a})',
};

const ROW_NAME_PATCH = {
  from: 'E=yTe(pz,{children:u},k)',
  to: 'E=yTe(pz,{children:globalThis.__cursorZhTranslateModelPickerDisplayName?globalThis.__cursorZhTranslateModelPickerDisplayName(u):u},k)',
};

const TRIGGER_LABEL_PATCH = {
  from: 'children:oSe(uch,{displayName:V},V)',
  to: 'children:oSe(uch,{displayName:globalThis.__cursorZhTranslateInlineText?globalThis.__cursorZhTranslateInlineText(globalThis.__cursorZhTranslateModelPickerDisplayName?globalThis.__cursorZhTranslateModelPickerDisplayName(V):V):(globalThis.__cursorZhTranslateModelPickerDisplayName?globalThis.__cursorZhTranslateModelPickerDisplayName(V):V)},globalThis.__cursorZhTranslateInlineText?globalThis.__cursorZhTranslateInlineText(globalThis.__cursorZhTranslateModelPickerDisplayName?globalThis.__cursorZhTranslateModelPickerDisplayName(V):V):(globalThis.__cursorZhTranslateModelPickerDisplayName?globalThis.__cursorZhTranslateModelPickerDisplayName(V):V))',
};

const SNIPPET = [
  'tagline:a}=t,l=i.displayName;',
  TAGLINE_PATCH.from,
  ROW_NAME_PATCH.from,
  TRIGGER_LABEL_PATCH.from,
].join('\n');

test('round 54 glass v6 model row tagline patches are registered', () => {
  for (const patch of [TAGLINE_PATCH, ROW_NAME_PATCH, TRIGGER_LABEL_PATCH]) {
    const match = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === patch.from);
    assert.ok(match, `missing embedded patch: ${patch.from}`);
    assert.equal(match.to, patch.to);
  }
});

test('static translation injects glass v6 model row tagline and trigger hooks', () => {
  const translated = applyStaticSourceTranslations(SNIPPET, []);
  assert.match(translated, /__cursorZhTranslateInlineText\(a\)/);
  assert.match(translated, /__cursorZhTranslateModelPickerDisplayName\(u\)/);
  assert.match(translated, /__cursorZhTranslateModelPickerDisplayName\(V\)/);
  assert.match(translated, /__cursorZhTranslateInlineText\(globalThis\.__cursorZhTranslateModelPickerDisplayName/);
});
