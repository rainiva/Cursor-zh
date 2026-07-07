const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const {
  CRITICAL_GLASS_ROUND48_UI_TARGETS,
  CRITICAL_EMBEDDED_UI_PATCHES,
} = require('../../lib/mapping/critical-ui-targets.js');
const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');
const { mergeMappings, translateTextWithMappings } = require('../../cursor-zh-lib');
const { readJsonIfExists } = require('../../tool/io');
const { createToolPaths } = require('../../tool/paths');

const ROUND48_EMBEDDED = [
  {
    from: 'fixCiPillSingleLabel:"Debug CI Failure"',
    to: 'fixCiPillSingleLabel:"调试 CI 失败"',
  },
  {
    from: 'fixCiPillPluralLabelTemplate:"Debug {count} CI Failures"',
    to: 'fixCiPillPluralLabelTemplate:"调试 {count} 个 CI 失败"',
  },
  {
    from: 'fixCiPillLoadingLabel:"Debugging CI"',
    to: 'fixCiPillLoadingLabel:"正在调试 CI"',
  },
  {
    from: 'fixCiPillLoadingProgressLabel:"Debugging CI"',
    to: 'fixCiPillLoadingProgressLabel:"正在调试 CI"',
  },
];

const FIX_CI_PILL_SNIPPET =
  'localOptionLabel:"Run locally in a Worktree",fixCiPillSingleLabel:"Debug CI Failure",fixCiPillPluralLabelTemplate:"Debug {count} CI Failures",fixCiPillLoadingLabel:"Debugging CI",fixCiPillLoadingProgressLabel:"Debugging CI"';

const toolPaths = createToolPaths(path.join(__dirname, '../../..'));

function loadMergedMappings() {
  return mergeMappings(
    mergeMappings(
      mergeMappings(
        readJsonIfExists(toolPaths.baseMappingPath, []),
        readJsonIfExists(toolPaths.overlayMappingPath, [])
      ),
      readJsonIfExists(toolPaths.cursorWinCommonPath, [])
    ),
    readJsonIfExists(toolPaths.dynamicMappingPath, [])
  );
}

test('round 48 defines fix CI pill targets', () => {
  const originals = CRITICAL_GLASS_ROUND48_UI_TARGETS.map((entry) => entry.originalText);
  assert.ok(originals.includes('Debug CI Failure'));
  assert.ok(originals.includes('Debugging CI'));
});

test('round 48 embedded patches are registered', () => {
  for (const patch of ROUND48_EMBEDDED) {
    const match = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === patch.from);
    assert.ok(match, `missing embedded patch: ${patch.from}`);
    assert.equal(match.to, patch.to);
  }
});

test('static translation localizes fix CI pill config snippet', () => {
  const translated = applyStaticSourceTranslations(FIX_CI_PILL_SNIPPET, loadMergedMappings());
  assert.match(translated, /fixCiPillSingleLabel:"调试 CI 失败"/);
  assert.match(translated, /fixCiPillPluralLabelTemplate:"调试 \{count\} 个 CI 失败"/);
  assert.match(translated, /fixCiPillLoadingLabel:"正在调试 CI"/);
  assert.equal(translated.includes('Debug CI Failure'), false);
});

test('merged mappings translate fix CI pill labels', () => {
  const mappings = loadMergedMappings();
  assert.equal(translateTextWithMappings('Debug CI Failure', mappings), '调试 CI 失败');
  assert.equal(
    translateTextWithMappings('Debug {count} CI Failures', mappings),
    '调试 {count} 个 CI 失败'
  );
  assert.equal(translateTextWithMappings('Debugging CI', mappings), '正在调试 CI');
});

test('cursor-win.common.json defines round 48 mappings', () => {
  const mappings = readJsonIfExists(toolPaths.cursorWinCommonPath, []);
  const byOriginal = new Map(mappings.map((entry) => [entry.originalText, entry]));

  for (const critical of CRITICAL_GLASS_ROUND48_UI_TARGETS) {
    const entry = byOriginal.get(critical.originalText);
    assert.ok(entry, `missing mapping: ${critical.originalText}`);
    assert.equal(entry.changeText, critical.changeText, critical.originalText);
  }
});
