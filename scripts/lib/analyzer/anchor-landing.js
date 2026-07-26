const { escapeRegExp } = require('../engine/substring');
const {
  buildGlassCommandFieldPattern,
  buildSettingsSlugFieldPattern,
  buildI18nKeyDefaultTextPattern,
} = require('../patcher/anchor-static.js');
const { findRemainingReplacementLiterals } = require('../patcher/static.js');

// verify 07 性能硬线（B6）：translated 正文只读一次，锚点定位用单趟组合
// alternation 捕获位置，落地核验只在位置局部窗口内做模式 exec——
// 严禁逐条锚点对 48MB 全文重扫（naive 方案实测 3.5s+，超 ≤2s 预算）。
const MAX_POSITIONS_PER_ID = 4000;
const LANDING_WINDOW_BEFORE = 20;
const LANDING_WINDOW_AFTER = 1500;

const QUOTE_DOUBLE = 34;
const QUOTE_SINGLE = 39;

function buildAnchorPositionIndex(anchors, bundles) {
  const ids = [...new Set(anchors.map((entry) => String(entry.anchorId)))]
    // 长 id 优先：alternation 首匹配语义下防止短 id 吞掉长 id 前缀。
    .sort((left, right) => right.length - left.length);
  const positions = new Map();
  if (ids.length === 0) {
    return positions;
  }
  const pattern = new RegExp(ids.map(escapeRegExp).join('|'), 'g');
  for (let bundleIndex = 0; bundleIndex < bundles.length; bundleIndex += 1) {
    const text = String(bundles[bundleIndex].bodyText || '');
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const id = match[0];
      let list = positions.get(id);
      if (!list) {
        list = [];
        positions.set(id, list);
      }
      if (list.length < MAX_POSITIONS_PER_ID) {
        list.push({ bundleIndex, index: match.index });
      }
    }
  }
  return positions;
}

// presence 判据与生产 sourceHasAnchor 对齐：glassCommand 要求 id: 结构前缀
// （id 可无引号），settingsSlug/i18nKey 要求引号包裹——裸子串噪音不算在场。
function isPresenceAt(entry, text, index) {
  const id = String(entry.anchorId);
  if (entry.anchorType === 'glassCommand') {
    const prefix = text.slice(Math.max(0, index - 12), index);
    return /id\s*:\s*["']?$/.test(prefix);
  }
  const before = text.charCodeAt(index - 1);
  const after = text.charCodeAt(index + id.length);
  return (
    (before === QUOTE_DOUBLE && after === QUOTE_DOUBLE) ||
    (before === QUOTE_SINGLE && after === QUOTE_SINGLE)
  );
}

function resolveLandingPattern(entry) {
  const field = entry.field || (entry.anchorType === 'settingsSlug' ? 'label' : 'title');
  if (entry.anchorType === 'glassCommand') {
    return { pattern: buildGlassCommandFieldPattern(entry.anchorId, field), textGroup: 4 };
  }
  if (entry.anchorType === 'settingsSlug') {
    return { pattern: buildSettingsSlugFieldPattern(entry.anchorId, field), textGroup: 3 };
  }
  if (entry.anchorType === 'i18nKey') {
    return { pattern: buildI18nKeyDefaultTextPattern(entry.anchorId), textGroup: 3 };
  }
  return null;
}

function evaluateAnchorLanding({ anchors = [], bundles = [] } = {}) {
  const positions = buildAnchorPositionIndex(anchors, bundles);
  const verdicts = [];
  const stats = {
    total: anchors.length,
    stableTotal: 0,
    stableFound: 0,
    stableApplied: 0,
    unstableTotal: 0,
    unstableFound: 0,
  };

  for (const entry of anchors) {
    const unstable = entry.unstable === true;
    if (unstable) {
      stats.unstableTotal += 1;
    } else {
      stats.stableTotal += 1;
    }

    const id = String(entry.anchorId);
    const idPositions = positions.get(id) || [];
    let presentBundle = null;
    let structuralFound = false;
    let applied = false;
    const landing = resolveLandingPattern(entry);

    for (const { bundleIndex, index } of idPositions) {
      const bundle = bundles[bundleIndex];
      const text = String(bundle.bodyText || '');
      if (!isPresenceAt(entry, text, index)) {
        continue;
      }
      if (!presentBundle) {
        presentBundle = bundle.name;
      }
      if (!landing) {
        continue;
      }
      const window = text.slice(
        Math.max(0, index - LANDING_WINDOW_BEFORE),
        index + id.length + LANDING_WINDOW_AFTER
      );
      landing.pattern.lastIndex = 0;
      const match = landing.pattern.exec(window);
      if (match) {
        structuralFound = true;
        if (match[landing.textGroup] === entry.changeText) {
          applied = true;
          break;
        }
      }
    }

    let status;
    if (entry.forceRuntime === true) {
      // runtime 类锚点：落地判据是 changeText 出现在运行时头部序列化数据
      // （头部条目序列化为 [original, change] 对，不含 anchorId 字段）。
      const headerHit = bundles.some((bundle) =>
        String(bundle.headerText || '').includes(entry.changeText)
      );
      if (presentBundle && headerHit) {
        status = 'runtime-applied';
      } else if (presentBundle) {
        status = 'found-not-applied';
      } else {
        status = 'missing';
      }
    } else if (applied) {
      status = 'applied';
    } else if (presentBundle) {
      // 引号/结构在场但完整替换模式不可命中或文案非 changeText：
      // 结构漂移或未落地，交由调用方结合 staticReconcile 豁免定性。
      status = 'found-not-applied';
    } else {
      status = 'missing';
    }

    if (presentBundle) {
      if (unstable) {
        stats.unstableFound += 1;
      } else {
        stats.stableFound += 1;
      }
    }
    if (!unstable && (status === 'applied' || status === 'runtime-applied')) {
      stats.stableApplied += 1;
    }

    verdicts.push({
      anchorId: entry.anchorId,
      anchorType: entry.anchorType,
      field: entry.field || null,
      surface: entry.surface || null,
      unstable,
      forceRuntime: entry.forceRuntime === true,
      status,
      bundle: presentBundle,
    });
  }

  return { verdicts, stats };
}

// static-only exact 逐条落地判据（fail-closed 但不误报）：
// originalText 引号字面量仍残留于某 bundle 正文，且该 bundle 正文无 changeText
// （多出现点部分替换不算失败），且未被运行时头部承接、不在 staticReconcile 豁免清单。
function evaluateExactLanding({ mappings = [], bundles = [], exemptOriginals = new Set() } = {}) {
  const byOriginal = new Map();
  for (const entry of mappings) {
    if (
      entry &&
      entry.searchType === 'exact' &&
      typeof entry.originalText === 'string' &&
      entry.originalText.length > 0 &&
      typeof entry.changeText === 'string' &&
      entry.forceRuntime !== true
    ) {
      byOriginal.set(entry.originalText, entry);
    }
  }

  const failures = [];
  if (byOriginal.size === 0) {
    return { failures, checkedCount: 0 };
  }

  for (const bundle of bundles) {
    const bodyText = String(bundle.bodyText || '');
    const headerText = String(bundle.headerText || '');
    // 单趟 alternation 扫描正文残留原文（复用 apply 侧同款实现，B6 合规）。
    const remaining = findRemainingReplacementLiterals(bodyText, byOriginal);
    for (const originalText of remaining) {
      if (exemptOriginals.has(originalText)) {
        continue;
      }
      if (headerText.includes(originalText)) {
        continue;
      }
      const entry = byOriginal.get(originalText);
      if (bodyText.includes(entry.changeText)) {
        continue;
      }
      failures.push({
        originalText,
        changeText: entry.changeText,
        surface: entry.surface || null,
        bundle: bundle.name,
      });
    }
  }

  return { failures, checkedCount: byOriginal.size };
}

module.exports = {
  evaluateAnchorLanding,
  evaluateExactLanding,
};
