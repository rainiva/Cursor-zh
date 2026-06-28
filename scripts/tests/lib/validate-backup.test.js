const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { validateBackupForUninstall } = require('../../lib/install/validate-backup.js');

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

test('validateBackupForUninstall requires nls backup when injected artifacts exist', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-validate-backup-'));
  const installDir = path.join(tempRoot, 'install');
  const backupDir = path.join(tempRoot, 'backup');
  const packageBackupPath = path.join(
    backupDir,
    'resources',
    'app',
    'package.json'
  );
  writeJson(packageBackupPath, { main: './out/main.js' });

  assert.throws(
    () =>
      validateBackupForUninstall({
        backupDir,
        installDir,
        installMetadata: { pkg: { version: '3.9.8' } },
        deletePaths: [path.join(installDir, 'resources', 'app', 'out', 'cursorTranslatorMain.js')],
        fs,
        existsSync: (filePath) => {
          if (filePath === packageBackupPath) {
            return true;
          }
          if (String(filePath).includes('cursorTranslatorMain.js')) {
            return true;
          }
          return fs.existsSync(filePath);
        },
      }),
    /nls\.messages\.json backup/
  );
});

test('validateBackupForUninstall warns when snapshot installDir differs from current install', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-validate-backup-'));
  const installDir = path.join(tempRoot, 'install-a');
  const backupDir = path.join(tempRoot, 'backup');
  const packageBackupPath = path.join(backupDir, 'resources', 'app', 'package.json');
  const nlsBackupPath = path.join(backupDir, 'resources', 'app', 'out', 'nls.messages.json');

  writeJson(packageBackupPath, { main: './out/main.js' });
  fs.mkdirSync(path.dirname(nlsBackupPath), { recursive: true });
  fs.writeFileSync(nlsBackupPath, '[]');
  writeJson(path.join(backupDir, 'backup-metadata.json'), {
    externalFiles: [],
    snapshot: {
      installDir: path.join(tempRoot, 'install-b'),
      cursorVersion: '3.9.8',
      hashes: {},
    },
  });

  const result = validateBackupForUninstall({
    backupDir,
    installDir,
    installMetadata: { pkg: { version: '3.9.8' } },
    deletePaths: [],
    fs,
  });

  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /installDir/i);
});
