const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createToolPaths } = require('../../tool/paths.js');
const { collectUninstallTargets } = require('../../tool/uninstall-targets.js');

function createInstallLayout(workspaceRoot) {
  const installDir = path.join(workspaceRoot, 'cursor');
  const resourcesAppDir = path.join(installDir, 'resources', 'app');
  const outDir = path.join(resourcesAppDir, 'out');
  const workbenchDir = path.join(outDir, 'vs', 'workbench');

  fs.mkdirSync(workbenchDir, { recursive: true });
  fs.writeFileSync(
    path.join(resourcesAppDir, 'package.json'),
    JSON.stringify({ main: './out/cursorTranslatorMain.js', version: '3.9.8' }, null, 2)
  );
  fs.writeFileSync(path.join(outDir, 'cursorTranslatorMain.js'), 'bootstrap');
  fs.writeFileSync(path.join(outDir, 'main_translated.js'), 'main');
  fs.writeFileSync(
    path.join(workbenchDir, 'workbench.desktop.main_translated.js'),
    'desktop'
  );
  fs.writeFileSync(
    path.join(workbenchDir, 'workbench.anysphere-ui-foo_translated.js'),
    'foo'
  );

  return { installDir, resourcesAppDir, workbenchDir };
}

test('collectUninstallTargets merges glob discovery with manifest injectedPaths', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-uninstall-targets-'));
  const toolPaths = createToolPaths(workspaceRoot);
  const { installDir, workbenchDir } = createInstallLayout(workspaceRoot);

  const orphanTranslatedPath = path.join(
    workbenchDir,
    'workbench.anysphere-ui-bar_translated.js'
  );
  fs.writeFileSync(orphanTranslatedPath, 'bar');

  writeJson(toolPaths.buildManifestPath, {
    installDir,
    cursorVersion: '3.9.7',
    injectedPaths: [
      'resources/app/out/vs/workbench/workbench.anysphere-ui-baz_translated.js',
    ],
  });

  const result = collectUninstallTargets({
    installDir,
    toolPaths,
    fs,
    readJsonIfExists: (filePath, fallback) => {
      if (!fs.existsSync(filePath)) {
        return fallback;
      }
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    },
    loadInstallMetadata: () => ({
      pkg: { version: '3.9.8' },
    }),
    context: {
      paths: {
        installDir,
        resourcesAppDir: path.join(installDir, 'resources', 'app'),
        packageJsonPath: path.join(installDir, 'resources', 'app', 'package.json'),
      },
    },
  });

  assert.ok(
    result.deletePaths.includes(path.join(installDir, 'resources', 'app', 'out', 'cursorTranslatorMain.js'))
  );
  assert.ok(
    result.deletePaths.includes(
      path.join(workbenchDir, 'workbench.anysphere-ui-foo_translated.js')
    )
  );
  assert.ok(result.deletePaths.includes(orphanTranslatedPath));
  assert.ok(
    result.deletePaths.includes(
      path.join(
        installDir,
        'resources',
        'app',
        'out',
        'vs',
        'workbench',
        'workbench.anysphere-ui-baz_translated.js'
      )
    )
  );
  assert.equal(result.warnings.length, 1);
});

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
