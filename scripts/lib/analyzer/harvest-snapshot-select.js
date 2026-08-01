'use strict';

// Snapshot baseline selection for `harvest --diff`.
//
// Snapshot files are named `<cursorVersion>.json` (e.g. `3.13.10.json`). Picking
// the "previous" baseline by lexicographic sort is wrong: '3.9.8' sorts AFTER
// '3.13.10' because '9' > '1', so a 3.14.7 harvest would diff against 3.9.8
// instead of the true nearest predecessor 3.13.10, producing bogus diff numbers.

function parseSnapshotVersion(name) {
  const base = String(name || '').replace(/\.json$/i, '');
  if (!/^\d+(?:\.\d+)*$/.test(base)) {
    return null;
  }
  return base.split('.').map((segment) => Number(segment));
}

function compareSnapshotVersions(left, right) {
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const leftValue = left[index] || 0;
    const rightValue = right[index] || 0;
    if (leftValue !== rightValue) {
      return leftValue < rightValue ? -1 : 1;
    }
  }
  return 0;
}

function selectPreviousSnapshotName(fileNames = [], currentVersion) {
  const currentParsed = parseSnapshotVersion(currentVersion);

  const candidates = [];
  for (const name of fileNames) {
    if (!name.endsWith('.json') || name === `${currentVersion}.json`) {
      continue;
    }
    const version = parseSnapshotVersion(name);
    if (!version) {
      // Ignore backups and other non-version snapshot names.
      continue;
    }
    candidates.push({ name, version });
  }

  if (candidates.length === 0) {
    return null;
  }

  // Prefer the highest version strictly older than the current one; fall back
  // to the highest available version when none is strictly older.
  const older = currentParsed
    ? candidates.filter((entry) => compareSnapshotVersions(entry.version, currentParsed) < 0)
    : [];
  const pool = older.length > 0 ? older : candidates;
  pool.sort((left, right) => compareSnapshotVersions(left.version, right.version));
  return pool[pool.length - 1].name;
}

module.exports = {
  parseSnapshotVersion,
  compareSnapshotVersions,
  selectPreviousSnapshotName,
};
