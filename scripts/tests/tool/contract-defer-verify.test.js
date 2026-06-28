const test = require('node:test');
const assert = require('node:assert/strict');

const {
  applyStaticSourceTranslationsDetailed,
} = require('../../lib/patcher/contracts.js');
const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');
const { createWorkbenchIndex } = require('../../lib/patcher/workbench-index.js');

test('applyStaticSourceTranslationsDetailed can skip contract summarization when deferContractsToVerify is true', () => {
  const source = 'const title = "General";';
  const mappings = [{ originalText: 'General', changeText: '常规', searchType: 'exact' }];
  const index = createWorkbenchIndex(source);

  const deferred = applyStaticSourceTranslationsDetailed(source, mappings, index, {
    deferContractsToVerify: true,
  });
  const full = applyStaticSourceTranslationsDetailed(source, mappings, index);

  assert.equal(deferred.translatedSource, full.translatedSource);
  assert.equal(deferred.contractsDeferred, true);
  assert.deepEqual(deferred.contracts, {});
  assert.ok(full.contracts && Object.keys(full.contracts).length > 0);
});

test('applyStaticSourceTranslations still translates without contract payload', () => {
  const source = 'const title = "General";';
  const mappings = [{ originalText: 'General', changeText: '常规', searchType: 'exact' }];
  const translated = applyStaticSourceTranslations(source, mappings, createWorkbenchIndex(source));

  assert.match(translated, /常规/);
  assert.doesNotMatch(translated, /"General"/);
});
