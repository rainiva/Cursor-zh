const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { CRITICAL_EMBEDDED_UI_PATCHES } = require('../../lib/mapping/critical-ui-targets.js');
const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');
const { buildTranslatedWorkbenchBundle } = require('../../lib/runtime/bundle-builder.js');
const { mergeMappings } = require('../../cursor-zh-lib');
const { readJsonIfExists } = require('../../tool/io');
const { createToolPaths } = require('../../tool/paths');

const GKN_AUTO_CONFIG_PATCH = {
  from: 'Gkn={routedModelViewConfig:{routedModelViewToNamedViewToggle:{titleMarkdown:"Auto",subtitle:"Balanced quality and speed, recommended for most tasks"',
  to: 'Gkn={routedModelViewConfig:{routedModelViewToNamedViewToggle:{titleMarkdown:"自动",subtitle:"质量与速度均衡，适合大多数任务"',
};

const GKN_SNIPPET =
  'Gkn={routedModelViewConfig:{routedModelViewToNamedViewToggle:{titleMarkdown:"Auto",subtitle:"Balanced quality and speed, recommended for most tasks",setToLastNamedModel:!0},hideSearchBar:!1},namedModelsViewConfig:{namedViewToRoutedModelViewToggle:{markdown:"Auto"}}}';

const MODEL_PICKER_SNIPPETS = [
  GKN_SNIPPET,
  'n[0]===Symbol.for("react.memo_cache_sentinel")?(o=Dce("Auto"),n[0]=o):o=n[0];',
  'closeOnSelect:!1,rightSection:c,"data-testid":"named-view-to-routed-model-view",children:"Auto"})}),n[6]=l,n[7]=u)',
  'description:u()?"Balanced quality and speed, recommended for most tasks":void 0,doNotShowSelected:u()?!0:void 0',
].join('\n');

const DKg_PATCH = {
  from: 'function DKg(n){const t=o2e(n)?.routedModelViewToNamedViewToggle?.titleMarkdown?.trim();return t||void 0}',
  to: 'function DKg(n){const t=o2e(n)?.routedModelViewToNamedViewToggle?.titleMarkdown?.trim();if(!t)return;const i=globalThis.__cursorZhTranslateInlineText?globalThis.__cursorZhTranslateInlineText(t):t;return i||void 0}',
};

const RKg_PATCH = {
  from: 'function RKg(n){const t=o2e(n)?.routedModelViewToNamedViewToggle?.subtitle?.trim();if(t!==void 0&&t!=="")return t}',
  to: 'function RKg(n){const t=o2e(n)?.routedModelViewToNamedViewToggle?.subtitle?.trim();if(t===void 0||t==="")return;const i=globalThis.__cursorZhTranslateInlineText?globalThis.__cursorZhTranslateInlineText(t):t;return i}',
};

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

test('Gkn auto model config embedded patch is registered for 3.9.16', () => {
  const match = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === GKN_AUTO_CONFIG_PATCH.from);
  assert.ok(match);
  assert.equal(match.to, GKN_AUTO_CONFIG_PATCH.to);
});

test('static translation localizes model picker auto card strings for 3.9.16', () => {
  const translated = applyStaticSourceTranslations(MODEL_PICKER_SNIPPETS, loadMergedMappings());

  assert.match(translated, /titleMarkdown:"自动",subtitle:"质量与速度均衡，适合大多数任务"/);
  assert.match(translated, /markdown:"自动"/);
  assert.match(translated, /Dce\("自动"\)/);
  assert.match(translated, /children:"自动"/);
  assert.match(translated, /description:u\(\)\?"质量与速度均衡，适合大多数任务":void 0/);
  assert.equal(translated.includes('Balanced quality and speed, recommended for most tasks'), false);
  assert.equal(translated.includes('"Auto"'), false);
});

test('DKg and RKg accessors use inline runtime translation for persisted model picker config', () => {
  const matchD = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === DKg_PATCH.from);
  const matchR = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === RKg_PATCH.from);
  assert.ok(matchD);
  assert.equal(matchD.to, DKg_PATCH.to);
  assert.ok(matchR);
  assert.equal(matchR.to, RKg_PATCH.to);

  const snippet = `${DKg_PATCH.from}${RKg_PATCH.from}`;
  const translated = applyStaticSourceTranslations(snippet, []);
  assert.match(translated, /__cursorZhTranslateInlineText/);
});

test('inline translation pool keeps auto card strings when bundle already static-translates them', () => {
  const bundle = buildTranslatedWorkbenchBundle({
    workbenchSource: GKN_SNIPPET,
    mappings: loadMergedMappings(),
    metadata: { runtimeConfig: { mode: 'performance' } },
  });

  assert.match(bundle, /inlineTranslationMappings/);
  assert.match(bundle, /\["Auto","自动"\]/);
  assert.match(
    bundle,
    /\["Balanced quality and speed, recommended for most tasks","质量与速度均衡，适合大多数任务"\]/
  );
  assert.doesNotMatch(bundle, /let translationMappings = \[[^\]]*\["Auto",/);
});
