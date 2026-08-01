const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseSnapshotVersion,
  compareSnapshotVersions,
  selectPreviousSnapshotName,
} = require('../../lib/analyzer/harvest-snapshot-select.js');

test('parseSnapshotVersion extracts numeric segments and rejects invalid names', () => {
  assert.deepEqual(parseSnapshotVersion('3.13.10.json'), [3, 13, 10]);
  assert.deepEqual(parseSnapshotVersion('3.9.8.json'), [3, 9, 8]);
  assert.deepEqual(parseSnapshotVersion('3.14.7'), [3, 14, 7]);
  assert.equal(parseSnapshotVersion('backup.json'), null);
  assert.equal(parseSnapshotVersion('.json'), null);
  assert.equal(parseSnapshotVersion('weird-name.json'), null);
  assert.equal(parseSnapshotVersion(''), null);
  assert.equal(parseSnapshotVersion(null), null);
});

test('compareSnapshotVersions orders by semantic version, not lexicographically', () => {
  // The alphabetical trap: '3.9.8' > '3.13.10' as strings, but 3.13.10 is newer.
  assert.ok(compareSnapshotVersions([3, 13, 10], [3, 9, 8]) > 0);
  assert.ok(compareSnapshotVersions([3, 9, 16], [3, 9, 8]) > 0);
  assert.ok(compareSnapshotVersions([3, 14, 10], [3, 14, 7]) > 0);
  assert.equal(compareSnapshotVersions([3, 14, 7], [3, 14, 7]), 0);
  // Differing segment counts compare missing segments as zero.
  assert.ok(compareSnapshotVersions([3, 14], [3, 14, 1]) < 0);
});

test('selectPreviousSnapshotName picks nearest semver baseline (3.13.10 over 3.9.8)', () => {
  const files = ['3.12.30.json', '3.13.10.json', '3.9.16.json', '3.9.8.json'];
  assert.equal(selectPreviousSnapshotName(files, '3.14.7'), '3.13.10.json');
});

test('selectPreviousSnapshotName compares multi-segment patch numbers numerically', () => {
  const files = ['3.14.2.json', '3.14.7.json', '3.14.10.json'];
  assert.equal(selectPreviousSnapshotName(files, '3.14.20'), '3.14.10.json');
});

test('selectPreviousSnapshotName excludes the current version snapshot', () => {
  const files = ['3.14.7.json', '3.13.10.json'];
  assert.equal(selectPreviousSnapshotName(files, '3.14.7'), '3.13.10.json');
});

test('selectPreviousSnapshotName tolerates invalid or missing snapshot names', () => {
  const files = ['backup.json', '.json', 'notes.txt', '3.13.10.json', 'weird-name.json'];
  assert.equal(selectPreviousSnapshotName(files, '3.14.7'), '3.13.10.json');
});

test('selectPreviousSnapshotName returns null when no valid candidate exists', () => {
  assert.equal(selectPreviousSnapshotName(['readme.txt', 'backup.json'], '3.14.7'), null);
  assert.equal(selectPreviousSnapshotName([], '3.14.7'), null);
});
