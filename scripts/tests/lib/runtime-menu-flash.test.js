const test = require('node:test');
const assert = require('node:assert/strict');

const { createRuntimeDomHarness } = require('./helpers/runtime-dom-harness.js');

const MENU_RUNTIME_MAPPING = {
  originalText: 'Copy as Markdown',
  changeText: '复制为 Markdown',
  searchType: 'exact',
  surface: 'glass_menu',
  forceRuntime: true,
};

const L2_STATIC_SOURCE = 'children:"复制为 Markdown"';

function createMenuRuntimeHarness() {
  const harness = createRuntimeDomHarness({
    workbenchSource: 'label:"Copy as Markdown"',
    runtimeMappings: [MENU_RUNTIME_MAPPING],
  });
  harness.runDueTimers(Infinity);
  return harness;
}

test('L3 menu item is translated in the same turn after mount without waiting for idle timers', () => {
  const harness = createMenuRuntimeHarness();
  const { menu } = harness.mountMenuItem('Copy as Markdown');

  harness.flushMicrotasks();

  assert.equal(
    harness.getMenuItemText(menu),
    '复制为 Markdown',
    'menu item should be Chinese before requestIdleCallback or debounce timers run'
  );
  assert.doesNotMatch(harness.getMenuItemText(menu), /Copy as Markdown/);
});

test('remounting a new menu translates in the same turn without idle timers', () => {
  const harness = createMenuRuntimeHarness();
  const first = harness.mountMenuItem('Copy as Markdown');
  harness.flushMicrotasks();
  assert.equal(harness.getMenuItemText(first.menu), '复制为 Markdown');

  first.menu.remove();
  const pendingBeforeRemount = harness.pendingTimerCount();
  const second = harness.mountMenuItem('Copy as Markdown');
  harness.flushMicrotasks();

  assert.equal(
    harness.getMenuItemText(second.menu),
    '复制为 Markdown',
    'newly mounted menu should not flash English on reopen'
  );
  assert.equal(harness.pendingTimerCount(), pendingBeforeRemount);
});

test('L2 static-covered menu label control renders Chinese without runtime flash window', () => {
  const harness = createRuntimeDomHarness({
    workbenchSource: L2_STATIC_SOURCE,
    runtimeMappings: [],
    translatedSource: L2_STATIC_SOURCE,
  });
  harness.runDueTimers(Infinity);

  const { menu } = harness.mountMenuItem('复制为 Markdown');
  harness.flushMicrotasks();

  assert.equal(harness.getMenuItemText(menu), '复制为 Markdown');
  assert.doesNotMatch(harness.getMenuItemText(menu), /Copy as Markdown/);
});
