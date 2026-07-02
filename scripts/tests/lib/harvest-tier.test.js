const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_HARVEST_TIER,
  HARVEST_TIER_ACTIONABLE,
  HARVEST_TIER_FULL,
  shouldIncludeHarvestEntry,
} = require('../../lib/analyzer/harvest-string-quality.js');
const { extractStringsFromSource } = require('../../lib/analyzer/string-harvest.js');

const ACTIONABLE = { tier: HARVEST_TIER_ACTIONABLE };
const FULL = { tier: HARVEST_TIER_FULL };

test('harvest tier constants default to actionable for maintainer scans', () => {
  assert.equal(HARVEST_TIER_ACTIONABLE, 'actionable');
  assert.equal(HARVEST_TIER_FULL, 'full');
  assert.equal(DEFAULT_HARVEST_TIER, HARVEST_TIER_ACTIONABLE);
});

test('shouldIncludeHarvestEntry uses actionable tier by default', () => {
  assert.equal(shouldIncludeHarvestEntry('Working', 'children:'), false);
  assert.equal(shouldIncludeHarvestEntry('Register Close Tooltip', 'title:'), true);
});

test('actionable tier always keeps high-confidence UI property contexts', () => {
  const samples = [
    ['Register Close Tooltip', 'title:'],
    ['Compare', 'label:'],
    ['Summarize your changes...', 'placeholder:'],
    ['Extend Cursor with Plugins', 'heading:'],
    ['Save && Close', 'label:'],
  ];

  for (const [text, context] of samples) {
    assert.equal(
      shouldIncludeHarvestEntry(text, context, ACTIONABLE),
      true,
      `expected actionable keep: ${text} (${context})`
    );
  }
});

test('actionable tier rejects literal and original contexts', () => {
  assert.equal(shouldIncludeHarvestEntry('Register Close Tooltip', 'literal', ACTIONABLE), false);
  assert.equal(shouldIncludeHarvestEntry('Register Close Tooltip', 'original:', ACTIONABLE), false);
});

test('actionable tier rejects children noise from 3.9.16 harvest report', () => {
  const noise = [
    'Working',
    'Submenu',
    'Create',
    'Command',
    'Remove',
    'Review',
    'Checkout',
    'Zoom in',
    'Thumbs up',
    'Fork chat',
  ];

  for (const text of noise) {
    assert.equal(
      shouldIncludeHarvestEntry(text, 'children:', ACTIONABLE),
      false,
      `expected actionable drop children noise: ${text}`
    );
  }
});

test('actionable tier keeps leading-space children badges', () => {
  assert.equal(shouldIncludeHarvestEntry(' Changed', 'children:', ACTIONABLE), true);
  assert.equal(shouldIncludeHarvestEntry(' Tokens', 'children:', ACTIONABLE), true);
  assert.equal(shouldIncludeHarvestEntry(' [blocked]', 'children:', ACTIONABLE), true);
  assert.equal(shouldIncludeHarvestEntry(' Queued', 'children:', ACTIONABLE), true);
});

test('actionable tier keeps multi-word or long children copy', () => {
  assert.equal(
    shouldIncludeHarvestEntry('Open parent conversation', 'children:', ACTIONABLE),
    true
  );
  assert.equal(
    shouldIncludeHarvestEntry('Open in Terminal Pane', 'children:', ACTIONABLE),
    true
  );
  assert.equal(
    shouldIncludeHarvestEntry('No diagnostics found', 'children:', ACTIONABLE),
    true
  );
  assert.equal(
    shouldIncludeHarvestEntry(
      'Chat title. Right-click for more actions.',
      'children:',
      ACTIONABLE
    ),
    true
  );
});

test('actionable tier still rejects CSS and React children noise after tier gate', () => {
  assert.equal(
    shouldIncludeHarvestEntry(
      'ui-step-group-collapsible agent-transcript-notification-collapsible',
      'children:',
      ACTIONABLE
    ),
    false
  );
  assert.equal(
    shouldIncludeHarvestEntry(
      'Menu.ExpandableSection components must be used within <Menu.ExpandableSection>',
      'children:',
      ACTIONABLE
    ),
    false
  );
});

test('full tier preserves permissive children harvesting for inventory scans', () => {
  const inventory = [
    'Working',
    'Thumbs up',
    'Fork chat',
    'Zoom in',
    'Agent disconnected',
  ];

  for (const text of inventory) {
    assert.equal(
      shouldIncludeHarvestEntry(text, 'children:', FULL),
      true,
      `expected full tier keep: ${text}`
    );
  }
});

test('full tier matches legacy shouldIncludeHarvestEntry behavior for title and label', () => {
  assert.equal(
    shouldIncludeHarvestEntry('Register Close Tooltip', 'title:', FULL),
    shouldIncludeHarvestEntry('Register Close Tooltip', 'title:')
  );
  assert.equal(
    shouldIncludeHarvestEntry('flex', 'title:', FULL),
    shouldIncludeHarvestEntry('flex', 'title:')
  );
});

test('extractStringsFromSource applies actionable tier to shrink children noise', () => {
  const source = `
title:"Plugin Settings";
label:"Secrets";
children:"Working";
children:"Submenu";
children:" Changed";
children:"Open parent conversation";
children:"ui-step-group-collapsible agent-transcript-notification-collapsible";
`;

  const strings = extractStringsFromSource(source, 'workbench.desktop.main.js', ACTIONABLE);
  const texts = strings.map((entry) => entry.text);

  assert.ok(texts.includes('Plugin Settings'));
  assert.ok(texts.includes('Secrets'));
  assert.ok(texts.includes(' Changed'));
  assert.ok(texts.includes('Open parent conversation'));
  assert.equal(texts.includes('Working'), false);
  assert.equal(texts.includes('Submenu'), false);
  assert.equal(
    texts.some((text) => text.includes('ui-step-group-collapsible')),
    false
  );
});

test('extractStringsFromSource full tier keeps inventory children strings', () => {
  const source = 'children:"Working";children:"Thumbs up";title:"Verified";';
  const strings = extractStringsFromSource(source, 'workbench.desktop.main.js', FULL);
  const texts = strings.map((entry) => entry.text);

  assert.ok(texts.includes('Working'));
  assert.ok(texts.includes('Thumbs up'));
  assert.ok(texts.includes('Verified'));
});

test('actionable tier does not relax title or label quality gates', () => {
  assert.equal(shouldIncludeHarvestEntry('flex', 'title:', ACTIONABLE), false);
  assert.equal(shouldIncludeHarvestEntry('separator', 'label:', ACTIONABLE), false);
  assert.equal(
    shouldIncludeHarvestEntry('editor.experimentalGpuAcceleration', 'label:', ACTIONABLE),
    false
  );
});
