const test = require('node:test');
const assert = require('node:assert/strict');

const {
  translatedQuotedLiteralPresent,
  summarizeStaticPatchContractsFromTranslatedSource,
} = require('../../lib/patcher/contracts.js');
const {
  applyStaticSourceTranslationsDetailed,
  defaultCursorWinDynamicMappings,
} = require('../../cursor-zh-lib.js');

test('translatedQuotedLiteralPresent falls back to regex when quoted literal set misses translation', () => {
  const translated = 'label:"继续追问"';
  const emptyLiterals = new Set();

  assert.equal(translatedQuotedLiteralPresent(translated, '继续追问', emptyLiterals), true);
  assert.equal(translatedQuotedLiteralPresent(translated, 'Send follow-up', emptyLiterals), false);
});

test('summarizeStaticPatchContractsFromTranslatedSource satisfies send_follow_up_glass via regex fallback', () => {
  const translated = 'label:"继续追问"';
  const original = 'label:"Send follow-up"';
  const contracts = summarizeStaticPatchContractsFromTranslatedSource(translated, original);

  assert.equal(contracts.send_follow_up_glass.matchCount, 1);
});

test('applyStaticSourceTranslationsDetailed satisfies send_follow_up_glass for composer follow-up literals', () => {
  const source =
    'const wu=$a?"Drop here to attach...":Te?"Send follow-up with subagent":"Send follow-up";';
  const result = applyStaticSourceTranslationsDetailed(source, defaultCursorWinDynamicMappings());

  assert.equal(result.contracts.send_follow_up_glass.matchCount, 1);
  assert.match(result.translatedSource, /"继续追问"/);
});
