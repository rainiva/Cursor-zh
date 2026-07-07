const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { CRITICAL_EMBEDDED_UI_PATCHES, CRITICAL_INLINE_TEXT_TARGETS } = require('../../lib/mapping/critical-ui-targets.js');
const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');
const { buildTranslatedWorkbenchBundle } = require('../../lib/runtime/bundle-builder.js');
const { mergeMappings } = require('../../cursor-zh-lib');
const { readJsonIfExists } = require('../../tool/io');
const { createToolPaths } = require('../../tool/paths');

const CYCLE_PARAMETER_PATCH = {
  from: '{id:"cycle-model-parameter",label:`Cycle ${ns}`,shortcut:ga}',
  to: '{id:"cycle-model-parameter",label:globalThis.__cursorZhTranslateInlineText?globalThis.__cursorZhTranslateInlineText(`Cycle ${ns}`):`Cycle ${ns}`,shortcut:ga}',
};

const SNIPPET =
  'Xa=n3(()=>{if(!(!ga||!ns))return[...Zr?[{id:"select-model",label:"Select Model",shortcut:Zr}]:[],{id:"cycle-model-parameter",label:`Cycle ${ns}`,shortcut:ga}]},[ga,ns,Zr])';

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

test('cycle model parameter label uses inline runtime translation hook', () => {
  const match = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === CYCLE_PARAMETER_PATCH.from);
  assert.ok(match);
  assert.equal(match.to, CYCLE_PARAMETER_PATCH.to);

  const translated = applyStaticSourceTranslations(SNIPPET, []);
  assert.match(translated, /__cursorZhTranslateInlineText\(`Cycle \$\{ns\}`\)/);
});

test('inline translation pool includes Cycle Reasoning shortcut label', () => {
  const entry = CRITICAL_INLINE_TEXT_TARGETS.find((item) => item.originalText === 'Cycle Reasoning');
  assert.ok(entry);
  assert.equal(entry.changeText, '切换推理');

  const bundle = buildTranslatedWorkbenchBundle({
    workbenchSource: SNIPPET,
    mappings: loadMergedMappings(),
    metadata: { runtimeConfig: { mode: 'performance' } },
  });
  assert.match(bundle, /\["Cycle Reasoning","切换推理"\]/);
});
