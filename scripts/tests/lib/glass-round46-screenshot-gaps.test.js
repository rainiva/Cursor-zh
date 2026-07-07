const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const fs = require('fs');
const {
  CRITICAL_GLASS_APP_MENU_UI_TARGETS,
  CRITICAL_GLASS_ROUND46_UI_TARGETS,
  CRITICAL_GLASS_ROUND46_DATA_POLICY_TARGETS,
  CRITICAL_EMBEDDED_UI_PATCHES,
} = require('../../lib/mapping/critical-ui-targets.js');
const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');
const { mergeMappings, translateTextWithMappings } = require('../../cursor-zh-lib');
const { readJsonIfExists } = require('../../tool/io');
const { createToolPaths } = require('../../tool/paths');
const { createRuntimeDomHarness } = require('./helpers/runtime-dom-harness.js');

const ROUND46_EMBEDDED = [
  {
    from: 'children:"Create Profile"',
    to: 'children:"创建个人资料"',
  },
  {
    from: 'title:"Options",children:re.map(de=>ZB(Q_m,{parameter:de',
    to: 'title:"选项",children:re.map(de=>ZB(Q_m,{parameter:de',
  },
];

const ACCOUNT_MENU_SNIPPET =
  'Mbe(gn.Item,{leftSection:Mbe(Yn,{name:"account"}),onSelect:T,children:"Create Profile"})';

const MODEL_OPTIONS_SNIPPET =
  'ZB(gn.Section,{title:"Options",children:re.map(de=>ZB(Q_m,{parameter:de,currentValue:ae(de.id),onValueChange:le=>se(de.id,le)},de.id))}';

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

test('round 46 defines account menu, model options, and finished tool-call targets', () => {
  const originals = CRITICAL_GLASS_ROUND46_UI_TARGETS.map((entry) => entry.originalText);
  assert.ok(originals.includes('Create Profile'));
  assert.ok(originals.includes('Options'));
  assert.ok(originals.includes('Effort'));
  assert.ok(originals.includes('Extra High'));
});

test('app menu targets include Create Profile', () => {
  const originals = CRITICAL_GLASS_APP_MENU_UI_TARGETS.map((entry) => entry.originalText);
  assert.ok(originals.includes('Create Profile'));
});

test('round 46 embedded patches are registered', () => {
  for (const patch of ROUND46_EMBEDDED) {
    const match = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === patch.from);
    assert.ok(match, `missing embedded patch: ${patch.from}`);
    assert.equal(match.to, patch.to);
  }
});

test('static translation localizes Create Profile and Options section snippets', () => {
  const translated = applyStaticSourceTranslations(
    [ACCOUNT_MENU_SNIPPET, MODEL_OPTIONS_SNIPPET].join('\n'),
    loadMergedMappings()
  );
  assert.match(translated, /children:"创建个人资料"/);
  assert.match(translated, /title:"选项"/);
  assert.equal(translated.includes('Create Profile'), false);
  assert.equal(translated.includes('title:"Options"'), false);
});

test('merged mappings translate generic Finished tool-call lines', () => {
  const mappings = loadMergedMappings();
  assert.equal(
    translateTextWithMappings('Finished Get horizontal binding test failure detail', mappings, {
      scopeMatched: true,
    }),
    '已完成 Get horizontal binding test failure detail'
  );
});

test('generic Finished regex does not break Finished N background tasks', () => {
  const mappings = loadMergedMappings();
  assert.equal(
    translateTextWithMappings('Finished 2 background tasks', mappings, { scopeMatched: true }),
    '已完成 2 个后台任务'
  );
});

test('model picker scoped mappings translate parameter menu labels', () => {
  const mappings = loadMergedMappings();
  const scopeText = 'ui-model-picker__param-check Options Effort';
  assert.equal(translateTextWithMappings('Thinking', mappings, { scopeText }), '思考');
  assert.equal(translateTextWithMappings('Fast', mappings, { scopeText }), '快速');
  assert.equal(translateTextWithMappings('Effort', mappings, { scopeText }), '推理强度');
  assert.equal(translateTextWithMappings('High', mappings, { scopeText }), '高');
  assert.equal(translateTextWithMappings('Extra High', mappings, { scopeText }), '极高');
});

test('scoped effort labels do not translate Max outside model picker menu', () => {
  const mappings = loadMergedMappings();
  assert.equal(
    translateTextWithMappings('Max', mappings, {
      scopeText: 'diff-meter-panel Err Avg',
    }),
    'Max'
  );
});

test('cursor-win.common.json defines round 46 mappings', () => {
  const mappings = readJsonIfExists(toolPaths.cursorWinCommonPath, []);
  const byOriginal = new Map(mappings.map((entry) => [entry.originalText, entry]));

  for (const critical of CRITICAL_GLASS_ROUND46_UI_TARGETS) {
    const entry = byOriginal.get(critical.originalText);
    assert.ok(entry, `missing mapping: ${critical.originalText}`);
    assert.equal(entry.changeText, critical.changeText, critical.originalText);
  }
});

test('runtime DOM renders Finished MCP tool line in Chinese prefix', () => {
  const mappings = loadMergedMappings().filter((entry) => entry.forceRuntime !== false);
  const harness = createRuntimeDomHarness({
    workbenchSource: 'Finished Get horizontal binding test failure detail',
    runtimeMappings: mappings,
  });
  harness.runDueTimers(Infinity);

  const { menu } = harness.mountMenuItem('Finished Get horizontal binding test failure detail');
  harness.flushMicrotasks();

  assert.equal(
    harness.getMenuItemText(menu),
    '已完成 Get horizontal binding test failure detail'
  );
  assert.doesNotMatch(harness.getMenuItemText(menu), /^Finished /);
});

const GLASS_BUNDLE_PATH =
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.glass.main.js';

test('data policy embedded patches require harvestable bundle literals', { skip: true }, () => {
  const bundle = fs.readFileSync(GLASS_BUNDLE_PATH, 'utf8');
  assert.ok(bundle.includes('Review Data Policy'), 'expected Review Data Policy in glass bundle');
  assert.ok(bundle.includes('View Policy'), 'expected View Policy in glass bundle');
});

test('runtime mappings translate Fable data-policy dialog copy', () => {
  const mappings = loadMergedMappings();
  assert.equal(
    translateTextWithMappings('Review Data Policy', mappings, { scopeMatched: true }),
    '审阅数据政策'
  );
  assert.equal(
    translateTextWithMappings('View Policy', mappings, { scopeMatched: true }),
    '查看政策'
  );
  assert.equal(
    translateTextWithMappings(
      "You must acknowledge Fable 5's data retention policy to use the model.",
      mappings,
      { scopeMatched: true }
    ),
    '使用此模型前须确认 Fable 5 的数据保留政策。'
  );
});

test('cursor-win.common.json defines data policy runtime mappings', () => {
  const mappings = readJsonIfExists(toolPaths.cursorWinCommonPath, []);
  const byOriginal = new Map(mappings.map((entry) => [entry.originalText, entry]));

  for (const critical of CRITICAL_GLASS_ROUND46_DATA_POLICY_TARGETS) {
    const entry = byOriginal.get(critical.originalText);
    assert.ok(entry, `missing mapping: ${critical.originalText}`);
    assert.equal(entry.changeText, critical.changeText, critical.originalText);
    assert.equal(entry.forceRuntime, true, `${critical.originalText} should use runtime`);
  }
});
