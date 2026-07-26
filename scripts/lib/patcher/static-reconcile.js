'use strict';

const { findRemainingReplacementLiterals } = require('./static.js');
const {
  buildGlassCommandFieldPattern,
  buildSettingsSlugFieldPattern,
  buildI18nKeyDefaultTextPattern,
  applyAnchorStaticTranslations,
  sourceHasAnchor,
} = require('./anchor-static.js');
const { isProductTipScopedMapping } = require('../shared/product-tip-scope');

// 与 anchor-static 的窗口约束保持一致（glassCommand 模式最长匹配覆盖）。
const ANCHOR_RECONCILE_WINDOW = 1400;
const ANCHOR_WINDOW_BEFORE = 12;

function anchorIdentityKey(entry) {
  const field = entry.field || (entry.anchorType === 'settingsSlug' ? 'label' : 'title');
  return `${entry.anchorType}\0${entry.anchorId}\0${field}`;
}

function resolveAnchorReconcilePattern(entry) {
  const field = entry.field || (entry.anchorType === 'settingsSlug' ? 'label' : 'title');
  if (entry.anchorType === 'glassCommand') {
    return buildGlassCommandFieldPattern(entry.anchorId, field);
  }
  if (entry.anchorType === 'settingsSlug') {
    return buildSettingsSlugFieldPattern(entry.anchorId, field);
  }
  if (entry.anchorType === 'i18nKey') {
    return buildI18nKeyDefaultTextPattern(entry.anchorId);
  }
  return null;
}

// 锚点邻域内生产模式是否可命中（indexOf 定位 + 局部窗口 exec，不做全文正则）。
function anchorPatternMatchesNearby(translatedSource, entry) {
  const pattern = resolveAnchorReconcilePattern(entry);
  if (!pattern) {
    return false;
  }
  const id = String(entry.anchorId);
  let from = 0;
  while (from < translatedSource.length) {
    const idx = translatedSource.indexOf(id, from);
    if (idx === -1) {
      return false;
    }
    const windowStart = Math.max(0, idx - ANCHOR_WINDOW_BEFORE);
    const windowEnd = Math.min(
      translatedSource.length,
      idx + id.length + 2 + ANCHOR_RECONCILE_WINDOW
    );
    pattern.lastIndex = 0;
    if (pattern.test(translatedSource.slice(windowStart, windowEnd))) {
      return true;
    }
    from = idx + id.length;
  }
  return false;
}

/**
 * 锚点条目对账（阶段三影响面评审修复）：
 * searchType==='anchor' 且非 forceRuntime 的静态锚点，若静态替换未落地但锚点仍在
 * translatedSource 在场，则回补进 runtimeMappings；锚点缺席不回补（属 verify 报告范畴）。
 * 落地判据与生产替换完全一致（避免独立判据与 applyAnchorStaticTranslations 口径分歧）：
 * - 对 translatedSource 重放该条目替换仍产生差异 → 静态未落地（原文还在）→ 回补；
 * - 重放幂等且锚点邻域模式可命中 → 已落地（field 已是 changeText）→ 不回补；
 * - 重放幂等但模式不可命中 → 替换结构漂移（锚点在场而静态失效）→ 回补。
 */
function reconcileAnchorMappings({ translatedSource, mergedMappings, runtimeMappings }) {
  const selectedAnchorKeys = new Set();
  for (const entry of runtimeMappings) {
    if (entry && entry.searchType === 'anchor' && entry.anchorId) {
      selectedAnchorKeys.add(anchorIdentityKey(entry));
    }
  }

  const reconciled = [];
  const seenKeys = new Set();
  for (const entry of mergedMappings) {
    if (!entry || entry.searchType !== 'anchor' || !entry.anchorId) {
      continue;
    }
    if (entry.forceRuntime === true) {
      continue;
    }
    if (typeof entry.changeText !== 'string' || entry.changeText.length === 0) {
      continue;
    }
    const key = anchorIdentityKey(entry);
    if (selectedAnchorKeys.has(key) || seenKeys.has(key)) {
      continue;
    }
    if (!sourceHasAnchor(translatedSource, entry)) {
      continue;
    }
    const replayed = applyAnchorStaticTranslations(translatedSource, [entry]);
    if (replayed === translatedSource && anchorPatternMatchesNearby(translatedSource, entry)) {
      continue;
    }
    seenKeys.add(key);
    reconciled.push(entry);
  }
  return reconciled;
}

/**
 * builder 汇合层对账（计划 D1/任务 1.2）：
 * 找出「exact 且原文字面量在 bundle 且静态替换未落地」的被剪枝词条，回补进 runtimeMappings。
 * 判据（审查记录 B2）：以 originalText 引号字面量是否仍留在 translatedSource 为主判据
 * （替换成功则该字面量应消失）；changeText 在场仅作辅证记录，不参与判定。
 * 阶段三扩展：anchor 条目（非 forceRuntime）静态未落地且锚点在场时同样回补（见 reconcileAnchorMappings）。
 */
function reconcilePrunedMappings({
  translatedSource,
  mergedMappings = [],
  runtimeMappings = [],
  workbenchIndex = null,
} = {}) {
  const source = String(translatedSource || '');
  if (source.length === 0) {
    return { runtimeMappings, reconciled: [] };
  }

  const selectedOriginals = new Set();
  for (const entry of runtimeMappings) {
    if (entry && typeof entry.originalText === 'string') {
      selectedOriginals.add(entry.originalText);
    }
  }

  const candidateByOriginal = new Map();
  for (const entry of mergedMappings) {
    if (!entry || entry.searchType !== 'exact') {
      continue;
    }
    if (typeof entry.originalText !== 'string' || entry.originalText.length === 0) {
      continue;
    }
    if (typeof entry.changeText !== 'string' || entry.changeText.length === 0) {
      continue;
    }
    if (selectedOriginals.has(entry.originalText)) {
      continue;
    }
    if (isProductTipScopedMapping(entry)) {
      continue;
    }
    if (
      workbenchIndex &&
      typeof workbenchIndex.hasQuotedLiteral === 'function' &&
      !workbenchIndex.hasQuotedLiteral(entry.originalText)
    ) {
      continue;
    }
    if (!candidateByOriginal.has(entry.originalText)) {
      candidateByOriginal.set(entry.originalText, entry);
    }
  }

  const reconciled = [];
  if (candidateByOriginal.size > 0) {
    const replacementByContent = new Map();
    for (const [originalText, entry] of candidateByOriginal) {
      replacementByContent.set(originalText, entry.changeText);
    }
    const remaining = findRemainingReplacementLiterals(source, replacementByContent);
    for (const originalText of remaining) {
      reconciled.push(candidateByOriginal.get(originalText));
    }
  }

  reconciled.push(
    ...reconcileAnchorMappings({ translatedSource: source, mergedMappings, runtimeMappings })
  );

  if (reconciled.length === 0) {
    return { runtimeMappings, reconciled: [] };
  }

  return {
    runtimeMappings: [...runtimeMappings, ...reconciled],
    reconciled,
  };
}

function summarizeStaticReconcile(reconciled = []) {
  return {
    count: reconciled.length,
    entries: reconciled.map((entry) =>
      entry.searchType === 'anchor' && entry.anchorId
        ? {
            anchorType: entry.anchorType,
            anchorId: entry.anchorId,
            field: entry.field || (entry.anchorType === 'settingsSlug' ? 'label' : 'title'),
            changeText: entry.changeText,
            ...(entry.surface ? { surface: entry.surface } : {}),
          }
        : {
            originalText: entry.originalText,
            changeText: entry.changeText,
            ...(entry.surface ? { surface: entry.surface } : {}),
          }
    ),
  };
}

module.exports = {
  reconcilePrunedMappings,
  summarizeStaticReconcile,
};
