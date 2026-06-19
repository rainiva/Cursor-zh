const test = require('node:test');
const assert = require('node:assert/strict');

const { createWorkbenchBuilderModule } = require('../../tool/builder/workbench.js');

test('generateTranslatedGlassWorkbench writes glass bundle when glass source exists', () => {
  const writes = [];

  const { generateTranslatedGlassWorkbench } = createWorkbenchBuilderModule({
    toolPaths: {
      generatedWorkbenchPath: '/generated-desktop.js',
      generatedGlassWorkbenchPath: '/generated-glass.js',
    },
    readText: () => 'glass-original',
    writeText: () => {
      throw new Error('writeText should not be used for workbench bundle output');
    },
    writeTextParts: (filePath, parts) => {
      writes.push({ filePath, parts: [...parts] });
    },
    applyStaticSourceTranslationsDetailed: () => ({
      translatedSource: 'glass-translated-body',
      contracts: { send_follow_up: { matchCount: 1 } },
    }),
    evaluatePatchContracts: () => ({ issues: [], warnings: [] }),
    buildTranslatedWorkbenchBundleParts: (options) => {
      assert.equal(options.workbenchSource, 'glass-original');
      assert.equal(options.translatedSource, 'glass-translated-body');
      return {
        runtimeHeader: '/* glass header */',
        translatedSource: 'glass-translated-body',
      };
    },
    summarizeRuntimeFootprintFromParts: () => ({
      runtimeMappingCount: 2,
      runtimeHeaderChars: 16,
      runtimeHeaderKB: 0,
    }),
  });

  const result = generateTranslatedGlassWorkbench(
    {
      paths: {
        workbenchGlassOriginalPath: '/glass.js',
        workbenchGlassTranslatedPath: '/glass-t.js',
      },
    },
    { runtimeConfig: { mode: 'performance' } },
    [],
    [],
    'glass-original',
    { translatedSource: 'glass-translated-body', contracts: {} },
    { issues: [], warnings: [] }
  );

  assert.equal(result.translatedSource, 'glass-translated-body');
  assert.deepEqual(writes, [
    {
      filePath: '/generated-glass.js',
      parts: ['/* glass header */', 'glass-translated-body'],
    },
    {
      filePath: '/glass-t.js',
      parts: ['/* glass header */', 'glass-translated-body'],
    },
  ]);
});
