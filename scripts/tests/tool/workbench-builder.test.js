const test = require('node:test');
const assert = require('node:assert/strict');

const { createWorkbenchBuilderModule } = require('../../tool/builder/workbench.js');

test('generateTranslatedWorkbench reuses pre-translated source when building bundle', () => {
  let staticTranslationCalls = 0;
  let bundleWorkbenchSource = null;
  let bundlePreTranslated = null;

  const { generateTranslatedWorkbench } = createWorkbenchBuilderModule({
    toolPaths: {
      generatedWorkbenchPath: '/generated.js',
    },
    readText: () => 'should-not-read',
    writeText: () => {},
    writeTextParts: () => {},
    applyStaticSourceTranslationsDetailed: () => {
      staticTranslationCalls += 1;
      return { translatedSource: 'unused', contracts: {} };
    },
    evaluatePatchContracts: () => ({ issues: [], warnings: [] }),
    buildTranslatedWorkbenchBundleParts: (options) => {
      bundleWorkbenchSource = options.workbenchSource;
      bundlePreTranslated = options.translatedSource;
      return {
        runtimeHeader: '/* header */',
        translatedSource: options.translatedSource,
      };
    },
    summarizeRuntimeFootprintFromParts: () => ({
      runtimeMappingCount: 1,
      runtimeHeaderChars: 10,
      runtimeHeaderKB: 0,
    }),
  });

  generateTranslatedWorkbench(
    { paths: { workbenchOriginalPath: '/wb.js', workbenchTranslatedPath: '/wb-t.js' } },
    { runtimeConfig: { mode: 'performance' } },
    [],
    [],
    'original-workbench',
    { translatedSource: 'already-translated', contracts: { ok: { matchCount: 1 } } },
    { issues: [], warnings: [] }
  );

  assert.equal(staticTranslationCalls, 0);
  assert.equal(bundleWorkbenchSource, 'original-workbench');
  assert.equal(bundlePreTranslated, 'already-translated');
});

test('generateTranslatedWorkbench writes header and body via writeTextParts', () => {
  const writes = [];

  const { generateTranslatedWorkbench } = createWorkbenchBuilderModule({
    toolPaths: {
      generatedWorkbenchPath: '/generated.js',
    },
    readText: () => 'fallback',
    writeText: () => {
      throw new Error('writeText should not be used for workbench bundle output');
    },
    writeTextParts: (filePath, parts) => {
      writes.push({ filePath, parts: [...parts] });
    },
    applyStaticSourceTranslationsDetailed: () => ({
      translatedSource: 'translated-body',
      contracts: { ok: { matchCount: 1 } },
    }),
    evaluatePatchContracts: () => ({ issues: [], warnings: [] }),
    buildTranslatedWorkbenchBundleParts: () => ({
      runtimeHeader: '/* header */',
      translatedSource: 'translated-body',
    }),
    summarizeRuntimeFootprintFromParts: () => ({
      runtimeMappingCount: 1,
      runtimeHeaderChars: 10,
      runtimeHeaderKB: 0,
    }),
  });

  generateTranslatedWorkbench(
    { paths: { workbenchOriginalPath: '/wb.js', workbenchTranslatedPath: '/wb-t.js' } },
    { runtimeConfig: { mode: 'performance' } },
    [],
    [],
    'original-workbench',
    { translatedSource: 'translated-body', contracts: { ok: { matchCount: 1 } } },
    { issues: [], warnings: [] }
  );

  assert.equal(writes.length, 2);
  assert.deepEqual(writes[0], {
    filePath: '/generated.js',
    parts: ['/* header */', 'translated-body'],
  });
  assert.deepEqual(writes[1], {
    filePath: '/wb-t.js',
    parts: ['/* header */', 'translated-body'],
  });
});
