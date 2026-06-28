const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const {
  CRITICAL_MARKETPLACE_UI_SHELL_TARGETS,
} = require('../../lib/mapping/critical-ui-targets.js');
const { applyStaticSourceTranslations, translateTextWithMappings } = require('../../cursor-zh-lib.js');
const { readJsonIfExists } = require('../../tool/io.js');
const { createToolPaths } = require('../../tool/paths.js');
const { createRuntimeDomHarness } = require('./helpers/runtime-dom-harness.js');

const toolPaths = createToolPaths(path.join(__dirname, '../../..'));

function loadOverlayCommonMappings() {
  return readJsonIfExists(toolPaths.cursorWinCommonPath, []);
}

test('marketplace UI shell targets include Discover and search placeholders', () => {
  const originals = CRITICAL_MARKETPLACE_UI_SHELL_TARGETS.map((entry) => entry.originalText);
  assert.ok(originals.includes('Discover'));
  assert.ok(originals.includes('Search Plugins, Skills, MCPs...'));
  assert.ok(originals.includes('Search skills, rules, subagents, MCPs, and hooks'));
  assert.ok(originals.includes('Enable'));
});

test('cursor-win.common.json defines every marketplace UI shell mapping', () => {
  const mappings = loadOverlayCommonMappings();
  const byOriginal = new Map(mappings.map((entry) => [entry.originalText, entry]));

  for (const critical of CRITICAL_MARKETPLACE_UI_SHELL_TARGETS) {
    const entry = byOriginal.get(critical.originalText);
    assert.ok(entry, `missing mapping: ${critical.originalText}`);
    assert.equal(entry.changeText, critical.changeText, critical.originalText);
  }
});

test('static translation replaces marketplace Discover tab label in bundle fragment', () => {
  const source = 'className:"ui-yab65l",children:"Discover"';
  const mappings = loadOverlayCommonMappings();
  const translated = applyStaticSourceTranslations(source, mappings);
  assert.match(translated, /children:"发现"/);
  assert.doesNotMatch(translated, /children:"Discover"/);
});

test('runtime exact mapping translates marketplace Enable button in DOM fixture', () => {
  const mappings = loadOverlayCommonMappings();
  const enableEntry = mappings.find((entry) => entry.originalText === 'Enable');
  assert.ok(enableEntry, 'Enable mapping should exist');

  const harness = createRuntimeDomHarness({
    mappings: [enableEntry],
    runtimeConfig: {
      mode: 'performance',
      rescanDelaysMs: [],
      observeScopeSelectors: ['[class*="marketplace"]'],
      marketplaceLazyTranslationEnabled: false,
    },
  });

  const root = harness.document.createElement('div');
  root.setAttribute('class', 'marketplace-plugin-card');
  const button = harness.document.createElement('button');
  button.textContent = 'Enable';
  root.appendChild(button);
  harness.document.body.appendChild(root);

  harness.runDueTimers(Infinity);
  harness.flushMicrotasks();

  assert.equal(button.textContent, '启用');
});
