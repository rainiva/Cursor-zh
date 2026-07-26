const { escapeRegExp } = require('../engine/substring');
const { isProductTipScopedMapping } = require('../shared/product-tip-scope');
const { sourceHasAnchor } = require('./anchor-static');
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
        return sourceHasAnchor(index.sourceText || workbenchSource, entry);
      }
      return false;
    }

    if (entry.searchType === 'anchor' && entry.anchorId) {
      return sourceHasAnchor(index.sourceText || workbenchSource, entry);
    }

    if (isProductTipScopedMapping(entry)) {
      return false;
    }

    const hasScopeSelectors =
      Array.isArray(entry.scopeSelectors) && entry.scopeSelectors.length > 0;
    const hasScopeHints =
      Array.isArray(entry.scopeContainsText) && entry.scopeContainsText.length > 0;
    const hasScope = hasScopeSelectors || hasScopeHints;

    if (entry.forceRuntime === true) {
      return true;
    }

    if (entry.searchType === 'exact') {
      const staticPresent = isAuthoritativeWorkbenchIndex(index)
        ? index.hasQuotedLiteral(entry.originalText)
        : sourceHasQuotedLiteral(workbenchSource, entry.originalText, index);

      if (staticPresent) {
        return false;
      }
    }

    if (entry.searchType !== 'exact') {
      return true;
    }

    if (hasScope) {
      return true;
    }

    if (isL3SurfaceMapping(entry, surfaceDefinitions)) {
      return false;
    }

    return true;
  });
}

function selectRuntimeMappingsUnion(workbenchSources = [], mappings = []) {
  const selectedByOriginal = new Map();

  for (const entry of workbenchSources) {
    const workbenchSource =
      entry && typeof entry.workbenchSource === 'string' ? entry.workbenchSource : '';
    const workbenchIndex = entry?.workbenchIndex;
    for (const mapping of selectRuntimeMappings(workbenchSource, mappings, workbenchIndex)) {
      // anchor 条目无 originalText，去重键改用锚点身份，避免互相覆盖只剩 1 条。
      const dedupeKey =
        mapping.searchType === 'anchor' && mapping.anchorId
          ? `anchor\0${mapping.anchorType || ''}\0${mapping.anchorId}\0${mapping.field || ''}`
          : mapping.originalText;
      selectedByOriginal.set(dedupeKey, mapping);
    }
  }

  return [...selectedByOriginal.values()];
}

module.exports = {
  sourceHasQuotedLiteral,
  selectRuntimeMappings,
  selectRuntimeMappingsUnion,
};

