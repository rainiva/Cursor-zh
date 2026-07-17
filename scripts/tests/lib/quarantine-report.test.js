const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  buildQuarantineReport,
  writeQuarantineReport,
  summarizeUpdateAdmission,
} = require('../../lib/compatibility/quarantine-report.js');

test('prioritizes blockers, preserves static copy, and strips unauthorized runtime raw text', () => {
  const report = buildQuarantineReport([
    { source: 'static', text: 'Brand new copy', surface: 'composer', kind: 'unknown', critical: true },
    { source: 'runtime', text: 'private prompt', surface: 'composer', kind: 'unknown', capturePolicy: 'fingerprint-only' },
    { source: 'runtime', fingerprint: 'abc', surface: 'composer', count: 2, kind: 'unknown', capturePolicy: 'fingerprint-only' },
    { translationId: 'composer.send', kind: 'blocked' },
    { text: 'inventory token', surface: 'unknown', kind: 'noise' },
  ]);
  assert.deepEqual(report.blockers.map((item) => item.translationId), ['composer.send']);
  assert.deepEqual(report.criticalUnknown.map((item) => item.text), ['Brand new copy']);
  assert.equal(report.criticalUnknown[0].changeText, undefined);
  assert.equal(JSON.stringify(report).includes('private prompt'), false);
  assert.equal(report.privacyDrops, 1);
});

test('writeQuarantineReport reapplies privacy filter and never persists ephemeral HMAC keys', () => {
  const reportPath = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-quarantine-')),
    'quarantine-report.json'
  );
  const written = writeQuarantineReport({
    records: [
      {
        source: 'runtime',
        text: 'secret chat',
        surface: 'composer',
        kind: 'unknown',
        capturePolicy: 'fingerprint-only',
        keyScope: 'session',
        hmacKey: 'ephemeral-key',
      },
      { source: 'static', text: 'Visible label', surface: 'settings', kind: 'unknown', critical: false },
    ],
    reportPath,
    writeJson: (filePath, payload) => {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
    },
  });

  const serialized = fs.readFileSync(reportPath, 'utf8');
  assert.equal(serialized.includes('secret chat'), false);
  assert.equal(serialized.includes('ephemeral-key'), false);
  assert.equal(serialized.includes('hmacKey'), false);
  assert.equal(written.privacyDrops, 1);
  assert.deepEqual(written.visibleUnknown.map((item) => item.text), ['Visible label']);
});

test('summarizeUpdateAdmission keeps blocked units as issues and degraded fallbacks as warnings', () => {
  const summary = summarizeUpdateAdmission({
    admission: {
      status: 'DEGRADED',
      blockers: [],
      fallbacks: ['product_tips.render_text'],
    },
    updateProfile: {
      units: [
        { translationId: 'composer.send_follow_up', outcome: 'resolved' },
        { translationId: 'product_tips.render_text', outcome: 'fallback', fallbackProof: { proofKey: 'current-key' } },
        { translationId: 'composer.send', outcome: 'blocked' },
      ],
    },
    quarantineReport: {
      criticalUnknown: [{ text: 'New copy', surface: 'composer' }],
      visibleUnknown: [{ fingerprint: 'abc', surface: 'composer', count: 1 }],
      privacyDrops: 0,
    },
  });

  assert.deepEqual(summary.resolved, ['composer.send_follow_up']);
  assert.deepEqual(summary.fallback, [
    { translationId: 'product_tips.render_text', proofKey: 'current-key' },
  ]);
  assert.deepEqual(summary.blocked, ['composer.send']);
  assert.equal(summary.unknown.critical, 1);
  assert.equal(summary.unknown.visible, 1);
  assert.equal(summary.issues.length, 1);
  assert.match(summary.warnings[0], /product_tips\.render_text/);
});
