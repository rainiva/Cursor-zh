'use strict';

const { isL3SurfaceMapping, loadSurfaceDefinitions } = require('./surfaces');

const surfaceDefinitions = loadSurfaceDefinitions();

function mappingHasRuntimeScope(entry) {
  return (
    (Array.isArray(entry?.scopeSelectors) && entry.scopeSelectors.length > 0) ||
    (Array.isArray(entry?.scopeContainsText) && entry.scopeContainsText.length > 0)
  );
}

function classifyRuntimeMappingPool(entry, { staticLiteralPresent = false } = {}) {
  if (!entry) {
    return 'static-only';
  }
  if (entry.searchType === 'exact' && staticLiteralPresent) {
    return 'static-only';
  }
  if (entry.forceRuntime === true) {
    return 'runtime-force';
  }
  if (
    entry.searchType === 'regex' ||
    entry.searchType === 'partial' ||
    entry.searchType === 'normalizedExact' ||
    entry.searchType === 'anchor'
  ) {
    return 'runtime-regex';
  }
  if (mappingHasRuntimeScope(entry)) {
    return 'runtime-scoped';
  }
  if (entry.surface) {
    return 'runtime-by-surface';
  }
  if (entry.searchType === 'exact') {
    const surface = entry.surface ? surfaceDefinitions[entry.surface] : null;
    if (surface?.defaultLayer === 'L2' || surface?.contract === true) {
      return 'static-only';
    }
    if (isL3SurfaceMapping(entry, surfaceDefinitions) && !mappingHasRuntimeScope(entry)) {
      return 'runtime-by-surface';
    }
    return 'legacy-global-exact';
  }
  return 'runtime-regex';
}

function summarizeRuntimePools(selectedMappings, staticLiteralChecker) {
  const counts = {
    'static-only': 0,
    'runtime-by-surface': 0,
    'runtime-regex': 0,
    'runtime-scoped': 0,
    'runtime-force': 0,
    'legacy-global-exact': 0,
  };

  for (const entry of selectedMappings) {
    const staticLiteralPresent = staticLiteralChecker(entry.originalText);
    const pool = classifyRuntimeMappingPool(entry, { staticLiteralPresent });
    counts[pool] += 1;
  }

  return counts;
}

module.exports = {
  classifyRuntimeMappingPool,
  summarizeRuntimePools,
};
