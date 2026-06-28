const test = require('node:test');
const assert = require('node:assert/strict');

const { createMarketplaceLazyTranslator } = require('../../lib/runtime/marketplace-lazy-translator.js');
const { buildMarketplaceLazyBootstrapLines } = require('../../lib/runtime/marketplace-lazy-template.js');
const { buildTranslatedWorkbenchBundle } = require('../../cursor-zh-lib.js');

function createDomFixture(descriptionText) {
  const nodes = [];
  const textNode = {
    nodeType: 3,
    textContent: descriptionText,
    parentElement: null,
  };
  const card = {
    nodeType: 1,
    getAttribute(name) {
      return this._attrs?.[name] ?? null;
    },
    setAttribute(name, value) {
      this._attrs = this._attrs || {};
      this._attrs[name] = value;
    },
    childNodes: [textNode],
    querySelectorAll() {
      return [];
    },
  };
  textNode.parentElement = card;

  const marketplaceRoot = {
    nodeType: 1,
    getAttribute() {
      return null;
    },
    setAttribute() {},
    childNodes: [card],
    querySelectorAll(selector) {
      if (String(selector).includes('marketplace')) {
        return [marketplaceRoot];
      }
      return [];
    },
  };

  const body = {
    nodeType: 1,
    childNodes: [marketplaceRoot],
    querySelector(selector) {
      if (String(selector).includes('marketplace')) {
        return marketplaceRoot;
      }
      return null;
    },
  };

  const document = {
    body,
    querySelector(selector) {
      return body.querySelector(selector);
    },
  };

  return { document, textNode, marketplaceRoot };
}

function createIdleHarness() {
  const idleCallbacks = [];
  return {
    requestIdleCallback(fn) {
      idleCallbacks.push(fn);
      return idleCallbacks.length;
    },
    flushIdle() {
      while (idleCallbacks.length > 0) {
        const batch = idleCallbacks.splice(0, idleCallbacks.length);
        for (const fn of batch) {
          fn({ timeRemaining: () => 50 });
        }
      }
    },
  };
}

const SAMPLE_CATALOG = {
  version: 1,
  generatedAt: '2026-06-26T00:00:00.000Z',
  entries: [
    {
      id: 'slack-mcp',
      originalText: 'Slack MCP server. Search channels, read messages.',
      changeText: 'Slack MCP 服务器。搜索频道、读取消息。',
      searchType: 'exact',
    },
  ],
};

test('activate leaves description English before mappings load completes', async () => {
  let resolveFetch;
  const fetchPromise = new Promise((resolve) => {
    resolveFetch = resolve;
  });
  const { document, textNode } = createDomFixture(
    'Slack MCP server. Search channels, read messages.'
  );
  const idle = createIdleHarness();
  const translator = createMarketplaceLazyTranslator({
    fetchJson: () => fetchPromise,
    requestIdleCallback: idle.requestIdleCallback,
    getDocument: () => document,
    mappingsUrl: 'cursor-zh://marketplace.descriptions.json',
    batchSize: 30,
  });

  const pending = translator.activate();
  assert.match(textNode.textContent, /Slack MCP server/);
  resolveFetch(SAMPLE_CATALOG);
  await pending;
  idle.flushIdle();
  assert.match(textNode.textContent, /Slack MCP 服务器/);
});

test('first activate fetches catalog once and translates visible description', async () => {
  let fetchCalls = 0;
  const { document, textNode } = createDomFixture(
    'Slack MCP server. Search channels, read messages.'
  );
  const idle = createIdleHarness();
  const translator = createMarketplaceLazyTranslator({
    fetchJson: async () => {
      fetchCalls++;
      return SAMPLE_CATALOG;
    },
    requestIdleCallback: idle.requestIdleCallback,
    getDocument: () => document,
    mappingsUrl: 'cursor-zh://marketplace.descriptions.json',
  });

  await translator.activate();
  idle.flushIdle();

  assert.equal(fetchCalls, 1);
  assert.match(textNode.textContent, /Slack MCP 服务器/);
  assert.equal(translator.getState().mappingsLoaded, true);
  assert.ok(translator.getState().mapSize > 0);
});

test('deactivate disconnects observer but retains mapping pool', async () => {
  const { document, textNode } = createDomFixture(
    'Slack MCP server. Search channels, read messages.'
  );
  const idle = createIdleHarness();
  const translator = createMarketplaceLazyTranslator({
    fetchJson: async () => SAMPLE_CATALOG,
    requestIdleCallback: idle.requestIdleCallback,
    getDocument: () => document,
    mappingsUrl: 'cursor-zh://marketplace.descriptions.json',
  });

  await translator.activate();
  idle.flushIdle();
  const sizeAfterActivate = translator.getState().mapSize;

  translator.deactivate();

  assert.equal(translator.getState().mapSize, sizeAfterActivate);
  assert.equal(translator.getState().mappingsLoaded, true);
  assert.equal(translator.getState().active, false);

  textNode.textContent = 'Slack MCP server. Search channels, read messages.';
  await translator.activate();
  idle.flushIdle();
  assert.match(textNode.textContent, /Slack MCP 服务器/);
});

test('second activate in same session skips additional fetch', async () => {
  let fetchCalls = 0;
  const { document, textNode } = createDomFixture(
    'Slack MCP server. Search channels, read messages.'
  );
  const idle = createIdleHarness();
  const translator = createMarketplaceLazyTranslator({
    fetchJson: async () => {
      fetchCalls++;
      return SAMPLE_CATALOG;
    },
    requestIdleCallback: idle.requestIdleCallback,
    getDocument: () => document,
    mappingsUrl: 'cursor-zh://marketplace.descriptions.json',
  });

  await translator.activate();
  idle.flushIdle();
  translator.deactivate();

  textNode.textContent = 'Slack MCP server. Search channels, read messages.';
  await translator.activate();
  idle.flushIdle();

  assert.equal(fetchCalls, 1);
  assert.match(textNode.textContent, /Slack MCP 服务器/);
});

test('reloadMappings allows one new fetch on next activate', async () => {
  let fetchCalls = 0;
  const { document } = createDomFixture('Slack MCP server. Search channels, read messages.');
  const idle = createIdleHarness();
  const translator = createMarketplaceLazyTranslator({
    fetchJson: async () => {
      fetchCalls++;
      return { ...SAMPLE_CATALOG, version: fetchCalls };
    },
    requestIdleCallback: idle.requestIdleCallback,
    getDocument: () => document,
    mappingsUrl: 'cursor-zh://marketplace.descriptions.json',
  });

  await translator.activate();
  idle.flushIdle();
  translator.deactivate();
  translator.reloadMappings();
  await translator.activate();
  idle.flushIdle();

  assert.equal(fetchCalls, 2);
});

test('activate refetches automatically when expected catalog version changes', async () => {
  let fetchCalls = 0;
  const { document, textNode } = createDomFixture('Slack MCP server. Search channels, read messages.');
  const idle = createIdleHarness();
  const translator = createMarketplaceLazyTranslator({
    fetchJson: async () => {
      fetchCalls += 1;
      if (fetchCalls === 1) {
        return SAMPLE_CATALOG;
      }
      return {
        version: 2,
        entries: [
          {
            id: 'slack-mcp',
            originalText: 'Slack MCP server. Search channels, read messages.',
            changeText: 'Slack MCP 服务器 v2。',
            searchType: 'exact',
          },
        ],
      };
    },
    requestIdleCallback: idle.requestIdleCallback,
    getDocument: () => document,
    mappingsUrl: 'cursor-zh://marketplace.descriptions.json',
  });

  await translator.activate({ expectedCatalogVersion: 1 });
  idle.flushIdle();
  assert.equal(fetchCalls, 1);
  assert.match(textNode.textContent, /Slack MCP 服务器/);

  translator.deactivate();
  textNode.textContent = 'Slack MCP server. Search channels, read messages.';

  await translator.activate({ expectedCatalogVersion: 2 });
  idle.flushIdle();

  assert.equal(fetchCalls, 2);
  assert.equal(translator.getState().loadedVersion, 2);
  assert.match(textNode.textContent, /Slack MCP 服务器 v2/);
  assert.equal(translator.getState().mappingsLoaded, true);
  assert.ok(translator.getState().mapSize > 0);
});

test('workbench header omits marketplace description entries from translationMappings', () => {
  const bundle = buildTranslatedWorkbenchBundle({
    workbenchSource: 'console.log("workbench");',
    mappings: [{ originalText: 'General', changeText: '常规', searchType: 'exact' }],
    metadata: {
      runtimeConfig: {
        mode: 'performance',
        rescanDelaysMs: [],
        marketplaceLazyTranslationEnabled: true,
        marketplaceRemoteTranslationEnabled: false,
      },
      marketplaceDescriptionsVersion: 1,
    },
  });

  assert.match(bundle, /__cursorZhMarketplaceLazy/);
  assert.doesNotMatch(bundle, /Slack MCP server\. Search channels/);
  assert.doesNotMatch(bundle, /marketplace\.entries/);
});

test('bootstrap lines register global marketplace lazy API', () => {
  const lines = buildMarketplaceLazyBootstrapLines();
  const source = lines.join('\n');
  assert.match(source, /globalThis\.__cursorZhMarketplaceLazy/);
  assert.match(source, /activate/);
  assert.match(source, /deactivate/);
  assert.match(source, /reloadMappings/);
  assert.match(source, /mappingsLoaded/);
  assert.match(source, /marketplaceDescriptionsVersion/);
});

function createIntersectionObserverHarness() {
  const observers = [];
  class MockIntersectionObserver {
    constructor(callback) {
      this.callback = callback;
      this.targets = new Set();
      observers.push(this);
    }

    observe(target) {
      this.targets.add(target);
    }

    disconnect() {
      this.targets.clear();
      const index = observers.indexOf(this);
      if (index >= 0) {
        observers.splice(index, 1);
      }
    }

    simulateIntersect(target) {
      if (!this.targets.has(target)) {
        return;
      }
      this.callback([{ target, isIntersecting: true }]);
    }
  }

  return {
    MockIntersectionObserver,
    observers,
  };
}

test('intersection observer schedules translation for newly visible marketplace cards', async () => {
  const ioHarness = createIntersectionObserverHarness();
  const original = globalThis.IntersectionObserver;
  globalThis.IntersectionObserver = ioHarness.MockIntersectionObserver;

  try {
    const { document, textNode, marketplaceRoot } = createDomFixture(
      'Slack MCP server. Search channels, read messages.'
    );
    const card = marketplaceRoot.childNodes[0];
    textNode.textContent = 'Slack MCP server. Search channels, read messages.';

    const idle = createIdleHarness();
    const translator = createMarketplaceLazyTranslator({
      fetchJson: async () => SAMPLE_CATALOG,
      requestIdleCallback: idle.requestIdleCallback,
      getDocument: () => document,
      mappingsUrl: 'cursor-zh://marketplace.descriptions.json',
    });

    await translator.activate();
    assert.match(textNode.textContent, /Slack MCP/);

    textNode.textContent = 'Slack MCP server. Search channels, read messages.';
    card.setAttribute('data-cursor-zh-mkt', '0');

    assert.equal(ioHarness.observers.length, 1);
    ioHarness.observers[0].simulateIntersect(card);
    idle.flushIdle();

    assert.match(textNode.textContent, /Slack MCP 服务器/);
  } finally {
    globalThis.IntersectionObserver = original;
  }
});

test('deactivate disconnects intersection observer but keeps mapping pool', async () => {
  const ioHarness = createIntersectionObserverHarness();
  const original = globalThis.IntersectionObserver;
  globalThis.IntersectionObserver = ioHarness.MockIntersectionObserver;

  try {
    const { document } = createDomFixture('Slack MCP server. Search channels, read messages.');
    const idle = createIdleHarness();
    const translator = createMarketplaceLazyTranslator({
      fetchJson: async () => SAMPLE_CATALOG,
      requestIdleCallback: idle.requestIdleCallback,
      getDocument: () => document,
      mappingsUrl: 'cursor-zh://marketplace.descriptions.json',
    });

    await translator.activate();
    assert.equal(ioHarness.observers.length, 1);
    const mapSize = translator.getState().mapSize;

    translator.deactivate();
    assert.equal(ioHarness.observers.length, 0);
    assert.equal(translator.getState().mapSize, mapSize);
    assert.equal(translator.getState().mappingsLoaded, true);
  } finally {
    globalThis.IntersectionObserver = original;
  }
});
