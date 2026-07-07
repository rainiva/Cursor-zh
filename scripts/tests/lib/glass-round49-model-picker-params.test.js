const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const vm = require('vm');

const {
  CRITICAL_INLINE_TEXT_TARGETS,
  CRITICAL_GLASS_ROUND49_MODEL_PICKER_PARAM_TARGETS,
  CRITICAL_EMBEDDED_UI_PATCHES,
} = require('../../lib/mapping/critical-ui-targets.js');
const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');
const {
  buildTranslatedWorkbenchBundle,
  buildTranslatedWorkbenchBundleParts,
} = require('../../lib/runtime/bundle-builder.js');
const { mergeMappings } = require('../../cursor-zh-lib');
const { readJsonIfExists } = require('../../tool/io');
const { createToolPaths } = require('../../tool/paths');
const { normalizeRuntimeMode } = require('../../tool/context.js');
const { createRuntimeConfigModule } = require('../../tool/runtime-config.js');
const { createRuntimeDomHarness } = require('./helpers/runtime-dom-harness.js');

const { buildRuntimeConfig } = createRuntimeConfigModule({ normalizeRuntimeMode });

const Q_M_TOGGLE_PATCH = {
  from: 'label:t.name,tooltip:l,children:t.name',
  to: 'label:globalThis.__cursorZhTranslateInlineText?globalThis.__cursorZhTranslateInlineText(t.name):t.name,tooltip:l,children:globalThis.__cursorZhTranslateInlineText?globalThis.__cursorZhTranslateInlineText(t.name):t.name',
};

const UQG_ENUM_PATCH = {
  from: 'children:p.displayName??p.value},p.value)},"t5"',
  to: 'children:globalThis.__cursorZhTranslateInlineText?globalThis.__cursorZhTranslateInlineText(p.displayName??p.value):(p.displayName??p.value)},p.value)},"t5"',
};

const UQG_SECTION_PATCH = {
  from: 'd=ZB(gn.Section,{title:l,tooltip:c,children:u})',
  to: 'd=ZB(gn.Section,{title:globalThis.__cursorZhTranslateInlineText?globalThis.__cursorZhTranslateInlineText(l):l,tooltip:c,children:u})',
};

const TQG_DISPLAY_PATCH = {
  from: 'children:u},E)',
  to: 'children:globalThis.__cursorZhTranslateModelPickerDisplayName?globalThis.__cursorZhTranslateModelPickerDisplayName(u):u},E)',
};

const TQG_TAGLINE_PATCH = {
  from: 'style:k.style,children:a})',
  to: 'style:k.style,children:globalThis.__cursorZhTranslateModelPickerDisplayName?globalThis.__cursorZhTranslateModelPickerDisplayName(a):a})',
};

const PEG_DISPLAY_PATCH = {
  from: 'children:d},I)',
  to: 'children:globalThis.__cursorZhTranslateModelPickerDisplayName?globalThis.__cursorZhTranslateModelPickerDisplayName(d):d},I)',
};

const PEG_TAGLINE_PATCH = {
  from: 'style:E.style,children:a})',
  to: 'style:E.style,children:globalThis.__cursorZhTranslateModelPickerDisplayName?globalThis.__cursorZhTranslateModelPickerDisplayName(a):a})',
};

const INHERIT_PRIMARY_PATCH = {
  from: 'ui-model-picker__plan-execution-inherit-label" style="flex-shrink: 0; color: var(--cursor-text-primary)">Inherit</span>',
  to: 'ui-model-picker__plan-execution-inherit-label" style="flex-shrink: 0; color: var(--cursor-text-primary)">继承</span>',
};

const INHERIT_SECONDARY_PATCH = {
  from: 'ui-model-picker__plan-execution-inherit-label" style="flex-shrink: 0; color: var(--cursor-text-secondary)">Inherit</span>',
  to: 'ui-model-picker__plan-execution-inherit-label" style="flex-shrink: 0; color: var(--cursor-text-secondary)">继承</span>',
};

const MULTI_MODEL_TOGGLE_PATCH = {
  from: 'label:"Use Multiple Models","data-testid":"multi-model-toggle",tooltip:l,children:"Use Multiple Models"',
  to: 'label:"使用多个模型","data-testid":"multi-model-toggle",tooltip:l,children:"使用多个模型"',
};

const Q_M_SNIPPET =
  'c=ZB(gn.ToggleItem,{checked:s,onChange:a,label:t.name,tooltip:l,children:t.name})';

const TQG_SNIPPET =
  'A=vre(Pce,{children:u},E);I=a&&vre("span",{className:k.className,style:k.style,children:a})';

const PEG_SNIPPET =
  'P=JQ(phe,{children:d},I);D=a&&JQ("span",{className:E.className,style:E.style,children:a})';

const INHERIT_SNIPPET =
  'ui-model-picker__plan-execution-inherit-label" style="flex-shrink: 0; color: var(--cursor-text-primary)">Inherit</span>';

const UQG_SNIPPET = [
  'children:p.displayName??p.value},p.value)},"t5"',
  'd=ZB(gn.Section,{title:l,tooltip:c,children:u})',
].join('\n');

function evaluateRuntimeHeader(header) {
  const sandbox = {
    globalThis: {},
    window: {},
    document: {
      createElement: () => ({}),
      addEventListener: () => {},
      readyState: 'complete',
      body: null,
      documentElement: null,
    },
    Node: { ELEMENT_NODE: 1, TEXT_NODE: 3 },
    MutationObserver: class MutationObserver {
      observe() {}
      disconnect() {}
    },
    requestIdleCallback: (cb) => setTimeout(() => cb({ timeRemaining: () => 0 }), 0),
    queueMicrotask: (fn) => Promise.resolve().then(fn),
    performance: { now: () => Date.now() },
    console: { table: () => {}, log: () => {} },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.runInNewContext(header, sandbox);
  return sandbox.globalThis;
}

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

test('round 49 defines model picker parameter inline targets', () => {
  const originals = CRITICAL_GLASS_ROUND49_MODEL_PICKER_PARAM_TARGETS.map(
    (entry) => entry.originalText
  );
  assert.ok(originals.includes('Thinking'));
  assert.ok(originals.includes('Fast'));
  assert.ok(originals.includes('Low'));
  assert.ok(originals.includes('High'));
  assert.ok(originals.includes('Max'));
});

test('inline translation pool includes model picker parameter labels', () => {
  const originals = CRITICAL_INLINE_TEXT_TARGETS.map((entry) => entry.originalText);
  for (const critical of CRITICAL_GLASS_ROUND49_MODEL_PICKER_PARAM_TARGETS) {
    assert.ok(originals.includes(critical.originalText), critical.originalText);
  }
});

test('round 49 embedded patches hook Q_m and uQg parameter renderers', () => {
  for (const patch of [
    Q_M_TOGGLE_PATCH,
    UQG_ENUM_PATCH,
    UQG_SECTION_PATCH,
    TQG_DISPLAY_PATCH,
    TQG_TAGLINE_PATCH,
    PEG_DISPLAY_PATCH,
    PEG_TAGLINE_PATCH,
    INHERIT_PRIMARY_PATCH,
    INHERIT_SECONDARY_PATCH,
    MULTI_MODEL_TOGGLE_PATCH,
  ]) {
    const match = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === patch.from);
    assert.ok(match, `missing embedded patch: ${patch.from}`);
    assert.equal(match.to, patch.to);
  }
});

test('static translation injects desktop model row display name hooks', () => {
  const translated = applyStaticSourceTranslations(PEG_SNIPPET, []);
  assert.match(translated, /__cursorZhTranslateModelPickerDisplayName\(d\)/);
  assert.match(translated, /__cursorZhTranslateModelPickerDisplayName\(a\)/);
});

test('static translation localizes plan-execution Inherit label', () => {
  const translated = applyStaticSourceTranslations(INHERIT_SNIPPET, []);
  assert.match(translated, />继承<\/span>/);
  assert.equal(translated.includes('>Inherit</span>'), false);
});

test('static translation injects inline hooks into model parameter renderers', () => {
  const translated = applyStaticSourceTranslations(
    [Q_M_SNIPPET, UQG_SNIPPET, TQG_SNIPPET, PEG_SNIPPET].join('\n'),
    []
  );
  assert.match(translated, /__cursorZhTranslateInlineText\(t\.name\)/);
  assert.match(translated, /__cursorZhTranslateInlineText\(p\.displayName/);
  assert.match(translated, /__cursorZhTranslateInlineText\(l\)/);
  assert.match(translated, /__cursorZhTranslateModelPickerDisplayName\(u\)/);
  assert.match(translated, /__cursorZhTranslateModelPickerDisplayName\(a\)/);
});

test('model picker display name translator localizes combined tier suffixes', () => {
  const parts = buildTranslatedWorkbenchBundleParts({
    workbenchSource: TQG_SNIPPET,
    mappings: loadMergedMappings(),
    metadata: { runtimeConfig: buildRuntimeConfig('performance') },
  });
  const runtime = evaluateRuntimeHeader(parts.runtimeHeader);
  const translate = runtime.__cursorZhTranslateModelPickerDisplayName;
  assert.equal(typeof translate, 'function');

  const cases = [
    ['Opus 4.8 High', 'Opus 4.8 高'],
    ['Composer 2.5 Fast', 'Composer 2.5 快速'],
    ['GPT-5.5 Medium', 'GPT-5.5 中'],
    ['GPT-5.5 Low', 'GPT-5.5 低'],
    ['GPT-5.4 Extra High', 'GPT-5.4 极高'],
    ['Extra High', '极高'],
    ['Kimi K2.7 Code', 'Kimi K2.7 Code'],
    ['GLM 5.2', 'GLM 5.2'],
  ];

  for (const [english, chinese] of cases) {
    assert.equal(translate(english), chinese, english);
  }
});

test('inline translation pool keeps model picker parameter labels', () => {
  const bundle = buildTranslatedWorkbenchBundle({
    workbenchSource: Q_M_SNIPPET,
    mappings: loadMergedMappings(),
    metadata: { runtimeConfig: buildRuntimeConfig('performance') },
  });

  assert.match(bundle, /\["Thinking","思考"\]/);
  assert.match(bundle, /\["Fast","快速"\]/);
  assert.match(bundle, /\["Low","低"\]/);
  assert.match(bundle, /\["High","高"\]/);
  assert.match(bundle, /\["Max","最高"\]/);
});

test('runtime config observes ui-model-picker scope for parameter menus', () => {
  const config = buildRuntimeConfig('performance');
  assert.ok(
    config.observeScopeSelectors.includes('[class*="ui-model-picker"]'),
    'model picker parameter menus should be runtime-observed'
  );
});

test('model picker tier badges translate via ui-model-picker scopeSelectors', () => {
  const mappings = loadMergedMappings();
  const harness = createRuntimeDomHarness({
    workbenchSource: '',
    mappings,
  });
  const { document } = harness;
  const picker = document.createElement('div');
  picker.setAttribute('class', 'ui-model-picker');
  document.body.appendChild(picker);

  const cases = [
    ['Fast', '快速'],
    ['Low', '低'],
    ['Medium', '中'],
    ['High', '高'],
  ];

  for (const [english, chinese] of cases) {
    const badge = document.createElement('span');
    badge.appendChild(document.createTextNode(english));
    picker.appendChild(badge);
    harness.runDueTimers(Infinity);
    harness.flushMicrotasks();
    assert.equal(badge.textContent, chinese, english);
    picker.removeChild(badge);
  }
});

test('model picker runtime fallback translates combined row and trigger names', () => {
  const mappings = loadMergedMappings();
  const harness = createRuntimeDomHarness({
    workbenchSource: '',
    mappings,
  });
  const { document } = harness;
  const picker = document.createElement('div');
  picker.setAttribute('class', 'ui-model-picker');
  document.body.appendChild(picker);

  const cases = [
    ['Composer 2.5 Fast', 'Composer 2.5 快速'],
    ['GPT-5.5 Low', 'GPT-5.5 低'],
    ['Opus 4.6 High', 'Opus 4.6 高'],
    ['GLM 5.2 High', 'GLM 5.2 高'],
    ['GPT-5.4 Extra High', 'GPT-5.4 极高'],
    ['Kimi K2.7 Code', 'Kimi K2.7 Code'],
  ];

  for (const [english, chinese] of cases) {
    const row = document.createElement('span');
    row.appendChild(document.createTextNode(english));
    picker.appendChild(row);
    harness.runDueTimers(Infinity);
    harness.flushMicrotasks();
    assert.equal(row.textContent, chinese, english);
    picker.removeChild(row);
  }
});
