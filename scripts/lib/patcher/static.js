const { escapeRegExp, escapeForQuotedLiteral } = require('../engine/substring');

const { applyProductTipsRenderHookPatches } = require('./product-tips-hook');

const { applyAnchorStaticTranslations } = require('./anchor-static');

const { loadEmbeddedPatchesForVersion } = require('../mapping/versioned-patches');

const { createWorkbenchIndex, iterateQuotedLiterals } = require('./workbench-index');

const { sourceHasQuotedLiteral } = require('./runtime-selector');



const embeddedPatchCache = new Map();



function getEmbeddedPatchesForVersion(cursorVersion) {

  const cacheKey = cursorVersion || 'generic';

  if (!embeddedPatchCache.has(cacheKey)) {

    embeddedPatchCache.set(cacheKey, loadEmbeddedPatchesForVersion(cursorVersion));

  }

  return embeddedPatchCache.get(cacheKey);

}



function findApplicableEmbeddedPatches(patches = [], anchorSource = '') {

  const anchor = String(anchorSource || '');

  if (!anchor || patches.length === 0) {

    return [];

  }



  const applicable = [];

  for (const patch of patches) {

    if (patch?.from && anchor.includes(patch.from)) {

      applicable.push(patch);

    }

  }

  return applicable;

}



function filterExactMappingsForWorkbench(workbenchSource, mappings = [], workbenchIndex) {

  if (workbenchIndex?.isAuthoritative === true && workbenchIndex.quotedLiterals) {

    return mappings.filter(

      (entry) =>

        entry &&

        entry.searchType === 'exact' &&

        typeof entry.originalText === 'string' &&

        entry.originalText.length > 0 &&

        typeof entry.changeText === 'string' &&

        workbenchIndex.quotedLiterals.has(entry.originalText)

    );

  }



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



function buildRegexVisibleQuotedLiteralSet(sourceText, candidateOriginals, quotedLiterals) {

  const pending = [];

  for (const original of candidateOriginals) {

    if (typeof original !== 'string' || original.length === 0) {

      continue;

    }

    if (quotedLiterals.has(original)) {

      continue;

    }

    pending.push(original);

  }



  if (pending.length === 0) {

    return new Set();

  }



  const pattern = pending

    .sort((left, right) => right.length - left.length)

    .map((original) => escapeRegExp(original))

    .join('|');

  const re = new RegExp(`(['"\`])(?:${pattern})\\1`, 'g');

  const found = new Set();

  const text = String(sourceText || '');

  let match;

  while ((match = re.exec(text)) !== null) {

    const content = text.slice(match.index + 1, match.index + match[0].length - 1);

    found.add(content);

  }



  return found;

}



function enrichWorkbenchQuotedLiterals(workbenchIndex, exactOriginalTexts = []) {

  if (!workbenchIndex?.isAuthoritative || !workbenchIndex.quotedLiterals) {

    return workbenchIndex;

  }



  const regexVisible = buildRegexVisibleQuotedLiteralSet(

    workbenchIndex.sourceText,

    exactOriginalTexts,

    workbenchIndex.quotedLiterals

  );

  if (regexVisible.size === 0) {

    return workbenchIndex;

  }



  return {

    ...workbenchIndex,

    quotedLiterals: new Set([...workbenchIndex.quotedLiterals, ...regexVisible]),

  };

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

    if (sourceHasQuotedLiteral(text, key, sourceIndex)) {

      counts.set(key, 0);

    }

  }



  iterateQuotedLiterals(text, (_quote, content) => {

    if (counts.has(content)) {

      counts.set(content, counts.get(content) + 1);

    }

  });



  const zeroCountKeys = [];

  for (const [key, count] of counts) {

    if (count === 0) {

      zeroCountKeys.push(key);

    }

  }



  if (zeroCountKeys.length > 0) {

    const pattern = zeroCountKeys

      .sort((left, right) => right.length - left.length)

      .map((key) => escapeRegExp(key))

      .join('|');

    const re = new RegExp(`(['"\`])(?:${pattern})\\1`, 'g');

    let match;

    while ((match = re.exec(text)) !== null) {

      const content = text.slice(match.index + 1, match.index + match[0].length - 1);

      if (counts.has(content)) {

        counts.set(content, counts.get(content) + 1);

      }

    }

  }



  for (const [key, count] of counts) {

    if (count > 0) {

      continue;

    }

    counts.delete(key);

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



function applyEmbeddedUiSourcePatches(sourceText, patches = [], anchorSource) {

  let current = String(sourceText || '');

  const applicable =

    anchorSource === undefined || anchorSource === null

      ? patches

      : findApplicableEmbeddedPatches(patches, anchorSource);



  for (const patch of applicable) {

    if (!patch?.from || !current.includes(patch.from)) {

      continue;

    }

    current = current.replaceAll(patch.from, patch.to);

  }

  return current;

}



function partitionEmbeddedUiSourcePatches(patches) {

  const preStatic = [];

  const postStatic = [];

  for (const patch of patches) {

    if (patch.applyBeforeStatic) {

      preStatic.push(patch);

      continue;

    }

    postStatic.push(patch);

  }

  return { preStatic, postStatic };

}



function enrichWorkbenchIndexWithEmbeddedPatches(workbenchIndex, anchorSource, cursorVersion) {

  const embeddedPatches = getEmbeddedPatchesForVersion(cursorVersion);

  const { preStatic, postStatic } = partitionEmbeddedUiSourcePatches(embeddedPatches);

  return {

    ...workbenchIndex,

    applicableEmbeddedPatches: {

      preStatic: findApplicableEmbeddedPatches(preStatic, anchorSource),

      postStatic,

    },

  };

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



function applyIndexedQuotedLiteralReplacements(sourceText, replacementByContent, workbenchIndex) {

  const activeKeys = new Set();

  for (const key of replacementByContent.keys()) {

    if (workbenchIndex.quotedLiterals.has(key)) {

      activeKeys.add(key);

    }

  }



  if (activeKeys.size === 0) {

    return String(sourceText || '');

  }



  const text = String(sourceText || '');

  const parts = [];

  let lastIndex = 0;



  iterateQuotedLiterals(text, (quote, content, start, end) => {

    parts.push(text.slice(lastIndex, start));

    if (activeKeys.has(content)) {

      const changed = replacementByContent.get(content);

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



function collectRemainingQuotedReplacementKeys(sourceText, replacementByContent, workbenchIndex) {

  if (!workbenchIndex?.quotedLiterals) {

    return new Set();

  }



  const candidates = [];

  for (const key of replacementByContent.keys()) {

    if (workbenchIndex.quotedLiterals.has(key)) {

      candidates.push(key);

    }

  }



  if (candidates.length === 0) {

    return new Set();

  }



  return buildRegexVisibleQuotedLiteralSet(sourceText, candidates, new Set());

}



function reconcileIndexedSinglePass(sourceText, replacementByContent, workbenchIndex) {

  let current = String(sourceText || '');

  let pending = findRemainingReplacementLiteralsViaScan(current, replacementByContent);

  if (pending.size > 0) {

    current = applyBatchQuotedLiteralRegexReplacement(current, pending, replacementByContent);

  }

  pending = collectRemainingQuotedReplacementKeys(current, replacementByContent, workbenchIndex);

  if (pending.size > 0) {

    const keys = [...pending];

    for (let index = 0; index < keys.length; index += 40) {

      current = applyBatchQuotedLiteralRegexReplacement(

        current,

        new Set(keys.slice(index, index + 40)),

        replacementByContent

      );

    }

  }

  return current;

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



function applyStaticSourceTranslations(workbenchSource, mappings = [], workbenchIndex, options = {}) {

  let current = String(workbenchSource || '');

  const cursorVersion = options.cursorVersion || null;

  const embeddedUiSourcePatches = getEmbeddedPatchesForVersion(cursorVersion);

  const partitionedEmbedded = partitionEmbeddedUiSourcePatches(embeddedUiSourcePatches);

  const precomputedEmbedded = workbenchIndex?.applicableEmbeddedPatches || {

    preStatic: findApplicableEmbeddedPatches(partitionedEmbedded.preStatic, workbenchSource),

    postStatic: partitionedEmbedded.postStatic,

  };



  current = applyEmbeddedUiSourcePatches(current, precomputedEmbedded.preStatic);



  const baseIndex =

    workbenchIndex && typeof workbenchIndex.hasQuotedLiteral === 'function'

      ? workbenchIndex

      : createWorkbenchIndex(current);



  const exactOriginalTexts = mappings

    .filter(

      (entry) =>

        entry &&

        entry.searchType === 'exact' &&

        typeof entry.originalText === 'string' &&

        entry.originalText.length > 0

    )

    .map((entry) => entry.originalText);



  const index = enrichWorkbenchQuotedLiterals(baseIndex, exactOriginalTexts);



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



  const useIndexedFastPath = index.isAuthoritative && index.quotedLiterals instanceof Set;



  if (replacementByContent.size > 0) {

    if (useIndexedFastPath) {

      current = applyIndexedQuotedLiteralReplacements(current, replacementByContent, index);

      current = reconcileIndexedSinglePass(current, replacementByContent, index);

      const occurrenceCounts = buildReplacementOccurrenceCounts(

        current,

        replacementByContent,

        index

      );

      current = reconcileSinglePassReplacements(

        current,

        replacementByContent,

        index,

        occurrenceCounts

      );

    } else {

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

  }



  if (slowPathEntries.length > 0) {

    const slowReplacementByContent = new Map(

      slowPathEntries.map((entry) => [entry.originalText, entry.changeText])

    );



    if (useIndexedFastPath) {

      const pendingSlow = new Set();

      for (const key of slowReplacementByContent.keys()) {

        if (index.quotedLiterals.has(key)) {

          pendingSlow.add(key);

        }

      }

      if (pendingSlow.size > 0) {

        current = applyBatchQuotedLiteralRegexReplacement(

          current,

          pendingSlow,

          slowReplacementByContent

        );

      }

    } else {

      for (const entry of slowPathEntries) {

        current = applyQuotedLiteralRegexReplacement(

          current,

          entry.originalText,

          entry.changeText

        );

      }

    }

  }



  current = applyEmbeddedUiSourcePatches(current, precomputedEmbedded.postStatic);



  current = applyAnchorStaticTranslations(

    current,

    mappings.filter((entry) => entry && entry.searchType === 'anchor')

  );



  current = applyProductTipsRenderHookPatches(current);



  if (replacementByContent.size > 0) {

    const remaining = findRemainingReplacementLiterals(current, replacementByContent);

    if (remaining.size > 0) {

      current = applyBatchQuotedLiteralRegexReplacement(

        current,

        remaining,

        replacementByContent

      );

    }

  }



  return current;

}



module.exports = {

  applyStaticSourceTranslations,

  findApplicableEmbeddedPatches,

  enrichWorkbenchIndexWithEmbeddedPatches,

  enrichWorkbenchQuotedLiterals,

  buildRegexVisibleQuotedLiteralSet,

  getEmbeddedPatchesForVersion,

  applyEmbeddedUiSourcePatches,

  partitionEmbeddedUiSourcePatches,

  applyQuotedLiteralReplacements,

  applyQuotedLiteralRegexReplacement,

  applyBatchQuotedLiteralRegexReplacement,

  applyIndexedQuotedLiteralReplacements,

  buildReplacementOccurrenceCounts,

  findRemainingReplacementLiterals,

  findRemainingReplacementLiteralsViaScan,

  reconcileSinglePassReplacements,

  reconcileIndexedSinglePass,

  collectRemainingQuotedReplacementKeys,

};
