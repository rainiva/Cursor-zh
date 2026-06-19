const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');

function countQuoted(source, literal) {
  const escaped = literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (String(source).match(new RegExp(`(['"\`])${escaped}\\1`, 'g')) || []).length;
}

const CODE_WITH_CLOUD_CONSTANTS =
  'function HER(n){if(n.currentEnvironmentKind==="cloud")return["cloud","local"];const e=n.canSelectCloud||n.currentEnvironmentKind==="cloud";return["local",...e?["cloud"]:[]]}function jER(){const te={id:"cloud",iconName:"cloud"},ee={local:{},cloud:te};return{items:["cloud"].map(ce=>ee[ce])}}';

test('applyStaticSourceTranslations does not replace "cloud" code constant with "云端" from normalizedExact mapping', () => {
  const mappings = [
    { originalText: 'Cloud', changeText: '云端', searchType: 'normalizedExact' },
  ];

  const result = applyStaticSourceTranslations(CODE_WITH_CLOUD_CONSTANTS, mappings);

  assert.equal(
    countQuoted(result, 'cloud'),
    countQuoted(CODE_WITH_CLOUD_CONSTANTS, 'cloud'),
    'quoted "cloud" literals should not be replaced'
  );
  assert.equal(
    countQuoted(result, '云端'),
    0,
    'quoted "云端" literals should not appear in code'
  );
});

test('exact "cloud" mapping corrupts code constants (regression scenario)', () => {
  const mappings = [
    { originalText: 'cloud', changeText: '云端', searchType: 'exact' },
  ];

  const result = applyStaticSourceTranslations(CODE_WITH_CLOUD_CONSTANTS, mappings);

  assert.notEqual(
    countQuoted(result, 'cloud'),
    countQuoted(CODE_WITH_CLOUD_CONSTANTS, 'cloud'),
    'exact mapping reproduces the corruption'
  );
  assert.ok(
    result.includes('id:"云端"'),
    'object id constant is corrupted by exact mapping'
  );
  assert.ok(
    result.includes('"云端"].map(ce=>ee[ce])'),
    'array lookup keys are corrupted by exact mapping'
  );
});

test('applyStaticSourceTranslations does not replace "cloud" code constant with regex mapping', () => {
  const mappings = [
    { originalText: '\\bcloud\\b', changeText: '云端', searchType: 'regex', flags: 'i' },
  ];

  const result = applyStaticSourceTranslations(CODE_WITH_CLOUD_CONSTANTS, mappings);

  assert.equal(
    countQuoted(result, 'cloud'),
    countQuoted(CODE_WITH_CLOUD_CONSTANTS, 'cloud'),
    'quoted "cloud" literals should not be replaced by regex mapping'
  );
  assert.equal(
    countQuoted(result, '云端'),
    0,
    'quoted "云端" literals should not appear in code'
  );
  assert.ok(
    result.includes('id:"cloud"'),
    'object id should remain "cloud"'
  );
  assert.ok(
    result.includes('cloud:te'),
    'object key should remain "cloud"'
  );
});

test('base workbench mapping for "cloud" is not exact (prevents AgentPanel code corruption)', () => {
  const basePath = path.join(__dirname, '..', '..', '..', 'translations', 'base', 'workbench.mappings.json');
  const raw = fs.readFileSync(basePath, 'utf-8');
  const mappings = JSON.parse(raw);
  const cloudMapping = mappings.find(
    (entry) => entry && entry.originalText && entry.originalText.includes('cloud')
  );

  assert.ok(cloudMapping, 'a cloud mapping should exist');
  assert.notEqual(
    cloudMapping.searchType,
    'exact',
    'cloud mapping must not be exact to avoid replacing code constants'
  );
});
