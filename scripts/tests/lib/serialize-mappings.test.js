const test = require('node:test');
const assert = require('node:assert/strict');

const { serializeMappings } = require('../../lib/runtime/text-translator-template.js');

test('serializeMappings emits compact single-line JSON arrays', () => {
  const serialized = serializeMappings([
    { originalText: 'Sign In', changeText: '登录', searchType: 'exact' },
    { originalText: 'General', changeText: '常规', searchType: 'exact' },
  ]);

  assert.doesNotMatch(serialized, /\n\s+"originalText"/);
  assert.match(serialized, /^\[{"originalText"/);
});
