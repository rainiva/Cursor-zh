const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

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

test('generateTranslatedNlsMessages syncs translated payload into clp cache files', () => {
  const tempAppData = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-clp-nls-'));
  const cachePath = path.join(
    tempAppData,
    'Cursor',
    'clp',
    'abc123.zh-cn',
    'hash-one',
    'nls.messages.json'
  );
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(['English']));

  const { generateTranslatedNlsMessages } = createNlsBuilderModule({
    readJson: (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8')),
    writeJson: (filePath, payload) => {
      fs.writeFileSync(filePath, `${JSON.stringify(payload)}\n`, 'utf8');
    },
    translateTextWithMappings: require('../../cursor-zh-lib.js').translateTextWithMappings,
    assertPathExists: () => {},
    toolPaths: { generatedNlsMessagesPath: path.join(tempAppData, 'generated.json') },
  });

  const messages = ['扩展在磁盘上已被修改。请重新加载窗口。', '重新加载窗口'];
  generateTranslatedNlsMessages(
    {
      paths: {
        nlsKeysPath: require.resolve('./fixtures/nls.keys.fixture.json'),
        nlsMessagesPath: path.join(tempAppData, 'nls.messages.json'),
      },
    },
    { path: path.join(__dirname, 'fixtures', 'language-pack') },
    [],
    messages,
    {
      syncLanguagePackCacheMessages: (payload) =>
        require('../../tool/language-pack-cache.js').syncLanguagePackCacheMessages({
          env: { APPDATA: tempAppData },
          messages: payload.messages,
          fs,
        }),
    }
  );

  assert.deepEqual(JSON.parse(fs.readFileSync(cachePath, 'utf8')), messages);
});
