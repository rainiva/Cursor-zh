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
