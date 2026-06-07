const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  OFFICIAL_COMMANDS,
  EXPERIMENTAL_COMMANDS,
  EXPERIMENTAL_RUNTIME_TOGGLE_ENV,
  createContextModule,
} = require('../../tool/context.js');

const contextApi = createContextModule({
  detectCursorInstallDir: () => 'D:\\fake-cursor',
});

const {
  assertCommandAllowed,
  createContext,
  shouldIncludeExperimentalRuntimeToggle,
} = contextApi;

test('assertCommandAllowed accepts official commands without env flags', () => {
  for (const command of OFFICIAL_COMMANDS) {
    assert.doesNotThrow(() => assertCommandAllowed(command));
  }
});

test('assertCommandAllowed rejects experimental commands unless env flag is set', () => {
  assert.throws(
    () => assertCommandAllowed('toggle'),
    /experimental and not part of the supported install or uninstall workflow/
  );

  assert.doesNotThrow(() =>
    assertCommandAllowed('toggle', { [EXPERIMENTAL_RUNTIME_TOGGLE_ENV]: '1' })
  );
});

test('createContext defaults to verify and resolves install paths', () => {
  const context = createContext([]);

  assert.equal(context.command, 'verify');
  assert.equal(context.options.installDir, 'D:\\fake-cursor');
  assert.equal(
    context.paths.packageJsonPath,
    path.join('D:\\fake-cursor', 'resources', 'app', 'package.json')
  );
  assert.equal(context.options.runtimeMode, 'performance');
});

test('createContext parses install-dir and force flags', () => {
  const installDir = path.resolve('D:\\custom-cursor');
  const context = createContext(['apply', '--install-dir', installDir, '--force']);

  assert.equal(context.command, 'apply');
  assert.equal(context.options.installDir, installDir);
  assert.equal(context.options.force, true);
});

test('createContext only allows runtime-mode for apply', () => {
  assert.throws(
    () => createContext(['verify', '--runtime-mode', 'performance']),
    /--runtime-mode is only supported for the apply command/
  );

  const context = createContext(['apply', '--runtime-mode', 'compatibility']);
  assert.equal(context.options.runtimeMode, 'compatibility');
});

test('shouldIncludeExperimentalRuntimeToggle reads build env flag', () => {
  assert.equal(shouldIncludeExperimentalRuntimeToggle({}), false);
  assert.equal(
    shouldIncludeExperimentalRuntimeToggle({
      CURSOR_ZH_INCLUDE_EXPERIMENTAL_RUNTIME_TOGGLE: '1',
    }),
    true
  );
});

test('OFFICIAL and EXPERIMENTAL command sets do not overlap', () => {
  for (const command of OFFICIAL_COMMANDS) {
    assert.equal(EXPERIMENTAL_COMMANDS.has(command), false);
  }
});
