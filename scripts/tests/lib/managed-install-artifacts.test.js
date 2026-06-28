const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  CORE_INJECTED_RELATIVE_PATHS,
  RESTORE_FROM_BACKUP_RELATIVE_PATHS,
  walkWorkbenchTranslatedRelativePaths,
  listInjectedInstallRelativePaths,
  listBackupInstallAbsolutePaths,
  collectUninstallWarnings,
  hasExistingInjectedArtifacts,
} = require('../../lib/install/managed-install-artifacts.js');

function createResourcesLayout(tempRoot) {
  const resourcesAppDir = path.join(tempRoot, 'resources', 'app');
  const workbenchDir = path.join(resourcesAppDir, 'out', 'vs', 'workbench');
  fs.mkdirSync(workbenchDir, { recursive: true });
  return { resourcesAppDir, workbenchDir };
}

test('CORE_INJECTED_RELATIVE_PATHS includes bootstrap and main translated', () => {
  assert.deepEqual(CORE_INJECTED_RELATIVE_PATHS, [
    'resources/app/out/cursorTranslatorMain.js',
    'resources/app/out/main_translated.js',
  ]);
});

test('RESTORE_FROM_BACKUP_RELATIVE_PATHS includes package.json and nls.messages.json', () => {
  assert.deepEqual(RESTORE_FROM_BACKUP_RELATIVE_PATHS, [
    'resources/app/package.json',
    'resources/app/out/nls.messages.json',
  ]);
});

test('walkWorkbenchTranslatedRelativePaths discovers orphan translated chunks', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-artifacts-'));
  const { resourcesAppDir, workbenchDir } = createResourcesLayout(tempRoot);

  fs.writeFileSync(
    path.join(workbenchDir, 'workbench.anysphere-ui-foo_translated.js'),
    'orphan'
  );
  fs.writeFileSync(path.join(workbenchDir, 'workbench.desktop.main.js'), 'original');

  const relativePaths = walkWorkbenchTranslatedRelativePaths(resourcesAppDir, fs);

  assert.deepEqual(relativePaths, [
    'resources/app/out/vs/workbench/workbench.anysphere-ui-foo_translated.js',
  ]);
});

test('listInjectedInstallRelativePaths includes core paths and existing translated workbench files', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-artifacts-'));
  const { resourcesAppDir, workbenchDir } = createResourcesLayout(tempRoot);
  const installDir = path.dirname(path.dirname(path.dirname(resourcesAppDir)));

  fs.mkdirSync(path.join(resourcesAppDir, 'out'), { recursive: true });
  fs.writeFileSync(
    path.join(resourcesAppDir, 'out', 'cursorTranslatorMain.js'),
    'bootstrap'
  );
  fs.writeFileSync(path.join(resourcesAppDir, 'out', 'main_translated.js'), 'main');
  fs.writeFileSync(
    path.join(workbenchDir, 'workbench.glass.main_translated.js'),
    'glass'
  );
  fs.writeFileSync(
    path.join(workbenchDir, 'workbench.anysphere-ui-foo_translated.js'),
    'foo'
  );

  const relativePaths = listInjectedInstallRelativePaths(resourcesAppDir, fs);

  assert.deepEqual(relativePaths, [
    'resources/app/out/cursorTranslatorMain.js',
    'resources/app/out/main_translated.js',
    'resources/app/out/vs/workbench/workbench.anysphere-ui-foo_translated.js',
    'resources/app/out/vs/workbench/workbench.glass.main_translated.js',
  ]);
});

test('listBackupInstallAbsolutePaths includes restore targets and existing injected files', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-artifacts-'));
  const installDir = path.join(tempRoot, 'install');
  const resourcesAppDir = path.join(installDir, 'resources', 'app');
  const workbenchDir = path.join(resourcesAppDir, 'out', 'vs', 'workbench');
  fs.mkdirSync(workbenchDir, { recursive: true });
  fs.mkdirSync(path.join(resourcesAppDir, 'out'), { recursive: true });

  fs.writeFileSync(path.join(resourcesAppDir, 'package.json'), '{}');
  fs.writeFileSync(path.join(resourcesAppDir, 'out', 'nls.messages.json'), '[]');
  fs.writeFileSync(
    path.join(resourcesAppDir, 'out', 'cursorTranslatorMain.js'),
    'bootstrap'
  );
  fs.writeFileSync(
    path.join(workbenchDir, 'workbench.desktop.main_translated.js'),
    'desktop'
  );

  const absolutePaths = listBackupInstallAbsolutePaths(
    {
      paths: {
        installDir,
        resourcesAppDir,
        packageJsonPath: path.join(resourcesAppDir, 'package.json'),
        nlsMessagesPath: path.join(resourcesAppDir, 'out', 'nls.messages.json'),
      },
    },
    fs
  );

  assert.ok(absolutePaths.includes(path.join(resourcesAppDir, 'package.json')));
  assert.ok(absolutePaths.includes(path.join(resourcesAppDir, 'out', 'nls.messages.json')));
  assert.ok(
    absolutePaths.includes(
      path.join(workbenchDir, 'workbench.desktop.main_translated.js')
    )
  );
  assert.ok(
    absolutePaths.includes(path.join(resourcesAppDir, 'out', 'cursorTranslatorMain.js'))
  );
});

test('collectUninstallWarnings warns when manifest cursorVersion differs from installed package', () => {
  const warnings = collectUninstallWarnings(
    { cursorVersion: '3.9.7' },
    { pkg: { version: '3.9.8' } }
  );

  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /3\.9\.7/);
  assert.match(warnings[0], /3\.9\.8/);
});

test('collectUninstallWarnings is empty when versions match', () => {
  const warnings = collectUninstallWarnings(
    { cursorVersion: '3.9.8' },
    { pkg: { version: '3.9.8' } }
  );

  assert.deepEqual(warnings, []);
});

test('hasExistingInjectedArtifacts returns false for empty delete path list', () => {
  assert.equal(hasExistingInjectedArtifacts([]), false);
  assert.equal(hasExistingInjectedArtifacts(null), false);
});

test('hasExistingInjectedArtifacts detects glass-only translated artifact', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-artifacts-'));
  const glassTranslatedPath = path.join(
    tempRoot,
    'resources',
    'app',
    'out',
    'vs',
    'workbench',
    'workbench.glass.main_translated.js'
  );
  fs.mkdirSync(path.dirname(glassTranslatedPath), { recursive: true });
  fs.writeFileSync(glassTranslatedPath, 'glass');

  assert.equal(hasExistingInjectedArtifacts([glassTranslatedPath]), true);
  assert.equal(
    hasExistingInjectedArtifacts([
      path.join(tempRoot, 'missing', 'workbench.glass.main_translated.js'),
    ]),
    false
  );
});
