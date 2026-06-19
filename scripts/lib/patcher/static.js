const { escapeRegExp, escapeForQuotedLiteral } = require('../engine/substring');
const { applyProductTipsRenderHookPatches } = require('./product-tips-hook');
const { CRITICAL_EMBEDDED_UI_PATCHES } = require('../mapping/critical-ui-targets');
const { createWorkbenchIndex, iterateQuotedLiterals } = require('./workbench-index');
const { sourceHasQuotedLiteral } = require('./runtime-selector');

function filterExactMappingsForWorkbench(workbenchSource, mappings = [], workbenchIndex) {
  return mappings.filter(
    (entry) =>
      entry &&
      entry.searchType === 'exact' &&
      typeof entry.originalText === 'string' &&
      entry.originalText.length > 0 &&
      typeof entry.changeText === 'string' &&
      sourceHasQuotedLiteral(workbenchSource, entry.originalText, workbenchIndex)
  );
}

function buildReplacementOccurrenceCounts(sourceText, replacementByContent, workbenchIndex) {
  const counts = new Map();
  if (!replacementByContent || replacementByContent.size === 0) {
    return counts;
  }

  const text = String(sourceText || '');
  const sourceIndex =
    workbenchIndex && typeof workbenchIndex.hasQuotedLiteral === 'function'
      ? workbenchIndex
      : createWorkbenchIndex(text);

  for (const key of replacementByContent.keys()) {
    if (
      sourceIndex.isAuthoritative === true
        ? sourceIndex.hasQuotedLiteral(key)
        : sourceHasQuotedLiteral(text, key, sourceIndex)
    ) {
      counts.set(key, 0);
    }
  }

  iterateQuotedLiterals(text, (_quote, content) => {
    if (counts.has(content)) {
      counts.set(content, counts.get(content) + 1);
    }
  });

  for (const [key, count] of counts) {
    if (count === 0) {
      counts.delete(key);
    }
  }

  return counts;
}

function findRemainingReplacementLiteralsViaScan(sourceText, replacementByContent) {
  const pending = new Set();
  if (!replacementByContent || replacementByContent.size === 0) {
    return pending;
  }

  iterateQuotedLiterals(String(sourceText || ''), (_quote, content) => {
    if (replacementByContent.has(content)) {
      pending.add(content);
    }
  });

  return pending;
}

function findRemainingReplacementLiterals(sourceText, replacementByContent) {
  const text = String(sourceText || '');
  const pending = new Set();
  if (!replacementByContent || replacementByContent.size === 0 || text.length === 0) {
    return pending;
  }

  const originals = [...replacementByContent.keys()].sort(
    (left, right) => right.length - left.length
  );
  const pattern = originals.map((original) => escapeRegExp(original)).join('|');
  const re = new RegExp(`(['"\`])(?:${pattern})\\1`, 'g');
  let match;
  while ((match = re.exec(text)) !== null) {
    const content = text.slice(match.index + 1, match.index + match[0].length - 1);
    if (replacementByContent.has(content)) {
      pending.add(content);
    }
  }

  return pending;
}

function applyBatchQuotedLiteralRegexReplacement(
  sourceText,
  pendingOriginals,
  replacementByContent
) {
  const originals = [...pendingOriginals].sort((left, right) => right.length - left.length);
  if (originals.length === 0) {
    return String(sourceText || '');
  }

  const pattern = originals.map((original) => escapeRegExp(original)).join('|');
  const re = new RegExp(`(['"\`])(?:${pattern})\\1`, 'g');
  return String(sourceText || '').replace(re, (fullMatch, quote) => {
    const content = fullMatch.slice(1, -1);
    const changed = replacementByContent.get(content);
    if (typeof changed !== 'string') {
      return fullMatch;
    }

    const translated = escapeForQuotedLiteral(changed, quote, {
      preserveTemplatePlaceholders: quote === '`' && content.includes('${'),
    });
    return `${quote}${translated}${quote}`;
  });
}

function applyQuotedLiteralReplacements(sourceText, replacementByContent, occurrenceCounts) {
  const parts = [];
  const text = String(sourceText || '');
  let lastIndex = 0;

  iterateQuotedLiterals(text, (quote, content, start, end) => {
    parts.push(text.slice(lastIndex, start));
    const changed = replacementByContent.get(content);
    if (typeof changed === 'string') {
      if (occurrenceCounts && occurrenceCounts.has(content)) {
        occurrenceCounts.set(content, occurrenceCounts.get(content) - 1);
      }
      const escaped = escapeForQuotedLiteral(changed, quote, {
        preserveTemplatePlaceholders: quote === '`' && content.includes('${'),
      });
      parts.push(quote, escaped, quote);
    } else {
      parts.push(text.slice(start, end));
    }
    lastIndex = end;
  });

  parts.push(text.slice(lastIndex));
  return parts.join('');
}

function applyQuotedLiteralRegexReplacement(sourceText, originalText, changedText) {
  const original = String(originalText || '');
  const changed = String(changedText || '');
  const escapedOriginal = escapeRegExp(original);
  const literalPattern = new RegExp(`(['"\`])${escapedOriginal}\\1`, 'g');
  return String(sourceText || '').replace(literalPattern, (_match, quote) => {
    const translated = escapeForQuotedLiteral(changed, quote, {
      preserveTemplatePlaceholders: quote === '`' && original.includes('${'),
    });
    return `${quote}${translated}${quote}`;
  });
}

function reconcileSinglePassReplacements(
  sourceText,
  replacementByContent,
  workbenchIndex,
  occurrenceCounts
) {
  let current = String(sourceText || '');
  if (!replacementByContent || replacementByContent.size === 0) {
    return current;
  }

  const pendingFromCounts = new Set();
  if (occurrenceCounts && occurrenceCounts.size > 0) {
    for (const [original, remaining] of occurrenceCounts) {
      if (remaining > 0 && replacementByContent.has(original)) {
        pendingFromCounts.add(original);
      }
    }
  } else {
    for (const literal of findRemainingReplacementLiteralsViaScan(
      current,
      replacementByContent
    )) {
      pendingFromCounts.add(literal);
    }
  }

  if (pendingFromCounts.size > 0) {
    current = applyBatchQuotedLiteralRegexReplacement(
      current,
      pendingFromCounts,
      replacementByContent
    );
    if (occurrenceCounts) {
      for (const original of pendingFromCounts) {
        if (occurrenceCounts.has(original)) {
          occurrenceCounts.set(original, 0);
        }
      }
    }
  }

  const remaining = findRemainingReplacementLiterals(current, replacementByContent);
  if (remaining.size > 0) {
    current = applyBatchQuotedLiteralRegexReplacement(
      current,
      remaining,
      replacementByContent
    );
    if (occurrenceCounts) {
      for (const original of remaining) {
        if (occurrenceCounts.has(original)) {
          occurrenceCounts.set(original, 0);
        }
      }
    }
  }

  return current;
}

function applyStaticSourceTranslations(workbenchSource, mappings = [], workbenchIndex) {
  let current = String(workbenchSource || '');
  const index =
    workbenchIndex && typeof workbenchIndex.hasQuotedLiteral === 'function'
      ? workbenchIndex
      : createWorkbenchIndex(current);
  const exactMappings = filterExactMappingsForWorkbench(
    workbenchSource,
    mappings,
    index
  ).sort((left, right) => right.originalText.length - left.originalText.length);

  const REGEX_SPECIAL_RE = /[.*+?^${}()|[\]\\]/;
  const QUOTE_CHARS = new Set(["'", '"', '`']);
  const replacementByContent = new Map();
  const slowPathEntries = [];

  for (const entry of exactMappings) {
    const original = entry.originalText;
    const changed = entry.changeText;
    const canUseSinglePass =
      !REGEX_SPECIAL_RE.test(original) &&
      !QUOTE_CHARS.has(original[0]) &&
      !QUOTE_CHARS.has(original[original.length - 1]) &&
      !QUOTE_CHARS.has(changed[0]) &&
      !QUOTE_CHARS.has(changed[changed.length - 1]);

    if (canUseSinglePass) {
      replacementByContent.set(original, changed);
      continue;
    }

    slowPathEntries.push(entry);
  }

  if (replacementByContent.size > 0) {
    const occurrenceCounts = buildReplacementOccurrenceCounts(
      current,
      replacementByContent,
      index
    );
    current = applyQuotedLiteralReplacements(current, replacementByContent, occurrenceCounts);
    current = reconcileSinglePassReplacements(
      current,
      replacementByContent,
      index,
      occurrenceCounts
    );
  }

  for (const entry of slowPathEntries) {
    const original = entry.originalText;
    const changed = entry.changeText;
    current = applyQuotedLiteralRegexReplacement(current, original, changed);
  }

  const embeddedUiSourcePatches = [
    ...CRITICAL_EMBEDDED_UI_PATCHES,
    {
      from: 'Show all (<!> more)',
      to: '显示全部（还有 <!> 项）',
    },
    {
      from: 'Show less',
      to: '收起',
    },
  ];

  for (const patch of embeddedUiSourcePatches) {
    if (!current.includes(patch.from)) {
      continue;
    }
    current = current.split(patch.from).join(patch.to);
  }

  current = applyProductTipsRenderHookPatches(current);

  return current;
}

module.exports = {
  applyStaticSourceTranslations,
  applyQuotedLiteralReplacements,
  applyQuotedLiteralRegexReplacement,
  applyBatchQuotedLiteralRegexReplacement,
  buildReplacementOccurrenceCounts,
  findRemainingReplacementLiterals,
  findRemainingReplacementLiteralsViaScan,
  reconcileSinglePassReplacements,
};
