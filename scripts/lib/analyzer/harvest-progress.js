'use strict';

function formatByteSize(byteLength = 0) {
  if (byteLength >= 1024 * 1024) {
    return `${(byteLength / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (byteLength >= 1024) {
    return `${(byteLength / 1024).toFixed(1)} KB`;
  }
  return `${byteLength} B`;
}

function formatHarvestProgressMessage(event = {}) {
  switch (event.stage) {
    case 'start':
      return `starting harvest for Cursor ${event.cursorVersion || 'unknown'}`;
    case 'metadata':
      return `install metadata loaded (Cursor ${event.cursorVersion}, VS Code ${event.vscodeVersion || 'unknown'})`;
    case 'mappings':
      return `loaded ${event.mappingCount ?? 0} merged mappings`;
    case 'scan-file':
      return `scanning ${event.path} (${event.index}/${event.total})...`;
    case 'scan-file-done':
      return `scanned ${event.path}: ${event.stringCount} strings, ${formatByteSize(event.byteLength)} in ${Math.round(event.durationMs || 0)}ms`;
    case 'reverse-coverage':
      const percent =
        event.total > 0 ? Math.round((event.current / event.total) * 100) : 100;
      return `reverse coverage ${event.current}/${event.total} (${percent}%)`;
    case 'reverse-coverage-done':
      return `reverse coverage complete: ${event.unmapped ?? 0} unmapped of ${event.total ?? 0}`;
    case 'diff':
      return `diff vs previous snapshot: added ${event.added ?? 0}, removed ${event.removed ?? 0}, anchor_changed ${event.anchorChanged ?? 0}`;
    case 'patch-orphans':
      return `checking ${event.patchCount ?? 0} embedded patch rules...`;
    case 'patch-orphans-done':
      return `patch_orphaned: ${event.orphanCount ?? 0}`;
    case 'write':
      return 'writing JSON/Markdown reports and snapshot...';
    default:
      return event.message || String(event.stage || 'progress');
  }
}

function createHarvestProgressReporter({ log = console.log, prefix = '[harvest]' } = {}) {
  const startedAt = performance.now();

  return function reportHarvestProgress(event = {}) {
    const elapsedSeconds = ((performance.now() - startedAt) / 1000).toFixed(1);
    log(`${prefix} [${elapsedSeconds}s] ${formatHarvestProgressMessage(event)}`);
  };
}

module.exports = {
  formatByteSize,
  formatHarvestProgressMessage,
  createHarvestProgressReporter,
};
