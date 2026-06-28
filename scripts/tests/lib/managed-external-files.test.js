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
