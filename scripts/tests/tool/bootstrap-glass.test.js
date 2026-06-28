const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');

const { createBootstrapBuilderModule } = require('../../tool/builder/bootstrap.js');

test('bootstrap source redirects glass workbench bundle to translated file', () => {
  const { createBootstrapSource } = createBootstrapBuilderModule({ writeText: () => {} });
  const source = createBootstrapSource();

  assert.match(source, /workbench\.desktop\.main\.js/);
  assert.match(source, /workbench\.desktop\.main_translated\.js/);
  assert.match(source, /workbench\.glass\.main\.js/);
  assert.match(source, /workbench\.glass\.main_translated\.js/);
  assert.match(source, /workbench\.anysphere-ui-automations\.js/);
  assert.match(source, /workbench\.anysphere-ui-automations_translated\.js/);
});

test('bootstrap shouldRedirect resolves glass bundle by basename', () => {
  const { createBootstrapSource } = createBootstrapBuilderModule({ writeText: () => {} });
  const source = createBootstrapSource();

  assert.match(source, /function shouldRedirect\(filePath\)/);
  assert.doesNotMatch(source, /basename\(filePath\) !== TARGET_FILENAME/);
});

test('bootstrap source parses as a CommonJS main-process entry', () => {
  const { createBootstrapSource } = createBootstrapBuilderModule({ writeText: () => {} });
  const source = createBootstrapSource();

  assert.doesNotThrow(() => {
    new vm.Script(source, { filename: 'cursorTranslatorMain.js' });
  });
});

test('bootstrap source uses ESM entry semantics when package type is module', () => {
  const { createBootstrapSource } = createBootstrapBuilderModule({ writeText: () => {} });
  const source = createBootstrapSource({ packageType: 'module' });

  assert.match(source, /import \{ app, session \} from 'electron';/);
  assert.match(source, /fileURLToPath\(import\.meta\.url\)/);
  assert.match(source, /await import\(MAIN_ENTRY\);/);
  assert.doesNotMatch(source, /require\(MAIN_ENTRY\);/);
});

test('bootstrap source auto-detects ESM package type from resources app package.json', () => {
  const { createBootstrapSource } = createBootstrapBuilderModule({ writeText: () => {} });
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-bootstrap-'));
  const resourcesAppDir = path.join(tempRoot, 'resources', 'app');
  fs.mkdirSync(resourcesAppDir, { recursive: true });
  fs.writeFileSync(path.join(resourcesAppDir, 'package.json'), '{"type":"module"}', 'utf8');

  const source = createBootstrapSource({ resourcesAppDir });

  assert.match(source, /import \{ app, session \} from 'electron';/);
  assert.match(source, /await import\(MAIN_ENTRY\);/);
});
