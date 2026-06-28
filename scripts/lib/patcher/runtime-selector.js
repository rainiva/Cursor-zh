const { escapeRegExp } = require('../engine/substring');
const { isProductTipScopedMapping } = require('../shared/product-tip-scope');
const { sourceHasGlassCommandAnchor } = require('./anchor-static');
const { createWorkbenchIndex } = require('./workbench-index');
const { loadSurfaceDefinitions, isL3SurfaceMapping } = require('../mapping/surfaces');

const surfaceDefinitions = loadSurfaceDefinitions();

function isAuthoritativeWorkbenchIndex(index) {
  return Boolean(index && index.isAuthoritative === true);
}

function resolveWorkbenchIndex(workbenchSource, workbenchIndex) {
  if (workbenchIndex && typeof workbenchIndex.hasQuotedLiteral === 'function') {
    return workbenchIndex;
  }
  return createWorkbenchIndex(workbenchSource);
}

function sourceHasQuotedLiteral(workbenchSource, originalText, workbenchIndex) {
  if (typeof originalText !== 'string' || originalText.length === 0) {
    return false;
  }

  const index = resolveWorkbenchIndex(workbenchSource, workbenchIndex);
  if (index.hasQuotedLiteral(originalText)) {
    return true;
  }

  const sourceText = index.sourceText || String(workbenchSource || '');
  if (!sourceText.includes(originalText)) {
    return false;
  }

  if (isAuthoritativeWorkbenchIndex(index) && originalText.length < 4) {
    return false;
  }

  const escapedOriginal = escapeRegExp(originalText);
  const literalPattern = new RegExp(`(['"\`])${escapedOriginal}\\1`);
  return literalPattern.test(sourceText);
}

function selectRuntimeMappings(workbenchSource, mappings = [], workbenchIndex) {
  const index = resolveWorkbenchIndex(workbenchSource, workbenchIndex);

  return mappings.filter((entry) => {
    if (!entry || typeof entry.originalText !== 'string' || entry.originalText.length === 0) {
      if (entry?.searchType === 'anchor' && entry.anchorId) {
        return sourceHasGlassCommandAnchor(index.sourceText || workbenchSource, entry.anchorId);
      }
      return false;
    }

    if (entry.searchType === 'anchor' && entry.anchorId) {
      return sourceHasGlassCommandAnchor(index.sourceText || workbenchSource, entry.anchorId);
    }

    if (entry.forceRuntime === true || isL3SurfaceMapping(entry, surfaceDefinitions)) {
      return true;
    }

    if (isProductTipScopedMapping(entry)) {
      return false;
    }

    const hasScopeSelectors =
      Array.isArray(entry.scopeSelectors) && entry.scopeSelectors.length > 0;
    const hasScopeHints =
      Array.isArray(entry.scopeContainsText) && entry.scopeContainsText.length > 0;

    if (entry.searchType !== 'exact') {
      return true;
    }

    if (hasScopeSelectors || hasScopeHints) {
      return true;
    }

    if (isAuthoritativeWorkbenchIndex(index)) {
      return !index.hasQuotedLiteral(entry.originalText);
    }

    return !sourceHasQuotedLiteral(workbenchSource, entry.originalText, index);
  });
}

function selectRuntimeMappingsUnion(workbenchSources = [], mappings = []) {
  const selectedByOriginal = new Map();

  for (const entry of workbenchSources) {
    const workbenchSource =
      entry && typeof entry.workbenchSource === 'string' ? entry.workbenchSource : '';
    const workbenchIndex = entry?.workbenchIndex;
    for (const mapping of selectRuntimeMappings(workbenchSource, mappings, workbenchIndex)) {
      selectedByOriginal.set(mapping.originalText, mapping);
    }
  }

  return [...selectedByOriginal.values()];
}

module.exports = {
  sourceHasQuotedLiteral,
  selectRuntimeMappings,
  selectRuntimeMappingsUnion,
};

