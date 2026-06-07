const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { withLocaleSetting } = require('../../cursor-zh-lib.js');
const { createLocaleModule } = require('../../tool/locale.js');
const { readJson, readText } = require('../../tool/io.js');

const localeApi = createLocaleModule({
  readText,
  writeJson: require('../../tool/io.js').writeJson,
  parseJsonc: require('../../cursor-zh-lib.js').parseJsonc,
  withLocaleSetting,
});

const { readArgvConfig, writeLocaleFiles } = localeApi;

test('readArgvConfig returns empty object when argv.json is missing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-locale-'));
  const argvPath = path.join(dir, 'argv.json');

  assert.deepEqual(readArgvConfig(argvPath), {});
});

test('readArgvConfig parses jsonc argv files', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-locale-'));
  const argvPath = path.join(dir, 'argv.json');
  fs.writeFileSync(argvPath, '{\n  // comment\n  "locale": "en"\n}\n');

  assert.deepEqual(readArgvConfig(argvPath), { locale: 'en' });
});

test('writeLocaleFiles sets zh-cn in argv and optional locale mirror', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-locale-'));
  const argvPath = path.join(dir, 'argv.json');
  const mirrorPath = path.join(dir, 'locale.json');
  const context = {
    paths: {
      argvPath,
      userLocaleMirrorPath: mirrorPath,
    },
  };

  const nextArgv = writeLocaleFiles(context);

  assert.equal(nextArgv.locale, 'zh-cn');
  assert.deepEqual(readJson(argvPath), nextArgv);
  assert.deepEqual(readJson(mirrorPath), {
    locale: 'zh-cn',
    source: 'cursor-zh-tool',
  });
});
