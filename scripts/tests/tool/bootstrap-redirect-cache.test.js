const test = require('node:test');
const assert = require('node:assert/strict');

const { createBootstrapBuilderModule } = require('../../tool/builder/bootstrap.js');

test('shouldRedirect checks translated file existence relative to filePath directory', () => {
  const { createBootstrapSource } = createBootstrapBuilderModule({ writeText: () => {} });
  const source = createBootstrapSource();

  // Extract the shouldRedirect function body
  const fnMatch = source.match(/function shouldRedirect\(filePath\) \{[\s\S]*?\n\}/);
  assert.ok(fnMatch, 'shouldRedirect function must exist in generated source');

  const fnBody = fnMatch[0];
  // Must call existsSync with join(dirname(filePath), redirect.translated)
  assert.match(fnBody, /existsSync/, 'shouldRedirect must call existsSync');
  assert.match(fnBody, /dirname\(filePath\)/, 'shouldRedirect must use dirname(filePath)');
  assert.match(fnBody, /redirect\.translated/, 'shouldRedirect must reference redirect.translated');
});

test('shouldRedirect uses findRedirect internally', () => {
  const { createBootstrapSource } = createBootstrapBuilderModule({ writeText: () => {} });
  const source = createBootstrapSource();

  const fnMatch = source.match(/function shouldRedirect\(filePath\) \{[\s\S]*?\n\}/);
  assert.ok(fnMatch, 'shouldRedirect function must exist in generated source');

  const fnBody = fnMatch[0];
  assert.match(fnBody, /findRedirect\(filePath\)/, 'shouldRedirect must call findRedirect(filePath)');
});

test('shouldRedirect function appears before installRedirect function', () => {
  const { createBootstrapSource } = createBootstrapBuilderModule({ writeText: () => {} });
  const source = createBootstrapSource();

  const shouldRedirectPos = source.indexOf('function shouldRedirect(');
  const installRedirectPos = source.indexOf('function installRedirect()');

  assert.ok(shouldRedirectPos !== -1, 'shouldRedirect must be present');
  assert.ok(installRedirectPos !== -1, 'installRedirect must be present');
  assert.ok(
    shouldRedirectPos < installRedirectPos,
    'shouldRedirect must appear before installRedirect()'
  );
});

test('generated source does not contain REDIRECT_EXISTS precomputed Set', () => {
  const { createBootstrapSource } = createBootstrapBuilderModule({ writeText: () => {} });
  const source = createBootstrapSource();

  // The buggy precomputed Set pattern must NOT be present
  assert.doesNotMatch(source, /REDIRECT_EXISTS/, 'source must not use REDIRECT_EXISTS precomputed Set');
});
