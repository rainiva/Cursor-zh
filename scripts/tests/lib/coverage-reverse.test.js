const test = require('node:test');
const assert = require('node:assert/strict');

const { analyzeReverseCoverage } = require('../../lib/analyzer/coverage-reverse.js');

test('analyzeReverseCoverage marks mapped literals as covered_static', () => {
  const harvest = {
    files: [
      {
        path: 'workbench.glass.main.js',
        strings: [
          { text: 'Copy as Markdown', context: 'label:' },
          { text: 'Toggle Expand Agent', context: 'title:' },
        ],
      },
    ],
    anchors: [],
  };
  const mappings = [
    { originalText: 'Copy as Markdown', changeText: '复制为 Markdown', searchType: 'exact' },
  ];

  const result = analyzeReverseCoverage({ harvest, mappings });

  const byText = Object.fromEntries(result.entries.map((entry) => [entry.text, entry.status]));
  assert.equal(byText['Copy as Markdown'], 'covered_static');
  assert.equal(byText['Toggle Expand Agent'], 'unmapped');
  assert.equal(result.summary.unmapped, 1);
});

test('analyzeReverseCoverage marks scoped runtime rules as covered_runtime', () => {
  const harvest = {
    files: [
      {
        path: 'workbench.glass.main.js',
        strings: [{ text: 'Balanced', context: 'label:' }],
      },
    ],
    anchors: [],
  };
  const mappings = [
    {
      originalText: 'Balanced',
      changeText: '均衡',
      searchType: 'exact',
      forceRuntime: true,
    },
  ];

  const result = analyzeReverseCoverage({ harvest, mappings });
  assert.equal(result.entries[0].status, 'covered_runtime');
});

test('analyzeReverseCoverage marks regex dynamic rules as covered_dynamic', () => {
  const harvest = {
    files: [
      {
        path: 'workbench.glass.main.js',
        strings: [{ text: 'Ask mode uses read-only tools', context: 'literal' }],
      },
    ],
    anchors: [],
  };
  const mappings = [
    {
      originalText: 'Ask mode uses read-only',
      changeText: '提问模式使用只读',
      searchType: 'regex',
    },
  ];

  const result = analyzeReverseCoverage({ harvest, mappings });
  assert.equal(result.entries[0].status, 'covered_dynamic');
});

test('analyzeReverseCoverage groups unmapped harvest strings by surface', () => {
  const harvest = {
    files: [
      {
        path: 'workbench.glass.main.js',
        strings: [
          { text: 'Unknown Palette Item', context: 'title:' },
          { text: 'Unknown Sidebar Label', context: 'label:', lineHint: 'sidebar' },
        ],
      },
    ],
    anchors: [],
  };

  const result = analyzeReverseCoverage({ harvest, mappings: [] });

  assert.ok(result.unmappedBySurface);
  assert.ok(Array.isArray(result.unmappedBySurface.command_palette));
  assert.ok(result.unmappedBySurface.command_palette.some((e) => e.text === 'Unknown Palette Item'));
  assert.ok(result.summary.unmapped >= 2);
});

test('analyzeReverseCoverage classifies large harvest batches within performance budget', () => {
  const strings = Array.from({ length: 20000 }, (_, index) => ({
    text: `Harvest perf string ${index}`,
    context: 'literal',
  }));
  const harvest = {
    files: [{ path: 'workbench.glass.main.js', strings }],
    anchors: [],
  };
  const mappings = [
    { originalText: 'Harvest perf string 0', changeText: '性能串 0', searchType: 'exact' },
    {
      originalText: 'Ask mode uses read-only',
      changeText: '提问模式使用只读',
      searchType: 'regex',
    },
  ];

  const start = performance.now();
  const result = analyzeReverseCoverage({ harvest, mappings });
  const elapsedMs = performance.now() - start;

  assert.equal(result.entries.length, 20000);
  assert.ok(elapsedMs < 2000, `expected <2000ms, got ${elapsedMs.toFixed(1)}ms`);
});

test('analyzeReverseCoverage reports reverse-coverage progress for large batches', () => {
  const strings = Array.from({ length: 2500 }, (_, index) => ({
    text: `Progress string ${index}`,
    context: 'literal',
  }));
  const harvest = {
    files: [{ path: 'workbench.glass.main.js', strings }],
    anchors: [],
  };
  const progressEvents = [];

  analyzeReverseCoverage({
    harvest,
    mappings: [],
    onProgress: (event) => progressEvents.push(event),
  });

  assert.ok(progressEvents.length >= 3);
  assert.ok(progressEvents.some((event) => event.stage === 'reverse-coverage'));
  assert.ok(progressEvents.some((event) => event.current === 2500));
});
