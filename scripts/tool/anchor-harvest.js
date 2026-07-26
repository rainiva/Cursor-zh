'use strict';

// 任务 3.1：锚点候选提取脚本。
// 从 workbench bundle 文本提取三类语义锚点候选（settingsSlug / i18nKey / glassCommand），
// 内置 D4 minified anchorId 拒绝规则，并与 dead-exact 失效清单、common.json exact 映射做 join。
// 性能约束（计划任务 3.1）：单遍全文扫描（一次合并模式 exec 迭代）+ 局部窗口匹配，
// 禁止按锚点逐条整文件重扫；真实 bundle 单次运行 < 10s。

const fs = require('node:fs');
const path = require('node:path');

// 候选 field 白名单：锚点邻近对象体内的可译文案字段。
const CANDIDATE_FIELDS = ['label', 'title', 'name', 'description', 'text', 'placeholder', 'tooltip'];
const FIELD_WINDOW_SIZE = 600;

// D4：minified 短标识拒绝规则——长度 ≤4 且不含语义分隔符（. / -）也非驼峰词。
function isRejectedMinifiedAnchorId(anchorId) {
  const id = String(anchorId || '');
  if (id.length > 4) {
    return false;
  }
  if (id.includes('.') || id.includes('-')) {
    return false;
  }
  if (/[a-z][A-Z]/.test(id)) {
    return false;
  }
  return true;
}

// 合并结构标记（单遍 exec 迭代 = 一次全文扫描）：
// 1) glassCommand：{id:"<id>",
// 2) settingsSlug：("<group>","<slug>",{
// 3) i18nKey：("<a.b.c>","<默认文案>"
// 注册/调用函数名均为 minified 可漂移名，一律不入模式（B5 同源原则）。
const COMBINED_MARKER_PATTERN = new RegExp(
  [
    '\\{id:"([A-Za-z0-9$_][A-Za-z0-9$_.-]*)",',
    '\\("([a-z][a-z0-9-]*)","([a-z0-9][a-z0-9-]*)",\\{',
    '\\("([a-z][a-zA-Z0-9]*(?:\\.[a-zA-Z0-9_-]+){2,})","((?:[^"\\\\]|\\\\.)*)"',
  ].join('|'),
  'g'
);

function extractWindowField(source, offset) {
  const windowText = source.slice(offset, offset + FIELD_WINDOW_SIZE);
  for (const field of CANDIDATE_FIELDS) {
    const match = windowText.match(new RegExp(`[,{]${field}:"((?:[^"\\\\]|\\\\.)*)"`));
    if (match) {
      return { field, currentText: match[1] };
    }
  }
  return null;
}

function pushCandidate(candidates, candidate) {
  if (isRejectedMinifiedAnchorId(candidate.anchorId)) {
    candidate.rejected = true;
  }
  candidates.push(candidate);
}

function extractAnchorCandidates(source) {
  const text = String(source || '');
  const candidates = [];
  COMBINED_MARKER_PATTERN.lastIndex = 0;
  let match;
  while ((match = COMBINED_MARKER_PATTERN.exec(text)) !== null) {
    const offset = match.index;
    if (match[1] !== undefined) {
      // glassCommand：id 后局部窗口内定位第一个可译 field。
      const fieldHit = extractWindowField(text, offset);
      if (fieldHit) {
        pushCandidate(candidates, {
          anchorType: 'glassCommand',
          anchorId: match[1],
          field: fieldHit.field,
          currentText: fieldHit.currentText,
          offset,
        });
      }
      continue;
    }
    if (match[2] !== undefined) {
      const fieldHit = extractWindowField(text, offset);
      if (fieldHit) {
        pushCandidate(candidates, {
          anchorType: 'settingsSlug',
          anchorId: match[3],
          group: match[2],
          field: fieldHit.field,
          currentText: fieldHit.currentText,
          offset,
        });
      }
      continue;
    }
    pushCandidate(candidates, {
      anchorType: 'i18nKey',
      anchorId: match[4],
      currentText: match[5],
      offset,
    });
  }
  return candidates;
}

function normalizeJoinText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// dead-exact 失效清单 join：大小写/空白归一后按候选 currentText 匹配；
// rejected 候选不得作为迁移配对（B1 语义 ID 准入优先于数量）。
function joinCandidatesWithDeadExact(candidates, deadEntries) {
  const byText = new Map();
  for (const candidate of candidates) {
    if (candidate.rejected === true) {
      continue;
    }
    const key = normalizeJoinText(candidate.currentText);
    if (!key) {
      continue;
    }
    if (!byText.has(key)) {
      byText.set(key, []);
    }
    byText.get(key).push(candidate);
  }

  const matched = [];
  const unmatched = [];
  for (const dead of deadEntries || []) {
    const hits = byText.get(normalizeJoinText(dead.originalText)) || [];
    if (hits.length > 0) {
      matched.push({ ...dead, candidates: hits });
    } else {
      unmatched.push(dead);
    }
  }
  return { matched, unmatched };
}

// CLI：对真实双 bundle 运行提取 + join，产出 state/reports/anchor-candidates.json。
function main() {
  const workspaceRoot = path.resolve(__dirname, '..', '..');
  const manifest = JSON.parse(
    fs.readFileSync(path.join(workspaceRoot, 'state', 'build-manifest.json'), 'utf8')
  );

  console.time('anchor-harvest total');
  const bundles = [
    ['desktop', manifest.files.workbenchOriginalPath],
    ['glass', manifest.files.workbenchGlassOriginalPath],
  ];

  const byIdentity = new Map();
  for (const [bundleName, bundlePath] of bundles) {
    console.time(`extract ${bundleName}`);
    const source = fs.readFileSync(bundlePath, 'utf8');
    for (const candidate of extractAnchorCandidates(source)) {
      const key = `${candidate.anchorType}\0${candidate.anchorId}\0${candidate.field || ''}`;
      let entry = byIdentity.get(key);
      if (!entry) {
        entry = { ...candidate, occurrences: {} };
        delete entry.offset;
        byIdentity.set(key, entry);
      }
      if (!entry.occurrences[bundleName]) {
        entry.occurrences[bundleName] = { count: 0, firstOffset: candidate.offset };
      }
      entry.occurrences[bundleName].count += 1;
    }
    console.timeEnd(`extract ${bundleName}`);
  }
  const candidates = [...byIdentity.values()];

  const deadPath = path.join(workspaceRoot, 'state', 'reports', 'anchor-pilot-dead-exact.json');
  const dead = fs.existsSync(deadPath) ? JSON.parse(fs.readFileSync(deadPath, 'utf8')) : [];
  const { matched, unmatched } = joinCandidatesWithDeadExact(candidates, dead);

  // common.json 现有 exact 映射 join：哪些映射词条有可用语义锚点（计划任务 3.1 REFACTOR）。
  const common = JSON.parse(
    fs.readFileSync(path.join(workspaceRoot, 'translations', 'overlay', 'cursor-win.common.json'), 'utf8')
  );
  const exactEntries = common.filter((m) => m && m.searchType === 'exact' && typeof m.originalText === 'string');
  const { matched: exactMatched } = joinCandidatesWithDeadExact(candidates, exactEntries);

  const report = {
    generatedAt: new Date().toISOString(),
    cursorVersion: manifest.cursorVersion,
    candidateCount: candidates.length,
    rejectedCount: candidates.filter((c) => c.rejected === true).length,
    deadExactCount: dead.length,
    deadExactMatchedCount: matched.length,
    commonExactMatchedCount: exactMatched.length,
    deadExactMatches: matched,
    deadExactUnmatched: unmatched,
    commonExactMatches: exactMatched.map((m) => ({
      originalText: m.originalText,
      surface: m.surface || null,
      candidates: m.candidates.map((c) => ({
        anchorType: c.anchorType,
        anchorId: c.anchorId,
        field: c.field || null,
      })),
    })),
    candidates,
  };

  const outPath = path.join(workspaceRoot, 'state', 'reports', 'anchor-candidates.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  console.timeEnd('anchor-harvest total');
  console.log(
    `candidates=${report.candidateCount} rejected=${report.rejectedCount} ` +
      `deadExactMatched=${report.deadExactMatchedCount}/${report.deadExactCount} ` +
      `commonExactMatched=${report.commonExactMatchedCount} -> ${outPath}`
  );
}

module.exports = {
  extractAnchorCandidates,
  isRejectedMinifiedAnchorId,
  joinCandidatesWithDeadExact,
  normalizeJoinText,
};

if (require.main === module) {
  main();
}
