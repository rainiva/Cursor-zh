const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  isRealWorkbenchAvailable,
  loadRealWorkbenchFixture,
  resetRealWorkbenchFixtureCacheForTests,
} = require('./real-workbench-fixture.js');
const { applyStaticSourceTranslationsDetailed } = require('../../../lib/patcher/contracts.js');
const { hasUnsuppressedExtensionCacheReloadPrompt } = require('../../../lib/patcher/extension-cache-prompt-guard.js');
const { countProductTipsRenderHookApplied } = require('../../../lib/patcher/product-tips-hook.js');

const DEFAULT_GLASS_WORKBENCH_PATH =
  process.env.CURSOR_GLASS_WORKBENCH_PATH ||
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.glass.main.js';

test.afterEach(() => {
  resetRealWorkbenchFixtureCacheForTests();
});

test('isRealWorkbenchAvailable returns false for missing path', () => {
  assert.equal(
    isRealWorkbenchAvailable(path.join(os.tmpdir(), 'cursor-zh-missing-workbench.js')),
    false
  );
});

test('loadRealWorkbenchFixture returns null when workbench file is missing', () => {
  const fixture = loadRealWorkbenchFixture({
    workbenchPath: path.join(os.tmpdir(), 'cursor-zh-missing-workbench.js'),
  });
  assert.equal(fixture, null);
});

test('loadRealWorkbenchFixture reuses cached source and merged mappings across calls', () => {
  const workbenchPath =
    process.env.CURSOR_WORKBENCH_PATH ||
    'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js';

  if (!fs.existsSync(workbenchPath)) {
    return;
  }

  const first = loadRealWorkbenchFixture({ workbenchPath });
  const second = loadRealWorkbenchFixture({ workbenchPath });

  assert.ok(first);
  assert.ok(second);
  assert.equal(first.source, second.source);
  assert.equal(first.mergedMappings, second.mergedMappings);
});

test('loadRealWorkbenchFixture defers workbench index until accessed', () => {
  const workbenchPath =
    process.env.CURSOR_WORKBENCH_PATH ||
    'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js';

  if (!fs.existsSync(workbenchPath)) {
    return;
  }

  const fixture = loadRealWorkbenchFixture({ workbenchPath });
  assert.ok(fixture.source);
  assert.ok(fixture.mergedMappings.length > 0);
  assert.equal(fixture._indexComputed, false);

  const index = fixture.index;
  assert.ok(index);
  assert.equal(fixture._indexComputed, true);
  assert.equal(fixture.index, index);
});

test('real glass workbench applies product tips render hook (Cursor 3.9.16+)', () => {
  if (!fs.existsSync(DEFAULT_GLASS_WORKBENCH_PATH)) {
    return;
  }

  const fixture = loadRealWorkbenchFixture({ workbenchPath: DEFAULT_GLASS_WORKBENCH_PATH });
  const result = applyStaticSourceTranslationsDetailed(
    fixture.source,
    fixture.mergedMappings,
    fixture.index
  );

  assert.ok(
    result.contracts.product_tips_render_hook.matchCount >= 1,
    `expected product_tips_render_hook match, got: ${JSON.stringify(result.contracts.product_tips_render_hook)}`
  );
  assert.ok(countProductTipsRenderHookApplied(result.translatedSource) >= 1);
});

test('real glass workbench suppresses extension cache reload prompt', () => {
  if (!fs.existsSync(DEFAULT_GLASS_WORKBENCH_PATH)) {
    return;
  }

  const fixture = loadRealWorkbenchFixture({ workbenchPath: DEFAULT_GLASS_WORKBENCH_PATH });
  const result = applyStaticSourceTranslationsDetailed(
    fixture.source,
    fixture.mergedMappings,
    fixture.index
  );

  assert.equal(
    hasUnsuppressedExtensionCacheReloadPrompt(result.translatedSource),
    false,
    'glass workbench should suppress extension cache reload prompt'
  );
});
