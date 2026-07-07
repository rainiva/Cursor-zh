const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  createUninstallOrchestratorModule,
} = require('../../tool/uninstall-orchestrator.js');

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeFakeFs(files = new Set()) {
  const copied = [];
  return {
    existsSync: (p) => files.has(p),
    mkdirSync: () => {},
    copyFileSync: (src, dest) => { copied.push({ src, dest }); },
    getCopied: () => copied,
  };
}

function getRestoreFromBackup(fakeFs) {
  const mod = createUninstallOrchestratorModule({
    toolPaths: {
      backupRoot: '/fake/backups',
      buildManifestPath: '/fake/build-manifest.json',
      generatedDir: '/fake/generated',
      startCursorPathFile: '/fake/start-cursor-path.txt',
      toggleSignalPath: '/fake/toggle-signal',
      workspaceRoot: '/fake/workspace',
      extensionOverlayPath: '/fake/ext-overlay',
      desktopShortcutName: 'Cursor.lnk',
    },
    fs: fakeFs,
    readJson: () => ({}),
    readJsonIfExists: () => null,
    writeJson: () => {},
    loadInstallMetadata: () => ({}),
    loadMergedMappings: () => ({}),
    verifyCleanState: () => ({ issues: [] }),
    printReport: () => {},
    env: {},
  });
  return mod.restoreFromBackup;
}

// ─── non-strict (default) ────────────────────────────────────────────────────

test('restoreFromBackup: backupDir 为 null 时返回 false（非 strict）', () => {
  const fakeFs = makeFakeFs();
  const restore = getRestoreFromBackup(fakeFs);

  const result = restore({
    backupDir: null,
    relativePath: 'package.json',
    targetPath: '/target/package.json',
    fs: fakeFs,
  });

  assert.equal(result, false);
});

test('restoreFromBackup: backup 文件不存在时返回 false（非 strict）', () => {
  const fakeFs = makeFakeFs();
  const restore = getRestoreFromBackup(fakeFs);

  const result = restore({
    backupDir: '/backups/abc',
    relativePath: 'package.json',
    targetPath: '/target/package.json',
    fs: fakeFs,
  });

  assert.equal(result, false);
});

test('restoreFromBackup: backup 文件存在时正常恢复并返回 true', () => {
  const backupFile = path.join('/backups/abc', 'package.json');
  const fakeFs = makeFakeFs(new Set([backupFile]));
  const restore = getRestoreFromBackup(fakeFs);

  const result = restore({
    backupDir: '/backups/abc',
    relativePath: 'package.json',
    targetPath: '/target/package.json',
    fs: fakeFs,
  });

  assert.equal(result, true);
  assert.equal(fakeFs.getCopied().length, 1);
  assert.equal(fakeFs.getCopied()[0].src, backupFile);
  assert.equal(fakeFs.getCopied()[0].dest, '/target/package.json');
});

// ─── strict mode (uninstall scenario) ────────────────────────────────────────

test('restoreFromBackup strict: backupDir 为 null 时抛异常', () => {
  const fakeFs = makeFakeFs();
  const restore = getRestoreFromBackup(fakeFs);

  assert.throws(
    () => restore({
      backupDir: null,
      relativePath: 'package.json',
      targetPath: '/target/package.json',
      strict: true,
      fs: fakeFs,
    }),
    { message: /[Bb]ackup/ },
  );
});

test('restoreFromBackup strict: backup 文件不存在时抛异常', () => {
  const fakeFs = makeFakeFs();
  const restore = getRestoreFromBackup(fakeFs);

  assert.throws(
    () => restore({
      backupDir: '/backups/abc',
      relativePath: 'nls.messages.json',
      targetPath: '/target/nls.messages.json',
      strict: true,
      fs: fakeFs,
    }),
    { message: /nls\.messages\.json/ },
  );
});

test('restoreFromBackup strict: backup 文件存在时正常恢复并返回 true', () => {
  const backupFile = path.join('/backups/abc', 'package.json');
  const fakeFs = makeFakeFs(new Set([backupFile]));
  const restore = getRestoreFromBackup(fakeFs);

  const result = restore({
    backupDir: '/backups/abc',
    relativePath: 'package.json',
    targetPath: '/target/package.json',
    strict: true,
    fs: fakeFs,
  });

  assert.equal(result, true);
  assert.equal(fakeFs.getCopied().length, 1);
});
