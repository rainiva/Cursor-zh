'use strict';

const { isL3SurfaceMapping, loadSurfaceDefinitions } = require('./surfaces');

const surfaceDefinitions = loadSurfaceDefinitions();

function mappingHasRuntimeScope(entry) {
  return (
    Array.isArray(entry?.scopeSelectors) && entry.scopeSelectors.length > 0
  );
}

function classifyRuntimeMappingPool(entry, { staticLiteralPresent = false } = {}) {
  if (!entry) {
    return 'static-only';
  }
  if (entry.forceRuntime === true || isL3SurfaceMapping(entry, surfaceDefinitions)) {
    return 'runtime-general';
  }
  if (entry.searchType === 'anchor') {
    return 'runtime-general';
  }
  if (entry.searchType === 'regex' || mappingHasRuntimeScope(entry)) {
    return 'runtime-general';
  }
  if (entry.searchType === 'exact' && staticLiteralPresent) {
    const surface = entry.surface ? surfaceDefinitions[entry.surface] : null;
    if (surface?.defaultLayer === 'L2' || surface?.contract === true) {
      return 'static-only';
    }
    if (!entry.surface) {
      return 'static-only';
    }
  }
  return 'runtime-general';
}

function summarizeRuntimePools(selectedMappings, staticLiteralChecker) {
  const counts = {
    'static-only': 0,
    'runtime-general': 0,
    'runtime-by-surface': 0,
  };

  for (const entry of selectedMappings) {
    const staticLiteralPresent = staticLiteralChecker(entry.originalText);
    const pool = classifyRuntimeMappingPool(entry, { staticLiteralPresent });
    if (entry.surface && pool !== 'static-only') {
      counts['runtime-by-surface'] += 1;
    } else {
      counts[pool] += 1;
    }
  }

  return counts;
}

module.exports = {
  classifyRuntimeMappingPool,
  summarizeRuntimePools,
};
