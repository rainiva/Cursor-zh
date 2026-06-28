const test = require('node:test');
const assert = require('node:assert/strict');

const { createMarketplaceLazyTranslator } = require('../../lib/runtime/marketplace-lazy-translator.js');

function createReopenFixture() {
  let marketplaceMounted = false;
  const textNode = {
    nodeType: 3,
    textContent: 'Slack MCP server. Search channels, read messages.',
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
        return marketplaceMounted ? [marketplaceRoot] : [];
      }
      return [];
    },
  };

  const body = {
    nodeType: 1,
    childNodes: [],
    querySelector(selector) {
      if (!marketplaceMounted) {
        return null;
      }
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

  return {
    document,
    textNode,
    openMarketplace() {
      marketplaceMounted = true;
      body.childNodes = [marketplaceRoot];
      textNode.textContent = 'Slack MCP server. Search channels, read messages.';
    },
    closeMarketplace() {
      marketplaceMounted = false;
      body.childNodes = [];
    },
  };
}

function createTimedIdleHarness() {
  const idleCallbacks = [];
  const perf = { now: 0 };
  return {
    requestIdleCallback(fn) {
      idleCallbacks.push(fn);
      return idleCallbacks.length;
    },
    flushIdle() {
      perf.now += 5;
      while (idleCallbacks.length > 0) {
        const batch = idleCallbacks.splice(0, idleCallbacks.length);
        for (const fn of batch) {
          fn({ timeRemaining: () => 50 });
        }
      }
    },
    perf,
  };
}

const SAMPLE_CATALOG = {
  version: 1,
  entries: [
    {
      originalText: 'Slack MCP server. Search channels, read messages.',
      changeText: 'Slack MCP 服务器。搜索频道、读取消息。',
      searchType: 'exact',
    },
  ],
};

test('open translate close reopen restores Chinese without extra fetch', async () => {
  let fetchCalls = 0;
  const fixture = createReopenFixture();
  const idle = createTimedIdleHarness();
  const translator = createMarketplaceLazyTranslator({
    fetchJson: async () => {
      fetchCalls++;
      return SAMPLE_CATALOG;
    },
    requestIdleCallback: idle.requestIdleCallback,
    getDocument: () => fixture.document,
    mappingsUrl: 'cursor-zh://marketplace.descriptions.json',
    performance: idle.perf,
  });

  fixture.openMarketplace();
  const firstStart = idle.perf.now;
  await translator.activate();
  idle.flushIdle();
  const firstDuration = idle.perf.now - firstStart;
  assert.match(fixture.textNode.textContent, /Slack MCP 服务器/);

  translator.deactivate();
  fixture.closeMarketplace();

  fixture.openMarketplace();
  const secondStart = idle.perf.now;
  await translator.activate();
  idle.flushIdle();
  const secondDuration = idle.perf.now - secondStart;

  assert.equal(fetchCalls, 1);
  assert.match(fixture.textNode.textContent, /Slack MCP 服务器/);
  if (process.env.CURSOR_ZH_PERF === '1') {
    assert.ok(secondDuration < firstDuration * 0.5);
  }
});
