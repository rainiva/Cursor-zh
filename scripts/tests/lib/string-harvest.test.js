const test = require('node:test');
const assert = require('node:assert/strict');

const HARVEST_SNIPPET = require('./fixtures/harvest-workbench-snippet.js');
const {
  extractStringsFromSource,
  extractAnchorsFromSource,
  harvestWorkbenchSources,
} = require('../../lib/analyzer/string-harvest.js');

test('extractStringsFromSource infers heading= property assignments as UI context', () => {
  const source = 'section.heading="Extend Cursor with Plugins";';
  const strings = extractStringsFromSource(source, 'workbench.glass.main.js');

  assert.equal(strings.length, 1);
  assert.equal(strings[0].text, 'Extend Cursor with Plugins');
  assert.equal(strings[0].context, 'heading:');
});

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

test('extractStringsFromSource filters minified bundle noise from real UI literals', () => {
  const source = `
typeof undefined==="undefined"&&function(){throw new TypeError("Class extends value undefined is not a constructor or null")}
title:"Register Close Tooltip";
label:"Monaco rectangle renderer render pass";
,title:x(192,null),order:1},{menuId:st.SimpleEditorContext,group:
title:"Copy as Markdown";
`;
  const strings = extractStringsFromSource(source, 'workbench.glass.main.js');
  const texts = strings.map((entry) => entry.text);

  assert.ok(texts.includes('Register Close Tooltip'));
  assert.ok(texts.includes('Copy as Markdown'));
  assert.equal(texts.includes('undefined'), false);
  assert.equal(texts.includes('function'), false);
  assert.equal(texts.some((text) => text.includes('menuId:')), false);
  assert.equal(texts.some((text) => text.includes('Monaco rectangle')), false);
});

test('extractStringsFromSource keeps actionable count bounded for tslib-heavy bundles', () => {
  const source = `
throw new TypeError("Object expected");
throw new TypeError("Generator is already executing.");
throw new TypeError("Private accessor was defined without a getter");
title:"flex";
title:"button";
title:"div@first";
label:"editor.experimentalGpuAcceleration";
label:"separator";
title:"Register Close Tooltip";
label:"Copy as Markdown";
children:[t.length," Queued"];
heading:"Extend Cursor with Plugins";
`;
  const strings = extractStringsFromSource(source, 'workbench.glass.main.js');
  const texts = strings.map((entry) => entry.text);

  assert.ok(strings.length <= 10, `expected <=10 actionable strings, got ${strings.length}`);
  assert.ok(texts.includes('Register Close Tooltip'));
  assert.ok(texts.includes('Copy as Markdown'));
  assert.ok(texts.includes(' Queued'));
  assert.equal(texts.includes('Object expected'), false);
  assert.equal(texts.includes('flex'), false);
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
