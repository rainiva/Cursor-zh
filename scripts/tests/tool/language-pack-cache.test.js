const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  findLanguagePackCacheMessagePaths,
  syncLanguagePackCacheMessages,
  clearLanguagePackCache,
} = require('../../tool/language-pack-cache.js');

test('findLanguagePackCacheMessagePaths discovers zh-cn clp nls.messages.json files', () => {
  const tempAppData = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-clp-'));
  const cacheDir = path.join(
    tempAppData,
    'Cursor',
    'clp',
    'abc123.zh-cn',
    'hash-one',
    'nls.messages.json'
  );
  fs.mkdirSync(path.dirname(cacheDir), { recursive: true });
  fs.writeFileSync(cacheDir, '[]');

  const paths = findLanguagePackCacheMessagePaths({ APPDATA: tempAppData }, fs);
  assert.deepEqual(paths, [cacheDir]);
});

test('syncLanguagePackCacheMessages writes translated payload to every clp cache file', () => {
  const tempAppData = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-clp-'));
  const localeRoot = path.join(tempAppData, 'Cursor', 'clp', 'abc123.zh-cn');
  const first = path.join(localeRoot, 'hash-one', 'nls.messages.json');
  const second = path.join(localeRoot, 'hash-two', 'nls.messages.json');
  fs.mkdirSync(path.dirname(first), { recursive: true });
  fs.mkdirSync(path.dirname(second), { recursive: true });
  fs.writeFileSync(first, JSON.stringify(['English']));
  fs.writeFileSync(second, JSON.stringify(['English']));

  const messages = ['扩展在磁盘上已被修改。请重新加载窗口。', '重新加载窗口'];
  const result = syncLanguagePackCacheMessages({
    env: { APPDATA: tempAppData },
    messages,
    fs,
  });

  assert.equal(result.updated.length, 2);
  assert.deepEqual(JSON.parse(fs.readFileSync(first, 'utf8')), messages);
  assert.deepEqual(JSON.parse(fs.readFileSync(second, 'utf8')), messages);
});

test('clearLanguagePackCache removes stale zh-cn clp locale directories', () => {
  const tempAppData = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-clp-'));
  const localeRoot = path.join(tempAppData, 'Cursor', 'clp', 'abc123.zh-cn');
  fs.mkdirSync(path.join(localeRoot, 'hash-one'), { recursive: true });

  const result = clearLanguagePackCache({ env: { APPDATA: tempAppData }, fs });

  assert.equal(result.removed.length, 1);
  assert.equal(fs.existsSync(localeRoot), false);
});
