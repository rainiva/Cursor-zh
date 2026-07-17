'use strict';

const { elementMatchesSelector } = require('./surface-translator.js');

function findSurfaceMatch(root, selectors) {
  if (!root || !Array.isArray(selectors) || selectors.length === 0) return null;
  if (root.nodeType === 1) {
    for (const selector of selectors) {
      if (elementMatchesSelector(root, selector)) return root;
    }
  }
  if (typeof root.querySelector === 'function') {
    for (const selector of selectors) {
      const match = root.querySelector(selector);
      if (match) return match;
    }
  }
  if (root.childNodes) {
    for (const child of root.childNodes) {
      const nested = findSurfaceMatch(child, selectors);
      if (nested) return nested;
    }
  }
  return null;
}

function isConnected(node) {
  if (!node) return false;
  if (typeof node.isConnected === 'boolean') return node.isConnected;
  let current = node;
  while (current) {
    if (current.nodeType === 9) return true;
    current = current.parentElement || current.parentNode;
  }
  return false;
}

function createSurfaceRegistry({
  document: doc,
  shards,
  createTranslator,
  discoveryBatchSize = 30,
  requestIdleCallback: requestIdle = null,
  MutationObserver: Observer = null,
}) {
  const active = new Map();
  const surfaceShards = shards && typeof shards === 'object' ? shards : {};
  const batchSize = Number(discoveryBatchSize) > 0 ? Number(discoveryBatchSize) : 30;
  const ObserverCtor = Observer || (typeof MutationObserver !== 'undefined' ? MutationObserver : null);
  const requestIdleCallbackFn =
    requestIdle ||
    (typeof requestIdleCallback === 'function'
      ? requestIdleCallback
      : (cb) => setTimeout(() => cb({ timeRemaining: () => 0 }), 0));

  let discoveryObserver = null;
  let discoveryOptions = null;
  let pendingAddedRoots = [];
  let discoveryIdleScheduled = false;
  let pendingDiscoveryBatches = 0;
  let inspectedAddedRootCount = 0;
  let globalTranslationAttemptCount = 0;

  function activate(surfaceId, root) {
    if (active.has(surfaceId)) return active.get(surfaceId);
    const shard = surfaceShards[surfaceId];
    if (!shard || !root) return null;
    const translator = createTranslator({
      root,
      shard,
      batchSize: 30,
      surfaceId,
    });
    translator.start();
    if (root) root.__cursorZhSurfaceObserver = translator.observer;
    active.set(surfaceId, translator);
    return translator;
  }

  function deactivate(surfaceId) {
    const translator = active.get(surfaceId);
    if (translator) translator.dispose();
    active.delete(surfaceId);
  }

  function disposeDisconnected() {
    for (const [surfaceId, translator] of [...active.entries()]) {
      if (!isConnected(translator.root)) {
        deactivate(surfaceId);
      }
    }
  }

  function discover(root = doc) {
    for (const [surfaceId, shard] of Object.entries(surfaceShards)) {
      const match = findSurfaceMatch(root, shard.selectors || []);
      if (match) activate(surfaceId, match);
      else if (!active.has(surfaceId) || !isConnected(active.get(surfaceId)?.root)) {
        deactivate(surfaceId);
      }
    }
  }

  function inspectAddedRoot(node) {
    if (!node || node.nodeType !== 1) return;
    inspectedAddedRootCount += 1;
    // Discovery never translates — only matches surface selectors.
    for (const [surfaceId, shard] of Object.entries(surfaceShards)) {
      const match = findSurfaceMatch(node, shard.selectors || []);
      if (match) activate(surfaceId, match);
    }
  }

  function runOneDiscoveryIdleBatch() {
    discoveryIdleScheduled = false;
    let processed = 0;
    while (processed < batchSize && pendingAddedRoots.length > 0) {
      const node = pendingAddedRoots.shift();
      inspectAddedRoot(node);
      processed += 1;
    }
    if (pendingAddedRoots.length > 0) {
      pendingDiscoveryBatches = 1;
      scheduleDiscoveryIdle();
    } else {
      pendingDiscoveryBatches = 0;
    }
    return processed;
  }

  function scheduleDiscoveryIdle() {
    if (discoveryIdleScheduled) return;
    discoveryIdleScheduled = true;
    pendingDiscoveryBatches = pendingAddedRoots.length > 0 ? 1 : 0;
    requestIdleCallbackFn(() => {
      runOneDiscoveryIdleBatch();
    });
  }

  function queueAddedNodes(addedNodes) {
    const list = addedNodes || [];
    for (const node of list) {
      if (node && node.nodeType === 1) {
        pendingAddedRoots.push(node);
      }
    }
    if (pendingAddedRoots.length > 0) scheduleDiscoveryIdle();
  }

  function installDiscoveryObserver() {
    if (!ObserverCtor || !doc) return null;
    const target = doc.body || doc.documentElement;
    if (!target) return null;
    discoveryOptions = { childList: true, subtree: true };
    discoveryObserver = new ObserverCtor((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type !== 'childList') continue;
        queueAddedNodes(mutation.addedNodes);
        disposeDisconnected();
      }
    });
    discoveryObserver.observe(target, discoveryOptions);
    return discoveryObserver;
  }

  function dispose() {
    for (const id of [...active.keys()]) deactivate(id);
    pendingAddedRoots = [];
    pendingDiscoveryBatches = 0;
    discoveryIdleScheduled = false;
    if (discoveryObserver) {
      discoveryObserver.disconnect();
      discoveryObserver = null;
    }
  }

  // Intentionally never used by discovery — kept for harness assertions.
  function attemptGlobalTranslation() {
    globalTranslationAttemptCount += 1;
  }

  return {
    activate,
    deactivate,
    discover,
    dispose,
    installDiscoveryObserver,
    runOneDiscoveryIdleBatch,
    queueAddedNodes,
    disposeDisconnected,
    attemptGlobalTranslation,
    activeCount: () => active.size,
    activeSurfaceObserverCount: () =>
      [...active.values()].filter((translator) => translator.observer).length,
    discoveryObserverCount: () => (discoveryObserver ? 1 : 0),
    discoveryObserverOptions: () => (discoveryOptions ? { ...discoveryOptions } : null),
    inspectedAddedRootCount: () => inspectedAddedRootCount,
    pendingDiscoveryBatchCount: () => pendingDiscoveryBatches,
    globalTranslationAttemptCount: () => globalTranslationAttemptCount,
    getActive: (surfaceId) => active.get(surfaceId) || null,
    pendingAddedRootCount: () => pendingAddedRoots.length,
  };
}

module.exports = {
  createSurfaceRegistry,
  findSurfaceMatch,
  isConnected,
};
