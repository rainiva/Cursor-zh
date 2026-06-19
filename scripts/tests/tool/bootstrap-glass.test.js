const test = require('node:test');
const assert = require('node:assert/strict');

const { createBootstrapBuilderModule } = require('../../tool/builder/bootstrap.js');

test('bootstrap source redirects glass workbench bundle to translated file', () => {
  const { createBootstrapSource } = createBootstrapBuilderModule({ writeText: () => {} });
  const source = createBootstrapSource();

  assert.match(source, /workbench\.desktop\.main\.js/);
  assert.match(source, /workbench\.desktop\.main_translated\.js/);
  assert.match(source, /workbench\.glass\.main\.js/);
  assert.match(source, /workbench\.glass\.main_translated\.js/);
});

test('bootstrap shouldRedirect resolves glass bundle by basename', () => {
  const { createBootstrapSource } = createBootstrapBuilderModule({ writeText: () => {} });
  const source = createBootstrapSource();

  assert.match(source, /function shouldRedirect\(filePath\)/);
  assert.doesNotMatch(source, /basename\(filePath\) !== TARGET_FILENAME/);
});
