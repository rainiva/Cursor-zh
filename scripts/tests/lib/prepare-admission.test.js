'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  resolveTranslationUnitOutcomes,
  computePrepareAdmission,
  buildPrepareAdmissionForContext,
  loadPrepareAdmissionInputs,
} = require('../../lib/compatibility/prepare-admission.js');
const { fixtureV1 } = require('./fixtures/update-drift/product-tips.js');

test('resolveTranslationUnitOutcomes marks missing static aliases and resolved semantic locators', () => {
  const units = [
    {
      translationId: 'composer.send_follow_up',
      aliases: ['Add a follow-up'],
      severity: 'error',
      primary: { kind: 'static_patch' },
    },
    {
      translationId: 'product_tips.render_text',
      aliases: ['product_tip_render_text'],
      severity: 'error',
      primary: { kind: 'semantic', locatorId: 'product_tips.render_text', cardinality: 1 },
    },
  ];

  const outcomes = resolveTranslationUnitOutcomes(units, [
    `unrelated ${fixtureV1}`,
  ]);

  assert.equal(outcomes[0].primary, 'missing');
  assert.equal(outcomes[1].primary, 'resolved');
});

test('computePrepareAdmission BLOCKED when error primary fails without current proof', () => {
  const units = [
    {
      translationId: 'composer.send_follow_up',
      aliases: ['Add a follow-up'],
      severity: 'error',
      primary: { kind: 'static_patch' },
    },
  ];
  const updateProfile = {
    version: 1,
    cursorVersion: '1.0.0',
    vscodeVersion: '1.0.0',
    bundles: [{ capabilityId: 'workbench.desktop', hash: 'abc' }],
    nls: { inventoryHash: 'nls' },
    units: [{ translationId: 'composer.send_follow_up', outcome: 'missing' }],
  };

  const result = computePrepareAdmission({
    units,
    sourceTexts: ['no aliases here'],
    updateProfile,
    toolVersion: '0.2.2',
  });

  assert.equal(result.admission.status, 'BLOCKED');
  assert.deepEqual(result.admission.blockers, ['composer.send_follow_up']);
  assert.ok(result.currentProofKey);
  assert.notEqual(result.currentProofKey, '');
});

test('buildPrepareAdmissionForContext loads units and BLOCKED against empty install sources', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-prep-adm-'));
  const workbenchPath = path.join(root, 'workbench.js');
  fs.writeFileSync(workbenchPath, 'const x = 1;', 'utf8');
  const workspaceRoot = path.resolve(__dirname, '../../..');
  const toolPaths = {
    workspaceRoot,
    translationUnitsPath: path.join(workspaceRoot, 'translations', 'meta', 'translation-units.json'),
    surfacesMetaPath: path.join(workspaceRoot, 'translations', 'meta', 'surfaces.json'),
    buildManifestPath: path.join(root, 'missing-manifest.json'),
  };

  const result = buildPrepareAdmissionForContext(
    {
      paths: { workbenchOriginalPath: workbenchPath, installDir: root },
      options: {},
    },
    toolPaths,
    {
      fs,
      sha256OfFile: (filePath) => `hash:${path.basename(filePath)}`,
      readJsonIfExists: () => null,
      toolVersion: '0.2.2',
    }
  );

  assert.ok(result.units.length > 0, 'must load real translation units');
  assert.equal(result.admission.status, 'BLOCKED');
  assert.ok(result.admission.blockers.length > 0);
  assert.ok(result.currentProofKey);
});

// Cursor 3.13.10 drift: dialog literals moved out of the bundles into the nls catalog,
// and apply translates nls.messages.json in place, so an applied install exposes only
// the Chinese changeText. Admission must accept that as primary evidence.
test('resolveTranslationUnitOutcomes resolves mapping units via changeText on applied installs', () => {
  const units = [
    {
      translationId: 'agent_shutdown_dialog.agent_shutdown_quit',
      changeText: '仍要退出',
      aliases: ['Quit Anyway'],
      severity: 'error',
      primary: { kind: 'mapping' },
    },
    {
      translationId: 'extension_cache_dialog.extension_cache_dialog',
      changeText: '扩展在磁盘上已被修改。请重新加载窗口。',
      aliases: ['Extensions have been modified on disk. Please reload the window.'],
      severity: 'error',
      primary: { kind: 'mapping' },
    },
  ];

  const translatedNlsSource = '["仍要退出","扩展在磁盘上已被修改。请重新加载窗口。"]';
  const outcomes = resolveTranslationUnitOutcomes(units, [translatedNlsSource]);

  assert.equal(outcomes[0].primary, 'resolved');
  assert.equal(outcomes[1].primary, 'resolved');
});

test('resolveTranslationUnitOutcomes keeps fail-closed when neither alias nor changeText exists', () => {
  const units = [
    {
      translationId: 'agent_shutdown_dialog.agent_shutdown_quit',
      changeText: '仍要退出',
      aliases: ['Quit Anyway'],
      severity: 'error',
      primary: { kind: 'mapping' },
    },
  ];

  const outcomes = resolveTranslationUnitOutcomes(units, ['no evidence at all']);

  assert.equal(outcomes[0].primary, 'missing');
});

test('computePrepareAdmission passes the 3.13.10 blocker set against translated-only nls evidence', () => {
  const workspaceRoot = path.resolve(__dirname, '../../..');
  const { units } = loadPrepareAdmissionInputs(
    {
      workspaceRoot,
      translationUnitsPath: path.join(workspaceRoot, 'translations', 'meta', 'translation-units.json'),
      surfacesMetaPath: path.join(workspaceRoot, 'translations', 'meta', 'surfaces.json'),
    },
    { workspaceRoot }
  );
  const blockerIds = [
    'extension_cache_dialog.extension_cache_dialog',
    'extension_cache_dialog.reload_window_mnemonic',
    'agent_shutdown_dialog.agent_shutdown_title',
    'agent_shutdown_dialog.agents_shutdown_title',
    'agent_shutdown_dialog.agent_shutdown_body_single',
    'agent_shutdown_dialog.agent_shutdown_body_plural',
    'agent_shutdown_dialog.agent_shutdown_quit',
  ];
  const blockerUnits = units.filter((unit) => blockerIds.includes(unit.translationId));
  assert.equal(blockerUnits.length, blockerIds.length, 'all 7 blocker units must exist');

  // Simulate the applied 3.13.10 install: nls catalog already Chinese, bundles carry no literals.
  const translatedNls = JSON.stringify(blockerUnits.map((unit) => unit.changeText));
  const outcomes = resolveTranslationUnitOutcomes(blockerUnits, [translatedNls]);

  for (const [index, outcome] of outcomes.entries()) {
    assert.equal(
      outcome.primary,
      'resolved',
      `${blockerUnits[index].translationId} must resolve via changeText evidence`
    );
  }
});
