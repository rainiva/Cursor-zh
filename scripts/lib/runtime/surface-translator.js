'use strict';

const crypto = require('node:crypto');

const DEFAULT_DENY_SELECTORS = Object.freeze([
  'input',
  'textarea',
  '[contenteditable]',
  '[data-editor]',
  '[data-terminal]',
  '[data-chat-body]',
  'code',
  '[data-dynamic-value]',
]);

function elementMatchesSelector(element, selector) {
  if (!element || element.nodeType !== 1) return false;
  if (typeof element.matches === 'function') {
    try {
      return element.matches(selector);
    } catch {
      // fall through to lightweight matchers
    }
  }
  const value = String(selector || '').trim();
  if (!value) return false;
  if (!value.startsWith('[') && !value.startsWith('.') && !value.startsWith('#')) {
    return String(element.tagName || '').toLowerCase() === value.toLowerCase();
  }
  const attrStar = value.match(/^\[([a-zA-Z0-9_-]+)\*="([^"]+)"\]$/);
  if (attrStar) {
    const attr = element.getAttribute?.(attrStar[1]);
    return typeof attr === 'string' && attr.includes(attrStar[2]);
  }
  const attrExact = value.match(/^\[([a-zA-Z0-9_-]+)(?:="([^"]*)")?\]$/);
  if (attrExact) {
    const attr = element.getAttribute?.(attrExact[1]);
    if (attrExact[2] === undefined) return attr != null;
    return attr === attrExact[2];
  }
  return false;
}

function elementOrAncestorMatches(element, selectors) {
  let current = element;
  while (current && current.nodeType === 1) {
    if (selectors.some((selector) => elementMatchesSelector(current, selector))) {
      return true;
    }
    current = current.parentElement;
  }
  return false;
}

function collectTextNodes(root, limit = Infinity, results = []) {
  if (!root || results.length >= limit) return results;
  if (root.nodeType === 3) {
    results.push(root);
    return results;
  }
  const children = root.childNodes || [];
  for (let i = 0; i < children.length && results.length < limit; i += 1) {
    collectTextNodes(children[i], limit, results);
  }
  return results;
}

function normalizeMatch(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function resolveTranslation(text, entries) {
  const trimmed = normalizeMatch(text);
  if (!trimmed) return null;
  for (const entry of entries || []) {
    const aliases = Array.isArray(entry.aliases)
      ? entry.aliases
      : entry.originalText
        ? [entry.originalText]
        : [];
    const match = entry.match || 'exact';
    for (const alias of aliases) {
      if (match === 'exact' && trimmed === alias) return entry.changeText;
      if (match === 'normalizedExact' && normalizeMatch(alias).toLowerCase() === trimmed.toLowerCase()) {
        return entry.changeText;
      }
    }
  }
  return null;
}

function createSurfaceTranslator({
  root,
  shard,
  batchSize = 30,
  surfaceId = 'unknown',
  requestIdleCallback: requestIdle = null,
  MutationObserver: Observer = null,
  quarantineDenySelectors = DEFAULT_DENY_SELECTORS,
  onQuarantine = null,
  sessionKey = null,
}) {
  const denySelectors = [...(quarantineDenySelectors || DEFAULT_DENY_SELECTORS)];
  const quarantineSelectors = [...(shard?.quarantineSelectors || [])];
  const entries = Array.isArray(shard?.entries) ? shard.entries : [];
  const idleBatchSize = Number(batchSize) > 0 ? Number(batchSize) : 30;
  const ObserverCtor = Observer || (typeof MutationObserver !== 'undefined' ? MutationObserver : null);
  const requestIdleCallbackFn =
    requestIdle ||
    (typeof requestIdleCallback === 'function'
      ? requestIdleCallback
      : (cb) => setTimeout(() => cb({ timeRemaining: () => 0 }), 0));

  let observer = null;
  let disposed = false;
  let pendingNodes = [];
  let idleScheduled = false;
  let pendingIdleBatches = 0;
  let translatedCount = 0;
  const ephemeralKey = sessionKey || crypto.randomBytes(32);
  const fingerprintCounts = new Map();
  const rawQuarantine = [];
  const fingerprintRecords = [];

  function translateNode(node) {
    if (!node || node.nodeType !== 3) return false;
    const next = resolveTranslation(node.textContent, entries);
    if (next == null || next === node.textContent) return false;
    node.textContent = next;
    translatedCount += 1;
    return true;
  }

  function queueTextNodes(fromRoot) {
    const nodes = collectTextNodes(fromRoot);
    for (const node of nodes) {
      pendingNodes.push(node);
    }
    scheduleIdle();
  }

  function runOneIdleBatch() {
    if (disposed) return 0;
    idleScheduled = false;
    let processed = 0;
    while (processed < idleBatchSize && pendingNodes.length > 0) {
      const node = pendingNodes.shift();
      translateNode(node);
      processed += 1;
    }
    if (pendingNodes.length > 0) {
      pendingIdleBatches = 1;
      scheduleIdle();
    } else {
      pendingIdleBatches = 0;
    }
    return processed;
  }

  function scheduleIdle() {
    if (idleScheduled || disposed) return;
    idleScheduled = true;
    pendingIdleBatches = pendingNodes.length > 0 ? 1 : 0;
    requestIdleCallbackFn(() => {
      runOneIdleBatch();
    });
  }

  async function quarantineUnknown(text, hostElement) {
    const value = String(text || '');
    if (!value) return null;
    if (elementOrAncestorMatches(hostElement, denySelectors)) {
      return { kind: 'denied' };
    }
    if (
      quarantineSelectors.length > 0 &&
      elementOrAncestorMatches(hostElement, quarantineSelectors)
    ) {
      rawQuarantine.push(value);
      if (typeof onQuarantine === 'function') {
        onQuarantine({ kind: 'raw', text: value, surface: surfaceId });
      }
      return { kind: 'raw', text: value, surface: surfaceId };
    }

    try {
      const fingerprint = crypto
        .createHmac('sha256', ephemeralKey)
        .update(value)
        .digest('hex');
      const previous = fingerprintCounts.get(fingerprint) || 0;
      const count = previous + 1;
      fingerprintCounts.set(fingerprint, count);
      const record = {
        fingerprint,
        surface: surfaceId,
        count,
        algorithm: 'HMAC-SHA-256',
        keyScope: 'ephemeral-session',
      };
      const existing = fingerprintRecords.find((item) => item.fingerprint === fingerprint);
      if (existing) existing.count = count;
      else fingerprintRecords.push(record);
      if (typeof onQuarantine === 'function') {
        onQuarantine({ kind: 'fingerprint', ...record });
      }
      return { kind: 'fingerprint', ...record };
    } catch {
      if (typeof onQuarantine === 'function') {
        onQuarantine({ kind: 'aggregate', surface: surfaceId, count: 1 });
      }
      return { kind: 'aggregate', surface: surfaceId, count: 1 };
    }
  }

  function start() {
    if (disposed) return;
    queueTextNodes(root);
    if (!ObserverCtor || !root) return;
    observer = new ObserverCtor((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type !== 'childList') continue;
        const added = mutation.addedNodes || [];
        for (const node of added) {
          queueTextNodes(node);
        }
      }
    });
    observer.observe(root, { childList: true, subtree: true, characterData: true });
  }

  function dispose() {
    disposed = true;
    pendingNodes = [];
    pendingIdleBatches = 0;
    idleScheduled = false;
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (root) {
      delete root.__cursorZhSurfaceObserver;
    }
  }

  return {
    start,
    dispose,
    runOneIdleBatch,
    quarantineUnknown,
    get observer() {
      return observer;
    },
    get root() {
      return root;
    },
    translatedCount: () => translatedCount,
    pendingIdleBatchCount: () => pendingIdleBatches,
    pendingNodeCount: () => pendingNodes.length,
    rawQuarantineTexts: () => [...rawQuarantine],
    fingerprintRecords: () => fingerprintRecords.map((item) => ({ ...item })),
    isDisposed: () => disposed,
  };
}

module.exports = {
  createSurfaceTranslator,
  DEFAULT_DENY_SELECTORS,
  resolveTranslation,
  collectTextNodes,
  elementMatchesSelector,
};
