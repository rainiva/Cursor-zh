const fs = require('fs');
const path = require('path');
const { CRITICAL_UI_ALL_TARGETS, CRITICAL_EMBEDDED_UI_PATCHES } = require('../lib/mapping/critical-ui-targets.js');
const { CRITICAL_NLS_TARGETS } = require('../lib/mapping/critical-nls-targets.js');

function syncFile(filePath) {
  const entries = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const indexByOriginal = new Map(entries.map((entry, idx) => [entry.originalText, idx]));
  let added = 0;
  let updated = 0;

  for (const critical of [...CRITICAL_UI_ALL_TARGETS, ...CRITICAL_NLS_TARGETS]) {
    const existingIndex = indexByOriginal.get(critical.originalText);
    if (existingIndex === undefined) {
      entries.push({
        originalText: critical.originalText,
        changeText: critical.changeText,
        searchType: 'exact',
        ...(critical.forceRuntime ? { forceRuntime: true } : {}),
      });
      indexByOriginal.set(critical.originalText, entries.length - 1);
      added += 1;
      continue;
    }

    const existing = entries[existingIndex];
    let changed = false;
    if (existing.changeText !== critical.changeText) {
      existing.changeText = critical.changeText;
      changed = true;
    }
    if (critical.forceRuntime && existing.forceRuntime !== true) {
      existing.forceRuntime = true;
      changed = true;
    }
    if (changed) {
      updated += 1;
    }
  }

  fs.writeFileSync(filePath, `${JSON.stringify(entries, null, 2)}\n`, 'utf8');
  return { added, updated, total: entries.length };
}

const root = path.join(__dirname, '../..');
const overlayPath = path.join(root, 'translations/overlay/cursor-win.common.json');
const defaultsPath = path.join(root, 'translations/overlay/defaults/cursor-win.common.json');

for (const filePath of [overlayPath, defaultsPath]) {
  const result = syncFile(filePath);
  console.log(path.relative(root, filePath), result);
}
