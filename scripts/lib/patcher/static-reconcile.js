'use strict';

const { findRemainingReplacementLiterals } = require('./static.js');
const { isProductTipScopedMapping } = require('../shared/product-tip-scope');

/**
 * builder 汇合层对账（计划 D1/任务 1.2）：
 * 找出「exact 且原文字面量在 bundle 且静态替换未落地」的被剪枝词条，回补进 runtimeMappings。
 * 判据（审查记录 B2）：以 originalText 引号字面量是否仍留在 translatedSource 为主判据
 * （替换成功则该字面量应消失）；changeText 在场仅作辅证记录，不参与判定。
 */
function reconcilePrunedMappings({
  translatedSource,
  mergedMappings = [],
  runtimeMappings = [],
  workbenchIndex = null,
} = {}) {
  const source = String(translatedSource || '');
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

  if (candidateByOriginal.size === 0 || source.length === 0) {
    return { runtimeMappings, reconciled: [] };
  }

  const replacementByContent = new Map();
  for (const [originalText, entry] of candidateByOriginal) {
    replacementByContent.set(originalText, entry.changeText);
  }

  const remaining = findRemainingReplacementLiterals(source, replacementByContent);
  if (remaining.size === 0) {
    return { runtimeMappings, reconciled: [] };
  }

  const reconciled = [];
  for (const originalText of remaining) {
    reconciled.push(candidateByOriginal.get(originalText));
  }

  return {
    runtimeMappings: [...runtimeMappings, ...reconciled],
    reconciled,
  };
}

function summarizeStaticReconcile(reconciled = []) {
  return {
    count: reconciled.length,
    entries: reconciled.map((entry) => ({
      originalText: entry.originalText,
      changeText: entry.changeText,
      ...(entry.surface ? { surface: entry.surface } : {}),
    })),
  };
}

module.exports = {
  reconcilePrunedMappings,
  summarizeStaticReconcile,
};
