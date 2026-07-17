const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildUpdateProfile,
  compareUpdateProfiles,
} = require('../../lib/compatibility/update-profile.js');

test('classifies hash drift without storing source text', () => {
  const previous = buildUpdateProfile({
    cursorVersion: '3.12.9',
    vscodeVersion: '1.128.0',
    bundles: [{ capabilityId: 'workbench.desktop', hash: 'old' }],
    nls: { inventoryHash: 'nls' },
    units: [{ translationId: 'composer.send_follow_up', outcome: 'resolved' }],
  });
  const current = buildUpdateProfile({
    cursorVersion: '3.12.10',
    vscodeVersion: '1.128.0',
    bundles: [{ capabilityId: 'workbench.desktop', hash: 'new' }],
    nls: { inventoryHash: 'nls' },
    units: [{ translationId: 'composer.send_follow_up', outcome: 'resolved' }],
  });
  assert.deepEqual(compareUpdateProfiles(previous, current), {
    status: 'KNOWN_DRIFT',
    changed: ['bundle:workbench.desktop'],
  });
  assert.equal(JSON.stringify(current).includes('sourceText'), false);
});
