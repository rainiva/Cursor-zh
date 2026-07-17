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
