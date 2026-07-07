const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { CRITICAL_EMBEDDED_UI_PATCHES, CRITICAL_MODEL_PICKER_UI_TARGETS } = require('../../lib/mapping/critical-ui-targets.js');
const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');
const { mergeMappings } = require('../../cursor-zh-lib');
const { readJsonIfExists } = require('../../tool/io');
const { createToolPaths } = require('../../tool/paths');

const ADD_MODELS_PATCHES = {
  pickerItem: {
    from: 'children:"Add Models"}),e[3]=l',
    to: 'children:"添加模型"}),e[3]=l',
  },
  menuTitle: {
    from: 'title:"Add Models",showType:"chevronRight"',
    to: 'title:"添加模型",showType:"chevronRight"',
  },
};

const SNIPPET = [
  'e[3]===Symbol.for("react.memo_cache_sentinel")?(l=f7e("span",{className:"ui-19aaqeu",children:"Add Models"}),e[3]=l):l=e[3]',
  '{id:"open-model-settings",title:"Add Models",showType:"chevronRight",class:"!text-[10px]",onClick:()=>{',
].join('\n');

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

test('Add Models embedded patches are registered', () => {
  for (const patch of Object.values(ADD_MODELS_PATCHES)) {
    const match = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === patch.from);
    assert.ok(match, `missing patch: ${patch.from}`);
    assert.equal(match.to, patch.to);
  }
});

test('static translation localizes Add Models in model picker and menu', () => {
  const translated = applyStaticSourceTranslations(SNIPPET, loadMergedMappings());
  assert.match(translated, /children:"添加模型"/);
  assert.match(translated, /title:"添加模型",showType:"chevronRight"/);
  assert.equal(translated.includes('Add Models'), false);
});

test('cursor-win.common.json defines Add Models mapping', () => {
  const mappings = readJsonIfExists(toolPaths.cursorWinCommonPath, []);
  const byOriginal = new Map(mappings.map((entry) => [entry.originalText, entry]));
  for (const target of CRITICAL_MODEL_PICKER_UI_TARGETS) {
    const entry = byOriginal.get(target.originalText);
    assert.ok(entry, `missing mapping: ${target.originalText}`);
    assert.equal(entry.changeText, target.changeText);
  }
});
