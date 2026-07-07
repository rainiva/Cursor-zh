const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const {
  CRITICAL_GLASS_ROUND47_UI_TARGETS,
  CRITICAL_EMBEDDED_UI_PATCHES,
} = require('../../lib/mapping/critical-ui-targets.js');
const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');
const { mergeMappings, translateTextWithMappings } = require('../../cursor-zh-lib');
const { readJsonIfExists } = require('../../tool/io');
const { createToolPaths } = require('../../tool/paths');
const { createRuntimeDomHarness } = require('./helpers/runtime-dom-harness.js');

const ROUND47_EMBEDDED = [
  {
    from: 'content:"Expand",offset:6,placement:"left",children:nN(da,{"aria-label":"Expand",color:"tertiary",icon:"chevrons-left"',
    to: 'content:"展开",offset:6,placement:"left",children:nN(da,{"aria-label":"展开",color:"tertiary",icon:"chevrons-left"',
  },
  {
    from: '"aria-label":"Collapse",color:"tertiary",icon:"chevrons-right"',
    to: '"aria-label":"收起",color:"tertiary",icon:"chevrons-right"',
  },
  {
    from: 'shortcut:Z,title:"Expand"}),placement:"bottom",sameAxisOnly:!0,children:xP(da,{"aria-label":"Expand",icon:"arrows-expand-simple"',
    to: 'shortcut:Z,title:"展开"}),placement:"bottom",sameAxisOnly:!0,children:xP(da,{"aria-label":"展开",icon:"arrows-expand-simple"',
  },
  {
    from: 'p=u===void 0?"Expand":u',
    to: 'p=u===void 0?"展开":u',
  },
];

const COLLAPSED_RAIL_EXPAND_SNIPPET =
  'b?nN(ua,{content:"Expand",offset:6,placement:"left",children:nN(da,{"aria-label":"Expand",color:"tertiary",icon:"chevrons-left",onClick:()=>w(!1),size:"lg"})})';

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

test('round 47 defines collapsed apps rail Expand and Collapse targets', () => {
  const originals = CRITICAL_GLASS_ROUND47_UI_TARGETS.map((entry) => entry.originalText);
  assert.ok(originals.includes('Expand'));
  assert.ok(originals.includes('Collapse'));
});

test('round 47 embedded patches are registered', () => {
  for (const patch of ROUND47_EMBEDDED) {
    const match = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === patch.from);
    assert.ok(match, `missing embedded patch: ${patch.from}`);
    assert.equal(match.to, patch.to);
  }
});

test('static translation localizes collapsed apps rail expand snippet', () => {
  const translated = applyStaticSourceTranslations(
    COLLAPSED_RAIL_EXPAND_SNIPPET,
    loadMergedMappings()
  );
  assert.match(translated, /content:"展开"/);
  assert.match(translated, /"aria-label":"展开"/);
  assert.equal(translated.includes('content:"Expand"'), false);
  assert.equal(translated.includes('"aria-label":"Expand"'), false);
});

test('scoped runtime mappings translate Expand inside collapsed apps rail', () => {
  const mappings = loadMergedMappings();
  const scopeText = 'collapsed-apps-rail__strip collapsed-apps-rail';
  assert.equal(translateTextWithMappings('Expand', mappings, { scopeText }), '展开');
  assert.equal(translateTextWithMappings('Collapse', mappings, { scopeText }), '收起');
});

test('scoped Expand mapping does not translate Expand outside collapsed apps rail', () => {
  const mappings = loadMergedMappings();
  assert.equal(
    translateTextWithMappings('Expand', mappings, {
      scopeText: 'outline-tree-panel',
    }),
    'Expand'
  );
});

test('cursor-win.common.json defines round 47 mappings', () => {
  const mappings = readJsonIfExists(toolPaths.cursorWinCommonPath, []);
  const byOriginal = new Map(mappings.map((entry) => [entry.originalText, entry]));

  for (const critical of CRITICAL_GLASS_ROUND47_UI_TARGETS) {
    const entry = byOriginal.get(critical.originalText);
    assert.ok(entry, `missing mapping: ${critical.originalText}`);
    assert.equal(entry.changeText, critical.changeText, critical.originalText);
    assert.equal(entry.forceRuntime, true, `${critical.originalText} should use runtime`);
  }
});

test('runtime DOM renders collapsed apps rail expand tooltip in Chinese', () => {
  const mappings = loadMergedMappings();
  const expandEntry = mappings.find((entry) => entry.originalText === 'Expand');
  assert.ok(expandEntry, 'Expand mapping should exist');

  const harness = createRuntimeDomHarness({
    mappings: [expandEntry],
    runtimeConfig: {
      mode: 'performance',
      rescanDelaysMs: [],
      observeScopeSelectors: ['[class*="collapsed-apps-rail"]'],
      marketplaceLazyTranslationEnabled: false,
    },
  });

  const rail = harness.document.createElement('div');
  rail.setAttribute('class', 'collapsed-apps-rail__strip');
  const tooltip = harness.document.createElement('div');
  tooltip.textContent = 'Expand';
  rail.appendChild(tooltip);
  harness.document.body.appendChild(rail);

  harness.runDueTimers(Infinity);
  harness.flushMicrotasks();

  assert.equal(tooltip.textContent, '展开');
});
