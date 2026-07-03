const test = require('node:test');
const assert = require('node:assert/strict');

const { buildTranslatedWorkbenchBundle } = require('../../cursor-zh-lib.js');
const { createRuntimeDomHarness } = require('./helpers/runtime-dom-harness.js');

function buildScopedMappings(count) {
  const mappings = [];
  for (let i = 0; i < count; i += 1) {
    mappings.push({
      originalText: `Scoped Label ${i}`,
      changeText: `作用域标签 ${i}`,
      searchType: 'exact',
      scopeSelectors: [`[class*="scope-bucket-${i % 5}"]`],
    });
  }
  return mappings;
}

test('P-UX-0: runtime bundle builds entry indexes for scoped translation', () => {
  const bundle = buildTranslatedWorkbenchBundle({
    workbenchSource: 'console.log("workbench");',
    mappings: buildScopedMappings(3),
    metadata: { runtimeConfig: { mode: 'performance' } },
  });

  assert.match(bundle, /_buildEntryIndexes\(\)/);
  assert.match(bundle, /this\._scopedExactBySelector/);
});

test('P-UX-0: translateTextForElement avoids scanning full entries list', () => {
  const bundle = buildTranslatedWorkbenchBundle({
    workbenchSource: 'console.log("workbench");',
    mappings: buildScopedMappings(1),
    metadata: { runtimeConfig: { mode: 'performance' } },
  });

  assert.doesNotMatch(
    bundle,
    /translateTextForElement\(text, element\) \{[\s\S]*for \(const entry of this\.entries\)/
  );
});

test('P-UX-0: translateTextForElement p95 stays under 2ms with many scoped mappings', () => {
  const mappings = buildScopedMappings(120);
  mappings.push({
    originalText: 'Hit Me',
    changeText: '命中',
    searchType: 'exact',
    scopeSelectors: ['[class*="scope-hit"]'],
  });

  const harness = createRuntimeDomHarness({
    workbenchSource: 'console.log("workbench");',
    mappings,
    runtimeMappings: mappings,
    runtimeConfig: {
      mode: 'performance',
      rescanDelaysMs: [],
      observeScopeSelectors: ['[class*="scope-"]'],
      marketplaceRemoteTranslationEnabled: false,
    },
  });

  const host = harness.document.createElement('div');
  host.setAttribute('class', 'scope-hit');
  host.textContent = 'Hit Me';
  harness.document.body.appendChild(host);

  harness.runtime.install();
  harness.runDueTimers(Infinity);

  const element = host;
  const samples = [];
  for (let i = 0; i < 100; i += 1) {
    const start = performance.now();
    harness.runtime.translateTextForElement('Hit Me', element);
    samples.push(performance.now() - start);
  }

  samples.sort((a, b) => a - b);
  const p95 = samples[Math.floor(samples.length * 0.95)];
  assert.ok(p95 < 2, `expected p95 < 2ms, got ${p95.toFixed(3)}ms`);
});

test('P-UX-0: observeExistingShadowRoots limits nested shadow traversal depth', () => {
  const bundle = buildTranslatedWorkbenchBundle({
    workbenchSource: 'console.log("workbench");',
    mappings: [{ originalText: 'Edit', changeText: '编辑', searchType: 'exact' }],
    metadata: { runtimeConfig: { mode: 'performance' } },
  });

  assert.match(bundle, /observeExistingShadowRoots\(root, depth\)/);
  assert.match(bundle, /depth >= 3/);
  assert.match(bundle, /observeExistingShadowRoots\(element\.shadowRoot, depth \+ 1\)/);
});

test('P-UX-0: idle queue merge avoids quadratic closest scans for nested roots', () => {
  const bundle = buildTranslatedWorkbenchBundle({
    workbenchSource: 'console.log("workbench");',
    mappings: [{ originalText: 'Edit', changeText: '编辑', searchType: 'exact' }],
    metadata: { runtimeConfig: { mode: 'performance' } },
  });

  assert.match(bundle, /this\._idleContainsSet/);
  assert.doesNotMatch(
    bundle,
    /for \(let j = 0; j < treeTasks\.length; j\+\+\)[\s\S]*closest\(b\.root\)/
  );
});

test('P-UX-0: _processIdleQueue drains 100 translateTree tasks under 10ms', () => {
  const harness = createRuntimeDomHarness({
    workbenchSource: 'console.log("workbench");',
    mappings: [{ originalText: 'Edit', changeText: '编辑', searchType: 'exact' }],
    runtimeMappings: [],
    runtimeConfig: {
      mode: 'performance',
      rescanDelaysMs: [],
      marketplaceRemoteTranslationEnabled: false,
    },
  });

  const roots = [];
  for (let i = 0; i < 100; i += 1) {
    const root = harness.document.createElement('div');
    root.setAttribute('class', `scope-bucket-${i % 5}`);
    harness.document.body.appendChild(root);
    roots.push(root);
  }

  harness.runtime._idleQueue = roots.map((root) => ({ type: 'translateTree', root }));
  const start = performance.now();
  harness.runtime._processIdleQueue();
  const elapsed = performance.now() - start;

  assert.ok(elapsed < 10, `expected idle queue drain <10ms, got ${elapsed.toFixed(3)}ms`);
});
