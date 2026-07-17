'use strict';

function buildRuntimeShards(units, mappings, surfaces = {}) {
  void mappings;
  const result = { core: [], surfaces: {} };
  for (const [surfaceId, def] of Object.entries(surfaces || {})) {
    result.surfaces[surfaceId] = {
      selectors: [...(def.runtimeScopes || [])],
      quarantineSelectors: [...(def.quarantineSelectors || [])],
      entries: [],
    };
  }

  for (const unit of units || []) {
    const surfaceId =
      unit.fallback?.kind === 'runtime-surface' ? unit.fallback.surface : null;
    const entry = {
      translationId: unit.translationId,
      aliases: unit.aliases,
      changeText: unit.changeText,
      match: unit.fallback?.match || 'exact',
    };
    if (surfaceId) {
      if (!result.surfaces[surfaceId]) {
        result.surfaces[surfaceId] = {
          selectors: [],
          quarantineSelectors: [],
          entries: [],
        };
      }
      result.surfaces[surfaceId].entries.push(entry);
    } else {
      result.core.push(entry);
    }
  }

  return result;
}

function measureRuntimeShards(shards) {
  const kb = (value) =>
    Number((Buffer.byteLength(JSON.stringify(value), 'utf8') / 1024).toFixed(1));
  return {
    coreKB: kb(shards.core || []),
    surfaceKB: Object.fromEntries(
      Object.entries(shards.surfaces || {}).map(([id, shard]) => [id, kb(shard)])
    ),
  };
}

function assertRuntimeShardBudgets(shards, { coreKB, surfaceKB }) {
  const measured = measureRuntimeShards(shards);
  if (measured.coreKB > coreKB) {
    throw new Error(
      `core runtime payload (${measured.coreKB} KB > ${coreKB} KB)`
    );
  }
  for (const [surface, size] of Object.entries(measured.surfaceKB)) {
    if (size > surfaceKB) {
      throw new Error(
        `surface shard ${surface} (${size} KB > ${surfaceKB} KB)`
      );
    }
  }
  return measured;
}

module.exports = {
  buildRuntimeShards,
  measureRuntimeShards,
  assertRuntimeShardBudgets,
};
