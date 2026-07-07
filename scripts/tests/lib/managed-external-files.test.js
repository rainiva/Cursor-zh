const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  getManagedExtensionTranslationFiles,
  getManagedExternalFiles,
  unionExternalFileEntries,
} = require('../../lib/install/managed-external-files.js');

test('getManagedExternalFiles includes argv and locale mirror entries', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-external-'));
  const extensionOverlayPath = path.join(workspaceRoot, 'extensions.overlay.json');
  fs.writeFileSync(extensionOverlayPath, '{}');

  const context = {
    paths: {
      argvPath: path.join(workspaceRoot, 'argv.json'),
      userLocaleMirrorPath: path.join(workspaceRoot, 'locale.json'),
      resourcesAppDir: path.join(workspaceRoot, 'resources', 'app'),
    },
  };

  const files = getManagedExternalFiles(context, { extensionOverlayPath });

  assert.deepEqual(
    files.map((entry) => entry.kind),
    ['argv', 'localeMirror']
  );
});

test('getManagedExtensionTranslationFiles returns overlay entries when overlay exists', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-ext-overlay-'));
  const resourcesAppDir = path.join(workspaceRoot, 'resources', 'app');
  const extDir = path.join(resourcesAppDir, 'extensions', 'cursor-test-ext');
  fs.mkdirSync(extDir, { recursive: true });

  const extensionOverlayPath = path.join(workspaceRoot, 'extensions.overlay.json');
  fs.writeFileSync(extensionOverlayPath, JSON.stringify({ 'cursor-test-ext': true }), 'utf8');

  const context = { paths: { resourcesAppDir } };
  const result = getManagedExtensionTranslationFiles(context, { extensionOverlayPath });

  assert.equal(result.length, 1);
  assert.equal(result[0].kind, 'extensionTranslation');
  assert.equal(result[0].targetPath, path.join(extDir, 'package.nls.zh-cn.json'));
});

test('getManagedExtensionTranslationFiles fallback: scans extensions dir when overlay missing', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-ext-fallback-'));
  const resourcesAppDir = path.join(workspaceRoot, 'resources', 'app');
  const extDir = path.join(resourcesAppDir, 'extensions', 'cursor-some-ext');
  fs.mkdirSync(extDir, { recursive: true });
  fs.writeFileSync(path.join(extDir, 'package.nls.zh-cn.json'), '{}', 'utf8');

  const extensionOverlayPath = path.join(workspaceRoot, 'extensions.overlay.json');
  // overlay file does NOT exist

  const context = { paths: { resourcesAppDir } };
  const result = getManagedExtensionTranslationFiles(context, { extensionOverlayPath });

  assert.equal(result.length, 1);
  assert.equal(result[0].kind, 'extensionTranslation');
  assert.equal(result[0].targetPath, path.join(extDir, 'package.nls.zh-cn.json'));
  assert.equal(
    result[0].backupRelativePath,
    path.join('external', 'extensions', 'cursor-some-ext', 'package.nls.zh-cn.json')
  );
});

test('getManagedExtensionTranslationFiles fallback: returns empty when no zh-cn files in extensions', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-ext-empty-'));
  const resourcesAppDir = path.join(workspaceRoot, 'resources', 'app');
  const extDir = path.join(resourcesAppDir, 'extensions', 'cursor-clean-ext');
  fs.mkdirSync(extDir, { recursive: true });
  // no package.nls.zh-cn.json here

  const extensionOverlayPath = path.join(workspaceRoot, 'extensions.overlay.json');
  const context = { paths: { resourcesAppDir } };
  const result = getManagedExtensionTranslationFiles(context, { extensionOverlayPath });

  assert.deepEqual(result, []);
});

test('getManagedExtensionTranslationFiles fallback: returns empty when extensions dir missing', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-ext-nodir-'));
  const resourcesAppDir = path.join(workspaceRoot, 'resources', 'app');
  fs.mkdirSync(resourcesAppDir, { recursive: true });
  // no extensions directory at all

  const extensionOverlayPath = path.join(workspaceRoot, 'extensions.overlay.json');
  const context = { paths: { resourcesAppDir } };
  const result = getManagedExtensionTranslationFiles(context, { extensionOverlayPath });

  assert.deepEqual(result, []);
});

test('getManagedExtensionTranslationFiles fallback: skips non-directory entries in extensions', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-ext-skip-'));
  const resourcesAppDir = path.join(workspaceRoot, 'resources', 'app');
  const extensionsDir = path.join(resourcesAppDir, 'extensions');
  fs.mkdirSync(extensionsDir, { recursive: true });
  // a regular file (not a directory) should be skipped
  fs.writeFileSync(path.join(extensionsDir, 'not-a-dir.txt'), 'hello', 'utf8');
  // a real extension dir with zh-cn file
  const extDir = path.join(extensionsDir, 'cursor-real-ext');
  fs.mkdirSync(extDir);
  fs.writeFileSync(path.join(extDir, 'package.nls.zh-cn.json'), '{}', 'utf8');

  const extensionOverlayPath = path.join(workspaceRoot, 'extensions.overlay.json');
  const context = { paths: { resourcesAppDir } };
  const result = getManagedExtensionTranslationFiles(context, { extensionOverlayPath });

  assert.equal(result.length, 1);
  assert.equal(result[0].targetPath, path.join(extDir, 'package.nls.zh-cn.json'));
});

test('unionExternalFileEntries merges metadata and registry without duplicate target paths', () => {
  const argvPath = '/tmp/argv.json';
  const extensionPath = '/tmp/extensions/cursor-always-local/package.nls.zh-cn.json';

  const union = unionExternalFileEntries(
    [
      {
        kind: 'argv',
        targetPath: argvPath,
        backupRelativePath: 'external/argv.json',
        existed: false,
      },
    ],
    [
      {
        kind: 'argv',
        targetPath: argvPath,
        backupRelativePath: 'external/argv.json',
      },
      {
        kind: 'extensionTranslation',
        targetPath: extensionPath,
        backupRelativePath: 'external/extensions/cursor-always-local/package.nls.zh-cn.json',
      },
    ]
  );

  assert.equal(union.length, 2);
  assert.deepEqual(
    union.map((entry) => entry.targetPath).sort(),
    [argvPath, extensionPath].sort()
  );
  assert.equal(union.find((entry) => entry.targetPath === argvPath).existed, false);
  assert.equal(
    union.find((entry) => entry.targetPath === extensionPath).existed,
    false
  );
});
