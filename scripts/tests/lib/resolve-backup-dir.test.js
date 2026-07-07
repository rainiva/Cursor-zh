const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { resolveBackupDir } = require('../../lib/install/resolve-backup-dir.js');

// ─── helpers ────────────────────────────────────────────────────────────────

// 归一化路径 key，确保 path.join 产生的路径能匹配
function normKey(p) {
  return path.resolve(p);
}

function makeFakeFs(dirs = {}, fileContents = {}) {
  // 归一化所有 key
  const normDirs = {};
  for (const [k, v] of Object.entries(dirs)) {
    // __mtime suffix keys: resolve the dir part, then append suffix
    if (k.endsWith('__mtime')) {
      const dirPart = k.slice(0, -'__mtime'.length);
      normDirs[normKey(dirPart) + '__mtime'] = v;
    } else {
      normDirs[normKey(k)] = v;
    }
  }
  const normFiles = {};
  for (const [k, v] of Object.entries(fileContents)) {
    normFiles[normKey(k)] = v;
  }

  return {
    existsSync(p) {
      const np = normKey(p);
      if (normDirs[np] !== undefined) return true;
      if (normFiles[np] !== undefined) return true;
      return false;
    },
    readdirSync(p) {
      const np = normKey(p);
      const entries = normDirs[np] || [];
      return entries.map((name) => ({ name, isDirectory: () => true }));
    },
    statSync(p) {
      const np = normKey(p);
      return { mtimeMs: normDirs[np + '__mtime'] || 1000 };
    },
    readFileSync(p) {
      const np = normKey(p);
      if (normFiles[np] !== undefined) {
        const content = normFiles[np];
        return typeof content === 'string' ? content : JSON.stringify(content);
      }
      throw new Error(`ENOENT: ${p}`);
    },
  };
}

const BACKUP_METADATA_RELATIVE = 'backup-metadata.json';

function metadataPath(backupDir) {
  return path.join(backupDir, BACKUP_METADATA_RELATIVE);
}

// ─── tests ──────────────────────────────────────────────────────────────────

test('resolveBackupDir: 不指定 userBackupDir，多冲突仍 throw', () => {
  const backupRoot = '/backups';
  const installDir = '/cursor';
  const resolvedInstallDir = path.resolve(installDir);
  const dirA = path.join(backupRoot, 'backup-a');
  const dirB = path.join(backupRoot, 'backup-b');

  // metadata 中存储 resolve 后的路径，确保 matchesInstallDir 匹配
  const meta = { snapshot: { installDir: resolvedInstallDir } };
  const fakeFs = makeFakeFs(
    {
      [backupRoot]: ['backup-a', 'backup-b'],
      [dirA + '__mtime']: 2000,
      [dirB + '__mtime']: 1000,
    },
    {
      [metadataPath(dirA)]: meta,
      [metadataPath(dirB)]: meta,
    }
  );

  assert.throws(
    () =>
      resolveBackupDir({
        backupRoot,
        installDir,
        manifest: null,
        fs: fakeFs,
      }),
    /Multiple backups match installDir/
  );
});

test('resolveBackupDir: 指定存在的 userBackupDir → 直接使用该路径', () => {
  const backupRoot = '/backups';
  const installDir = '/cursor';
  const userDir = '/custom/backup';

  const fakeFs = makeFakeFs(
    {
      [backupRoot]: [],
      [userDir]: [], // existsSync returns true
    },
    {}
  );

  const result = resolveBackupDir({
    backupRoot,
    installDir,
    manifest: null,
    userBackupDir: userDir,
    fs: fakeFs,
  });

  assert.equal(result.backupDir, userDir);
});

test('resolveBackupDir: 指定不存在的 userBackupDir → 抛出明确错误', () => {
  const backupRoot = '/backups';
  const installDir = '/cursor';
  const userDir = '/nonexistent/backup';

  const fakeFs = makeFakeFs({ [backupRoot]: [] }, {});

  assert.throws(
    () =>
      resolveBackupDir({
        backupRoot,
        installDir,
        manifest: null,
        userBackupDir: userDir,
        fs: fakeFs,
      }),
    (err) => {
      assert.ok(err.message.includes(userDir), 'error should mention the path');
      return true;
    }
  );
});

test('resolveBackupDir: 单 backup + 不指定 userBackupDir → 自动选择（行为不变）', () => {
  const backupRoot = '/backups';
  const installDir = '/cursor';
  const resolvedInstallDir = path.resolve(installDir);
  const dirA = path.join(backupRoot, 'backup-a');

  const meta = { snapshot: { installDir: resolvedInstallDir } };
  const fakeFs = makeFakeFs(
    {
      [backupRoot]: ['backup-a'],
      [dirA + '__mtime']: 1000,
    },
    {
      [metadataPath(dirA)]: meta,
    }
  );

  const result = resolveBackupDir({
    backupRoot,
    installDir,
    manifest: null,
    fs: fakeFs,
  });

  assert.equal(result.backupDir, dirA);
});
