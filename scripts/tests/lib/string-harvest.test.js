const test = require('node:test');
const assert = require('node:assert/strict');

const HARVEST_SNIPPET = require('./fixtures/harvest-workbench-snippet.js');
const {
  extractStringsFromSource,
  extractAnchorsFromSource,
  harvestWorkbenchSources,
} = require('../../lib/analyzer/string-harvest.js');

test('extractStringsFromSource finds known UI literals from fixture snippet', () => {
  const strings = extractStringsFromSource(HARVEST_SNIPPET, 'workbench.glass.main.js');
  const texts = strings.map((entry) => entry.text);

  assert.ok(texts.includes('Toggle Expand Agent'));
  assert.ok(texts.includes('Copy as Markdown'));
  assert.ok(texts.includes('Extend Cursor with Plugins'));
  assert.ok(texts.includes(' Queued'));
  assert.ok(!texts.includes('1 Queued'));
});

test('extractStringsFromSource tags children context for queued badge fragment', () => {
  const strings = extractStringsFromSource(HARVEST_SNIPPET, 'workbench.glass.main.js');
  const queued = strings.find((entry) => entry.text === ' Queued');

  assert.ok(queued);
  assert.match(String(queued.context), /children/i);
});

test('extractAnchorsFromSource finds glass command anchor with id and title', () => {
  const anchors = extractAnchorsFromSource(HARVEST_SNIPPET, 'workbench.glass.main.js');
  const toggle = anchors.find((entry) => entry.id === 'workbench.action.toggleExpandAgent');

  assert.ok(toggle);
  assert.equal(toggle.type, 'glassCommand');
  assert.equal(toggle.text, 'Toggle Expand Agent');
  assert.equal(toggle.field, 'title');
});

test('harvestWorkbenchSources returns version metadata and grouped files', () => {
  const result = harvestWorkbenchSources({
    cursorVersion: '3.9.8',
    vscodeVersion: '1.105.1',
    files: [{ path: 'workbench.glass.main.js', source: HARVEST_SNIPPET }],
  });

  assert.equal(result.cursorVersion, '3.9.8');
  assert.equal(result.vscodeVersion, '1.105.1');
  assert.ok(result.generatedAt);
  assert.equal(result.files.length, 1);
  assert.ok(result.files[0].strings.length > 0);
  assert.ok(result.anchors.length > 0);
});

test('extractStringsFromSource scans large minified bundles within performance budget', () => {
  const chunk = 'title:"Hello world";';
  const source = chunk.repeat(200000);
  const start = performance.now();
  const strings = extractStringsFromSource(source);
  const elapsedMs = performance.now() - start;

  assert.ok(strings.length >= 100000);
  assert.ok(elapsedMs < 3000, `expected <3000ms, got ${elapsedMs.toFixed(1)}ms`);
});
