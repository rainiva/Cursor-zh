const test = require('node:test');
const assert = require('node:assert/strict');

const { createWorkbenchBuilderModule } = require('../../tool/builder/workbench.js');

test('generateTranslatedWorkbench reconciles static-failed pruned mappings into runtime set', () => {
  let capturedBundleRuntimeMappings = null;
  let capturedFootprintRuntimeMappings = null;
  let capturedMetadata = null;

  const failedEntry = {
    originalText: 'Open Agents On Startup',
    changeText: '启动时打开智能体',
    searchType: 'exact',
    surface: 'mode_menu',
  };
  const succeededEntry = { originalText: 'General', changeText: '常规', searchType: 'exact' };
  // 静态替换后 failedEntry 原文仍以引号字面量在场（静态未落地），succeededEntry 已替换。
  const staticResult = {
    translatedSource: 'label:"Open Agents On Startup",title:"常规"',
    contracts: {},
  };

  const { generateTranslatedWorkbench } = createWorkbenchBuilderModule({
    toolPaths: { generatedWorkbenchPath: '/generated.js' },
    readText: () => 'fallback',
    writeText: () => {},
    writeTextParts: () => {},
    applyStaticSourceTranslationsDetailed: () => staticResult,
    evaluatePatchContracts: () => ({ issues: [], warnings: [] }),
    buildTranslatedWorkbenchBundleParts: (options) => {
      capturedBundleRuntimeMappings = options.runtimeMappings;
      capturedMetadata = options.metadata;
      return {
        runtimeHeader: '/* header */',
        translatedSource: options.translatedSource,
      };
    },
    summarizeRuntimeFootprintFromParts: (_header, _source, runtimeMappings) => {
      capturedFootprintRuntimeMappings = runtimeMappings;
      return { runtimeMappingCount: runtimeMappings.length, runtimeHeaderChars: 10, runtimeHeaderKB: 0 };
    },
  });

  const result = generateTranslatedWorkbench(
    { paths: { workbenchOriginalPath: '/wb.js', workbenchTranslatedPath: '/wb-t.js' } },
    { runtimeConfig: { mode: 'performance' }, runtimeMappingCount: 0 },
    [failedEntry, succeededEntry],
    [],
    'label:"Open Agents On Startup",title:"General"',
    staticResult,
    { issues: [], warnings: [] }
  );

  assert.ok(
    capturedBundleRuntimeMappings.some((entry) => entry.originalText === 'Open Agents On Startup'),
    '回补词条必须进入运行时注入集合'
  );
  assert.equal(
    capturedBundleRuntimeMappings.some((entry) => entry.originalText === 'General'),
    false,
    '静态成功词条不得回补'
  );
  assert.deepEqual(result.staticReconcile, {
    count: 1,
    entries: [
      {
        originalText: 'Open Agents On Startup',
        changeText: '启动时打开智能体',
        surface: 'mode_menu',
      },
    ],
  });
  assert.equal(result.runtimeMappings.length, 1, '返回值必须携带回补后的实际注入集合（审查记录 B4）');
  assert.equal(capturedFootprintRuntimeMappings.length, 1, 'runtimeFootprint 必须基于回补后集合');
  assert.equal(capturedMetadata.runtimeMappingCount, 1, '头部 metadata 计数必须与实际注入一致');
});

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

test('generateTranslatedWorkbench passes units/surfaces and returns runtimeShards', () => {
  let captured = null;
  const expectedShards = {
    core: [{ translationId: 'core.one', aliases: ['A'], changeText: '甲' }],
    surfaces: {
      settings_search: {
        selectors: ['.settings'],
        quarantineSelectors: [],
        entries: [{ translationId: 'settings_search.search_settings', aliases: ['Search Settings'], changeText: '搜索设置' }],
      },
    },
  };

  const { generateTranslatedWorkbench } = createWorkbenchBuilderModule({
    toolPaths: {
      generatedWorkbenchPath: '/generated.js',
      workspaceRoot: process.cwd(),
    },
    readText: () => 'wb',
    writeText: () => {},
    writeTextParts: () => {},
    applyStaticSourceTranslationsDetailed: () => ({
      translatedSource: 'body',
      contracts: {},
    }),
    evaluatePatchContracts: () => ({ issues: [], warnings: [] }),
    buildTranslatedWorkbenchBundleParts: (options) => {
      captured = options;
      return {
        runtimeHeader: '/* header */',
        translatedSource: 'body',
        runtimeShards: expectedShards,
      };
    },
    summarizeRuntimeFootprintFromParts: () => ({
      runtimeMappingCount: 0,
      runtimeHeaderChars: 10,
      runtimeHeaderKB: 0,
    }),
  });

  const units = [
    {
      translationId: 'settings_search.search_settings',
      aliases: ['Search Settings'],
      changeText: '搜索设置',
      fallback: { kind: 'runtime-surface', surface: 'settings_search' },
    },
  ];
  const surfaces = {
    settings_search: { runtimeScopes: ['.settings'], quarantineSelectors: [] },
  };

  const result = generateTranslatedWorkbench(
    { paths: { workbenchOriginalPath: '/wb.js', workbenchTranslatedPath: '/wb-t.js' } },
    {
      runtimeConfig: { mode: 'performance' },
      units,
      surfaces,
    },
    [],
    [],
    'original',
    { translatedSource: 'body', contracts: {} },
    { issues: [], warnings: [] }
  );

  assert.ok(captured, 'bundle parts must be invoked');
  assert.deepEqual(captured.units, units);
  assert.deepEqual(captured.surfaces, surfaces);
  assert.deepEqual(result.runtimeShards, expectedShards);
});
