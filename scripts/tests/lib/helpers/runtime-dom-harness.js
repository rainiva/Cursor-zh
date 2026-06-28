const vm = require('vm');
const { buildTranslatedWorkbenchBundleParts } = require('../../../lib/runtime/bundle-builder.js');
const { createRuntimeConfigModule } = require('../../../tool/runtime-config.js');
const { normalizeRuntimeMode } = require('../../../tool/context.js');

const { buildRuntimeConfig } = createRuntimeConfigModule({ normalizeRuntimeMode });

const NODE = {
  ELEMENT_NODE: 1,
  TEXT_NODE: 3,
  DOCUMENT_NODE: 9,
  DOCUMENT_FRAGMENT_NODE: 11,
};

function parseSimpleSelector(selector) {
  const roleMatch = selector.match(/^\[role="([^"]+)"\]$/);
  if (roleMatch) {
    return { type: 'role', value: roleMatch[1] };
  }
  const classMatch = selector.match(/^\[class\*="([^"]+)"\]$/);
  if (classMatch) {
    return { type: 'class', value: classMatch[1] };
  }
  return { type: 'raw', value: selector };
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
  return false;
}

function elementMatchesAny(element, selectors) {
  return selectors.some((selector) => elementMatchesSelector(element, selector));
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
    appendChild(child) {
      if (!child) return child;
      if (child.parentElement) {
        child.parentElement.removeChild(child);
      }
      child.parentElement = this;
      children.push(child);
      documentRef.__notifyChildList(this, [child]);
      return child;
    },
    removeChild(child) {
      const index = children.indexOf(child);
      if (index >= 0) {
        children.splice(index, 1);
        child.parentElement = null;
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

function createRuntimeDomHarness(options = {}) {
  const timers = [];
  let timerId = 1;
  const microtasks = [];
  const mutationObservers = new Set();

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
    __notifyChildList(target, addedNodes) {
      for (const observer of mutationObservers) {
        observer.__deliver({
          type: 'childList',
          target,
          addedNodes,
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
  const parts = buildTranslatedWorkbenchBundleParts({
    workbenchSource: options.workbenchSource || '',
    mappings: options.mappings || [],
    runtimeMappings: options.runtimeMappings,
    metadata: {
      runtimeConfig,
      version: options.version || '3.9.8',
    },
    translatedSource: options.translatedSource || '',
  });

  vm.runInNewContext(parts.runtimeHeader, sandbox);

  return {
    sandbox,
    document: documentRef,
    runtime: sandbox.globalThis.__cursorZhRuntime,
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
      this.flushMicrotasks();
      const pending = timers.filter((timer) => timer.delay <= maxDelay);
      timers.length = 0;
      for (const timer of pending.sort((left, right) => left.delay - right.delay)) {
        if (timer.kind === 'idle') {
          timer.callback({ timeRemaining: () => 0 });
        } else {
          timer.callback();
        }
      }
      this.flushMicrotasks();
    },
    pendingTimerCount() {
      return timers.length;
    },
  };
}

module.exports = {
  createRuntimeDomHarness,
  buildRuntimeConfig,
};
