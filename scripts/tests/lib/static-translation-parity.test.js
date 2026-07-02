const test = require('node:test');
const assert = require('node:assert/strict');

const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');
const {
  isRealWorkbenchAvailable,
  loadRealWorkbenchFixture,
} = require('./helpers/real-workbench-fixture.js');

function countQuoted(source, literal) {
  const escaped = literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (String(source).match(new RegExp(`(['"\`])${escaped}\\1`, 'g')) || []).length;
}

test('applyStaticSourceTranslations replaces File after regex literal desync snippet', () => {
  const source = 's.replace(/^["\']|["\']$/g,""),label:"File"';
  const mappings = [{ originalText: 'File', changeText: '文件', searchType: 'exact' }];
  const result = applyStaticSourceTranslations(source, mappings);
  assert.equal(countQuoted(result, 'File'), 0);
  assert.ok(countQuoted(result, '文件') >= 1);
});

test('applyStaticSourceTranslations reconciles all quoted menu literals on real workbench', () => {
  if (!isRealWorkbenchAvailable()) {
    return;
  }

  const fixture = loadRealWorkbenchFixture();
  const mappings = [
    { originalText: 'File', changeText: '文件', searchType: 'exact' },
    { originalText: 'Edit', changeText: '编辑', searchType: 'exact' },
    { originalText: 'View', changeText: '视图', searchType: 'exact' },
    { originalText: 'Help', changeText: '帮助', searchType: 'exact' },
    { originalText: 'Fork Chat', changeText: '分叉对话', searchType: 'exact' },
  ];

  const translated = applyStaticSourceTranslations(fixture.source, mappings, fixture.index);

  for (const entry of mappings) {
    const before = countQuoted(fixture.source, entry.originalText);
    const afterOriginal = countQuoted(translated, entry.originalText);
    const afterTranslated = countQuoted(translated, entry.changeText);
    assert.equal(
      afterOriginal,
      0,
      `${entry.originalText} still has ${afterOriginal} quoted literals (before ${before})`
    );
    assert.ok(
      afterTranslated >= before,
      `${entry.changeText} expected at least ${before} quoted literals, got ${afterTranslated}`
    );
  }
});

test('applyStaticSourceTranslations leaves no quoted File literals after full merged mappings on real workbench', () => {
  if (!isRealWorkbenchAvailable()) {
    return;
  }

  const fixture = loadRealWorkbenchFixture();
  const fileMapping = fixture.mergedMappings.find((entry) => entry.originalText === 'File');

  assert.ok(fileMapping);
  assert.equal(countQuoted(fixture.translated, 'File'), 0);
  assert.ok(countQuoted(fixture.translated, fileMapping.changeText) > 0);
});
