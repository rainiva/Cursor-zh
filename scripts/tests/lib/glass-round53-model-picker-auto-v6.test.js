const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { CRITICAL_EMBEDDED_UI_PATCHES } = require('../../lib/mapping/critical-ui-targets.js');
const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');
const { mergeMappings } = require('../../cursor-zh-lib');
const { readJsonIfExists } = require('../../tool/io');
const { createToolPaths } = require('../../tool/paths');

const toolPaths = createToolPaths(path.join(__dirname, '../../..'));

const RZt_AUTO_CONFIG_PATCH = {
  from: 'rZt={routedModelViewConfig:{routedModelViewToNamedViewToggle:{titleMarkdown:"Auto",subtitle:"Balanced quality and speed, recommended for most tasks"',
  to: 'rZt={routedModelViewConfig:{routedModelViewToNamedViewToggle:{titleMarkdown:"自动",subtitle:"质量与速度均衡，适合大多数任务"',
};

const KLE_AUTO_PATCH = {
  from: '?(o=Kle("Auto"),t[0]=o):o=t[0]',
  to: '?(o=Kle("自动"),t[0]=o):o=t[0]',
};

const TRIGGER_AUTO_PATCH = {
  from: 'F?"Auto":j',
  to: 'F?"自动":j',
};

const XFD_PATCH = {
  from: 'function Xfd(t){const n=EFe(t)?.routedModelViewToNamedViewToggle?.titleMarkdown?.trim();return n||void 0}',
  to: 'function Xfd(t){const n=EFe(t)?.routedModelViewToNamedViewToggle?.titleMarkdown?.trim();if(!n)return;const i=globalThis.__cursorZhTranslateInlineText?globalThis.__cursorZhTranslateInlineText(n):n;return i||void 0}',
};

const YFD_PATCH = {
  from: 'function Yfd(t){const n=EFe(t)?.routedModelViewToNamedViewToggle?.subtitle?.trim();if(n!==void 0&&n!=="")return n}',
  to: 'function Yfd(t){const n=EFe(t)?.routedModelViewToNamedViewToggle?.subtitle?.trim();if(n===void 0||n==="")return;const i=globalThis.__cursorZhTranslateInlineText?globalThis.__cursorZhTranslateInlineText(n):n;return i}',
};

const V6_SNIPPET = [
  'rZt={routedModelViewConfig:{routedModelViewToNamedViewToggle:{titleMarkdown:"Auto",subtitle:"Balanced quality and speed, recommended for most tasks",setToLastNamedModel:!0},hideSearchBar:!1},namedModelsViewConfig:{namedViewToRoutedModelViewToggle:{markdown:"Auto"}}}',
  't[0]===Symbol.for("react.memo_cache_sentinel")?(o=Kle("Auto"),t[0]=o):o=t[0];',
  'const V=W!==void 0&&W.length>0?W:F?"Auto":j,Q=P&&!F&&!H;',
  `${XFD_PATCH.from}${YFD_PATCH.from}`,
].join('\n');

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

test('round 53 glass v6 auto trigger embedded patches are registered', () => {
  for (const patch of [
    RZt_AUTO_CONFIG_PATCH,
    KLE_AUTO_PATCH,
    TRIGGER_AUTO_PATCH,
    XFD_PATCH,
    YFD_PATCH,
  ]) {
    const match = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === patch.from);
    assert.ok(match, `missing embedded patch: ${patch.from}`);
    assert.equal(match.to, patch.to);
  }
});

test('static translation localizes glass v6 auto trigger and config snippets', () => {
  const translated = applyStaticSourceTranslations(V6_SNIPPET, loadMergedMappings());
  assert.match(translated, /titleMarkdown:"自动",subtitle:"质量与速度均衡，适合大多数任务"/);
  assert.match(translated, /markdown:"自动"/);
  assert.match(translated, /Kle\("自动"\)/);
  assert.match(translated, /F\?"自动":j/);
  assert.match(translated, /__cursorZhTranslateInlineText/);
  assert.equal(translated.includes('F?"Auto":j'), false);
  assert.equal(translated.includes('Kle("Auto")'), false);
});
