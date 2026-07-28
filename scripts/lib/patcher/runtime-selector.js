const { escapeRegExp } = require('../engine/substring');
const { isProductTipScopedMapping } = require('../shared/product-tip-scope');
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
    // 任务 11（RC-2 诚实化）：anchor 条目彻底不入运行时头部——运行时引擎对无
    // originalText 条目一律跳过，历史准入产物是 [null, changeText] 死数据；
    // 静态锚点补丁（apply 构建期）是 anchor 条目唯一落地路径，forceRuntime 对 anchor 失效。
    if (entry?.searchType === 'anchor') {
      return false;
    }

    if (!entry || typeof entry.originalText !== 'string' || entry.originalText.length === 0) {
      return false;
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
      // anchor 条目已被 selector 一律排除，选中条目必有 originalText 作去重键。
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

