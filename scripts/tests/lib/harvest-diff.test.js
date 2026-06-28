const test = require('node:test');
const assert = require('node:assert/strict');

const { diffHarvestSnapshots } = require('../../lib/analyzer/harvest-diff.js');

function snapshot(strings, anchors = []) {
  return {
    cursorVersion: '1.0.0',
    files: [{ path: 'workbench.glass.main.js', strings }],
    anchors,
  };
}

test('diffHarvestSnapshots reports added and removed strings', () => {
  const baseline = snapshot([
    { text: 'Copy as Markdown', context: 'label:' },
    { text: 'Plan Mode', context: 'title:' },
  ]);
  const current = snapshot([
    { text: 'Copy as Markdown', context: 'label:' },
    { text: 'Toggle Expand Agent', context: 'title:' },
  ]);

  const diff = diffHarvestSnapshots(baseline, current);

  assert.deepEqual(diff.added.map((entry) => entry.text), ['Toggle Expand Agent']);
  assert.deepEqual(diff.removed.map((entry) => entry.text), ['Plan Mode']);
  assert.deepEqual(diff.changed, []);
});

test('diffHarvestSnapshots reports changed_anchor_stable when anchor id matches but title changes', () => {
  const baseline = snapshot([], [
    {
      type: 'glassCommand',
      id: 'workbench.action.toggleExpandAgent',
      field: 'title',
      text: 'Toggle Expand Agent',
      path: 'workbench.glass.main.js',
    },
  ]);
  const current = snapshot([], [
    {
      type: 'glassCommand',
      id: 'workbench.action.toggleExpandAgent',
      field: 'title',
      text: 'Expand Agent Panel',
      path: 'workbench.glass.main.js',
    },
  ]);

  const diff = diffHarvestSnapshots(baseline, current);

  assert.equal(diff.changed_anchor_stable.length, 1);
  assert.equal(diff.changed_anchor_stable[0].id, 'workbench.action.toggleExpandAgent');
  assert.equal(diff.changed_anchor_stable[0].before, 'Toggle Expand Agent');
  assert.equal(diff.changed_anchor_stable[0].after, 'Expand Agent Panel');
});

test('diffHarvestSnapshots patch_orphaned is attached by harvest report builder', () => {
  const { diffEmbeddedPatchOrphans } = require('../../lib/mapping/versioned-patches.js');
  const orphans = diffEmbeddedPatchOrphans('source-without-patch', [
    { from: 'missing-fragment', to: 'x' },
  ]);
  assert.equal(orphans.length, 1);
  assert.equal(orphans[0].from, 'missing-fragment');
});
