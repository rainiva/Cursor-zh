const test = require('node:test');
const assert = require('node:assert/strict');

const {
normalizeTextForComparison,
translateTextWithMappings,
} = require('../../cursor-zh-lib.js');

test('normalizeTextForComparison normalizes casing spaces and ellipsis', () => {
  assert.equal(
    normalizeTextForComparison('  Learn   More\u2026  '),
    'learn more...'
  );
  assert.equal(normalizeTextForComparison('Sign In'), 'sign in');
  assert.equal(normalizeTextForComparison('Clos&&e Window'), 'close window');
  assert.equal(normalizeTextForComparison('E&&xit'), 'exit');
  assert.equal(normalizeTextForComparison('&&VS Code Settings'), 'vs code settings');
});

test('translateTextWithMappings applies exact mappings', () => {
  const mappings = [{ originalText: 'Appearance', changeText: '\u5916\u89c2', searchType: 'exact' }];
  assert.equal(translateTextWithMappings('Appearance', mappings), '\u5916\u89c2');
});

test('translateTextWithMappings applies normalizedExact mappings', () => {
  const mappings = [
    {
      originalText: 'Sign In',
      changeText: '\u767b\u5f55',
      searchType: 'normalizedExact',
    },
  ];
  assert.equal(translateTextWithMappings('sign   in', mappings), '\u767b\u5f55');
});

test('translateTextWithMappings applies normalizedExact mappings to mnemonic menu labels', () => {
  const mappings = [
    {
      originalText: 'Close Window',
      changeText: '\u5173\u95ed\u7a97\u53e3',
      searchType: 'normalizedExact',
    },
    {
      originalText: 'VS Code Settings',
      changeText: 'VS Code \u8bbe\u7f6e',
      searchType: 'normalizedExact',
    },
  ];

  assert.equal(
    translateTextWithMappings('Clos&&e Window', mappings),
    '\u5173\u95ed\u7a97\u53e3'
  );
  assert.equal(
    translateTextWithMappings('&&VS Code Settings', mappings),
    'VS Code \u8bbe\u7f6e'
  );
});

test('translateTextWithMappings applies regex mappings', () => {
  const mappings = [
    {
      originalText: '^Something went wrong:\\s*(.+)$',
      changeText: '\u51fa\u9519\u4e86\uff1a$1',
      searchType: 'regex',
      flags: 'i',
    },
  ];
  assert.equal(
    translateTextWithMappings('Something went wrong: boom', mappings),
    '\u51fa\u9519\u4e86\uff1aboom'
  );
});

test('translateTextWithMappings respects scoped rules', () => {
  const mappings = [
    {
      originalText: 'System',
      changeText: '\u8ddf\u968f\u7cfb\u7edf',
      searchType: 'normalizedExact',
      scopeContainsText: ['Theme'],
    },
  ];

  assert.equal(
    translateTextWithMappings('System', mappings, { scopeMatched: false }),
    'System'
  );
  assert.equal(
    translateTextWithMappings('System', mappings, { scopeMatched: true }),
    '\u8ddf\u968f\u7cfb\u7edf'
  );
  assert.equal(
    translateTextWithMappings('System', mappings, { scopeText: 'Theme Light Dark' }),
    '\u8ddf\u968f\u7cfb\u7edf'
  );
});
