'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { CRITICAL_EMBEDDED_UI_PATCHES } = require('./critical-ui-targets');

const DEFAULT_WORKSPACE_ROOT = path.resolve(__dirname, '../../..');

function resolvePatchPackId(cursorVersion) {
  const match = String(cursorVersion || '').match(/^(\d+)\.(\d+)/);
  if (!match) {
    return 'generic';
  }
  return `cursor-${match[1]}.${match[2]}`;
}

function readPatchFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return Array.isArray(parsed) ? parsed : [];
}

function loadEmbeddedPatchesForVersion(cursorVersion, workspaceRoot = DEFAULT_WORKSPACE_ROOT) {
  const patchesDir = path.join(workspaceRoot, 'translations', 'patches');
  const generic = readPatchFile(path.join(patchesDir, 'generic', 'embedded-ui.json'));
  const packId = resolvePatchPackId(cursorVersion);
  const versioned =
    packId === 'generic'
      ? []
      : readPatchFile(path.join(patchesDir, packId, 'embedded-ui.json'));

  const mergedByFrom = new Map();
  for (const entry of [...CRITICAL_EMBEDDED_UI_PATCHES, ...generic, ...versioned]) {
    if (entry?.from) {
      mergedByFrom.set(entry.from, entry);
    }
  }
  return [...mergedByFrom.values()];
}

function diffEmbeddedPatchOrphans(workbenchSource, patches = []) {
  const source = String(workbenchSource || '');
  return patches.filter((patch) => patch?.from && !source.includes(patch.from));
}

module.exports = {
  resolvePatchPackId,
  loadEmbeddedPatchesForVersion,
  diffEmbeddedPatchOrphans,
};
