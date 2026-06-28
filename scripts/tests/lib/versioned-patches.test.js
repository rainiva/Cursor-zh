const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const {
  resolvePatchPackId,
  loadEmbeddedPatchesForVersion,
  diffEmbeddedPatchOrphans,
} = require('../../lib/mapping/versioned-patches.js');

const workspaceRoot = path.resolve(__dirname, '../../..');

test('resolvePatchPackId maps 3.9.8 to cursor-3.9', () => {
  assert.equal(resolvePatchPackId('3.9.8'), 'cursor-3.9');
  assert.equal(resolvePatchPackId('3.10.1'), 'cursor-3.10');
});

test('loadEmbeddedPatchesForVersion loads generic and cursor-3.9 packs', () => {
  const patches = loadEmbeddedPatchesForVersion('3.9.8', workspaceRoot);
  assert.ok(patches.length > 0);
  const queued = patches.find((entry) => entry.from.includes('Queued'));
  assert.ok(queued, 'cursor-3.9 pack should include Queued patch');
});

test('loadEmbeddedPatchesForVersion falls back to generic for unknown minor', () => {
  const patches = loadEmbeddedPatchesForVersion('99.0.0', workspaceRoot);
  assert.ok(Array.isArray(patches));
});

test('diffEmbeddedPatchOrphans lists patches whose from substring is missing', () => {
  const orphans = diffEmbeddedPatchOrphans('always-present tail', [
    { from: 'duration-100"> Queued', to: 'x' },
    { from: 'always-present', to: 'y' },
  ]);
  assert.deepEqual(
    orphans.map((entry) => entry.from),
    ['duration-100"> Queued']
  );
});
