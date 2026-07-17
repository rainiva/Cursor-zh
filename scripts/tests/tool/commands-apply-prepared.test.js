const test = require('node:test');
const assert = require('node:assert/strict');

const { createCommandsModule } = require('../../tool/commands.js');
const {
  createPreparedBuild,
  commitPreparedBuild,
  LEGACY_APPLY_EXPIRY_VERSION,
} = require('../../tool/prepared-build.js');
const { getManagedTransactionTargets } = require('../../lib/install/managed-external-files.js');

test('blocked prepare performs zero managed-target writes and keeps workspace diagnostics', async () => {
  const writes = [];
  const prepared = { admission: { status: 'BLOCKED', blockers: ['composer.send_follow_up'] } };
  const commands = createCommandsModule({
    prepareBuild: async () => prepared,
    commitPreparedBuild: async () => {
      writes.push({ kind: 'commit' });
    },
    printPreparedBuildReport: () => {},
  });
  await assert.rejects(
    () => commands.runApply({ options: { force: false }, paths: {} }),
    /blocked: composer.send_follow_up/
  );
  assert.deepEqual(writes, []);
});

test('blocked admission never selects legacy apply and skips all managed writer hooks', async () => {
  const writes = [];
  const track = (kind) => () => {
    writes.push(kind);
  };
  const { runApply, runLegacyApply } = createCommandsModule({
    prepareBuild: async () =>
      createPreparedBuild({
        buildId: 'diag-1',
        rootDir: '/workspace/state/generated/diag-1',
        artifacts: [],
        admission: { status: 'BLOCKED', blockers: ['composer.send_follow_up'] },
        manifest: {},
        recoveryCapsule: { path: '/workspace/state/generated/diag-1/recovery-capsule.json' },
        managedTargetSnapshot: [],
      }),
    commitPreparedBuild: async () => {
      writes.push('commit');
    },
    printPreparedBuildReport: () => {},
    writeStartLauncherPath: track('launcher'),
    writeLocaleFiles: track('locale'),
    writeTranslatorBootstrap: track('bootstrap'),
    patchPackageJsonMain: track('package'),
    writeExtensionTranslationFiles: track('extensionNls'),
    createDesktopShortcut: track('shortcut'),
    ensureBackup: track('backup'),
  });

  assert.equal(runLegacyApply.expiryVersion, LEGACY_APPLY_EXPIRY_VERSION);

  await assert.rejects(
    () => runApply({ options: { force: false }, paths: {} }),
    /blocked: composer.send_follow_up/
  );
  assert.deepEqual(writes, []);
});

test('commitPreparedBuild refuses BLOCKED and enumerates full managed target kinds', async () => {
  await assert.rejects(
    () =>
      commitPreparedBuild(
        { admission: { status: 'BLOCKED', blockers: ['x'] }, artifacts: [] },
        { writeArtifact: async () => {} }
      ),
    /blocked: x/
  );

  const extensionOverlayPath = 'D:/ws/translations/overlay/extensions.overlay.json';
  const kinds = new Set(
    getManagedTransactionTargets(
      {
        paths: {
          installDir: 'D:/Apps/Cursor',
          argvPath: 'D:/Users/u/argv.json',
          userLocaleMirrorPath: 'D:/Users/u/locale.json',
          resourcesAppDir: 'D:/Apps/Cursor/resources/app',
          packageJsonPath: 'D:/Apps/Cursor/resources/app/package.json',
          nlsMessagesPath: 'D:/Apps/Cursor/resources/app/out/nls.messages.json',
        },
      },
      {
        extensionOverlayPath,
        toolPaths: {
          startCursorPathFile: 'D:/ws/state/start-cursor-path.txt',
          desktopShortcutName: 'Cursor 中文版.lnk',
        },
        listBackupInstallAbsolutePaths: () => [
          'D:/Apps/Cursor/resources/app/package.json',
        ],
        findLanguagePackCacheMessagePaths: () => [
          'D:/Users/u/AppData/Cursor/clp/1.2.3.zh-cn/hash/nls.messages.json',
        ],
        fs: {
          existsSync: (filePath) => {
            const normalized = String(filePath).replace(/\\/g, '/');
            if (normalized === extensionOverlayPath.replace(/\\/g, '/')) {
              return true;
            }
            if (normalized.endsWith('/extensions/cursor-test-ext')) {
              return true;
            }
            return false;
          },
          readFileSync: (filePath) => {
            const normalized = String(filePath).replace(/\\/g, '/');
            if (normalized === extensionOverlayPath.replace(/\\/g, '/')) {
              return '{"cursor-test-ext":true}';
            }
            throw new Error(`unexpected read: ${filePath}`);
          },
        },
      }
    ).map((entry) => entry.kind)
  );

  for (const required of [
    'installArtifact',
    'argv',
    'localeMirror',
    'extensionTranslation',
    'languagePackCache',
    'launcher',
    'shortcut',
  ]) {
    assert.ok(kinds.has(required), `missing managed kind ${required}`);
  }
});
