const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');
const { selectRuntimeMappings } = require('../../lib/patcher/runtime-selector.js');
const { mergeMappings, translateTextWithMappings, defaultCursorWinCommonMappings, defaultCursorWinDynamicMappings } = require('../../cursor-zh-lib.js');
const { readJsonIfExists } = require('../../tool/io.js');
const { createToolPaths } = require('../../tool/paths.js');
const { createRuntimeDomHarness } = require('./helpers/runtime-dom-harness.js');
const { createRuntimeConfigModule } = require('../../tool/runtime-config.js');
const { normalizeRuntimeMode } = require('../../tool/context.js');

const { buildRuntimeConfig } = createRuntimeConfigModule({ normalizeRuntimeMode });
const toolPaths = createToolPaths(path.join(__dirname, '../../..'));

const { CRITICAL_GLASS_ROUND42_UI_TARGETS } = require('../../lib/mapping/critical-ui-targets.js');

const ROUND42_WORKING_COUNT_REGEX = {
  originalText: '^(\\d+) Working$',
  changeText: '$1 个进行中',
  searchType: 'regex',
  scopeContainsText: ['Stop All', '全部停止'],
};

function loadMergedMappings() {
  return mergeMappings(
    mergeMappings(
      mergeMappings(
        readJsonIfExists(toolPaths.baseMappingPath, []),
        readJsonIfExists(toolPaths.overlayMappingPath, [])
      ),
      readJsonIfExists(toolPaths.cursorWinCommonPath, [])
    ),
    readJsonIfExists(toolPaths.dynamicMappingPath, [])
  );
}

test('cursor-win.common.json defines multitask queue Stop All mapping', () => {
  const mappings = readJsonIfExists(toolPaths.cursorWinCommonPath, []);
  const byOriginal = new Map(mappings.map((entry) => [entry.originalText, entry]));

  for (const critical of CRITICAL_GLASS_ROUND42_UI_TARGETS) {
    const entry = byOriginal.get(critical.originalText);
    assert.ok(entry, `missing mapping: ${critical.originalText}`);
    assert.equal(entry.changeText, critical.changeText, critical.originalText);
    assert.equal(entry.surface, critical.surface, critical.originalText);
    assert.equal(entry.forceRuntime, critical.forceRuntime, critical.originalText);
    if (Array.isArray(critical.scopeSelectors)) {
      assert.deepEqual(entry.scopeSelectors, critical.scopeSelectors, critical.originalText);
    }
  }
});

test('selectRuntimeMappings excludes embedded Stop All when static literal exists', () => {
  const mappings = loadMergedMappings();
  const source = 'children:"Stop All",onClick:stopAll';
  const runtime = selectRuntimeMappings(source, mappings);
  assert.equal(
    runtime.some((entry) => entry.originalText === 'Stop All'),
    false
  );
});

test('cursor-win.dynamic.json scopes Working count regex to multitask queue panel', () => {
  const mappings = readJsonIfExists(toolPaths.dynamicMappingPath, []);
  const entry = mappings.find((item) => item.originalText === ROUND42_WORKING_COUNT_REGEX.originalText);
  assert.ok(entry, 'missing dynamic regex for Working count header');
  assert.equal(entry.changeText, ROUND42_WORKING_COUNT_REGEX.changeText);
  assert.equal(entry.searchType, 'regex');
  assert.ok(
    Array.isArray(entry.scopeContainsText) && entry.scopeContainsText.length > 0,
    'Working count regex must have scopeContainsText'
  );
  for (const hint of ROUND42_WORKING_COUNT_REGEX.scopeContainsText) {
    assert.ok(entry.scopeContainsText.includes(hint), `scope missing ${hint}`);
  }
});

test('merged mappings do not translate user task titles as fixed UI strings', () => {
  const mappings = loadMergedMappings();
  const byOriginal = new Map(mappings.map((entry) => [entry.originalText, entry]));
  assert.equal(byOriginal.has('Performance & architecture audit'), false);
});

test('merged mappings translate Working count header via scoped regex', () => {
  const mappings = loadMergedMappings();
  const parent = { textContent: 'Stop All' };
  const element = {
    nodeType: 1,
    tagName: 'DIV',
    parentElement: parent,
    getAttribute: () => null,
    matches: () => false,
    closest: () => null,
  };
  parent.closest = () => parent;

  assert.equal(
    translateTextWithMappings('1 Working', mappings, { element, scopeMatched: true }),
    '1 个进行中'
  );
});

test('embedded patch removes Stop All quoted literal from fixture snippet', () => {
  const mappings = loadMergedMappings();
  const source = 'children:"Stop All",onClick:stopAll';
  const translated = applyStaticSourceTranslations(source, mappings);
  assert.doesNotMatch(translated, /"Stop All"/);
  assert.match(translated, /全部停止/);
});

test('embedded patch removes multitask Working count template literal', () => {
  const mappings = loadMergedMappings();
  const source = 'r>0?`${r} Working`:i.length>0?`${i.length} Done`:null';
  const translated = applyStaticSourceTranslations(source, mappings);
  assert.match(translated, /个进行中/);
  assert.match(translated, /已完成/);
  assert.doesNotMatch(translated, /\$\{r\} Working/);
});

test('runtime DOM translates multitask queue Stop All control', () => {
  const mappings = loadMergedMappings();
  const harness = createRuntimeDomHarness({
    workbenchSource: 'Stop All',
    runtimeMappings: selectRuntimeMappings('Stop All', mappings),
    runtimeConfig: {
      ...buildRuntimeConfig('performance'),
      marketplaceLazyTranslationEnabled: false,
    },
  });
  harness.runDueTimers(Infinity);

  const panel = harness.document.createElement('div');
  panel.setAttribute('class', 'ui-agent-tray');
  const stopAll = harness.document.createElement('button');
  stopAll.setAttribute('class', 'ui-agent-tray__stop-all-button');
  stopAll.appendChild(harness.document.createTextNode('Stop All'));
  panel.appendChild(stopAll);
  harness.document.body.appendChild(panel);
  harness.runtime.translateTree(panel);
  harness.runDueTimers(Infinity);

  assert.equal(stopAll.textContent, '全部停止');
});
