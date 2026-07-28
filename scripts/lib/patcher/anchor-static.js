const { escapeRegExp } = require('../engine/substring');

// REFACTOR（任务 2.2）：模式预编译缓存——同一 anchorId 多次调用不重复 new RegExp。
const anchorPatternCache = new Map();

function getCachedPattern(cacheKey, build) {
  let pattern = anchorPatternCache.get(cacheKey);
  if (!pattern) {
    pattern = build();
    anchorPatternCache.set(cacheKey, pattern);
  }
  return pattern;
}

function buildGlassCommandFieldPattern(anchorId, field = 'title') {
  const escapedId = escapeRegExp(String(anchorId));
  const escapedField = escapeRegExp(String(field));
  return new RegExp(
    `(id\\s*:\\s*["']?${escapedId}["']?)([\\s\\S]{0,500}?${escapedField}\\s*:\\s*)(["'])([^"']*)(\\3)`,
    'g'
  );
}

// settingsSlug：只锚定 slug 字符串本身（注册函数名 minified 会漂移，不入模式——同 B5 原则）。
// 形如 nu("general","open-agents-on-startup",{label:"Window Restoration",...})
// RC-1 修复（任务 13）：字段间隙用 [^{}] 禁止跨对象边界——旧模式 (?:[\s\S]{0,500}?[,{])?
// 可回溯跨过 }...{ 把译文写进相邻条目；目标对象无该字段时必须失配而非错配（fail-closed）。
function buildSettingsSlugFieldPattern(anchorId, field = 'label') {
  const escapedId = escapeRegExp(String(anchorId));
  const escapedField = escapeRegExp(String(field));
  return new RegExp(
    `(["']${escapedId}["']\\s*,\\s*\\{(?:[^{}]{0,500}?,)??\\s*${escapedField}\\s*:\\s*)(["'])([^"']*)(\\2)`,
    'g'
  );
}

// i18nKey：只锚定 key 字符串本身，默认文案不入模式（审查记录 B5——调用名与文案均可漂移）。
// 形如 C("glass.agentPanel.continueWorking","Continue Working")
function buildI18nKeyDefaultTextPattern(anchorId) {
  const escapedId = escapeRegExp(String(anchorId));
  return new RegExp(`(["']${escapedId}["']\\s*,\\s*)(["'])([^"']*)(\\2)`, 'g');
}

function resolveAnchorPattern(mapping) {
  const anchorType = mapping.anchorType;
  const field = mapping.field || (anchorType === 'settingsSlug' ? 'label' : 'title');
  const cacheKey = `${anchorType}\0${mapping.anchorId}\0${field}`;
  if (anchorType === 'glassCommand') {
    return getCachedPattern(cacheKey, () => buildGlassCommandFieldPattern(mapping.anchorId, field));
  }
  if (anchorType === 'settingsSlug') {
    return getCachedPattern(cacheKey, () => buildSettingsSlugFieldPattern(mapping.anchorId, field));
  }
  if (anchorType === 'i18nKey') {
    return getCachedPattern(cacheKey, () => buildI18nKeyDefaultTextPattern(mapping.anchorId));
  }
  return null;
}

function applyAnchorStaticTranslations(source, mappings = []) {
  const text = String(source || '');
  // 性能：所有 mapping 先只收集编辑区间（不重建大字符串），
  // 最后一次性拼接——避免每条命中都复制一遍 48MB 文本。
  const edits = [];

  for (const mapping of mappings) {
    if (!mapping || mapping.searchType !== 'anchor') {
      continue;
    }

    if (!mapping.anchorId || typeof mapping.changeText !== 'string') {
      continue;
    }

    // 性能：不做独立 includes 护栏——collectAnchorEdits 的单趟 indexOf
    // 定位本身就是护栏（未命中即整趟结束），避免重复的 48MB 全文扫描。
    if (mapping.anchorType === 'glassCommand') {
      const field = mapping.field || 'title';
      const pattern = getCachedPattern(`glassCommand\0${mapping.anchorId}\0${field}`, () =>
        buildGlassCommandFieldPattern(mapping.anchorId, field)
      );
      // id 可能无引号包裹（id:D5h），窗口用裸 anchorId 定位并前置留出 "id :" 余量。
      collectAnchorEdits(
        text,
        edits,
        mapping.anchorId,
        pattern,
        (window) =>
          window.replace(pattern, (_match, idPart, middle, quote, _oldText, endQuote) => {
            return `${idPart}${middle}${quote}${mapping.changeText}${endQuote}`;
          }),
        { rawVariants: true, windowBefore: 12 }
      );
      continue;
    }

    if (mapping.anchorType === 'settingsSlug' || mapping.anchorType === 'i18nKey') {
      const pattern = resolveAnchorPattern(mapping);
      collectAnchorEdits(text, edits, mapping.anchorId, pattern, (window) =>
        window.replace(pattern, (_m, prefix, quote, _oldText, endQuote) => {
          return `${prefix}${quote}${mapping.changeText}${endQuote}`;
        })
      );
    }
  }

  return applyCollectedEdits(text, edits);
}

// 超大单行 bundle 性能约束：不做全文正则替换，先 indexOf 定位 anchorId，
// 再仅对局部窗口应用模式（任务 2.2 验收：4 条 < 200ms）。
// 窗口须覆盖 glassCommand 模式最长匹配（id + 500 字符中段 + field + 文案）。
const ANCHOR_WINDOW_SIZE = 1400;

const QUOTE_DOUBLE = 34;
const QUOTE_SINGLE = 39;

function collectAnchorEdits(source, edits, anchorId, pattern, replaceWindow, options = {}) {
  const id = String(anchorId);
  // 性能：只做一趟裸 id 的 indexOf 扫描；引号包裹条件用字符码就地校验，
  // 避免 "id" / 'id' 两个变体各扫一整趟 48MB 文本。
  const requireQuoted = options.rawVariants !== true;
  const windowBefore = options.windowBefore || 0;
  let from = 0;

  while (from < source.length) {
    const idx = source.indexOf(id, from);
    if (idx === -1) {
      break;
    }
    if (requireQuoted) {
      const before = source.charCodeAt(idx - 1);
      const after = source.charCodeAt(idx + id.length);
      const wrapped =
        (before === QUOTE_DOUBLE && after === QUOTE_DOUBLE) ||
        (before === QUOTE_SINGLE && after === QUOTE_SINGLE);
      if (!wrapped) {
        from = idx + 1;
        continue;
      }
    }
    const anchorStart = requireQuoted ? idx - 1 : idx;
    const windowStart = Math.max(0, anchorStart - windowBefore);
    const windowEnd = Math.min(source.length, idx + id.length + 2 + ANCHOR_WINDOW_SIZE);
    const window = source.slice(windowStart, windowEnd);
    pattern.lastIndex = 0;
    const replacedWindow = replaceWindow(window);
    if (replacedWindow !== window) {
      // 编辑收窄为窗口内的真实差异区间（公共前后缀裁剪）——
      // 相邻锚点（如同一设置注册区）窗口重叠时编辑互不吞并。
      let prefixLen = 0;
      const maxPrefix = Math.min(window.length, replacedWindow.length);
      while (prefixLen < maxPrefix && window.charCodeAt(prefixLen) === replacedWindow.charCodeAt(prefixLen)) {
        prefixLen += 1;
      }
      let suffixLen = 0;
      const maxSuffix = Math.min(window.length, replacedWindow.length) - prefixLen;
      while (
        suffixLen < maxSuffix &&
        window.charCodeAt(window.length - 1 - suffixLen) ===
          replacedWindow.charCodeAt(replacedWindow.length - 1 - suffixLen)
      ) {
        suffixLen += 1;
      }
      edits.push({
        start: windowStart + prefixLen,
        end: windowEnd - suffixLen,
        text: replacedWindow.slice(prefixLen, replacedWindow.length - suffixLen),
      });
      from = windowEnd;
    } else {
      from = idx + 1;
    }
  }
}

// 编辑区间按位置排序后一次性拼接；重叠区间保留先收集者（同窗重复命中防御）。
function applyCollectedEdits(source, edits) {
  if (edits.length === 0) {
    return source;
  }
  edits.sort((a, b) => a.start - b.start || a.end - b.end);
  const parts = [];
  let lastEnd = 0;
  for (const edit of edits) {
    if (edit.start < lastEnd) {
      continue;
    }
    parts.push(source.slice(lastEnd, edit.start), edit.text);
    lastEnd = edit.end;
  }
  parts.push(source.slice(lastEnd));
  return parts.join('');
}

function sourceHasGlassCommandAnchor(source, anchorId) {
  if (!anchorId) {
    return false;
  }
  const text = String(source || '');
  if (!text.includes(String(anchorId))) {
    return false;
  }
  const escapedId = escapeRegExp(String(anchorId));
  return new RegExp(`id\\s*:\\s*["']?${escapedId}["']?`).test(text);
}

// 任务 2.2：按 anchorType 分派的泛化存在性判定（runtime-selector 准入用）。
function sourceHasAnchor(source, entry) {
  if (!entry || !entry.anchorId) {
    return false;
  }
  const text = String(source || '');
  if (entry.anchorType === 'settingsSlug' || entry.anchorType === 'i18nKey') {
    const id = String(entry.anchorId);
    return text.includes(`"${id}"`) || text.includes(`'${id}'`);
  }
  return sourceHasGlassCommandAnchor(text, entry.anchorId);
}

module.exports = {
  buildGlassCommandFieldPattern,
  buildSettingsSlugFieldPattern,
  buildI18nKeyDefaultTextPattern,
  applyAnchorStaticTranslations,
  sourceHasGlassCommandAnchor,
  sourceHasAnchor,
};
