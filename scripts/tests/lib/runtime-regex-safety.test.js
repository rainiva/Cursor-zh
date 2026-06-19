const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildTranslatedWorkbenchBundleParts,
} = require('../../lib/runtime/bundle-builder.js');

function evaluateRuntimeHeader(header) {
  const sandbox = {
    globalThis: {},
    window: {},
    document: {
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

  const fn = new Function(
    'globalThis',
    'window',
    'document',
    'Node',
    'MutationObserver',
    'requestIdleCallback',
    'queueMicrotask',
    'performance',
    'console',
    'setTimeout',
    'clearTimeout',
    'setInterval',
    'clearInterval',
    header
  );

  fn(
    sandbox.globalThis,
    sandbox.window,
    sandbox.document,
    sandbox.Node,
    sandbox.MutationObserver,
    sandbox.requestIdleCallback,
    sandbox.queueMicrotask,
    sandbox.performance,
    sandbox.console,
    sandbox.setTimeout,
    sandbox.clearTimeout,
    sandbox.setInterval,
    sandbox.clearInterval
  );

  return sandbox.globalThis;
}

test('runtime product tip translator skips invalid regex mappings without throwing', () => {
  const parts = buildTranslatedWorkbenchBundleParts({
    workbenchSource: '',
    mappings: [
      {
        originalText: 'Keep',
        changeText: '保留',
        searchType: 'exact',
        scopeSelectors: ['[class*="empty-state-rotating-tips"]'],
      },
      {
        originalText: '(unclosed',
        changeText: '无效',
        searchType: 'regex',
        scopeSelectors: ['[class*="empty-state-rotating-tips"]'],
      },
    ],
    runtimeMappings: [],
    metadata: { runtimeConfig: { mode: 'performance' } },
    translatedSource: '',
  });

  const globals = evaluateRuntimeHeader(parts.runtimeHeader);
  assert.equal(typeof globals.__cursorZhTranslateProductTipText, 'function');
  assert.equal(globals.__cursorZhTranslateProductTipText('Keep'), '保留');
  assert.equal(globals.__cursorZhTranslateProductTipText('tip (unclosed'), 'tip (unclosed');
});

test('runtime inline translator skips invalid regex mappings without throwing', () => {
  const parts = buildTranslatedWorkbenchBundleParts({
    workbenchSource: '',
    mappings: [],
    runtimeMappings: [
      { originalText: 'Keep', changeText: '保留', searchType: 'exact' },
      { originalText: '[invalid', changeText: '无效', searchType: 'regex' },
    ],
    metadata: { runtimeConfig: { mode: 'performance' } },
    translatedSource: '',
  });

  const globals = evaluateRuntimeHeader(parts.runtimeHeader);
  assert.equal(typeof globals.__cursorZhTranslateInlineText, 'function');
  assert.equal(globals.__cursorZhTranslateInlineText('Keep'), '保留');
});
