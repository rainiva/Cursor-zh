const test = require('node:test');
const assert = require('node:assert/strict');

const { mappingKey } = require('../../lib/mapping/merge.js');
const {
  harvestOccurrenceKey,
  buildRuleIndex,
  resolveStringCoverage,
  resolveAnchorCoverage,
  buildCoverageLedger,
} = require('../../lib/analyzer/coverage-ledger.js');
const { SURFACE_CONTRACTS } = require('../../lib/mapping/surface-contracts.js');

const COMMON_MAPPINGS = [
  {
    originalText: 'Copy as Markdown',
    changeText: '复制为 Markdown',
    searchType: 'exact',
  },
  {
    originalText: 'Never Harvested Label',
    changeText: '从未采集',
    searchType: 'exact',
  },
];

const MAPPINGS_BY_LAYER = {
  baseMappings: [],
  overlayMappings: [],
  cursorWinCommonMappings: COMMON_MAPPINGS,
  anchorMappings: [],
  dynamicMappings: [],
};

test('harvestOccurrenceKey includes context for strings and anchor prefix for anchors', () => {
  assert.equal(
    harvestOccurrenceKey({
      kind: 'string',
      path: 'workbench.glass.main.js',
      context: 'label:',
      text: 'Copy as Markdown',
    }),
    'workbench.glass.main.js\0label:\0Copy as Markdown'
  );
  assert.equal(
    harvestOccurrenceKey({
      kind: 'anchor',
      path: 'workbench.glass.main.js',
      anchorId: 'workbench.action.toggleExpandAgent',
      field: 'title',
    }),
    'anchor\0workbench.action.toggleExpandAgent\0title\0workbench.glass.main.js'
  );
});

test('buildRuleIndex tags cursor-win.common layer and ruleKey', () => {
  const index = buildRuleIndex(MAPPINGS_BY_LAYER);
  const rule = index.byKey.get(mappingKey(COMMON_MAPPINGS[0]));
  assert.ok(rule);
  assert.equal(rule.layer, 'cursor-win.common');
  assert.equal(rule.entry.changeText, '复制为 Markdown');
});

test('resolveStringCoverage records exact match with ruleKey and layer', () => {
  const index = buildRuleIndex(MAPPINGS_BY_LAYER);
  const result = resolveStringCoverage(
    {
      path: 'workbench.glass.main.js',
      context: 'label:',
      text: 'Copy as Markdown',
    },
    index,
    { contracts: SURFACE_CONTRACTS }
  );

  assert.equal(result.status, 'covered_static');
  assert.equal(result.matchedRules.length, 1);
  assert.equal(result.matchedRules[0].ruleKey, mappingKey(COMMON_MAPPINGS[0]));
  assert.equal(result.matchedRules[0].layer, 'cursor-win.common');
  assert.equal(result.matchedRules[0].contractId, 'copy_as_markdown');
  assert.equal(result.unmappedReason, null);
});

test('resolveStringCoverage marks missing rules with no_rule', () => {
  const index = buildRuleIndex(MAPPINGS_BY_LAYER);
  const result = resolveStringCoverage(
    {
      path: 'workbench.glass.main.js',
      context: 'title:',
      text: 'Register Close Tooltip',
    },
    index
  );

  assert.equal(result.status, 'unmapped');
  assert.equal(result.matchedRules.length, 0);
  assert.equal(result.unmappedReason, 'no_rule');
});

test('resolveStringCoverage classifies regex and runtime rules', () => {
  const index = buildRuleIndex({
    ...MAPPINGS_BY_LAYER,
    dynamicMappings: [
      {
        originalText: 'Ask mode uses read-only',
        changeText: '提问模式使用只读',
        searchType: 'regex',
      },
      {
        originalText: 'Balanced',
        changeText: '均衡',
        searchType: 'exact',
        forceRuntime: true,
      },
    ],
  });

  const regexResult = resolveStringCoverage(
    { path: 'workbench.glass.main.js', context: 'label:', text: 'Ask mode uses read-only tools' },
    index
  );
  assert.equal(regexResult.status, 'covered_dynamic');
  assert.equal(regexResult.matchedRules[0].matchMode, 'regex');

  const runtimeResult = resolveStringCoverage(
    { path: 'workbench.glass.main.js', context: 'label:', text: 'Balanced' },
    index
  );
  assert.equal(runtimeResult.status, 'covered_runtime');
  assert.equal(runtimeResult.matchedRules[0].matchMode, 'exact');
});

test('resolveAnchorCoverage matches searchType anchor rules', () => {
  const index = buildRuleIndex({
    ...MAPPINGS_BY_LAYER,
    anchorMappings: [
      {
        anchorType: 'glassCommand',
        anchorId: 'workbench.action.toggleExpandAgent',
        field: 'title',
        changeText: '切换展开智能体',
        searchType: 'anchor',
      },
    ],
  });

  const result = resolveAnchorCoverage(
    {
      type: 'glassCommand',
      id: 'workbench.action.toggleExpandAgent',
      field: 'title',
      text: 'Toggle Expand Agent',
      path: 'workbench.glass.main.js',
    },
    index
  );

  assert.equal(result.status, 'covered_anchor');
  assert.equal(result.matchedRules[0].matchMode, 'anchor');
  assert.equal(result.matchedRules[0].layer, 'cursor-win.anchors');
});

test('buildCoverageLedger produces records ruleUsage and contractStatus', () => {
  const harvest = {
    files: [
      {
        path: 'workbench.glass.main.js',
        strings: [
          { text: 'Copy as Markdown', context: 'label:' },
          { text: 'Register Close Tooltip', context: 'title:' },
        ],
      },
    ],
    anchors: [
      {
        type: 'glassCommand',
        id: 'workbench.action.toggleExpandAgent',
        field: 'title',
        text: 'Toggle Expand Agent',
        path: 'workbench.glass.main.js',
      },
    ],
  };

  const ledger = buildCoverageLedger({
    harvest,
    mappingsByLayer: {
      ...MAPPINGS_BY_LAYER,
      anchorMappings: [
        {
          anchorType: 'glassCommand',
          anchorId: 'workbench.action.toggleExpandAgent',
          field: 'title',
          changeText: '切换展开智能体',
          searchType: 'anchor',
        },
      ],
    },
    contracts: SURFACE_CONTRACTS,
  });

  assert.equal(ledger.records.length, 3);
  assert.ok(ledger.summary.mappedByLayer['cursor-win.common'] >= 1);
  assert.ok(ledger.ruleUsage.some((entry) => entry.status === 'active'));
  assert.ok(ledger.ruleUsage.some((entry) => entry.status === 'orphan'));
  const searchSettings = ledger.contractStatus.find((entry) => entry.id === 'search_settings');
  assert.ok(searchSettings);
  assert.equal(searchSettings.status, 'missing');
  const copyContract = ledger.contractStatus.find((entry) => entry.id === 'copy_as_markdown');
  assert.ok(copyContract);
  assert.equal(copyContract.status, 'satisfied');
});

test('resolveStringCoverage flags scope_mismatch when scope hints do not match', () => {
  const index = buildRuleIndex({
    ...MAPPINGS_BY_LAYER,
    dynamicMappings: [
      {
        originalText: 'Scoped Label',
        changeText: '作用域标签',
        searchType: 'exact',
        scopeContainsText: ['sidebar-panel'],
      },
    ],
  });

  const result = resolveStringCoverage(
    {
      path: 'workbench.glass.main.js',
      context: 'label:',
      text: 'Scoped Label',
      lineHint: 'toolbar',
    },
    index
  );

  assert.equal(result.status, 'unmapped');
  assert.equal(result.unmappedReason, 'scope_mismatch');
});

test('resolveStringCoverage flags ambiguous when same-layer exact rules conflict', () => {
  const index = buildRuleIndex({
    ...MAPPINGS_BY_LAYER,
    overlayMappings: [
      { originalText: 'Compare', changeText: '比较 A', searchType: 'exact' },
      { originalText: 'Compare', changeText: '比较 B', searchType: 'exact' },
    ],
  });

  const result = resolveStringCoverage(
    { path: 'workbench.glass.main.js', context: 'label:', text: 'Compare' },
    index
  );

  assert.equal(result.status, 'ambiguous');
  assert.equal(result.unmappedReason, 'ambiguous');
  assert.equal(result.matchedRules.length, 2);
});

test('buildCoverageLedger normalizes unmappedReason for every unmapped record', () => {
  const ledger = buildCoverageLedger({
    harvest: {
      files: [
        {
          path: 'workbench.glass.main.js',
          strings: [{ text: 'Register Close Tooltip', context: 'title:' }],
        },
      ],
      anchors: [],
    },
    mappingsByLayer: MAPPINGS_BY_LAYER,
  });

  for (const record of ledger.records) {
    if (record.status === 'unmapped') {
      assert.equal(typeof record.unmappedReason, 'string');
      assert.ok(record.unmappedReason.length > 0);
    } else {
      assert.equal(record.unmappedReason, null);
    }
  }
});

test('buildCoverageLedger dedupes title strings superseded by anchor occurrences', () => {
  const harvest = {
    files: [
      {
        path: 'workbench.glass.main.js',
        strings: [
          { text: 'Toggle Expand Agent', context: 'title:' },
          { text: 'Copy as Markdown', context: 'label:' },
        ],
      },
    ],
    anchors: [
      {
        type: 'glassCommand',
        id: 'workbench.action.toggleExpandAgent',
        field: 'title',
        text: 'Toggle Expand Agent',
        path: 'workbench.glass.main.js',
      },
    ],
  };

  const ledger = buildCoverageLedger({
    harvest,
    mappingsByLayer: MAPPINGS_BY_LAYER,
  });

  const toggleRecords = ledger.records.filter((record) => record.text === 'Toggle Expand Agent');
  assert.equal(toggleRecords.length, 1);
  assert.equal(toggleRecords[0].kind, 'anchor');
});

test('resolveStringCoverage classifies L3 surface exact rules as covered_runtime', () => {
  const index = buildRuleIndex({
    ...MAPPINGS_BY_LAYER,
    dynamicMappings: [
      {
        originalText: 'Toggle Expand Agent',
        changeText: '切换展开智能体',
        searchType: 'exact',
        surface: 'command_palette',
      },
    ],
  });

  const result = resolveStringCoverage(
    {
      path: 'workbench.glass.main.js',
      context: 'title:',
      text: 'Toggle Expand Agent',
    },
    index
  );

  assert.equal(result.status, 'covered_runtime');
});

test('resolveStringCoverage keeps L2 contract exact rules as covered_static', () => {
  const index = buildRuleIndex({
    ...MAPPINGS_BY_LAYER,
    cursorWinCommonMappings: [
      {
        originalText: 'Search models',
        changeText: '搜索模型',
        searchType: 'exact',
        surface: 'model_picker',
      },
    ],
  });

  const result = resolveStringCoverage(
    {
      path: 'workbench.glass.main.js',
      context: 'label:',
      text: 'Search models',
    },
    index
  );

  assert.equal(result.status, 'covered_static');
});
