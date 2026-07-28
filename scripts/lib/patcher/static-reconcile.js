'use strict';

const { findRemainingReplacementLiterals } = require('./static.js');
const { isProductTipScopedMapping } = require('../shared/product-tip-scope');

/**
 * builder 汇合层对账（计划 D1/任务 1.2）：
 * 找出「exact 且原文字面量在 bundle 且静态替换未落地」的被剪枝词条，回补进 runtimeMappings。
 * 判据（审查记录 B2）：以 originalText 引号字面量是否仍留在 translatedSource 为主判据
 * （替换成功则该字面量应消失）；changeText 在场仅作辅证记录，不参与判定。
 *
 * 任务 11（RC-2 诚实化，行为合同变化）：anchor 回补路径整体删除——回补进
 * runtimeMappings 的 anchor 条目无 originalText，运行时引擎一律跳过，dea481a 引入的
 * 回补本身就是死数据假阳性。「静态锚点落地失败」的安全网从『假回补』改为
 * 『verify 严苛邻域核验显性报错（found-not-applied）』的真实失效检测。
 * 未来可选方向（仅记录不实施）：回补时物化为带真实 originalText 的 exact 条目。
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
    // anchor 回补已删除（RC-2 诚实化），对账清单只会出现 exact 词条。
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
