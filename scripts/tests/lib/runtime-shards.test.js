'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildRuntimeShards,
  measureRuntimeShards,
  assertRuntimeShardBudgets,
} = require('../../lib/mapping/runtime-shards.js');

test('keeps owned mappings out of core and enforces per-shard budgets', () => {
  const shards = buildRuntimeShards(
    [
      {
        translationId: 'composer.send',
        owner: 'composer',
        aliases: ['Send'],
        changeText: '发送',
        fallback: { kind: 'runtime-surface', surface: 'composer', match: 'exact' },
      },
    ],
    [],
    { composer: { runtimeScopes: ['[class*="composer"]'] } }
  );
  assert.deepEqual(shards.core, []);
  assert.equal(shards.surfaces.composer.entries[0].translationId, 'composer.send');
  assert.doesNotThrow(() => assertRuntimeShardBudgets(shards, { coreKB: 80, surfaceKB: 20 }));
});

test('puts cross-surface units in core and copies quarantineSelectors onto shards', () => {
  const shards = buildRuntimeShards(
    [
      {
        translationId: 'shared.label',
        owner: 'shared',
        aliases: ['Label'],
        changeText: '标签',
        fallback: { kind: 'static' },
      },
      {
        translationId: 'composer.send',
        owner: 'composer',
        aliases: ['Send'],
        changeText: '发送',
        fallback: { kind: 'runtime-surface', surface: 'composer', match: 'exact' },
      },
    ],
    [],
    {
      composer: {
        runtimeScopes: ['[class*="composer"]'],
        quarantineSelectors: ['[data-ui-chrome]'],
      },
    }
  );

  assert.equal(shards.core.length, 1);
  assert.equal(shards.core[0].translationId, 'shared.label');
  assert.deepEqual(shards.surfaces.composer.selectors, ['[class*="composer"]']);
  assert.deepEqual(shards.surfaces.composer.quarantineSelectors, ['[data-ui-chrome]']);
  assert.equal(shards.surfaces.composer.entries[0].match, 'exact');
});

test('measureRuntimeShards reports coreKB and per-surface KB', () => {
  const shards = buildRuntimeShards(
    [
      {
        translationId: 'composer.send',
        owner: 'composer',
        aliases: ['Send'],
        changeText: '发送',
        fallback: { kind: 'runtime-surface', surface: 'composer', match: 'exact' },
      },
    ],
    [],
    { composer: { runtimeScopes: ['[class*="composer"]'] } }
  );
  const measured = measureRuntimeShards(shards);
  assert.equal(typeof measured.coreKB, 'number');
  assert.equal(typeof measured.surfaceKB.composer, 'number');
  assert.ok(measured.coreKB >= 0);
  assert.ok(measured.surfaceKB.composer > 0);
});

test('assertRuntimeShardBudgets hard-fails overages', () => {
  const shards = {
    core: [{ translationId: 'x'.repeat(90 * 1024), aliases: ['a'], changeText: 'b', match: 'exact' }],
    surfaces: {
      composer: {
        selectors: [],
        quarantineSelectors: [],
        entries: [{ translationId: 'y'.repeat(25 * 1024), aliases: ['a'], changeText: 'b', match: 'exact' }],
      },
    },
  };
  assert.throws(
    () => assertRuntimeShardBudgets(shards, { coreKB: 80, surfaceKB: 20 }),
    /core|surface/i
  );
});
