const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');
const { CRITICAL_EMBEDDED_UI_PATCHES } = require('../../lib/mapping/critical-ui-targets.js');
const { CRITICAL_NLS_TARGETS } = require('../../lib/mapping/critical-nls-targets.js');
const { createNlsBuilderModule } = require('../../tool/builder/nls.js');
const { mergeMappings, translateTextWithMappings } = require('../../cursor-zh-lib');
const { readJsonIfExists } = require('../../tool/io');
const { createToolPaths } = require('../../tool/paths');

const GLASS_WORKBENCH_PATH =
  process.env.CURSOR_GLASS_WORKBENCH_PATH ||
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.glass.main.js';

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

test('glass EkS Search Settings patch is registered for 3.9.16', () => {
  const patch = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === 'EkS="Search Settings"');
  assert.ok(patch);
  assert.equal(patch.to, 'EkS="搜索设置"');
});

test('static translation applies glass EkS Search Settings binding', () => {
  const translated = applyStaticSourceTranslations('var EkS="Search Settings";function w9E(n){', []);
  assert.match(translated, /EkS="搜索设置"/);
  assert.doesNotMatch(translated, /Search Settings/);
});

test('static translation applies glass logout confirm snippet', () => {
  const snippet =
    'await h.confirm({title:"Log out?",description:"You\'ll be logged out of your Cursor account on this device.",primaryLabel:"Log Out",regretLabel:"Cancel"}';
  const translated = applyStaticSourceTranslations(snippet, loadMergedMappings());
  assert.match(translated, /title:"退出登录？"/);
  assert.doesNotMatch(translated, /Log out\?/);
});

test('static translation applies customize welcome object patch', () => {
  const snippet =
    'b$m={title:"Welcome to Customize",body:"Manage plugins, MCPs, skills, rules, commands, and hooks in one place."}';
  const translated = applyStaticSourceTranslations(snippet, []);
  assert.match(translated, /title:"欢迎使用自定义"/);
  assert.doesNotMatch(translated, /Welcome to Customize/);
});

test('critical NLS targets cover extension cache and agent shutdown contracts', () => {
  const byOriginal = new Map(CRITICAL_NLS_TARGETS.map((entry) => [entry.originalText, entry]));
  assert.ok(
    byOriginal.has('Extensions have been modified on disk. Please reload the window.')
  );
  assert.ok(byOriginal.has('&&Reload Window'));
  assert.ok(byOriginal.has('Agent is still working'));
  assert.ok(byOriginal.has('{0} agents are still working'));
  assert.ok(byOriginal.has('Stopping now will cancel the current task.'));
  assert.ok(byOriginal.has('Quit Anyway'));
});

test('buildTranslatedNlsMessagesPayload applies agent shutdown overlay mappings', () => {
  const translated = buildTranslatedNlsMessagesPayload(
    fixtureContext,
    fixtureLanguagePack,
    mergeMappings([], CRITICAL_NLS_TARGETS)
  );

  assert.equal(translated[3], 'Agent 仍在运行');
  assert.equal(translated[7], '仍要退出');
});

test('real glass workbench still contains logout and Search Settings literals when available', () => {
  if (!fs.existsSync(GLASS_WORKBENCH_PATH)) {
    return;
  }

  const source = fs.readFileSync(GLASS_WORKBENCH_PATH, 'utf8');
  assert.ok(source.includes('Log out?'));
  assert.ok(source.includes('Search Settings'));
  assert.ok(source.includes('Welcome to Customize'));
});
