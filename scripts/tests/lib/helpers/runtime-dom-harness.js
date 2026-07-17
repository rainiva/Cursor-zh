const vm = require('vm');
const { buildTranslatedWorkbenchBundleParts } = require('../../../lib/runtime/bundle-builder.js');
const { createRuntimeConfigModule } = require('../../../tool/runtime-config.js');
const { normalizeRuntimeMode } = require('../../../tool/context.js');
const { createSurfaceRegistry } = require('../../../lib/runtime/surface-registry.js');
const { createSurfaceTranslator } = require('../../../lib/runtime/surface-translator.js');

const { buildRuntimeConfig } = createRuntimeConfigModule({ normalizeRuntimeMode });

const NODE = {
  ELEMENT_NODE: 1,
  TEXT_NODE: 3,
  DOCUMENT_NODE: 9,
  DOCUMENT_FRAGMENT_NODE: 11,
};

function parseSimpleSelector(selector) {
  const value = String(selector || '').trim();
  const roleMatch = value.match(/^\[role="([^"]+)"\]$/);
  if (roleMatch) {
    return { type: 'role', value: roleMatch[1] };
  }
  const classMatch = value.match(/^\[class\*="([^"]+)"\]$/);
  if (classMatch) {
    return { type: 'class', value: classMatch[1] };
  }
  const attrStar = value.match(/^\[([a-zA-Z0-9_-]+)\*="([^"]+)"\]$/);
  if (attrStar) {
    return { type: 'attr-star', name: attrStar[1], value: attrStar[2] };
  }
  const attrExact = value.match(/^\[([a-zA-Z0-9_-]+)="([^"]*)"\]$/);
  if (attrExact) {
    return { type: 'attr-exact', name: attrExact[1], value: attrExact[2] };
  }
  const attrPresent = value.match(/^\[([a-zA-Z0-9_-]+)\]$/);
  if (attrPresent) {
    return { type: 'attr-present', name: attrPresent[1] };
  }
  const dotClassMatch = value.match(/^\.([A-Za-z0-9_-]+)$/);
  if (dotClassMatch) {
    return { type: 'class', value: dotClassMatch[1] };
  }
  if (value && !value.startsWith('[') && !value.startsWith('.') && !value.startsWith('#')) {
    return { type: 'tag', value: value.toLowerCase() };
  }
  return { type: 'raw', value };
}

function elementMatchesSelector(element, selector) {
  if (!element || element.nodeType !== NODE.ELEMENT_NODE) {
    return false;
  }
  const parsed = parseSimpleSelector(String(selector || '').trim());
  if (parsed.type === 'role') {
    return element.getAttribute('role') === parsed.value;
  }
  if (parsed.type === 'class') {
    const className = element.getAttribute('class') || '';
    return className.includes(parsed.value);
  }
  if (parsed.type === 'attr-star') {
    const attr = element.getAttribute(parsed.name);
    return typeof attr === 'string' && attr.includes(parsed.value);
  }
  if (parsed.type === 'attr-exact') {
    return element.getAttribute(parsed.name) === parsed.value;
  }
  if (parsed.type === 'attr-present') {
    return element.getAttribute(parsed.name) != null;
  }
  if (parsed.type === 'tag') {
    return String(element.tagName || '').toLowerCase() === parsed.value;
  }
  return false;
}

function createElement(tagName, documentRef) {
  const children = [];
  const attrs = new Map();
  return {
    nodeType: NODE.ELEMENT_NODE,
    tagName: String(tagName || 'DIV').toUpperCase(),
    childNodes: children,
    parentElement: null,
    shadowRoot: null,
    __document: documentRef,
    get firstChild() {
      return children[0] || null;
    },
    get textContent() {
      return children.map((child) => child.textContent || '').join('');
    },
    set textContent(value) {
      children.length = 0;
      if (value != null && value !== '') {
        children.push(createTextNode(String(value), this));
      }
    },
    get isConnected() {
      let current = this;
      while (current) {
        if (current === documentRef.documentElement) return true;
        current = current.parentElement;
      }
      return false;
    },
    appendChild(child) {
      if (!child) return child;
      if (child.parentElement) {
        child.parentElement.removeChild(child);
      }
      child.parentElement = this;
      children.push(child);
      documentRef.__notifyChildList(this, [child], []);
      return child;
    },
    removeChild(child) {
      const index = children.indexOf(child);
      if (index >= 0) {
        children.splice(index, 1);
        child.parentElement = null;
        documentRef.__notifyChildList(this, [], [child]);
      }
      return child;
    },
    remove() {
      if (this.parentElement) {
        this.parentElement.removeChild(this);
      }
    },
    getAttribute(name) {
      return attrs.has(name) ? attrs.get(name) : null;
    },
    setAttribute(name, value) {
      attrs.set(name, String(value));
      if (name === 'id' && documentRef) {
        documentRef.__elementsById.set(String(value), this);
      }
    },
    matches(selector) {
      return elementMatchesSelector(this, selector);
    },
    closest(selector) {
      let current = this;
      while (current) {
        if (elementMatchesSelector(current, selector)) {
          return current;
        }
        current = current.parentElement;
      }
      return null;
    },
    querySelector(selector) {
      const all = this.querySelectorAll(selector);
      return all[0] || null;
    },
    querySelectorAll(selector) {
      const results = [];
      const visit = (node) => {
        if (node.nodeType === NODE.ELEMENT_NODE) {
          if (elementMatchesSelector(node, selector)) {
            results.push(node);
          }
          for (const child of node.childNodes) {
            visit(child);
          }
        }
      };
      visit(this);
      return results;
    },
  };
}

function createTextNode(text, parentElement = null) {
  return {
    nodeType: NODE.TEXT_NODE,
    textContent: String(text || ''),
    parentElement,
  };
}

function createTreeWalker(root, whatToShow) {
  const textNodes = [];
  const visit = (node) => {
    if (!node) return;
    if (node.nodeType === NODE.TEXT_NODE && whatToShow === 4) {
      textNodes.push(node);
      return;
    }
    if (node.childNodes) {
      for (const child of node.childNodes) {
        visit(child);
      }
    }
  };
  visit(root);
  let index = 0;
  return {
    nextNode() {
      if (index >= textNodes.length) {
        return null;
      }
      const node = textNodes[index];
      index += 1;
      return node;
    },
  };
}

function wantsSurfaceLifecycle(options) {
  return Boolean(
    options.surfaceShards ||
      options.surfaceBatchSize != null ||
      options.discoveryBatchSize != null ||
      options.quarantineSelectors ||
      options.quarantineDenySelectors
  );
}

function resolveSurfaceShards(options) {
  const quarantineSelectors = options.quarantineSelectors || [];
  const base =
    options.surfaceShards ||
    {
      composer: {
        selectors: ['[class*="composer"]'],
        quarantineSelectors: [],
        entries: [
          {
            translationId: 'composer.send',
            aliases: ['Send'],
            changeText: '发送',
            match: 'exact',
          },
        ],
      },
    };
  const shards = {};
  for (const [surfaceId, shard] of Object.entries(base)) {
    shards[surfaceId] = {
      selectors: [...(shard.selectors || [])],
      quarantineSelectors:
        quarantineSelectors.length > 0
          ? [...quarantineSelectors]
          : [...(shard.quarantineSelectors || [])],
      entries: Array.isArray(shard.entries) ? shard.entries.map((entry) => ({ ...entry })) : [],
    };
  }
  return shards;
}

function createRuntimeDomHarness(options = {}) {
  const timers = [];
  let timerId = 1;
  const microtasks = [];
  const mutationObservers = new Set();
  const surfaceLifecycle = wantsSurfaceLifecycle(options);
  const surfaceShards = surfaceLifecycle ? resolveSurfaceShards(options) : null;
  const surfaceBatchSize =
    options.surfaceBatchSize != null ? Number(options.surfaceBatchSize) : 30;
  const discoveryBatchSize =
    options.discoveryBatchSize != null ? Number(options.discoveryBatchSize) : 30;
  const quarantineDenySelectors = options.quarantineDenySelectors || undefined;
  const quarantineReport = [];
  let unknownHosts = [];

  const documentRef = {
    readyState: 'complete',
    body: null,
    documentElement: null,
    head: null,
    __mutationObservers: mutationObservers,
    __elementsById: new Map(),
    getElementById(id) {
      return this.__elementsById.get(id) || null;
    },
    __notifyChildList(target, addedNodes, removedNodes = []) {
      for (const observer of mutationObservers) {
        observer.__deliver({
          type: 'childList',
          target,
          addedNodes,
          removedNodes,
        });
      }
    },
    createElement(tagName) {
      const element = createElement(tagName, documentRef);
      if (element.getAttribute('id')) {
        documentRef.__elementsById.set(element.getAttribute('id'), element);
      }
      return element;
    },
    createTextNode(text) {
      return createTextNode(text);
    },
    createTreeWalker(root, whatToShow) {
      return createTreeWalker(root, whatToShow);
    },
    addEventListener() {},
  };

  documentRef.documentElement = createElement('html', documentRef);
  documentRef.head = createElement('head', documentRef);
  documentRef.body = createElement('body', documentRef);
  documentRef.documentElement.appendChild(documentRef.head);
  documentRef.documentElement.appendChild(documentRef.body);

  class MutationObserver {
    constructor(callback) {
      this.callback = callback;
      this.observed = null;
      this.options = null;
    }

    observe(target, options) {
      this.observed = target;
      this.options = options;
      target.__mutationObserver = this;
      mutationObservers.add(this);
    }

    disconnect() {
      mutationObservers.delete(this);
      if (this.observed) {
        delete this.observed.__mutationObserver;
      }
    }

    __deliver(record) {
      this.callback([record]);
    }
  }

  const sandbox = {
    globalThis: {},
    window: {},
    document: documentRef,
    Node: NODE,
    NodeFilter: { SHOW_TEXT: 4 },
    Element: { prototype: {} },
    MutationObserver,
    requestIdleCallback(callback) {
      timers.push({ id: timerId++, delay: 0, kind: 'idle', callback });
      return timerId;
    },
    queueMicrotask(fn) {
      microtasks.push(fn);
    },
    performance: { now: () => Date.now() },
    console: { table: () => {}, log: () => {} },
    setTimeout(callback, delay = 0) {
      timers.push({ id: timerId++, delay, kind: 'timeout', callback });
      return timerId;
    },
    clearTimeout() {},
    setInterval() {
      return timerId++;
    },
    clearInterval() {},
  };

  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.NodeFilter = { SHOW_TEXT: 4 };

  const runtimeConfig = {
    ...(options.runtimeConfig || buildRuntimeConfig('performance')),
    marketplaceLazyTranslationEnabled:
      options.runtimeConfig?.marketplaceLazyTranslationEnabled ?? false,
  };

  const bundleOptions = {
    workbenchSource: options.workbenchSource || '',
    mappings: options.mappings || [],
    runtimeMappings: options.runtimeMappings,
    metadata: {
      runtimeConfig,
      version: options.version || '3.9.8',
      skipRuntimeInstall: surfaceLifecycle,
    },
    translatedSource: options.translatedSource || '',
  };
  if (surfaceLifecycle && options.surfaceShards) {
    bundleOptions.runtimeShards = { core: [], surfaces: surfaceShards };
  }

  const parts = buildTranslatedWorkbenchBundleParts(bundleOptions);
  vm.runInNewContext(parts.runtimeHeader, sandbox);

  let registry = null;
  if (surfaceLifecycle) {
    // Surface lifecycle owns discovery; detach any observers from the generated runtime.
    for (const observer of [...mutationObservers]) {
      observer.disconnect();
    }
    if (documentRef.documentElement) {
      delete documentRef.documentElement.__cursorZhDiscoveryObserver;
    }
    if (sandbox.globalThis.__cursorZhRuntime) {
      sandbox.globalThis.__cursorZhRuntime._enabled = false;
    }

    registry = createSurfaceRegistry({
      document: documentRef,
      shards: surfaceShards,
      discoveryBatchSize,
      MutationObserver,
      requestIdleCallback: (callback) => sandbox.requestIdleCallback(callback),
      createTranslator: ({ root, shard, batchSize, surfaceId }) =>
        createSurfaceTranslator({
          root,
          shard,
          batchSize: batchSize || surfaceBatchSize,
          surfaceId,
          MutationObserver,
          requestIdleCallback: (callback) => sandbox.requestIdleCallback(callback),
          quarantineDenySelectors,
          cryptoUnavailable: options.cryptoUnavailable === true,
          onQuarantine: (record) => {
            quarantineReport.push(record);
          },
        }),
    });
    registry.installDiscoveryObserver();
  }

  const harness = {
    sandbox,
    document: documentRef,
    runtime: sandbox.globalThis.__cursorZhRuntime,
    registry,
    mountMenuItem(labelText) {
      const menu = documentRef.createElement('div');
      menu.setAttribute('role', 'menu');
      const item = documentRef.createElement('div');
      item.appendChild(documentRef.createTextNode(labelText));
      menu.appendChild(item);
      documentRef.body.appendChild(menu);
      return { menu, item };
    },
    getMenuItemText(menu) {
      const item = menu.firstChild;
      return item ? item.textContent : '';
    },
    flushMicrotasks() {
      while (microtasks.length > 0) {
        const batch = microtasks.splice(0, microtasks.length);
        for (const task of batch) {
          task();
        }
      }
    },
    runDueTimers(maxDelay = Infinity) {
      const runPass = () => {
        this.flushMicrotasks();
        const pending = timers.filter((timer) => timer.delay <= maxDelay);
        for (const timer of pending) {
          const index = timers.indexOf(timer);
          if (index >= 0) timers.splice(index, 1);
        }
        for (const timer of pending.sort((left, right) => left.delay - right.delay)) {
          if (timer.kind === 'idle') {
            timer.callback({ timeRemaining: () => 0 });
          } else {
            timer.callback();
          }
        }
        this.flushMicrotasks();
      };
      // Discovery idle activates a surface translator that schedules its own idle
      // batch; drain one extra pass only in surface-lifecycle harness mode.
      runPass();
      if (surfaceLifecycle) runPass();
    },
    pendingTimerCount() {
      return timers.length;
    },
    discoveryObserverCount() {
      return registry ? registry.discoveryObserverCount() : 0;
    },
    activeSurfaceObserverCount() {
      return registry ? registry.activeSurfaceObserverCount() : 0;
    },
    discoveryObserverOptions() {
      return registry ? registry.discoveryObserverOptions() : null;
    },
    mountText(text) {
      const node = documentRef.createElement('div');
      node.appendChild(documentRef.createTextNode(text));
      documentRef.body.appendChild(node);
      return node;
    },
    mountSurface(surfaceId, text) {
      const shard = surfaceShards?.[surfaceId];
      const root = documentRef.createElement('div');
      const selector = shard?.selectors?.[0] || `[class*="${surfaceId}"]`;
      const classMatch = String(selector).match(/\[class\*="([^"]+)"\]/);
      if (classMatch) {
        root.setAttribute('class', classMatch[1]);
      } else {
        root.setAttribute('class', surfaceId);
      }
      root.appendChild(documentRef.createTextNode(text));
      documentRef.body.appendChild(root);
      return root;
    },
    mountSurfaceWithItems(surfaceId, count, text) {
      const shard = surfaceShards?.[surfaceId];
      const root = documentRef.createElement('div');
      const selector = shard?.selectors?.[0] || `[class*="${surfaceId}"]`;
      const classMatch = String(selector).match(/\[class\*="([^"]+)"\]/);
      if (classMatch) {
        root.setAttribute('class', classMatch[1]);
      } else {
        root.setAttribute('class', surfaceId);
      }
      for (let i = 0; i < count; i += 1) {
        const item = documentRef.createElement('span');
        item.appendChild(documentRef.createTextNode(text));
        root.appendChild(item);
      }
      documentRef.body.appendChild(root);
      if (registry) {
        registry.activate(surfaceId, root);
      }
      return root;
    },
    mountAddedRoots(count) {
      const roots = [];
      for (let i = 0; i < count; i += 1) {
        const root = documentRef.createElement('div');
        root.setAttribute('class', `added-root-${i}`);
        documentRef.body.appendChild(root);
        roots.push(root);
      }
      return roots;
    },
    runOneIdleBatch() {
      if (!registry) return 0;
      let processed = 0;
      for (const surfaceId of Object.keys(surfaceShards || {})) {
        const translator = registry.getActive(surfaceId);
        if (translator) processed += translator.runOneIdleBatch();
      }
      return processed;
    },
    runOneDiscoveryIdleBatch() {
      return registry ? registry.runOneDiscoveryIdleBatch() : 0;
    },
    translatedTextCount() {
      if (!registry) return 0;
      let total = 0;
      for (const surfaceId of Object.keys(surfaceShards || {})) {
        const translator = registry.getActive(surfaceId);
        if (translator) total += translator.translatedCount();
      }
      return total;
    },
    pendingIdleBatchCount() {
      if (!registry) return 0;
      let total = 0;
      for (const surfaceId of Object.keys(surfaceShards || {})) {
        const translator = registry.getActive(surfaceId);
        if (translator) total += translator.pendingIdleBatchCount();
      }
      return total;
    },
    inspectedAddedRootCount() {
      return registry ? registry.inspectedAddedRootCount() : 0;
    },
    pendingDiscoveryBatchCount() {
      return registry ? registry.pendingDiscoveryBatchCount() : 0;
    },
    globalTranslationAttemptCount() {
      return registry ? registry.globalTranslationAttemptCount() : 0;
    },
    mountUnknowns(parts) {
      const composer = this.mountSurface('composer', 'Send');
      if (registry) {
        this.flushMicrotasks();
        this.runDueTimers();
      }
      unknownHosts = [];
      if (parts.chrome != null) {
        const chrome = documentRef.createElement('div');
        chrome.setAttribute('data-ui-chrome', '1');
        chrome.appendChild(documentRef.createTextNode(parts.chrome));
        composer.appendChild(chrome);
        unknownHosts.push({ kind: 'chrome', element: chrome, text: parts.chrome });
      }
      if (parts.input != null) {
        const input = documentRef.createElement('input');
        input.setAttribute('value', parts.input);
        // Represent input text as a child text node for quarantine host checks.
        input.appendChild(documentRef.createTextNode(parts.input));
        composer.appendChild(input);
        unknownHosts.push({ kind: 'input', element: input, text: parts.input });
      }
      if (parts.chat != null) {
        const chat = documentRef.createElement('div');
        chat.setAttribute('data-chat-body', '1');
        chat.appendChild(documentRef.createTextNode(parts.chat));
        composer.appendChild(chat);
        unknownHosts.push({ kind: 'chat', element: chat, text: parts.chat });
      }
      if (parts.other != null) {
        const other = documentRef.createElement('div');
        other.appendChild(documentRef.createTextNode(parts.other));
        composer.appendChild(other);
        unknownHosts.push({ kind: 'other', element: other, text: parts.other });
      }
      return { composer, unknownHosts };
    },
    async flushQuarantine() {
      if (!registry) return;
      const translator = registry.getActive('composer') || registry.activate('composer', documentRef.body);
      if (!translator) return;
      for (const host of unknownHosts) {
        await translator.quarantineUnknown(host.text, host.element);
      }
    },
    async quarantineAgain(text, kind = 'other') {
      if (!registry) return;
      const translator = registry.getActive('composer');
      if (!translator) return;
      const host =
        unknownHosts.find((item) => item.kind === kind) ||
        unknownHosts.find((item) => item.kind === 'other');
      const element = host?.element || documentRef.body;
      await translator.quarantineUnknown(text, element);
    },
    rawQuarantineTexts() {
      const translator = registry?.getActive('composer');
      return translator ? translator.rawQuarantineTexts() : [];
    },
    fingerprintRecords() {
      const translator = registry?.getActive('composer');
      return translator ? translator.fingerprintRecords() : [];
    },
    aggregateRecords() {
      const translator = registry?.getActive('composer');
      if (!translator || typeof translator.aggregateRecords !== 'function') {
        return [];
      }
      return translator.aggregateRecords();
    },
    reportContains(text) {
      const needle = String(text || '');
      if (!needle) return false;
      if (quarantineReport.some((entry) => JSON.stringify(entry).includes(needle))) {
        return true;
      }
      const translator = registry?.getActive('composer');
      if (!translator) return false;
      if (translator.rawQuarantineTexts().some((value) => value.includes(needle))) {
        return true;
      }
      if (
        typeof translator.aggregateRecords === 'function' &&
        translator.aggregateRecords().some((record) => JSON.stringify(record).includes(needle))
      ) {
        return true;
      }
      return translator
        .fingerprintRecords()
        .some((record) => JSON.stringify(record).includes(needle));
    },
  };

  return harness;
}

module.exports = {
  createRuntimeDomHarness,
  buildRuntimeConfig,
};
