const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const {
  CRITICAL_GLASS_ROUND51_UI_TARGETS,
  CRITICAL_INLINE_TEXT_TARGETS,
  CRITICAL_EMBEDDED_UI_PATCHES,
} = require('../../lib/mapping/critical-ui-targets.js');
const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');
const { mergeMappings } = require('../../cursor-zh-lib');
const { readJsonIfExists } = require('../../tool/io');
const { createToolPaths } = require('../../tool/paths');

const toolPaths = createToolPaths(path.join(__dirname, '../../..'));

const ROUND51_EMBEDDED = [
  {
    from: '"data-testid":"named-view-to-routed-model-view",children:"Auto"})}),t[6]=l,t[7]=u)',
    to: '"data-testid":"named-view-to-routed-model-view",children:"自动"})}),t[6]=l,t[7]=u)',
  },
  {
    from: 'tooltip:"Fork this chat and submit the current prompt"',
    to: 'tooltip:"分叉此对话并提交当前提示"',
  },
  {
    from: 'description:"Start a new agent with the current prompt"',
    to: 'description:"使用当前提示启动新 Agent"',
  },
  {
    from: 'children:s})]})}return t}function gtd({item:t',
    to: 'children:s})]})}return globalThis.__cursorZhTranslateInlineText?globalThis.__cursorZhTranslateInlineText(t):t}function gtd({item:t',
  },
  {
    from: 'xie(Jt.Section,{title:s?void 0:f.title,children:',
    to: 'xie(Jt.Section,{title:s?void 0:(globalThis.__cursorZhTranslateInlineText?globalThis.__cursorZhTranslateInlineText(f.title):f.title),children:',
  },
  {
    from: 'label:I?t.name:`${i}${t.name}`,description:w',
    to: 'label:I?(globalThis.__cursorZhTranslateInlineText?globalThis.__cursorZhTranslateInlineText(t.name):t.name):`${i}${t.name}`,description:w',
  },
];

const ROUND51_INLINE = [
  { originalText: 'fork', changeText: '分叉' },
  { originalText: 'new', changeText: '新建' },
  { originalText: 'add-plugin', changeText: '添加插件' },
  { originalText: 'remove-plugin', changeText: '移除插件' },
  { originalText: 'Tools', changeText: '工具' },
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

test('round 51 defines auto toggle, slash actions, and section title targets', () => {
  const originals = CRITICAL_GLASS_ROUND51_UI_TARGETS.map((entry) => entry.originalText);
  assert.ok(originals.includes('Fork this chat and submit the current prompt'));
  assert.ok(originals.includes('Start a new agent with the current prompt'));
  assert.ok(originals.includes('Tools'));
});

test('round 51 embedded patches are registered', () => {
  for (const patch of ROUND51_EMBEDDED) {
    const match = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === patch.from);
    assert.ok(match, `missing embedded patch: ${patch.from}`);
    assert.equal(match.to, patch.to);
  }
});

test('round 51 inline text targets cover slash action names and Tools section', () => {
  const byOriginal = new Map(CRITICAL_INLINE_TEXT_TARGETS.map((entry) => [entry.originalText, entry]));
  for (const expected of ROUND51_INLINE) {
    const entry = byOriginal.get(expected.originalText);
    assert.ok(entry, `missing inline target: ${expected.originalText}`);
    assert.equal(entry.changeText, expected.changeText);
  }
});

test('static translation applies round 51 glass snippets', () => {
  const source = [
    '"data-testid":"named-view-to-routed-model-view",children:"Auto"})}),t[6]=l,t[7]=u)',
    '{id:"glass-action-fork",name:"fork",tooltip:"Fork this chat and submit the current prompt",type:"action",sectionTitle:"Actions"',
    '{id:"glass-action-new",name:"new",description:"Start a new agent with the current prompt",type:"action",sectionTitle:"Actions"',
  ].join('\n');
  const translated = applyStaticSourceTranslations(source, loadMergedMappings());

  assert.match(translated, /children:"自动"/);
  assert.match(translated, /tooltip:"分叉此对话并提交当前提示"/);
  assert.match(translated, /description:"使用当前提示启动新 Agent"/);
  assert.equal(translated.includes('children:"Auto"'), false);
  assert.equal(translated.includes('Fork this chat and submit the current prompt'), false);
  assert.equal(translated.includes('Start a new agent with the current prompt'), false);
});
