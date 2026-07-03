const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const {
  CRITICAL_GLASS_ROUND45_UI_TARGETS,
  CRITICAL_EMBEDDED_UI_PATCHES,
} = require('../../lib/mapping/critical-ui-targets.js');
const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');
const { mergeMappings, translateTextWithMappings } = require('../../cursor-zh-lib');
const { readJsonIfExists } = require('../../tool/io');
const { createToolPaths } = require('../../tool/paths');
const { createRuntimeDomHarness } = require('./helpers/runtime-dom-harness.js');
const { createRuntimeConfigModule } = require('../../tool/runtime-config.js');
const { normalizeRuntimeMode } = require('../../tool/context.js');

const { buildRuntimeConfig } = createRuntimeConfigModule({ normalizeRuntimeMode });
const toolPaths = createToolPaths(path.join(__dirname, '../../..'));

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

const ROUND45_EMBEDDED = [
  {
    from: 'Y="The string to replace was not found in the file."',
    to: 'Y="文件中未找到要替换的字符串。"',
  },
  {
    from: 'case"images":return`Using ${n.count===1?"image":`${n.count} images`}`',
    to: 'case"images":return`使用 ${n.count===1?"图片":`${n.count} 张图片`}`',
  },
  {
    from: 'loadingAction:"Using",completedAction:"Used",details:e',
    to: 'loadingAction:"正在使用",completedAction:"已使用",details:e',
  },
  {
    from: 'semSearchToolCall:{loading:"Searching",completed:"Searched",error:"Search"}',
    to: 'semSearchToolCall:{loading:"搜索中",completed:"已搜索",error:"搜索"}',
  },
  {
    from: 'return["Searching","Searched","Search attempted"]',
    to: 'return["搜索中","已搜索","尝试搜索"]',
  },
  {
    from: 'return t?{action:"Searched",details:`"${Xrt(t,30)}"`}:{action:"Searched",details:""}}',
    to: 'return t?{action:"已搜索",details:`"${Xrt(t,30)}"`}:{action:"已搜索",details:""}}',
  },
];

function mountToolCallLine(harness, action, details) {
  const line = harness.document.createElement('div');
  line.setAttribute('class', 'ui-tool-call-line');
  const actionEl = harness.document.createElement('span');
  actionEl.setAttribute('class', 'ui-tool-call-line-action');
  actionEl.appendChild(harness.document.createTextNode(action));
  const detailsEl = harness.document.createElement('span');
  detailsEl.setAttribute('class', 'ui-tool-call-line-details');
  if (details) {
    detailsEl.appendChild(harness.document.createTextNode(details));
  }
  line.appendChild(actionEl);
  line.appendChild(detailsEl);
  harness.document.body.appendChild(line);
  return { line, actionEl, detailsEl };
}

test('round 45 defines edit error, image usage, and semantic search targets', () => {
  const originals = CRITICAL_GLASS_ROUND45_UI_TARGETS.map((entry) => entry.originalText);
  assert.ok(originals.includes('The string to replace was not found in the file.'));
  assert.ok(originals.includes('Searched'));
  assert.ok(originals.includes('Search attempted'));
});

test('round 45 embedded patches are registered', () => {
  for (const patch of ROUND45_EMBEDDED) {
    const match = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === patch.from);
    assert.ok(match, `missing embedded patch: ${patch.from}`);
    assert.equal(match.to, patch.to);
  }
});

test('cursor-win.common.json defines round 45 mappings', () => {
  const mappings = readJsonIfExists(toolPaths.cursorWinCommonPath, []);
  const byOriginal = new Map(mappings.map((entry) => [entry.originalText, entry]));

  for (const critical of CRITICAL_GLASS_ROUND45_UI_TARGETS) {
    const entry = byOriginal.get(critical.originalText);
    assert.ok(entry, `missing mapping: ${critical.originalText}`);
    assert.equal(entry.changeText, critical.changeText, critical.originalText);
    if (critical.forceRuntime) {
      assert.equal(entry.forceRuntime, true, `${critical.originalText} should use runtime`);
    }
  }
});

test('merged mappings translate edit failure and semantic search labels', () => {
  const mappings = loadMergedMappings();
  assert.equal(
    translateTextWithMappings('The string to replace was not found in the file.', mappings, {
      scopeMatched: true,
    }),
    '文件中未找到要替换的字符串。'
  );
  assert.equal(
    translateTextWithMappings('Searched', mappings, { scopeMatched: true }),
    '已搜索'
  );
  assert.equal(
    translateTextWithMappings('Search attempted', mappings, { scopeMatched: true }),
    '尝试搜索'
  );
});

test('static translation applies round 45 edit, image, and search snippets', () => {
  const source = [
    'if(e.old_string!==""&&U===$){const Y="The string to replace was not found in the file.",Z=new JSe',
    'case"images":return`Using ${n.count===1?"image":`${n.count} images`}`;case"videos":return`Using ${n.count===1?"video"',
    'if(e)return{loadingAction:"Using",completedAction:"Used",details:e}}return Vum(n)',
    'semSearchToolCall:{loading:"Searching",completed:"Searched",error:"Search"},createPlanToolCall',
    'case yt.READ_SEMSEARCH_FILES:return["Searching","Searched","Search attempted"];case yt.SEMANTIC_SEARCH_FULL:return["Searching","Searched","Search attempted"]',
    'const t=YR(e,"query");return t?{action:"Searched",details:`"${Xrt(t,30)}"`}:{action:"Searched",details:""}}default:return',
  ].join('\n');

  const translated = applyStaticSourceTranslations(source, loadMergedMappings());

  assert.match(translated, /Y="文件中未找到要替换的字符串。"/);
  assert.match(translated, /case"images":return`使用 \$\{n\.count===1\?"图片":`\$\{n\.count\} 张图片`\}`/);
  assert.match(translated, /loadingAction:"正在使用",completedAction:"已使用",details:e/);
  assert.match(translated, /semSearchToolCall:\{loading:"搜索中",completed:"已搜索",error:"搜索"\}/);
  assert.match(translated, /return\["搜索中","已搜索","尝试搜索"\]/g);
  assert.match(translated, /action:"已搜索",details:`"\$\{Xrt\(t,30\)\}"`/);
  assert.equal(translated.includes('The string to replace was not found in the file.'), false);
  assert.equal(translated.includes('Using ${n.count===1?"image"'), false);
});

test('runtime DOM translates split semantic search action and query details', () => {
  const mappings = loadMergedMappings();
  const harness = createRuntimeDomHarness({
    workbenchSource: 'Searched semantic query',
    runtimeMappings: mappings.filter((entry) => entry.forceRuntime !== false),
    runtimeConfig: {
      ...buildRuntimeConfig('performance'),
      marketplaceLazyTranslationEnabled: false,
    },
  });
  harness.runDueTimers(Infinity);

  const { line, actionEl, detailsEl } = mountToolCallLine(
    harness,
    'Searched',
    ' How is tool call action and details l...'
  );
  harness.flushMicrotasks();

  assert.equal(actionEl.textContent, '已搜索');
  assert.match(detailsEl.textContent, /How is tool call/);
  assert.doesNotMatch(line.textContent, /^Searched /);
});
