function buildUpdateProfile(input) {
  return {
    version: 1,
    cursorVersion: String(input.cursorVersion),
    vscodeVersion: String(input.vscodeVersion),
    bundles: [...input.bundles]
      .map(({ capabilityId, hash }) => ({ capabilityId, hash }))
      .sort((a, b) => a.capabilityId.localeCompare(b.capabilityId)),
    nls: { inventoryHash: input.nls.inventoryHash },
    units: [...input.units]
      .map(({ translationId, outcome }) => ({ translationId, outcome }))
      .sort((a, b) => a.translationId.localeCompare(b.translationId)),
  };
}

function compareUpdateProfiles(previous, current) {
  const changed = [];
  const oldBundles = new Map((previous?.bundles || []).map((item) => [item.capabilityId, item.hash]));
  for (const bundle of current.bundles) {
    if (oldBundles.get(bundle.capabilityId) !== bundle.hash) {
      changed.push(`bundle:${bundle.capabilityId}`);
    }
  }
  if (previous?.nls?.inventoryHash !== current.nls.inventoryHash) {
    changed.push('nls:inventory');
  }
  return { status: changed.length === 0 ? 'UNCHANGED' : 'KNOWN_DRIFT', changed };
}

module.exports = { buildUpdateProfile, compareUpdateProfiles };
