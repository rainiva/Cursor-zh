'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createRuntimeDomHarness } = require('./helpers/runtime-dom-harness.js');

test('loads one shard on mount, translates only inside it, and disconnects on unmount', () => {
  const harness = createRuntimeDomHarness({ surfaceShards: {
    composer: { selectors: ['[class*="composer"]'], entries: [
      { translationId: 'composer.send', aliases: ['Send'], changeText: '发送', match: 'exact' },
    ] },
  } });
  assert.equal(harness.discoveryObserverCount(), 1);
  assert.equal(harness.activeSurfaceObserverCount(), 0);
  const outside = harness.mountText('Send');
  const composer = harness.mountSurface('composer', 'Send');
  harness.flushMicrotasks();
  harness.runDueTimers();
  assert.equal(outside.textContent, 'Send');
  assert.equal(composer.textContent, '发送');
  assert.equal(harness.activeSurfaceObserverCount(), 1);
  composer.remove();
  harness.flushMicrotasks();
  assert.equal(harness.activeSurfaceObserverCount(), 0);
});

test('yields after thirty text nodes', () => {
  const harness = createRuntimeDomHarness({ surfaceBatchSize: 30 });
  harness.mountSurfaceWithItems('composer', 31, 'Send');
  harness.runOneIdleBatch();
  assert.equal(harness.translatedTextCount(), 30);
  assert.equal(harness.pendingIdleBatchCount(), 1);
});

test('global discovery is child-list-only, non-translating, and yields after thirty added roots', () => {
  const harness = createRuntimeDomHarness({ discoveryBatchSize: 30 });
  assert.deepEqual(harness.discoveryObserverOptions(), { childList: true, subtree: true });
  harness.mountAddedRoots(31);
  harness.runOneDiscoveryIdleBatch();
  assert.equal(harness.inspectedAddedRootCount(), 30);
  assert.equal(harness.pendingDiscoveryBatchCount(), 1);
  assert.equal(harness.globalTranslationAttemptCount(), 0);
});

test('runtime quarantine never persists user content and raw text requires an explicit chrome allowlist', async () => {
  const harness = createRuntimeDomHarness({
    quarantineSelectors: ['[data-ui-chrome]'],
    quarantineDenySelectors: ['input', 'textarea', '[contenteditable]', '[data-editor]', '[data-terminal]', '[data-chat-body]', 'code', '[data-dynamic-value]'],
  });
  harness.mountUnknowns({ chrome: 'New toolbar label', input: 'secret token', chat: 'private prompt', other: 'dynamic value' });
  await harness.flushQuarantine();
  assert.deepEqual(harness.rawQuarantineTexts(), ['New toolbar label']);
  assert.equal(harness.reportContains('secret token'), false);
  assert.equal(harness.reportContains('private prompt'), false);
  assert.deepEqual(harness.fingerprintRecords().map(({ fingerprint, ...record }) => record), [
    { surface: 'composer', count: 1, algorithm: 'HMAC-SHA-256', keyScope: 'ephemeral-session' },
  ]);
});

test('when Web Crypto is unavailable, quarantine increments aggregate only and never stores raw text', async () => {
  const harness = createRuntimeDomHarness({
    quarantineSelectors: ['[data-ui-chrome]'],
    quarantineDenySelectors: [
      'input',
      'textarea',
      '[contenteditable]',
      '[data-editor]',
      '[data-terminal]',
      '[data-chat-body]',
      'code',
      '[data-dynamic-value]',
    ],
    cryptoUnavailable: true,
  });
  harness.mountUnknowns({ other: 'dynamic secret value', chrome: 'Visible chrome label' });
  await harness.flushQuarantine();
  assert.deepEqual(harness.rawQuarantineTexts(), ['Visible chrome label']);
  assert.equal(harness.reportContains('dynamic secret value'), false);
  assert.deepEqual(harness.fingerprintRecords(), []);
  assert.deepEqual(harness.aggregateRecords(), [
    { kind: 'aggregate', surface: 'composer', count: 1 },
  ]);
  await harness.quarantineAgain('another unknown', 'other');
  assert.equal(harness.reportContains('another unknown'), false);
  assert.deepEqual(harness.aggregateRecords(), [
    { kind: 'aggregate', surface: 'composer', count: 2 },
  ]);
});

test('generated runtime installs surface registry from runtime surface shards', () => {
  const { buildTranslatedWorkbenchBundleParts } = require('../../lib/runtime/bundle-builder.js');
  const parts = buildTranslatedWorkbenchBundleParts({
    workbenchSource: 'console.log("workbench");',
    mappings: [],
    runtimeMappings: [],
    metadata: {
      skipRuntimeInstall: true,
      runtimeConfig: { mode: 'performance', rescanDelaysMs: [] },
    },
    runtimeShards: {
      core: [],
      surfaces: {
        composer: {
          selectors: ['[class*="composer"]'],
          quarantineSelectors: ['[data-ui-chrome]'],
          entries: [
            {
              translationId: 'composer.send',
              aliases: ['Send'],
              changeText: '发送',
              match: 'exact',
            },
          ],
        },
      },
    },
  });

  assert.match(parts.runtimeHeader, /__cursorZhInstallSurfaceRegistry/);
  assert.match(parts.runtimeHeader, /createSurfaceRegistry/);
  assert.match(parts.runtimeHeader, /__cursorZhSurfaceRegistry/);
  assert.doesNotMatch(parts.runtimeHeader, /require\(['"]node:crypto['"]\)/);

  const vm = require('node:vm');
  const observers = new Set();
  class MutationObserver {
    constructor(callback) {
      this.callback = callback;
    }
    observe() {
      observers.add(this);
    }
    disconnect() {
      observers.delete(this);
    }
  }
  const documentRef = {
    readyState: 'complete',
    body: { nodeType: 1, childNodes: [], querySelector() { return null; } },
    documentElement: { nodeType: 1, childNodes: [], querySelector() { return null; } },
    head: { appendChild() {} },
    createElement() {
      return { id: '', textContent: '', appendChild() {}, setAttribute() {}, remove() {} };
    },
    addEventListener() {},
  };
  const sandbox = {
    globalThis: {},
    window: {},
    document: documentRef,
    Node: { ELEMENT_NODE: 1, TEXT_NODE: 3, DOCUMENT_NODE: 9, DOCUMENT_FRAGMENT_NODE: 11 },
    MutationObserver,
    requestIdleCallback(cb) {
      queueMicrotask(() => cb({ timeRemaining: () => 0 }));
      return 1;
    },
    setTimeout() { return 1; },
    clearTimeout() {},
    setInterval() { return 1; },
    clearInterval() {},
    performance: { now: () => 0 },
    console: { table() {}, log() {} },
    TextEncoder,
    Uint8Array,
    crypto: undefined,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.runInNewContext(parts.runtimeHeader, sandbox);
  assert.ok(sandbox.globalThis.__cursorZhRuntimeSurfaceShards);
  assert.ok(sandbox.globalThis.__cursorZhSurfaceRegistry);
  assert.equal(typeof sandbox.globalThis.__cursorZhSurfaceRegistry.discover, 'function');
  assert.equal(typeof sandbox.globalThis.__cursorZhSurfaceRegistry.dispose, 'function');
  assert.equal(sandbox.globalThis.__cursorZhSurfaceRegistry.discoveryObserverCount(), 1);
});
