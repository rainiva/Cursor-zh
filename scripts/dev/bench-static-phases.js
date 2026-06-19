const fs = require('fs');
const path = require('path');
const { createWorkbenchIndex, iterateQuotedLiterals } = require('../lib/patcher/workbench-index.js');
const {
  applyQuotedLiteralReplacements,
  buildReplacementOccurrenceCounts,
  reconcileSinglePassReplacements,
  findRemainingReplacementLiterals,
  applyStaticSourceTranslations,
} = require('../lib/patcher/static.js');
const { mergeMappings } = require('../cursor-zh-lib.js');
const { createToolPaths } = require('../tool/paths.js');
const { readJsonIfExists } = require('../tool/io.js');
const { sourceHasQuotedLiteral } = require('../lib/patcher/runtime-selector.js');

const workbenchPath =
  process.argv[2] ||
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js';
const source = fs.readFileSync(workbenchPath, 'utf8');
const toolPaths = createToolPaths(path.join(__dirname, '../..'));
const merged = mergeMappings(
  mergeMappings(
    mergeMappings(
      readJsonIfExists(toolPaths.baseMappingPath, []),
      readJsonIfExists(toolPaths.overlayMappingPath, [])
    ),
    readJsonIfExists(toolPaths.cursorWinCommonPath, [])
  ),
  readJsonIfExists(toolPaths.dynamicMappingPath, [])
);

function time(label, fn) {
  const t0 = Date.now();
  const result = fn();
  console.log(label, Date.now() - t0, 'ms');
  return result;
}

const index = time('index', () => createWorkbenchIndex(source));

const exactMappings = time('filter mappings', () =>
  merged.filter(
    (entry) =>
      entry &&
      entry.searchType === 'exact' &&
      typeof entry.originalText === 'string' &&
      entry.originalText.length > 0 &&
      typeof entry.changeText === 'string' &&
      sourceHasQuotedLiteral(source, entry.originalText, index)
  )
);

const REGEX_SPECIAL_RE = /[.*+?^${}()|[\]\\]/;
const QUOTE_CHARS = new Set(["'", '"', '`']);
const replacementByContent = new Map();
for (const entry of exactMappings) {
  const original = entry.originalText;
  const changed = entry.changeText;
  const canUseSinglePass =
    !REGEX_SPECIAL_RE.test(original) &&
    !QUOTE_CHARS.has(original[0]) &&
    !QUOTE_CHARS.has(original[original.length - 1]) &&
    !QUOTE_CHARS.has(changed[0]) &&
    !QUOTE_CHARS.has(changed[changed.length - 1]);
  if (canUseSinglePass) replacementByContent.set(original, changed);
}

console.log('single-pass keys', replacementByContent.size);

const occurrenceCounts = time('buildReplacementOccurrenceCounts', () =>
  buildReplacementOccurrenceCounts(source, replacementByContent, index)
);

const afterReplace = time('applyQuotedLiteralReplacements', () =>
  applyQuotedLiteralReplacements(source, replacementByContent, occurrenceCounts)
);

time('reconcileSinglePassReplacements', () =>
  reconcileSinglePassReplacements(afterReplace, replacementByContent, index, occurrenceCounts)
);

time('findRemainingReplacementLiterals', () =>
  findRemainingReplacementLiterals(afterReplace, replacementByContent)
);

function findRemainingViaScan(sourceText, replacementByContent) {
  const pending = new Set();
  iterateQuotedLiterals(sourceText, (_quote, content) => {
    if (replacementByContent.has(content)) {
      pending.add(content);
    }
  });
  return pending;
}

time('findRemainingViaScan', () => findRemainingViaScan(afterReplace, replacementByContent));

time('applyStaticSourceTranslations full', () =>
  applyStaticSourceTranslations(source, merged, index)
);
