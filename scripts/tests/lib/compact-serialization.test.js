const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('vm');

const {
  serializeMappingsCompact,
  generateDeserializerCode,
} = require('../../lib/runtime/compact-serialization.js');

function makeSampleMappings() {
  return [
    { originalText: 'Edit', changeText: '编辑', searchType: 'exact' },
    { originalText: 'Mode', changeText: '模式', searchType: 'exact' },
    { originalText: 'Open Settings', changeText: '打开设置', searchType: 'normalizedExact' },
    { originalText: 'Save', changeText: '保存', searchType: 'partial' },
    { originalText: '\\d+ days', changeText: '$1 天', searchType: 'regex', flags: 'g' },
    {
      originalText: 'Scoped',
      changeText: '作用域',
      searchType: 'exact',
      scopeSelectors: ['[class*="settings"]'],
    },
    {
      originalText: 'Contains',
      changeText: '包含',
      searchType: 'exact',
      scopeSelectors: ['[class*="panel"]'],
      scopeContainsText: 'container',
    },
    {
      originalText: 'Full',
      changeText: '完整',
      searchType: 'regex',
      flags: 'gi',
      scopeSelectors: ['[class*="dialog"]', '[role="menu"]'],
      scopeContainsText: 'menu',
    },
    {
      originalText: 'Special "\\n\tchars',
      changeText: '特殊"\\n\t字符',
      searchType: 'exact',
    },
  ];
}

function deepEqualWithDefaults(actual, expected) {
  assert.equal(actual.length, expected.length);
  for (let i = 0; i < expected.length; i += 1) {
    const exp = expected[i];
    const act = actual[i];
    assert.equal(act.originalText, exp.originalText);
    assert.equal(act.changeText, exp.changeText);
    assert.equal(act.searchType, exp.searchType || 'exact');
    assert.deepEqual(act.scopeSelectors, exp.scopeSelectors ?? null);
    assert.equal(act.scopeContainsText, exp.scopeContainsText ?? null);
    assert.equal(act.flags, exp.flags ?? null);
  }
}

function buildMockMappings(count) {
  const types = ['exact', 'normalizedExact', 'partial', 'regex'];
  const scopes = [
    ['[class*="settings"]', '[role="dialog"]'],
    ['[class*="panel"]'],
    [],
    null,
  ];
  const mappings = [];
  for (let i = 0; i < count; i += 1) {
    const type = types[i % types.length];
    const mapping = {
      originalText: `Label ${i % 50}`,
      changeText: `标签 ${i % 50}`,
      searchType: type,
    };
    const scope = scopes[i % scopes.length];
    if (scope && scope.length > 0) {
      mapping.scopeSelectors = scope;
    }
    if (i % 7 === 0) {
      mapping.scopeContainsText = 'container';
    }
    if (type === 'regex') {
      mapping.flags = i % 3 === 0 ? 'g' : 'gi';
    }
    mappings.push(mapping);
  }
  return mappings;
}

test('serializeMappingsCompact round-trips exact mappings through deserialize code', () => {
  const mappings = makeSampleMappings();
  const compact = serializeMappingsCompact(mappings);
  const parsed = JSON.parse(compact);
  const sandbox = {
    translationMappingsCompact: parsed,
    inlineTranslationMappingsCompact: [],
    productTipMappingsCompact: [],
    translationMappings: null,
    inlineTranslationMappings: null,
    productTipMappings: null,
    console,
  };
  vm.runInNewContext(generateDeserializerCode(), sandbox);
  deepEqualWithDefaults(sandbox.translationMappings, mappings);
});

test('serializeMappingsCompact produces array-of-arrays format', () => {
  const compact = serializeMappingsCompact([
    { originalText: 'Edit', changeText: '编辑', searchType: 'exact' },
  ]);
  const parsed = JSON.parse(compact);
  assert.ok(Array.isArray(parsed));
  assert.ok(Array.isArray(parsed[0]));
  assert.deepEqual(parsed[0], ['Edit', '编辑']);
});

// 任务 11（RC-2）：运行时引擎对无 originalText 条目一律 continue 跳过——
// 序列化层同口径过滤，杜绝 [null,"中文"] 死数据再次流入运行时头部。
test('serializeMappingsCompact drops entries without executable originalText (RC-2 dead-data guard)', () => {
  const compact = serializeMappingsCompact([
    { originalText: 'Edit', changeText: '编辑', searchType: 'exact' },
    { searchType: 'anchor', anchorType: 'i18nKey', anchorId: 'glass.agentPanel.continueWorking', changeText: '继续工作', forceRuntime: true },
    { originalText: '', changeText: '空原文', searchType: 'exact' },
    { originalText: null, changeText: '空引用', searchType: 'exact' },
  ]);
  const parsed = JSON.parse(compact);
  assert.deepEqual(parsed, [['Edit', '编辑']]);
});

test('serializeMappingsCompact omits trailing null/default fields', () => {
  const compact = serializeMappingsCompact([
    { originalText: 'A', changeText: '一', searchType: 'exact' },
    { originalText: 'B', changeText: '二', searchType: 'exact', scopeSelectors: ['.x'] },
    { originalText: 'C', changeText: '三', searchType: 'regex', flags: 'g' },
  ]);
  const parsed = JSON.parse(compact);
  assert.deepEqual(parsed[0], ['A', '一']);
  assert.deepEqual(parsed[1], ['B', '二', 0, ['.x']]);
  assert.deepEqual(parsed[2], ['C', '三', 3, null, null, 'g']);
});

test('serializeMappingsCompact is at least 35% smaller than JSON.stringify for 448 mappings', () => {
  const mappings = buildMockMappings(448);
  const compact = serializeMappingsCompact(mappings);
  const original = JSON.stringify(mappings);
  const ratio = compact.length / original.length;
  assert.ok(
    ratio < 0.65,
    `expected compact size < 65% of original, got ${(ratio * 100).toFixed(1)}%`,
  );
});

test('decompression of 800 mappings in under 1ms', () => {
  const mappings = buildMockMappings(800);
  const compact = JSON.parse(serializeMappingsCompact(mappings));
  const SEARCH_TYPES = ['exact', 'normalizedExact', 'partial', 'regex'];
  function decompact(a) {
    return {
      originalText: a[0],
      changeText: a[1],
      searchType: SEARCH_TYPES[a[2] || 0],
      scopeSelectors: a[3] != null ? a[3] : null,
      scopeContainsText: a[4] != null ? a[4] : null,
      flags: a[5] != null ? a[5] : null,
    };
  }
  const start = performance.now();
  const result = compact.map(decompact);
  const elapsed = performance.now() - start;
  assert.ok(elapsed < 1, `expected decompression <1ms, got ${elapsed.toFixed(3)}ms`);
  assert.equal(result.length, 800);
});

test('deserializer handles empty array', () => {
  const sandbox = {
    translationMappingsCompact: [],
    inlineTranslationMappingsCompact: [],
    productTipMappingsCompact: [],
    translationMappings: ['should-be-replaced'],
    inlineTranslationMappings: ['should-be-replaced'],
    productTipMappings: ['should-be-replaced'],
  };
  vm.runInNewContext(generateDeserializerCode(), sandbox);
  assert.deepEqual(sandbox.translationMappings, []);
  assert.deepEqual(sandbox.inlineTranslationMappings, []);
  assert.deepEqual(sandbox.productTipMappings, []);
});

test('deserializer handles single mapping', () => {
  const compact = JSON.parse(serializeMappingsCompact([
    { originalText: 'One', changeText: '一', searchType: 'exact' },
  ]));
  const sandbox = {
    translationMappingsCompact: compact,
    inlineTranslationMappingsCompact: [],
    productTipMappingsCompact: [],
    translationMappings: null,
    inlineTranslationMappings: null,
    productTipMappings: null,
  };
  vm.runInNewContext(generateDeserializerCode(), sandbox);
  deepEqualWithDefaults(sandbox.translationMappings, [
    { originalText: 'One', changeText: '一', searchType: 'exact' },
  ]);
});

test('deserializer preserves special characters', () => {
  const mappings = [
    { originalText: 'Line\\nBreak', changeText: '换行', searchType: 'exact' },
    { originalText: 'Quote"Test', changeText: '引号"测试', searchType: 'exact' },
    { originalText: 'Emoji\u2764', changeText: '爱心\u2764', searchType: 'exact' },
  ];
  const compact = JSON.parse(serializeMappingsCompact(mappings));
  const sandbox = {
    translationMappingsCompact: compact,
    inlineTranslationMappingsCompact: [],
    productTipMappingsCompact: [],
    translationMappings: null,
    inlineTranslationMappings: null,
    productTipMappings: null,
  };
  vm.runInNewContext(generateDeserializerCode(), sandbox);
  deepEqualWithDefaults(sandbox.translationMappings, mappings);
});
