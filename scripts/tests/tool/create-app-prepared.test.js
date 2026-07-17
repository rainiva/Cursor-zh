'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  resolvePrepareAdmission,
  buildLeaseCurrentSnapshot,
} = require('../../tool/prepared-build.js');
const { createToolApp } = require('../../tool/create-app.js');

function findByTarget(snapshot, targetPath) {
  return snapshot.find(
    (entry) => String(entry.targetPath).replace(/\\/g, '/') === String(targetPath).replace(/\\/g, '/')
  );
}

test('resolvePrepareAdmission defaults to UNCHANGED when drift is false', () => {
  assert.deepEqual(resolvePrepareAdmission({}), {
    status: 'UNCHANGED',
    blockers: [],
    fallbacks: [],
  });
});

test('resolvePrepareAdmission reaches BLOCKED from drift and blocking outcomes', () => {
  const admission = resolvePrepareAdmission({
    admissionDrift: true,
    admissionOutcomes: [
      {
        translationId: 'composer.send_follow_up',
        severity: 'error',
        primary: 'failed',
      },
    ],
    currentProofKey: 'proof-key',
  });
  assert.equal(admission.status, 'BLOCKED');
  assert.deepEqual(admission.blockers, ['composer.send_follow_up']);
});

test('resolvePrepareAdmission honors explicit admission override for tests', () => {
  const override = { status: 'KNOWN_DRIFT', blockers: [], fallbacks: ['x'] };
  assert.deepEqual(resolvePrepareAdmission({ admission: override }), override);
});

test('buildLeaseCurrentSnapshot re-reads managed targets from disk at lease time', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-lease-snap-'));
  const targetPath = path.join(root, 'resources', 'app', 'package.json');
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, 'version-1', 'utf8');

  const context = {
    paths: {
      installDir: root,
      argvPath: path.join(root, 'argv.json'),
      resourcesAppDir: path.join(root, 'resources', 'app'),
      packageJsonPath: targetPath,
    },
  };
  const deps = {
    toolPaths: {},
    listBackupInstallAbsolutePaths: () => [targetPath],
    findLanguagePackCacheMessagePaths: () => [],
    fs,
    sha256OfFile: (filePath) => `hash:${fs.readFileSync(filePath, 'utf8')}`,
  };

  const preparedSnapshot = buildLeaseCurrentSnapshot(context, {}, deps);
  assert.equal(findByTarget(preparedSnapshot, targetPath).contentHash, 'hash:version-1');

  fs.writeFileSync(targetPath, 'version-2', 'utf8');
  const currentSnapshot = buildLeaseCurrentSnapshot(context, {}, deps);

  assert.notDeepEqual(currentSnapshot, preparedSnapshot);
  assert.equal(findByTarget(currentSnapshot, targetPath).contentHash, 'hash:version-2');
});

test('createToolApp prepareBuild classifies BLOCKED without admission override', async () => {
  const app = createToolApp();
  const context = {
    paths: {
      installDir: 'D:/Apps/Cursor',
      argvPath: 'D:/Users/u/argv.json',
      userLocaleMirrorPath: 'D:/Users/u/locale.json',
      resourcesAppDir: 'D:/Apps/Cursor/resources/app',
      packageJsonPath: 'D:/Apps/Cursor/resources/app/package.json',
      nlsMessagesPath: 'D:/Apps/Cursor/resources/app/out/nls.messages.json',
    },
    options: {
      admissionDrift: true,
      admissionOutcomes: [
        {
          translationId: 'composer.send_follow_up',
          severity: 'error',
          primary: 'failed',
        },
      ],
      currentProofKey: 'proof-key',
    },
  };

  const prepared = await app.prepareBuild(context);
  assert.equal(prepared.admission.status, 'BLOCKED');
  assert.deepEqual(prepared.admission.blockers, ['composer.send_follow_up']);
});

test('createToolApp acquireCommitLease detects concurrent drift from lease-time snapshot', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-lease-ctx-'));
  const targetPath = path.join(root, 'resources', 'app', 'package.json');
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, 'before-lease', 'utf8');

  const app = createToolApp();
  const context = {
    paths: {
      installDir: root,
      argvPath: path.join(root, 'argv.json'),
      resourcesAppDir: path.join(root, 'resources', 'app'),
      packageJsonPath: targetPath,
    },
    options: {},
    // Avoid real Cursor.exe busy detection; focus on concurrent-drift path.
    busyProcesses: [],
  };

  const prepared = await app.prepareBuild(context);
  assert.ok(prepared.managedTargetSnapshot.length > 0);

  fs.writeFileSync(targetPath, 'after-prepare', 'utf8');

  await assert.rejects(
    () => app.acquireCommitLease({ context, prepared }),
    (error) => {
      assert.match(error.message, /Commit preflight blocked: concurrent-drift/);
      assert.equal(error.preflight?.reason, 'concurrent-drift');
      const preparedHash = findByTarget(
        error.preflight.evidence.preparedSnapshot,
        targetPath
      )?.contentHash;
      const currentHash = findByTarget(
        error.preflight.evidence.currentSnapshot,
        targetPath
      )?.contentHash;
      assert.ok(preparedHash);
      assert.ok(currentHash);
      assert.notEqual(preparedHash, currentHash);
      return true;
    }
  );
});
