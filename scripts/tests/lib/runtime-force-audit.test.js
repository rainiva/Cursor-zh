const test = require('node:test');
const assert = require('node:assert/strict');

const { selectRuntimeMappings } = require('../../lib/patcher/runtime-selector.js');
const {
  CRITICAL_GLASS_ROUND41_UI_TARGETS,
  CRITICAL_GLASS_ROUND42_UI_TARGETS,
} = require('../../lib/mapping/critical-ui-targets.js');
const {
  isRealWorkbenchAvailable,
  loadRealWorkbenchFixture,
} = require('./helpers/real-workbench-fixture.js');

const EMBEDDED_COVERED_LABELS = [
  'Building...',
  'Built',
  'Build',
  'Build Locally',
  'Build in Parallel',
  'Build in Cloud',
  'Stop All',
];

test('Round 41/42 critical targets disable forceRuntime on embedded-covered labels', () => {
  for (const entry of [...CRITICAL_GLASS_ROUND41_UI_TARGETS, ...CRITICAL_GLASS_ROUND42_UI_TARGETS]) {
    if (!EMBEDDED_COVERED_LABELS.includes(entry.originalText)) {
      continue;
    }
    assert.equal(entry.forceRuntime, false, entry.originalText);
  }
});

test('selectRuntimeMappings excludes embedded-covered Round 41/42 labels from real workbench pool', () => {
  if (!isRealWorkbenchAvailable()) {
    return;
  }

  const fixture = loadRealWorkbenchFixture();
  const runtime = selectRuntimeMappings(fixture.source, fixture.mergedMappings, fixture.index);
  const originals = new Set(runtime.map((entry) => entry.originalText));

  for (const label of EMBEDDED_COVERED_LABELS) {
    if (!fixture.index.hasQuotedLiteral(label)) {
      continue;
    }
    assert.equal(originals.has(label), false, `${label} should not enter runtime when static handles it`);
  }
});
