const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  CRITICAL_GLASS_ROUND38_UI_TARGETS,
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

const ROUND38_EMBEDDED = [
  {
    from: 'action:`Completed ${l} of ${e.length} to-dos`',
    to: 'action:`已完成 ${l}/${e.length} 项待办`',
    applyBeforeStatic: true,
  },
  {
    from: 'action:`Completed ${l} of ${e.length}`',
    to: 'action:`已完成 ${l}/${e.length} 项`',
    applyBeforeStatic: true,
  },
  { from: 'action:"Started to-do"', to: 'action:"已启动待办"', applyBeforeStatic: true },
  {
    from: 'action:`Started ${r.length} to-dos`',
    to: 'action:`已启动 ${r.length} 项待办`',
    applyBeforeStatic: true,
  },
  { from: 'action:"Added to-do"', to: 'action:"已添加待办"', applyBeforeStatic: true },
  {
    from: 'action:`Added ${o.length} to-dos`',
    to: 'action:`已添加 ${o.length} 项待办`',
    applyBeforeStatic: true,
  },
  { from: 'action:"Cancelled to-do"', to: 'action:"已取消待办"', applyBeforeStatic: true },
  {
    from: 'action:`Cancelled ${a.length} to-dos`',
    to: 'action:`已取消 ${a.length} 项待办`',
    applyBeforeStatic: true,
  },
  {
    from: 'action:"Checked",details:"to-do list"',
    to: 'action:"已查看",details:"待办列表"',
    applyBeforeStatic: true,
  },
  {
    from: 'verb:`Completed ${d} of ${e.length} to-dos`',
    to: 'verb:`已完成 ${d}/${e.length} 项待办`',
    applyBeforeStatic: true,
  },
  {
    from: 'verb:`Completed ${d} of ${e.length}`',
    to: 'verb:`已完成 ${d}/${e.length} 项`',
    applyBeforeStatic: true,
  },
  {
    from: 'verb:`Completed ${m} of ${e.length} to-dos`',
    to: 'verb:`已完成 ${m}/${e.length} 项待办`',
    applyBeforeStatic: true,
  },
  {
    from: 'verb:`Completed ${m} of ${e.length}`',
    to: 'verb:`已完成 ${m}/${e.length} 项`',
    applyBeforeStatic: true,
  },
  { from: 'verb:"Started to-do"', to: 'verb:"已启动待办"', applyBeforeStatic: true },
  {
    from: 'verb:`Started ${a} to-dos`',
    to: 'verb:`已启动 ${a} 项待办`',
    applyBeforeStatic: true,
  },
  { from: 'verb:"Added to-do"', to: 'verb:"已添加待办"', applyBeforeStatic: true },
  {
    from: 'verb:`Added ${u} to-dos`',
    to: 'verb:`已添加 ${u} 项待办`',
    applyBeforeStatic: true,
  },
  {
    from: 'verb:`Added ${d} to-dos`',
    to: 'verb:`已添加 ${d} 项待办`',
    applyBeforeStatic: true,
  },
  { from: 'verb:"Cancelled to-do"', to: 'verb:"已取消待办"', applyBeforeStatic: true },
  {
    from: 'verb:`Cancelled ${c} to-dos`',
    to: 'verb:`已取消 ${c} 项待办`',
    applyBeforeStatic: true,
  },
  { from: 'argument:"to-do list"', to: 'argument:"待办列表"', applyBeforeStatic: true },
  {
    from: 'case yt.TODO_WRITE:return["Updating todos","Updated todos","Update todos attempted"]',
    to: 'case yt.TODO_WRITE:return["正在更新待办","已更新待办","尝试更新待办"]',
    applyBeforeStatic: true,
  },
];

function mountToolCallLine(harness, action, details = '') {
  const line = harness.document.createElement('div');
  line.setAttribute('class', 'ui-tool-call-line');
  const actionEl = harness.document.createElement('span');
  actionEl.setAttribute('class', 'ui-tool-call-line-action');
  actionEl.appendChild(harness.document.createTextNode(action));
  line.appendChild(actionEl);
  if (details) {
    const detailsEl = harness.document.createElement('span');
    detailsEl.setAttribute('class', 'ui-tool-call-line-details');
    detailsEl.appendChild(harness.document.createTextNode(details));
    line.appendChild(detailsEl);
  }
  harness.document.body.appendChild(line);
  return { line, actionEl };
}

test('round 38 defines todo write status targets', () => {
  const originals = CRITICAL_GLASS_ROUND38_UI_TARGETS.map((entry) => entry.originalText);
  assert.ok(originals.includes('Updating todos'));
  assert.ok(originals.includes('to-do list'));
});

test('round 38 embedded patches are registered', () => {
  for (const patch of ROUND38_EMBEDDED) {
    const match = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === patch.from);
    assert.ok(match, `missing embedded patch: ${patch.from}`);
    assert.equal(match.to, patch.to);
    if (patch.applyBeforeStatic) {
      assert.equal(match.applyBeforeStatic, true, patch.from);
    }
  }
});

test('static translation patches todo write action templates before generic word rules', () => {
  const source = [
    'return s.length===1?{action:`Completed ${l} of ${e.length}`,details:s[0].content}:{action:`Completed ${l} of ${e.length} to-dos`,details:""}',
    'return o.length===1?{action:"Added to-do",details:o[0].content}:{action:`Added ${o.length} to-dos`,details:""}',
    'return{action:"Checked",details:"to-do list"}',
    'return z(J$,{loadingVerb:ye,argument:"to-do list",completedVerb:Se',
    'case yt.TODO_WRITE:return["Updating todos","Updated todos","Update todos attempted"]',
  ].join('\n');

  const translated = applyStaticSourceTranslations(source, loadMergedMappings());

  assert.match(translated, /已完成 \$\{l\}\/\$\{e\.length\} 项待办/);
  assert.match(translated, /已添加待办/);
  assert.match(translated, /已查看",details:"待办列表"/);
  assert.match(translated, /argument:"待办列表"/);
  assert.match(translated, /正在更新待办","已更新待办"/);
  assert.equal(translated.includes('Completed ${l}'), false);
  assert.equal(translated.includes('to-do list"'), false);
});

test('merged mappings translate dynamic todo completion counts via regex', () => {
  const mappings = loadMergedMappings();
  const cases = [
    ['Completed 12 of 12 to-dos', '已完成 12/12 项待办'],
    ['Completed 1 of 3', '已完成 1/3 项'],
    ['Started 4 to-dos', '已启动 4 项待办'],
    ['Added 2 to-dos', '已添加 2 项待办'],
    ['Cancelled 2 to-dos', '已取消 2 项待办'],
    ['Updating todos', '正在更新待办'],
    ['Updated todos', '已更新待办'],
  ];

  for (const [input, expected] of cases) {
    assert.equal(
      translateTextWithMappings(input, mappings, { scopeMatched: true }),
      expected,
      `${input} should translate to ${expected}`
    );
  }
});

test('runtime DOM renders completed todo count without English fragments', () => {
  const mappings = loadMergedMappings();
  const harness = createRuntimeDomHarness({
    workbenchSource: 'Completed 12 of 12 to-dos',
    runtimeMappings: mappings.filter((entry) => entry.forceRuntime !== false),
    runtimeConfig: {
      ...buildRuntimeConfig('performance'),
      marketplaceLazyTranslationEnabled: false,
    },
  });
  harness.runDueTimers(Infinity);

  const { line, actionEl } = mountToolCallLine(harness, 'Completed 12 of 12 to-dos');
  harness.flushMicrotasks();

  assert.equal(actionEl.textContent, '已完成 12/12 项待办');
  assert.doesNotMatch(line.textContent, /Completed|to-dos/i);
});

test('runtime DOM renders checked to-do list split labels', () => {
  const mappings = loadMergedMappings();
  const harness = createRuntimeDomHarness({
    workbenchSource: 'Checked to-do list',
    runtimeMappings: mappings.filter((entry) => entry.forceRuntime !== false),
    runtimeConfig: {
      ...buildRuntimeConfig('performance'),
      marketplaceLazyTranslationEnabled: false,
    },
  });
  harness.runDueTimers(Infinity);

  const line = harness.document.createElement('div');
  line.setAttribute('class', 'ui-tool-call-line');
  const actionEl = harness.document.createElement('span');
  actionEl.setAttribute('class', 'ui-tool-call-line-action');
  actionEl.appendChild(harness.document.createTextNode('Checked'));
  const detailsEl = harness.document.createElement('span');
  detailsEl.setAttribute('class', 'ui-tool-call-line-details');
  detailsEl.appendChild(harness.document.createTextNode(' to-do list'));
  line.appendChild(actionEl);
  line.appendChild(detailsEl);
  harness.document.body.appendChild(line);
  harness.flushMicrotasks();

  assert.equal(actionEl.textContent, '已查看');
  assert.equal(detailsEl.textContent, '待办列表');
});
