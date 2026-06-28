const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { CRITICAL_EMBEDDED_UI_PATCHES } = require('../../lib/mapping/critical-ui-targets.js');
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

const ROUND37_EMBEDDED = [
  {
    from: 'loadingAction:"Reading",completedAction:"Read",details:"terminal"',
    to: 'loadingAction:"正在读取",completedAction:"读取",details:"终端"',
    applyBeforeStatic: true,
  },
  {
    from: 'loadingAction:"Reading",completedAction:"Read",details:"agent transcript"',
    to: 'loadingAction:"正在读取",completedAction:"读取",details:"智能体记录"',
    applyBeforeStatic: true,
  },
  {
    from: 'loadingVerb:"Waiting",get completedVerb(){return ye()},get argument(){return Se()}',
    to: 'loadingVerb:"正在等待",get completedVerb(){return ye()},get argument(){return Se()}',
  },
  {
    from: 'ye=be(()=>pe()?"Wait skipped":"Waited")',
    to: 'ye=be(()=>pe()?"已跳过等待":"已等待")',
  },
  {
    from: 'return Le?`for ${/^[0-9]+$/.test(Le.trim())?"shell":"agent"}`',
    to: 'return Le?`${/^[0-9]+$/.test(Le.trim())?"shell":"agent"}`',
  },
  {
    from: 'return n?e&&e.length>0?`for ${e} in ${n}`:`for ${n}`:""',
    to: 'return n?e&&e.length>0?`${e} in ${n}`:`${n}`:""',
  },
  { from: 'action:"Waiting"', to: 'action:"正在等待"' },
  { from: 'action:"Waited"', to: 'action:"已等待"' },
  { from: 'action:"Wait skipped"', to: 'action:"已跳过等待"' },
  { from: 'loadingVerb:"Waiting"', to: 'loadingVerb:"正在等待"' },
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

test('round 37 embedded patches are registered for split tool-call labels', () => {
  for (const patch of ROUND37_EMBEDDED) {
    const match = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === patch.from);
    assert.ok(match, `missing embedded patch: ${patch.from}`);
    assert.equal(match.to, patch.to);
    if (patch.applyBeforeStatic) {
      assert.equal(match.applyBeforeStatic, true, patch.from);
    }
  }
});

test('static translation patches Fum terminal read split fields', () => {
  const source =
    'return Bum(n)?{loadingAction:"Reading",completedAction:"Read",details:"terminal"}:_Pg(n)?{loadingAction:"Reading",completedAction:"Read",details:"agent transcript"}:null';
  const translated = applyStaticSourceTranslations(source, loadMergedMappings());

  assert.match(translated, /completedAction:"读取",details:"终端"/);
  assert.equal(translated.includes('details:"terminal"'), false);
});

test('static translation patches await shell wait verbs in DDg and J$', () => {
  const source = [
    'return{action:"Waiting",details:w.length>0?k>0?`${Sri(k)} ${w}`:w:k>0?Sri(k):""}}return{action:"Waiting",details:w}',
    'return{action:"Waited",details:b.length>0?b:c!==void 0&&c>0?Sri(c):""}}',
    'return z(J$,{loadingVerb:"Waiting",get completedVerb(){return ye()},get argument(){return Se()}',
    'ye=be(()=>pe()?"Wait skipped":"Waited")',
    'return n?e&&e.length>0?`for ${e} in ${n}`:`for ${n}`:""',
  ].join('\n');

  const translated = applyStaticSourceTranslations(source, loadMergedMappings());

  assert.match(translated, /action:"正在等待"/);
  assert.match(translated, /action:"已等待"/);
  assert.match(translated, /loadingVerb:"正在等待"/);
  assert.match(translated, /已跳过等待/);
  assert.equal(translated.includes('action:"Waiting"'), false);
  assert.equal(translated.includes('action:"Waited"'), false);
  assert.equal(translated.includes('`for ${n}`'), false);
});

test('runtime config observes tool-call lines for split label translation', () => {
  const config = buildRuntimeConfig('performance');
  assert.ok(
    config.observeScopeSelectors.some((selector) => selector.includes('tool-call')),
    'tool-call scope should be observed for split action/details labels'
  );
});

test('runtime DOM translates split read terminal action and details without English fragments', () => {
  const mappings = loadMergedMappings();
  const harness = createRuntimeDomHarness({
    workbenchSource: 'Read terminal',
    runtimeMappings: mappings.filter((entry) => entry.forceRuntime !== false),
    runtimeConfig: {
      ...buildRuntimeConfig('performance'),
      marketplaceLazyTranslationEnabled: false,
    },
  });
  harness.runDueTimers(Infinity);

  const { line, actionEl, detailsEl } = mountToolCallLine(harness, '读取', ' terminal');
  harness.flushMicrotasks();

  assert.equal(actionEl.textContent, '读取');
  assert.equal(detailsEl.textContent, '终端');
  assert.doesNotMatch(line.textContent, /terminal/i);
});

test('runtime DOM translates split shell wait action and duration details', () => {
  const mappings = loadMergedMappings();
  const harness = createRuntimeDomHarness({
    workbenchSource: 'Waiting 3m 22s for shell',
    runtimeMappings: mappings.filter((entry) => entry.forceRuntime !== false),
    runtimeConfig: {
      ...buildRuntimeConfig('performance'),
      marketplaceLazyTranslationEnabled: false,
    },
  });
  harness.runDueTimers(Infinity);

  const { line, actionEl, detailsEl } = mountToolCallLine(harness, 'Waiting', ' 3m 22s for shell');
  harness.flushMicrotasks();

  assert.equal(actionEl.textContent, '正在等待');
  assert.match(detailsEl.textContent, /shell/);
  assert.doesNotMatch(line.textContent, /^Waiting/i);
  assert.doesNotMatch(line.textContent, /for shell$/);
});

test('runtime DOM translates split waited for shell labels', () => {
  const mappings = loadMergedMappings();
  const harness = createRuntimeDomHarness({
    workbenchSource: 'Waited for shell',
    runtimeMappings: mappings.filter((entry) => entry.forceRuntime !== false),
    runtimeConfig: {
      ...buildRuntimeConfig('performance'),
      marketplaceLazyTranslationEnabled: false,
    },
  });
  harness.runDueTimers(Infinity);

  const { actionEl, detailsEl } = mountToolCallLine(harness, 'Waited', ' for shell');
  harness.flushMicrotasks();

  assert.equal(actionEl.textContent, '已等待');
  assert.equal(detailsEl.textContent, 'shell');
});
