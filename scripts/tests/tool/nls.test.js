const test = require('node:test');
const assert = require('node:assert/strict');

const { createNlsBuilderModule } = require('../../tool/builder/nls.js');
const { CRITICAL_NLS_TARGETS } = require('../../lib/mapping/critical-nls-targets.js');
const { mergeMappings } = require('../../cursor-zh-lib.js');

const { buildTranslatedNlsMessagesPayload } = createNlsBuilderModule({
  readJson: (filePath) => require(filePath),
  writeJson: () => {},
  translateTextWithMappings: require('../../cursor-zh-lib.js').translateTextWithMappings,
  assertPathExists: () => {},
  toolPaths: { generatedNlsMessagesPath: '' },
});

const fixtureContext = {
  paths: {
    nlsKeysPath: require.resolve('./fixtures/nls.keys.fixture.json'),
    nlsMessagesPath: require.resolve('./fixtures/nls.messages.fixture.json'),
  },
};

const fixtureLanguagePack = {
  path: require('path').join(__dirname, 'fixtures', 'language-pack'),
};

test('buildTranslatedNlsMessagesPayload resolves electron-sandbox extension cache strings from electron-browser i18n', () => {
  const translated = buildTranslatedNlsMessagesPayload(
    fixtureContext,
    fixtureLanguagePack,
    []
  );

  assert.equal(
    translated[0],
    '扩展在磁盘上已被修改。请重新加载窗口。',
    'extensionCache.invalid should use official zh-hans translation via module alias'
  );
  assert.equal(translated[1], '重新加载窗口', 'reloadWindow should use official zh-hans translation');
});

test('buildTranslatedNlsMessagesPayload applies overlay mappings for untranslated mnemonic reload labels', () => {
  const mergedMappings = mergeMappings([], CRITICAL_NLS_TARGETS);
  const translated = buildTranslatedNlsMessagesPayload(
    fixtureContext,
    fixtureLanguagePack,
    mergedMappings
  );

  assert.equal(translated[2], '重新加载窗口(&&R)', '&&Reload Window should be localized');
});

test('critical NLS targets define extension modified dialog strings', () => {
  const byOriginal = new Map(CRITICAL_NLS_TARGETS.map((entry) => [entry.originalText, entry]));

  assert.ok(
    byOriginal.has('Extensions have been modified on disk. Please reload the window.'),
    'missing extension modified message mapping'
  );
  assert.ok(byOriginal.has('&&Reload Window'), 'missing mnemonic reload window mapping');
});
