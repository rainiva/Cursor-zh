const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createDetectorModule } = require('../../tool/detector.js');
const { readJson } = require('../../tool/io.js');

function createFakeInstall(installDir) {
  const packageJsonPath = path.join(installDir, 'resources', 'app', 'package.json');
  fs.mkdirSync(path.dirname(packageJsonPath), { recursive: true });
  fs.writeFileSync(packageJsonPath, '{"name":"cursor"}\n');
}

test('detectCursorInstallDir prefers CURSOR_INSTALL_DIR when valid', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-detector-'));
  const installDir = path.join(workspaceRoot, 'from-env');
  createFakeInstall(installDir);

  const { detectCursorInstallDir } = createDetectorModule({ readJson });
  const detected = detectCursorInstallDir({
    workspaceRoot,
    defaultInstallDir: path.join(workspaceRoot, 'fallback'),
    env: {
      CURSOR_INSTALL_DIR: installDir,
      LOCALAPPDATA: '',
      USERPROFILE: '',
      ProgramFiles: '',
      'ProgramFiles(x86)': '',
      APPDATA: '',
    },
    execSync: () => {
      throw new Error('registry should not be queried when env is set');
    },
  });

  assert.equal(detected, installDir);
});

test('detectCursorInstallDir falls back to defaultInstallDir when nothing matches', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-detector-'));
  const defaultInstallDir = path.join(workspaceRoot, 'cursor');

  const { detectCursorInstallDir } = createDetectorModule({ readJson });
  const detected = detectCursorInstallDir({
    workspaceRoot,
    defaultInstallDir,
    env: {
      LOCALAPPDATA: path.join(workspaceRoot, 'empty-local'),
      USERPROFILE: workspaceRoot,
      ProgramFiles: path.join(workspaceRoot, 'empty-program-files'),
      'ProgramFiles(x86)': path.join(workspaceRoot, 'empty-program-files-x86'),
      APPDATA: path.join(workspaceRoot, 'empty-appdata'),
    },
    execSync: () => {
      throw new Error('registry should not be queried when common paths miss');
    },
  });

  assert.equal(detected, defaultInstallDir);
});

test('findLanguagePack returns highest-version zh-hans language pack', () => {
  const extensionRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-detector-'));
  const olderDir = path.join(
    extensionRoot,
    'ms-ceintl.vscode-language-pack-zh-hans-1.0.0'
  );
  const newerDir = path.join(
    extensionRoot,
    'ms-ceintl.vscode-language-pack-zh-hans-2.0.0'
  );

  for (const [dir, version] of [
    [olderDir, '1.0.0'],
    [newerDir, '2.0.0'],
  ]) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      `${JSON.stringify({ version })}\n`
    );
  }

  const { findLanguagePack } = createDetectorModule({ readJson });
  const pack = findLanguagePack(extensionRoot);

  assert.ok(pack);
  assert.equal(pack.path, newerDir);
  assert.equal(pack.version, '2.0.0');
});

test('findLanguagePack returns null when extension root is missing', () => {
  const { findLanguagePack } = createDetectorModule({ readJson });
  assert.equal(findLanguagePack(path.join(os.tmpdir(), 'missing-extensions-root')), null);
});
