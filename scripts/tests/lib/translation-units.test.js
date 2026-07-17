const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateTranslationUnits,
} = require('../../lib/mapping/translation-units.js');

const surfaces = { composer: { defaultLayer: 'L3', runtimeScopes: ['[class*="composer"]'] } };
const unit = {
  translationId: 'composer.send_follow_up',
  changeText: '继续追问',
  aliases: ['Send follow-up', 'Add a follow-up'],
  owner: 'composer',
  primary: { kind: 'semantic', locatorId: 'composer.follow_up_action', cardinality: 1 },
  fallback: { kind: 'runtime-surface', surface: 'composer', match: 'normalizedExact' },
  severity: 'error',
  placeholders: [],
};

test('validates a stable translation unit and indexes aliases by scope', () => {
  const result = validateTranslationUnits({ version: 1, units: [unit] }, surfaces);
  assert.equal(result.byId.get(unit.translationId).changeText, '继续追问');
  assert.equal(result.aliasesByScope.get('composer\0Send follow-up'), unit.translationId);
});

test('rejects duplicate ids, conflicting aliases, and unregistered runtime surfaces', () => {
  assert.throws(
    () => validateTranslationUnits({ version: 1, units: [unit, { ...unit }] }, surfaces),
    /duplicate translationId/
  );
  assert.throws(
    () => validateTranslationUnits({ version: 1, units: [
      unit,
      { ...unit, translationId: 'composer.other', changeText: '其他' },
    ] }, surfaces),
    /conflicting alias/
  );
  assert.throws(
    () => validateTranslationUnits({ version: 1, units: [
      { ...unit, translationId: 'missing.surface', fallback: { ...unit.fallback, surface: 'missing' } },
    ] }, surfaces),
    /unregistered runtime surface/
  );
});
