const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { createToolPaths, resolveToolPaths } = require('../../tool/paths.js');

test('resolveToolPaths uses workspace root from config', () => {
  const paths = resolveToolPaths({
    scriptDir: 'D:\\proj\\scripts',
    env: { CURSOR_ZH_WORKSPACE_ROOT: 'D:\\workspace' },
  });

  assert.equal(paths.workspaceRoot, 'D:\\workspace');
  assert.equal(paths.stateDir, path.join('D:\\workspace', 'state'));
  assert.equal(
    paths.translationOverlayDir,
    path.join('D:\\workspace', 'translations', 'overlay')
  );
});

test('createToolPaths exposes overlay mapping paths', () => {
  const paths = createToolPaths('C:\\root');

  assert.equal(
    paths.overlayMappingPath,
    path.join('C:\\root', 'translations', 'overlay', 'workbench.overlay.json')
  );
  assert.equal(paths.dynamicMappingPath, path.join('C:\\root', 'translations', 'overlay', 'cursor-win.dynamic.json'));
});

test('createToolPaths exposes runtimeConfigPath', () => {
  const paths = createToolPaths('C:\\root');
  assert.equal(
    paths.runtimeConfigPath,
    path.join('C:\\root', 'scripts', 'tool', 'runtime-config.js')
  );
});

test('createToolPaths exposes embedded patch source paths', () => {
  const paths = createToolPaths('C:\\root');
  assert.equal(
    paths.criticalUiTargetsPath,
    path.join('C:\\root', 'scripts', 'lib', 'mapping', 'critical-ui-targets.js')
  );
  assert.equal(
    paths.productTipsHookPath,
    path.join('C:\\root', 'scripts', 'lib', 'patcher', 'product-tips-hook.js')
  );
});
