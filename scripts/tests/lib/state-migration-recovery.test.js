const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  CURRENT_READER_VERSION,
  readStateManifest,
  canRunOperation,
} = require('../../lib/compatibility/state-schema.js');
const {
  buildRecoveryCapsule,
  validateRecoveryCapsule,
  CURRENT_RECOVERY_READER_VERSION,
} = require('../../lib/install/recovery-capsule.js');
const { validateBackupForRecovery } = require('../../lib/install/validate-backup.js');

const INSTALL_DIR = 'D:/Apps/Cursor';
const NORMALIZED_INSTALL = 'd:/apps/cursor';
const BACKUP_DIR = 'D:/repo/state/backups/2026-07-17';
const BUILD_ID = 'build-test-001';

function stableBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function createFixture(id, payload) {
  const bytes = stableBytes(payload);
  return {
    id,
    payload,
    bytes: () => Buffer.from(bytes),
    json: () => JSON.parse(bytes.toString('utf8')),
  };
}

function loadStateFixtures(ids) {
  const fixtures = {
    v0: createFixture('v0', {
      generatedAt: '2026-06-01T00:00:00.000Z',
      installDir: INSTALL_DIR,
      backupDir: BACKUP_DIR,
      cursorVersion: '3.12.9',
      vscodeVersion: '1.128.0',
    }),
    v1: createFixture('v1', {
      schemaVersion: 1,
      minReaderVersion: 1,
      generatedAt: '2026-07-01T00:00:00.000Z',
      installDir: INSTALL_DIR,
      backupDir: BACKUP_DIR,
      cursorVersion: '3.12.10',
      vscodeVersion: '1.128.0',
      installIdentity: {
        installDir: INSTALL_DIR,
        normalizedInstallDir: NORMALIZED_INSTALL,
      },
    }),
    v2: createFixture('v2', {
      schemaVersion: 2,
      minReaderVersion: 2,
      generatedAt: '2026-07-10T00:00:00.000Z',
      installDir: INSTALL_DIR,
      backupDir: BACKUP_DIR,
      buildId: BUILD_ID,
      cursorVersion: '3.12.11',
      vscodeVersion: '1.128.0',
      installIdentity: {
        installDir: INSTALL_DIR,
        normalizedInstallDir: NORMALIZED_INSTALL,
      },
      recoveryCapsulePath: 'state/generated/build-test-001/recovery-capsule.json',
    }),
  };
  return ids.map((id) => fixtures[id]);
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function createRecoveryFixture() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-recovery-'));
  const installDir = path.join(tempRoot, 'install');
  const backupDir = path.join(tempRoot, 'backup');
  const packageBackupPath = path.join(backupDir, 'resources', 'app', 'package.json');
  const nlsBackupPath = path.join(backupDir, 'resources', 'app', 'out', 'nls.messages.json');
  const metadataPath = path.join(backupDir, 'backup-metadata.json');

  writeJson(packageBackupPath, { main: './out/main.js' });
  fs.mkdirSync(path.dirname(nlsBackupPath), { recursive: true });
  fs.writeFileSync(nlsBackupPath, '[]');
  writeJson(metadataPath, {
    externalFiles: [],
    snapshot: {
      installDir,
      cursorVersion: '3.12.11',
      hashes: {},
    },
  });

  const managedTargets = [
    {
      identity: 'resources/app/package.json',
      existed: true,
      contentHash: sha256File(packageBackupPath),
      restoreSource: packageBackupPath,
    },
    {
      identity: 'resources/app/out/nls.messages.json',
      existed: true,
      contentHash: sha256File(nlsBackupPath),
      restoreSource: nlsBackupPath,
    },
  ];

  return {
    tempRoot,
    installDir,
    backupDir,
    packageBackupPath,
    nlsBackupPath,
    metadataPath,
    managedTargets,
    installIdentity: {
      installDir,
      normalizedInstallDir: path.resolve(installDir).replace(/\\/g, '/').toLowerCase(),
    },
  };
}

function validCapsule(overrides = {}) {
  const fixture = createRecoveryFixture();
  const capsule = buildRecoveryCapsule({
    operation: 'apply',
    buildId: BUILD_ID,
    installIdentity: fixture.installIdentity,
    backup: {
      backupDir: fixture.backupDir,
      packageJsonPath: fixture.packageBackupPath,
      nlsMessagesPath: fixture.nlsBackupPath,
      metadataPath: fixture.metadataPath,
    },
    managedTargets: fixture.managedTargets,
    ...overrides,
  });
  return { capsule, fixture };
}

function corruptCapsule() {
  const { capsule } = validCapsule();
  return { ...capsule, backup: { backupDir: '/missing/backup' } };
}

test('adapts v0 and two prior schemas in memory without modifying source state', () => {
  for (const fixture of loadStateFixtures(['v0', 'v1', 'v2'])) {
    const before = fixture.bytes();
    const result = readStateManifest(fixture.json(), { readerVersion: CURRENT_READER_VERSION });
    assert.equal(result.status, 'compatible');
    assert.equal(result.sourceSchema, Number(fixture.id.slice(1)));
    assert.equal(result.manifest.schemaVersion, CURRENT_READER_VERSION);
    assert.deepEqual(fixture.bytes(), before);
  }
});

test('future state blocks apply and only a validated capsule authorizes uninstall', () => {
  const future = readStateManifest(
    { schemaVersion: 99, minReaderVersion: 99 },
    { readerVersion: CURRENT_READER_VERSION }
  );
  assert.equal(future.status, 'future-unsupported');
  assert.equal(canRunOperation('apply', future), false);
  assert.equal(canRunOperation('ensure', future), false);
  assert.equal(canRunOperation('uninstall', future, { capsule: corruptCapsule() }), false);

  const { capsule, fixture } = validCapsule();
  const validation = validateRecoveryCapsule(capsule, {
    readerVersion: CURRENT_RECOVERY_READER_VERSION,
    installDir: fixture.installDir,
    fs,
  });
  assert.equal(validation.valid, true);
  assert.equal(canRunOperation('uninstall', future, { capsule, validation }), true);
  assert.equal(
    canRunOperation('uninstall', future, {
      capsule,
      readerVersion: CURRENT_RECOVERY_READER_VERSION,
      installDir: fixture.installDir,
      fs,
    }),
    true,
    'uninstall succeeds when canRunOperation validates the capsule itself'
  );
});

test('rejects manifest whose minimum reader is newer than the tool', () => {
  const result = readStateManifest(
    { schemaVersion: 3, minReaderVersion: CURRENT_READER_VERSION + 1, installDir: INSTALL_DIR },
    { readerVersion: CURRENT_READER_VERSION }
  );
  assert.equal(result.status, 'reader-too-new');
  assert.match(result.guidance, /newer/i);
  assert.equal(canRunOperation('apply', result), false);
});

test('rejects corrupt manifest JSON fail closed', () => {
  const result = readStateManifest('{not-json', { readerVersion: CURRENT_READER_VERSION });
  assert.equal(result.status, 'invalid');
  assert.equal(canRunOperation('ensure', result), false);
});

test('validateRecoveryCapsule rejects corrupt capsule and wrong install identity', () => {
  const { capsule, fixture } = validCapsule();
  const corrupt = validateRecoveryCapsule(
    { ...capsule, managedTargets: 'not-an-array' },
    { readerVersion: CURRENT_RECOVERY_READER_VERSION, installDir: fixture.installDir, fs }
  );
  assert.equal(corrupt.valid, false);
  assert.ok(corrupt.issues.length > 0);

  const wrongInstall = validateRecoveryCapsule(capsule, {
    readerVersion: CURRENT_RECOVERY_READER_VERSION,
    installDir: path.join(fixture.tempRoot, 'other-install'),
    fs,
  });
  assert.equal(wrongInstall.valid, false);
  assert.ok(wrongInstall.issues.some((issue) => /install/i.test(issue)));
});

test('validateBackupForRecovery rejects invalid backup pointers', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-backup-recovery-'));
  const backupDir = path.join(tempRoot, 'backup');
  const packageBackupPath = path.join(backupDir, 'resources', 'app', 'package.json');
  writeJson(packageBackupPath, { main: './out/main.js' });

  const result = validateBackupForRecovery({
    backup: {
      backupDir,
      packageJsonPath: packageBackupPath,
      nlsMessagesPath: path.join(backupDir, 'resources', 'app', 'out', 'nls.messages.json'),
      metadataPath: path.join(backupDir, 'backup-metadata.json'),
    },
    fs,
  });
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => /nls/i.test(issue)));
});

test('buildRecoveryCapsule records only recovery-critical fields', () => {
  const { capsule } = validCapsule();
  assert.deepEqual(Object.keys(capsule).sort(), [
    'backup',
    'buildId',
    'capsuleVersion',
    'installIdentity',
    'managedTargets',
    'minRecoveryReaderVersion',
    'operation',
    'toolVersion',
  ].sort());
  assert.equal(capsule.operation, 'apply');
  assert.equal(capsule.buildId, BUILD_ID);
  assert.ok(Array.isArray(capsule.managedTargets));
  assert.equal(capsule.managedTargets[0].identity, 'resources/app/package.json');
});
