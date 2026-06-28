'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_WORKSPACE_ROOT = path.resolve(__dirname, '../../..');

let cached = null;

function getSurfacesMetaPath(workspaceRoot = DEFAULT_WORKSPACE_ROOT) {
  return path.join(workspaceRoot, 'translations', 'meta', 'surfaces.json');
}

function loadSurfaceDefinitions(workspaceRoot = DEFAULT_WORKSPACE_ROOT) {
  if (cached && cached.workspaceRoot === workspaceRoot) {
    return cached.definitions;
  }

  const filePath = getSurfacesMetaPath(workspaceRoot);
  const definitions = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  cached = { workspaceRoot, definitions };
  return definitions;
}

function isL3SurfaceMapping(entry, surfaces) {
  if (!entry?.surface) {
    return false;
  }
  const def = surfaces[entry.surface];
  return def?.defaultLayer === 'L3';
}

function applySurfaceRuntimeDefaults(mapping, surfaces) {
  if (!mapping || typeof mapping !== 'object') {
    return mapping;
  }
  if (isL3SurfaceMapping(mapping, surfaces) && mapping.forceRuntime !== false) {
    return { ...mapping, forceRuntime: true };
  }
  return { ...mapping };
}

function getL3RuntimeScopeSelectors(workspaceRoot = DEFAULT_WORKSPACE_ROOT) {
  const surfaces = loadSurfaceDefinitions(workspaceRoot);
  const selectors = [];

  for (const def of Object.values(surfaces)) {
    if (def.defaultLayer === 'L3' && Array.isArray(def.runtimeScopes)) {
      selectors.push(...def.runtimeScopes);
    }
  }

  return [...new Set(selectors)];
}

function countL3Surfaces(workspaceRoot = DEFAULT_WORKSPACE_ROOT) {
  const surfaces = loadSurfaceDefinitions(workspaceRoot);
  return Object.values(surfaces).filter((def) => def.defaultLayer === 'L3').length;
}

function matchesHarvestHints(entry, hints = {}) {
  const pathLower = String(entry.path || '').toLowerCase();
  const context = String(entry.context || '');
  const lineHint = String(entry.lineHint || '').toLowerCase();

  if (Array.isArray(hints.pathIncludes)) {
    const pathMatched = hints.pathIncludes.some(
      (fragment) => pathLower.includes(String(fragment).toLowerCase()) || lineHint.includes(String(fragment).toLowerCase())
    );
    if (!pathMatched) {
      return false;
    }
  }

  if (Array.isArray(hints.contextIncludes)) {
    const contextMatched = hints.contextIncludes.some((fragment) => context.includes(fragment));
    if (!contextMatched) {
      return false;
    }
  }

  return Boolean(hints.pathIncludes || hints.contextIncludes);
}

function inferHarvestEntrySurface(entry, surfaces) {
  for (const [surfaceId, def] of Object.entries(surfaces)) {
    if (def.defaultLayer !== 'L3') {
      continue;
    }
    if (matchesHarvestHints(entry, def.harvestHints)) {
      return surfaceId;
    }
  }

  const pathLower = String(entry.path || '').toLowerCase();
  const context = String(entry.context || '');

  if (context.includes('title:') && pathLower.includes('glass')) {
    return 'command_palette';
  }

  if (pathLower.includes('sidebar') || String(entry.lineHint || '').includes('sidebar')) {
    return 'glass_sidebar';
  }

  return 'unknown';
}

module.exports = {
  DEFAULT_WORKSPACE_ROOT,
  getSurfacesMetaPath,
  loadSurfaceDefinitions,
  isL3SurfaceMapping,
  applySurfaceRuntimeDefaults,
  getL3RuntimeScopeSelectors,
  countL3Surfaces,
  inferHarvestEntrySurface,
};
