const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { CRITICAL_EMBEDDED_UI_PATCHES } = require('../../lib/mapping/critical-ui-targets.js');
const { CRITICAL_NLS_TARGETS } = require('../../lib/mapping/critical-nls-targets.js');
const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');
const { mergeMappings, translateTextWithMappings } = require('../../cursor-zh-lib');
const { readJsonIfExists } = require('../../tool/io');
const { createToolPaths } = require('../../tool/paths');
const { createNlsBuilderModule } = require('../../tool/builder/nls.js');

const CREATE_PLAN_EMBEDDED = {
  from: 'case yt.CREATE_PLAN:return["Creating plan","Created plan","Create plan attempted"]',
  to: 'case yt.CREATE_PLAN:return["正在创建计划","已创建计划","尝试创建计划"]',
};

const CREATE_PLAN_TARGETS = [
  { originalText: 'Creating plan', changeText: '正在创建计划' },
  { originalText: 'Created plan', changeText: '已创建计划' },
  { originalText: 'Create plan attempted', changeText: '尝试创建计划' },
];

const toolPaths = createToolPaths(path.join(__dirname, '../../..'));

const { buildTranslatedNlsMessagesPayload } = createNlsBuilderModule({
  readJson: (filePath) => require(filePath),
  writeJson: () => {},
  translateTextWithMappings,
  assertPathExists: () => {},
  toolPaths: { generatedNlsMessagesPath: '' },
});

const fixtureContext = {
  paths: {
    nlsKeysPath: require.resolve('../tool/fixtures/nls.keys.fixture.json'),
    nlsMessagesPath: require.resolve('../tool/fixtures/nls.messages.fixture.json'),
  },
};

const fixtureLanguagePack = {
  path: path.join(__dirname, '../tool/fixtures/language-pack'),
};

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

test('create plan embedded patch is registered', () => {
  const match = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === CREATE_PLAN_EMBEDDED.from);
  assert.ok(match);
  assert.equal(match.to, CREATE_PLAN_EMBEDDED.to);
});

test('static translation applies create plan tool-call snippet', () => {
  const source =
    'case yt.CREATE_PLAN:return["Creating plan","Created plan","Create plan attempted"];case yt.FETCH_PULL_REQUEST';
  const translated = applyStaticSourceTranslations(source, loadMergedMappings());
  assert.match(translated, /return\["正在创建计划","已创建计划","尝试创建计划"\]/);
  assert.equal(translated.includes('Creating plan'), false);
});

test('cursor-win.common.json defines create plan mappings without forceRuntime', () => {
  const mappings = readJsonIfExists(toolPaths.cursorWinCommonPath, []);
  const byOriginal = new Map(mappings.map((entry) => [entry.originalText, entry]));

  for (const target of CREATE_PLAN_TARGETS) {
    const entry = byOriginal.get(target.originalText);
    assert.ok(entry, `missing mapping: ${target.originalText}`);
    assert.equal(entry.changeText, target.changeText);
    assert.notEqual(entry.forceRuntime, true);
  }
});

test('critical NLS targets define background terminal shutdown dialog strings', () => {
  const byOriginal = new Map(CRITICAL_NLS_TARGETS.map((entry) => [entry.originalText, entry]));
  assert.ok(byOriginal.has('Background terminal is still running'));
  assert.ok(byOriginal.has('Stopping now will kill the background terminal.'));
});

test('buildTranslatedNlsMessagesPayload localizes background terminal shutdown strings', () => {
  const translated = buildTranslatedNlsMessagesPayload(
    fixtureContext,
    fixtureLanguagePack,
    mergeMappings([], CRITICAL_NLS_TARGETS)
  );

  assert.equal(translated[8], '后台终端仍在运行');
  assert.equal(translated[9], '现在停止将终止后台终端。');
});
