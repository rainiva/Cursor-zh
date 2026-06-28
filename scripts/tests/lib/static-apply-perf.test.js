const test = require('node:test');
const assert = require('node:assert/strict');

const { createWorkbenchIndex } = require('../../lib/patcher/workbench-index.js');
const {
  applyStaticSourceTranslations,
  findApplicableEmbeddedPatches,
  applyEmbeddedUiSourcePatches,
} = require('../../lib/patcher/static.js');

test('findApplicableEmbeddedPatches only returns patches present in anchor source', () => {
  const patches = [
    { from: 'Alpha', to: '甲' },
    { from: 'Missing', to: '无' },
    { from: 'Beta', to: '乙' },
  ];
  const applicable = findApplicableEmbeddedPatches(patches, 'const x = "Alpha";');
  assert.deepEqual(applicable.map((entry) => entry.from), ['Alpha']);
});

test('applyStaticSourceTranslations replaces quoted literals inside block comments', () => {
  const source = '/* title:"PR Preferences" */';
  const mappings = [
    { originalText: 'PR Preferences', changeText: 'PR 偏好设置', searchType: 'exact' },
  ];
  const index = createWorkbenchIndex(source);
  const translated = applyStaticSourceTranslations(source, mappings, index);

  assert.equal(translated.includes('PR Preferences'), false);
  assert.ok(translated.includes('PR 偏好设置'));
});

test('applyStaticSourceTranslations batches slow-path quoted literals in one pass', () => {
  const source = '"File";"General";"Ask mode uses read-only tools";';
  const index = createWorkbenchIndex(source);
  const mappings = [
    { originalText: 'File', changeText: '文件', searchType: 'exact' },
    { originalText: 'General', changeText: '常规', searchType: 'exact' },
    {
      originalText: 'Ask mode uses read-only tools',
      changeText: '提问模式使用只读工具',
      searchType: 'exact',
    },
  ];

  const translated = applyStaticSourceTranslations(source, mappings, index);
  assert.ok(!translated.includes('"File"'));
  assert.ok(translated.includes('"文件"'));
  assert.ok(translated.includes('"常规"'));
  assert.ok(translated.includes('提问模式使用只读工具'));
});

test('applyStaticSourceTranslations on multi-megabyte indexed workbench meets apply budget', () => {
  const literals = Array.from({ length: 80 }, (_, index) => `Label ${index}`);
  const mappings = literals.map((label) => ({
    originalText: label,
    changeText: `标签${label.slice(6)}`,
    searchType: 'exact',
  }));
  const quoted = literals.map((label) => `"${label}"`).join('');
  const padding = 'a'.repeat(4_000_000);
  const source = `${padding}${quoted}${padding}`;
  const index = createWorkbenchIndex(source);

  const startedAt = performance.now();
  applyStaticSourceTranslations(source, mappings, index);
  const elapsedMs = performance.now() - startedAt;

  assert.ok(elapsedMs < 2500, `expected indexed static apply <2.5s, took ${elapsedMs.toFixed(1)}ms`);
});

test('applyEmbeddedUiSourcePatches uses prefiltered applicable patch list', () => {
  const source = 'Choose how Agents run tools';
  const patches = [
    { from: 'Missing', to: '无' },
    {
      from: 'Choose how Agents run tools',
      to: '选择智能体运行工具的方式',
    },
  ];
  const applicable = findApplicableEmbeddedPatches(patches, source);
  const translated = applyEmbeddedUiSourcePatches(source, applicable);
  assert.ok(translated.includes('选择智能体运行工具的方式'));
  assert.equal(translated.includes('Missing'), false);
});
