const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createToolPaths } = require('../../tool/paths.js');
const { createBackupModule } = require('../../tool/backup.js');
const { ensureDir, readJson, writeJson, timestampLabel } = require('../../tool/io.js');

test('getManagedExternalFiles includes argv and locale mirror entries', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-backup-'));
  const toolPaths = createToolPaths(workspaceRoot);
  const { getManagedExternalFiles } = createBackupModule({
    toolPaths,
    ensureDir,
    readJson,
    writeJson,
    timestampLabel,
  });

  const context = {
    paths: {
      argvPath: path.join(workspaceRoot, 'argv.json'),
      userLocaleMirrorPath: path.join(workspaceRoot, 'locale.json'),
      resourcesAppDir: path.join(workspaceRoot, 'resources', 'app'),
    },
  };

  const files = getManagedExternalFiles(context);

  assert.deepEqual(
    files.map((entry) => entry.kind),
    ['argv', 'localeMirror']
  );
  assert.equal(files[0].backupRelativePath, path.join('external', 'argv.json'));
});

test('getManagedExtensionTranslationFiles maps overlay keys to extension nls targets', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-backup-'));
  const toolPaths = createToolPaths(workspaceRoot);
  writeJson(toolPaths.extensionOverlayPath, {
    'cursor-always-local': { displayName: 'test' },
  });

  const extensionDir = path.join(
    workspaceRoot,
    'resources',
    'app',
    'extensions',
    'cursor-always-local'
  );
  ensureDir(extensionDir);

  const { getManagedExtensionTranslationFiles } = createBackupModule({
    toolPaths,
    ensureDir,
    readJson,
    writeJson,
    timestampLabel,
  });

  const entries = getManagedExtensionTranslationFiles({
    paths: {
      resourcesAppDir: path.join(workspaceRoot, 'resources', 'app'),
    },
  });

  assert.equal(entries.length, 1);
  assert.equal(entries[0].kind, 'extensionTranslation');
  assert.equal(
    entries[0].targetPath,
    path.join(extensionDir, 'package.nls.zh-cn.json')
  );
});

test('ensureBackup copies install and external files into timestamped backup dir', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-backup-'));
  const installDir = path.join(workspaceRoot, 'install');
  const resourcesAppDir = path.join(installDir, 'resources', 'app');
  const mainTranslatedPath = path.join(resourcesAppDir, 'out', 'main_translated.js');
  const argvPath = path.join(workspaceRoot, 'argv.json');
  const toolPaths = createToolPaths(workspaceRoot);

  ensureDir(path.dirname(mainTranslatedPath));
  fs.writeFileSync(mainTranslatedPath, 'translated-main');
  writeJson(argvPath, { locale: 'en' });

  let seedCalls = 0;
  const { ensureBackup } = createBackupModule({
    toolPaths,
    ensureDir,
    readJson,
    writeJson,
    timestampLabel: () => '2026-06-07T12-00-00-000Z',
  });

  const backupDir = ensureBackup(
    {
      paths: {
        installDir,
        mainTranslatedPath,
        nlsMessagesPath: path.join(resourcesAppDir, 'out', 'nls.messages.json'),
        packageJsonPath: path.join(resourcesAppDir, 'package.json'),
        translatorBootstrapPath: path.join(resourcesAppDir, 'out', 'cursorTranslatorMain.js'),
        workbenchTranslatedPath: path.join(
          resourcesAppDir,
          'out',
          'vs',
          'workbench',
          'workbench.desktop.main_translated.js'
        ),
        argvPath,
        userLocaleMirrorPath: null,
        resourcesAppDir,
      },
    },
    {
      seedOverlayFiles: () => {
        seedCalls += 1;
      },
    }
  );

  assert.equal(seedCalls, 1);
  assert.equal(
    backupDir,
    path.join(toolPaths.backupRoot, '2026-06-07T12-00-00-000Z')
  );
  assert.equal(
    fs.readFileSync(
      path.join(backupDir, 'resources', 'app', 'out', 'main_translated.js'),
      'utf8'
    ),
    'translated-main'
  );
  assert.deepEqual(readJson(path.join(backupDir, 'external', 'argv.json')), {
    locale: 'en',
  });
  assert.ok(readJson(path.join(backupDir, 'backup-metadata.json')).externalFiles);
});

test('ensureBackup sanitizes patched package.json back to original main entry', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-backup-'));
  const installDir = path.join(workspaceRoot, 'install');
  const resourcesAppDir = path.join(installDir, 'resources', 'app');
  const packageJsonPath = path.join(resourcesAppDir, 'package.json');
  const toolPaths = createToolPaths(workspaceRoot);

  ensureDir(resourcesAppDir);
  writeJson(packageJsonPath, {
    name: 'cursor',
    main: './out/cursorTranslatorMain.js',
    main_original: './out/main.js',
    type: 'module',
  });

  const { ensureBackup } = createBackupModule({
    toolPaths,
    ensureDir,
    readJson,
    writeJson,
    timestampLabel: () => '2026-06-07T12-01-00-000Z',
  });

  const backupDir = ensureBackup({
    paths: {
      installDir,
      resourcesAppDir,
      mainTranslatedPath: path.join(resourcesAppDir, 'out', 'main_translated.js'),
      nlsMessagesPath: path.join(resourcesAppDir, 'out', 'nls.messages.json'),
      packageJsonPath,
      translatorBootstrapPath: path.join(resourcesAppDir, 'out', 'cursorTranslatorMain.js'),
      workbenchTranslatedPath: path.join(
        resourcesAppDir,
        'out',
        'vs',
        'workbench',
        'workbench.desktop.main_translated.js'
      ),
      argvPath: path.join(workspaceRoot, 'argv.json'),
      userLocaleMirrorPath: null,
      resourcesAppDir,
    },
  });

  const backupPackageJson = readJson(
    path.join(backupDir, 'resources', 'app', 'package.json')
  );

  assert.equal(backupPackageJson.main, './out/main.js');
  assert.equal('main_original' in backupPackageJson, false);
  assert.equal(backupPackageJson.type, 'module');
});
