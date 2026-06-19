const test = require('node:test');
const assert = require('node:assert/strict');

const { createPackageBuilderModule } = require('../../tool/builder/package.js');

test('patchPackageJsonMain preserves original main when reapplying over existing bootstrap', () => {
  const written = [];
  const { patchPackageJsonMain } = createPackageBuilderModule({
    writeJson: (_filePath, value) => {
      written.push(value);
    },
  });

  const context = {
    paths: {
      packageJsonPath: '/fake/package.json',
    },
  };

  const first = patchPackageJsonMain(context, {
    name: 'cursor',
    main: './out/main.js',
  });
  assert.equal(first.main, './out/cursorTranslatorMain.js');
  assert.equal(first.main_original, './out/main.js');

  const second = patchPackageJsonMain(context, first);
  assert.equal(second.main, './out/cursorTranslatorMain.js');
  assert.equal(
    second.main_original,
    './out/main.js',
    'reapplying should not overwrite main_original with the bootstrap path'
  );
});

test('patchPackageJsonMain keeps existing main_original even when package main is already bootstrap', () => {
  const written = [];
  const { patchPackageJsonMain } = createPackageBuilderModule({
    writeJson: (_filePath, value) => {
      written.push(value);
    },
  });

  const context = {
    paths: {
      packageJsonPath: '/fake/package.json',
    },
  };

  const pkg = {
    name: 'cursor',
    main: './out/cursorTranslatorMain.js',
    main_original: './out/legacy-main.js',
  };

  const result = patchPackageJsonMain(context, pkg);
  assert.equal(result.main, './out/cursorTranslatorMain.js');
  assert.equal(result.main_original, './out/legacy-main.js');
});
