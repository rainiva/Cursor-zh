const {
  defaultCursorWinCommonMappings: loadDefaultCursorWinCommonMappings,
  defaultCursorWinDynamicMappings: loadDefaultCursorWinDynamicMappings,
  defaultOverlayMappings: loadDefaultOverlayMappings,
} = require('./lib/mapping/data.js');

const LEGACY_MAPPING_PATTERN =
  /const translationMappings = (\[.*?\]); \/\/ don't modify string/s;

function createMapping(originalText, changeText, extra = {}) {
  return {
    originalText,
    changeText,
    searchType: 'exact',
    ...extra,
  };
}

function createExactMapping(originalText, changeText, extra = {}) {
  return createMapping(originalText, changeText, {
    ...extra,
    searchType: 'exact',
  });
}

function createNormalizedExactMapping(originalText, changeText, extra = {}) {
  return createMapping(originalText, changeText, {
    ...extra,
    searchType: 'normalizedExact',
  });
}

function createRegexMapping(originalText, changeText, extra = {}) {
  return createMapping(originalText, changeText, {
    ...extra,
    searchType: 'regex',
  });
}

function normalizeTextForComparison(text) {
  return String(text || '')
    .replace(/\u2026/g, '...')
    .replace(/\.{3,}/g, '...')
    .replace(/&&/g, '')
    .replace(/&/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function stripJsonComments(source) {
  return source
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

function parseJsonc(source) {
  if (typeof source !== 'string' || source.trim() === '') {
    return {};
  }

  return JSON.parse(stripJsonComments(source));
}

function parseLegacyWorktreeMappings(source) {
  if (typeof source !== 'string' || source.length === 0) {
    return [];
  }

  const match = source.match(LEGACY_MAPPING_PATTERN);
  if (!match) {
    return [];
  }

  const parsed = new Function(`return (${match[1]})`)();
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      originalText: item.originalText,
      changeText: item.changeText,
      searchType: item.searchType || 'exact',
      ...(item.flags ? { flags: item.flags } : {}),
      ...(item.scopeSelectors ? { scopeSelectors: item.scopeSelectors } : {}),
      ...(item.scopeContainsText ? { scopeContainsText: item.scopeContainsText } : {}),
      ...(item.coverageHints ? { coverageHints: item.coverageHints } : {}),
    }));
}

function mappingKey(mapping) {
  return [
    mapping.originalText || '',
    mapping.searchType || 'exact',
    mapping.flags || '',
    Array.isArray(mapping.scopeSelectors) ? mapping.scopeSelectors.join('|') : '',
    Array.isArray(mapping.scopeContainsText) ? mapping.scopeContainsText.join('|') : '',
  ].join('::');
}

function mergeMappings(baseMappings = [], overlayMappings = []) {
  const merged = new Map();

  for (const mapping of baseMappings) {
    merged.set(mappingKey(mapping), { ...mapping });
  }

  for (const mapping of overlayMappings) {
    merged.set(mappingKey(mapping), { ...mapping });
  }

  return Array.from(merged.values());
}

function parseVersionParts(version) {
  const [major = '0', minor = '0', patch = '0'] = String(version)
    .split('.')
    .map((part) => part.replace(/[^\d].*$/, ''));

  return [Number(major), Number(minor), Number(patch)];
}

function compareLanguagePackVersion(languagePackVersion, vscodeVersion) {
  const [lpMajor, lpMinor] = parseVersionParts(languagePackVersion);
  const [vsMajor, vsMinor] = parseVersionParts(vscodeVersion);

  if (lpMajor === vsMajor && lpMinor === vsMinor) {
    return { compatible: true, reason: 'major-minor-match' };
  }

  return { compatible: false, reason: 'major-minor-mismatch' };
}

function withLocaleSetting(config, locale) {
  return {
    ...(config || {}),
    locale,
  };
}

function defaultCursorWinCommonMappings() {
  return loadDefaultCursorWinCommonMappings();
}

function defaultOverlayMappings() {
  return loadDefaultOverlayMappings();
}

function cursorWinCoverageTargets() {
  return defaultCursorWinCommonMappings().map((item) => item.originalText);
}

function analyzeCursorWinCoverage({ workbenchSource = '', mappings = [], targets = [] }) {
  const bundleTargets = targets.filter((target) => workbenchSource.includes(target));
  const mappedTargets = bundleTargets.filter(
    (target) => translateTextWithMappings(target, mappings) !== target
  );
  const missingTargets = bundleTargets.filter(
    (target) => !mappedTargets.includes(target)
  );

  return {
    totalTargetCount: targets.length,
    bundleTargetCount: bundleTargets.length,
    mappedTargetCount: mappedTargets.length,
    missingTargets,
  };
}

function productTipsCoverageTargets() {
  return [
    'Use /canvas to get interactive visualizations like dashboards from Cursor',
    'Cursor can respond with interactive visualizations alongside text. Use /canvas to get started',
    'Use /shell to run commands in the terminal',
    'Voice mode lets you dictate better prompts. Click or hold ctrl+M to enable',
    'Composer offers a great balance of intelligence and cost. Try it out from the model picker',
    'Ask mode uses read-only agents to research your codebase. Use shift+tab to enable',
    'Use /loop to run a prompt on a schedule or keep a local agent running continuously',
    'Use /add-plugin to install a plugin from the Cursor Marketplace',
    'Use cloud agents for better parallelization and durable execution. Go to cursor.com/agents',
  ];
}

function productTipScopedMappings(mappings = []) {
  return mappings.filter((entry) => isProductTipScopedMapping(entry));
}

function analyzeProductTipsCoverage({ mappings = [], targets = [] }) {
  const scopedMappings = productTipScopedMappings(mappings);
  const mappedTips = [];
  const missingTips = [];

  for (const sampleText of targets) {
    const translated = translateTextWithMappings(sampleText, scopedMappings, {
      scopeMatched: true,
      scopeText: sampleText,
    });
    if (translated === sampleText) {
      missingTips.push(sampleText);
    } else {
      mappedTips.push(sampleText);
    }
  }

  return {
    totalTipCount: targets.length,
    mappedTipCount: mappedTips.length,
    missingTips,
  };
}

function serializeMappings(mappings) {
  return JSON.stringify(mappings, null, 2);
}

const productTipScopeSelectors = ['[class*="empty-state-rotating-tips"]'];
const STATIC_SOURCE_PATCHES = [
  {
    from: 'Show all (<!> more)',
    to: '\u663e\u793a\u5168\u90e8\uff08\u8fd8\u6709 <!> \u9879\uff09',
  },
  {
    from: 'Show less',
    to: '\u6536\u8d77',
  },
];
const KEY_SURFACE_PATCH_CONTRACTS = [
  {
    id: 'search_models',
    surface: 'model_picker',
    required: true,
    fallbackMode: 'none',
    originalText: 'Search models',
    translatedText: '\u641c\u7d22\u6a21\u578b',
  },
  {
    id: 'send_follow_up',
    surface: 'composer',
    required: true,
    fallbackMode: 'none',
    originalText: 'Send follow-up',
    translatedText: '\u7ee7\u7eed\u8ffd\u95ee',
  },
  {
    id: 'product_tips_render_hook',
    surface: 'product_tips',
    required: true,
    fallbackMode: 'runtime',
    from: 'const Re=z?U?"":mkE:U?"":ne?.text??"",Be=',
    to: 'const Re=z?U?"":mkE:U?"":window.__cursorZhTranslateProductTipText?window.__cursorZhTranslateProductTipText(ne?.text??""):ne?.text??"",Be=',
  },
];
const KEY_SURFACE_CONTRACTS_BY_ORIGINAL_TEXT = new Map(
  KEY_SURFACE_PATCH_CONTRACTS.filter(
    (contract) => typeof contract.originalText === 'string' && contract.originalText.length > 0
  ).map((contract) => [contract.originalText, contract])
);

function isProductTipScopedMapping(entry) {
  const scopeSelectors = Array.isArray(entry?.scopeSelectors) ? entry.scopeSelectors : [];
  return (
    scopeSelectors.length === productTipScopeSelectors.length &&
    scopeSelectors.every((selector, index) => selector === productTipScopeSelectors[index])
  );
}

function sourceHasQuotedLiteral(workbenchSource, originalText) {
  if (typeof originalText !== 'string' || originalText.length === 0) {
    return false;
  }

  const escapedOriginal = escapeRegExp(originalText);
  const literalPattern = new RegExp(`(['"\`])${escapedOriginal}\\1`);
  return literalPattern.test(String(workbenchSource || ''));
}

function selectRuntimeMappings(workbenchSource, mappings = []) {
  return mappings.filter((entry) => {
    if (!entry || typeof entry.originalText !== 'string' || entry.originalText.length === 0) {
      return false;
    }

    if (entry.forceRuntime === true) {
      return true;
    }

    if (isProductTipScopedMapping(entry)) {
      return false;
    }

    const hasScopeSelectors =
      Array.isArray(entry.scopeSelectors) && entry.scopeSelectors.length > 0;
    const hasScopeHints =
      Array.isArray(entry.scopeContainsText) && entry.scopeContainsText.length > 0;

    if (entry.searchType !== 'exact') {
      return true;
    }

    if (hasScopeSelectors || hasScopeHints) {
      return true;
    }

    return !sourceHasQuotedLiteral(workbenchSource, entry.originalText);
  });
}

function defaultCursorWinDynamicMappings() {
  return loadDefaultCursorWinDynamicMappings();
}

function scopeHintsMatch(scopeContainsText = [], scopeText = '') {
  if (!Array.isArray(scopeContainsText) || scopeContainsText.length === 0) {
    return true;
  }

  const normalizedScopeText = normalizeTextForComparison(scopeText);
  if (!normalizedScopeText) {
    return false;
  }

  return scopeContainsText.some((hint) =>
    normalizedScopeText.includes(normalizeTextForComparison(hint))
  );
}

function mappingMatchesScope(entry, options = {}) {
  const hasScopeSelectors =
    Array.isArray(entry?.scopeSelectors) && entry.scopeSelectors.length > 0;
  const hasScopeHints =
    Array.isArray(entry?.scopeContainsText) && entry.scopeContainsText.length > 0;

  if (!hasScopeSelectors && !hasScopeHints) {
    return true;
  }

  if (options.scopeMatched === false) {
    return false;
  }

  if (options.scopeMatched === true) {
    return true;
  }

  return scopeHintsMatch(entry.scopeContainsText, options.scopeText || '');
}

function describeCoverageEntry(entry) {
  if (!entry) {
    return '';
  }

  if (Array.isArray(entry.coverageHints) && entry.coverageHints.length > 0) {
    return entry.coverageHints[0];
  }

  return entry.originalText || '';
}

function entryAppearsInSource(entry, workbenchSource = '') {
  const haystack = normalizeTextForComparison(workbenchSource);
  const hints =
    Array.isArray(entry?.coverageHints) && entry.coverageHints.length > 0
      ? entry.coverageHints
      : [entry?.originalText];

  return hints.some((hint) => haystack.includes(normalizeTextForComparison(hint)));
}

function translateTextWithMappings(text, mappings = [], options = {}) {
  if (typeof text !== 'string' || text.length === 0) {
    return text;
  }

  let current = text;
  for (const entry of mappings) {
    if (!entry || !entry.originalText) {
      continue;
    }

    if (!mappingMatchesScope(entry, options)) {
      continue;
    }

    if (entry.searchType === 'exact') {
      if (current.trim() === entry.originalText) {
        current = entry.changeText;
      }
    } else if (entry.searchType === 'normalizedExact') {
      if (
        normalizeTextForComparison(current) ===
        normalizeTextForComparison(entry.originalText)
      ) {
        current = entry.changeText;
      }
    } else if (entry.searchType === 'partial') {
      current = current.split(entry.originalText).join(entry.changeText);
    } else if (entry.searchType === 'regex') {
      const regex = new RegExp(entry.originalText, entry.flags || 'g');
      current = current.replace(regex, entry.changeText);
    }
  }

  return current;
}

function analyzeDynamicRuleCoverage({ workbenchSource = '', mappings = [], targets = [] }) {
  const mappingIndex = new Map(mappings.map((entry) => [mappingKey(entry), entry]));
  const bundleRules = targets.filter((entry) => entryAppearsInSource(entry, workbenchSource));
  const mappedRules = bundleRules.filter((entry) => {
    const activeEntry = mappingIndex.get(mappingKey(entry));
    if (!activeEntry) {
      return false;
    }

    if (activeEntry.searchType === 'regex') {
      return true;
    }

    const sampleText = describeCoverageEntry(activeEntry);
    const scopeText = Array.isArray(activeEntry.scopeContainsText)
      ? activeEntry.scopeContainsText.join(' ')
      : '';

    return (
      translateTextWithMappings(sampleText, [activeEntry], {
        scopeMatched: true,
        scopeText,
      }) !== sampleText
    );
  });
  const missingRules = bundleRules
    .filter((entry) => !mappedRules.some((mapped) => mappingKey(mapped) === mappingKey(entry)))
    .map((entry) => describeCoverageEntry(entry));

  return {
    totalRuleCount: targets.length,
    bundleRuleCount: bundleRules.length,
    mappedRuleCount: mappedRules.length,
    missingRules,
  };
}

function escapeRegExp(source) {
  return String(source).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeForQuotedLiteral(text, quote, options = {}) {
  const preserveTemplatePlaceholders = Boolean(
    options && options.preserveTemplatePlaceholders
  );
  let current = String(text).replace(/\\/g, '\\\\');
  if (quote === "'") {
    current = current.replace(/'/g, "\\'");
  } else if (quote === '"') {
    current = current.replace(/"/g, '\\"');
  } else if (quote === '`') {
    current = current.replace(/`/g, '\\`');
    if (!preserveTemplatePlaceholders) {
      current = current.replace(/\$\{/g, '\\${');
    }
  }
  return current;
}

function applyStaticSourceTranslations(workbenchSource, mappings = []) {
  let current = String(workbenchSource || '');
  const exactMappings = mappings
    .filter(
      (entry) =>
        entry &&
        entry.searchType === 'exact' &&
        typeof entry.originalText === 'string' &&
        entry.originalText.length > 0 &&
        typeof entry.changeText === 'string'
    )
    .sort((left, right) => right.originalText.length - left.originalText.length);

  // Fast path: use split/join for literals that contain no regex-special chars
  // and no quote chars that need escaping. This avoids the overhead of
  // creating and running RegExp objects on multi-MB source text.
  const REGEX_SPECIAL_RE = /[.*+?^${}()|[\]\\]/;
  const QUOTE_CHARS = new Set(["'", '"', '`']);

  for (const entry of exactMappings) {
    const original = entry.originalText;
    const changed = entry.changeText;

    // Determine if we can use the fast split/join path.
    const canUseFastPath =
      !REGEX_SPECIAL_RE.test(original) &&
      !QUOTE_CHARS.has(original[0]) &&
      !QUOTE_CHARS.has(original[original.length - 1]) &&
      !QUOTE_CHARS.has(changed[0]) &&
      !QUOTE_CHARS.has(changed[changed.length - 1]);

    if (canUseFastPath) {
      // Build the three quoted variants and replace them directly.
      const singleQuoted = `'${original}'`;
      const doubleQuoted = `"${original}"`;
      const templateQuoted = `\`${original}\``;
      const singleChanged = `'${changed}'`;
      const doubleChanged = `"${changed}"`;
      const templateChanged = `\`${changed}\``;

      if (current.includes(singleQuoted)) {
        current = current.split(singleQuoted).join(singleChanged);
      }
      if (current.includes(doubleQuoted)) {
        current = current.split(doubleQuoted).join(doubleChanged);
      }
      if (current.includes(templateQuoted)) {
        current = current.split(templateQuoted).join(templateChanged);
      }
      continue;
    }

    // Slow path: full regex-based replacement for complex literals.
    const escapedOriginal = escapeRegExp(original);
    const literalPattern = new RegExp(`(['"\`])${escapedOriginal}\\1`, 'g');
    current = current.replace(literalPattern, (_match, quote) => {
      const translated = escapeForQuotedLiteral(changed, quote, {
        preserveTemplatePlaceholders:
          quote === '`' && original.includes('${'),
      });
      return `${quote}${translated}${quote}`;
    });
  }

  const embeddedUiSourcePatches = [
    {
      from: 'Show all (<!> more)',
      to: '显示全部（还有 <!> 项）',
    },
    {
      from: 'Show less',
      to: '收起',
    },
    {
      from: 'const Re=z?U?"":mkE:U?"":ne?.text??"",Be=',
      to: 'const Re=z?U?"":mkE:U?"":window.__cursorZhTranslateProductTipText?window.__cursorZhTranslateProductTipText(ne?.text??""):ne?.text??"",Be=',
    },
  ];

  for (const patch of embeddedUiSourcePatches) {
    if (!current.includes(patch.from)) {
      continue;
    }
    current = current.split(patch.from).join(patch.to);
  }

  return current;
}

function initializePatchContracts() {
  const contracts = {};

  for (const contract of KEY_SURFACE_PATCH_CONTRACTS) {
    contracts[contract.id] = {
      surface: contract.surface,
      required: contract.required,
      fallbackMode: contract.fallbackMode,
      severityOnMiss: contract.fallbackMode === 'runtime' ? 'warning' : 'error',
      matchCount: 0,
    };
  }

  return contracts;
}

function countSubstringMatches(sourceText, pattern) {
  if (typeof pattern !== 'string' || pattern.length === 0) {
    return 0;
  }

  return String(sourceText || '').split(pattern).length - 1;
}

function countQuotedLiteralMatches(sourceText, literalText) {
  if (typeof literalText !== 'string' || literalText.length === 0) {
    return 0;
  }

  const escapedLiteral = escapeRegExp(literalText);
  const matches = String(sourceText || '').match(new RegExp(`(['"\`])${escapedLiteral}\\1`, 'g'));
  return Array.isArray(matches) ? matches.length : 0;
}

function applyStaticSourceTranslationsDetailed(workbenchSource, mappings = []) {
  const sourceText = String(workbenchSource || '');
  const translatedSource = applyStaticSourceTranslations(sourceText, mappings);
  const contracts = initializePatchContracts();

  for (const contract of KEY_SURFACE_PATCH_CONTRACTS) {
    if (typeof contract.originalText === 'string' && contract.originalText.length > 0) {
      const sourceMatchCount = countQuotedLiteralMatches(sourceText, contract.originalText);
      if (sourceMatchCount === 0) {
        continue;
      }

      const translatedMatchCount = countQuotedLiteralMatches(
        translatedSource,
        contract.translatedText
      );
      contracts[contract.id].matchCount = Math.min(sourceMatchCount, translatedMatchCount);
      continue;
    }

    if (typeof contract.from === 'string' && contract.from.length > 0) {
      const sourceMatchCount = countSubstringMatches(sourceText, contract.from);
      if (sourceMatchCount === 0) {
        continue;
      }

      const translatedMatchCount = countSubstringMatches(translatedSource, contract.to);
      contracts[contract.id].matchCount = Math.min(sourceMatchCount, translatedMatchCount);
    }
  }

  return {
    translatedSource,
    contracts,
  };
}

function summarizeStaticPatchContractsFromTranslatedSource(translatedSourceText = '') {
  const contracts = initializePatchContracts();
  const text = String(translatedSourceText || '');

  for (const contract of KEY_SURFACE_PATCH_CONTRACTS) {
    if (typeof contract.translatedText === 'string' && contract.translatedText.length > 0) {
      contracts[contract.id].matchCount = countQuotedLiteralMatches(
        text,
        contract.translatedText
      );
      continue;
    }

    if (typeof contract.to === 'string' && contract.to.length > 0) {
      contracts[contract.id].matchCount = countSubstringMatches(text, contract.to);
    }
  }

  return contracts;
}

function evaluatePatchContracts({ runtimeMode, contracts }) {
  const issues = [];
  const warnings = [];

  for (const [contractId, contract] of Object.entries(contracts || {})) {
    if (contract?.required !== true || contract.matchCount > 0) {
      continue;
    }

    if (contract.fallbackMode === 'runtime') {
      warnings.push(
        `Static patch contract missed and runtime fallback stayed active: ${contractId}`
      );
      continue;
    }

    if (runtimeMode === 'performance') {
      issues.push(`Required static patch contract failed: ${contractId}`);
    }
  }

  return { issues, warnings };
}

function summarizeRuntimeFootprint(bundleText, translatedSourceText, runtimeMappings = []) {
  const runtimeHeaderChars = Math.max(
    String(bundleText || '').length - String(translatedSourceText || '').length,
    0
  );

  return {
    runtimeHeaderChars,
    runtimeHeaderKB: +(runtimeHeaderChars / 1024).toFixed(1),
    runtimeMappingCount: Array.isArray(runtimeMappings) ? runtimeMappings.length : 0,
  };
}

function buildTranslatedWorkbenchBundle({
  workbenchSource,
  mappings,
  runtimeMappings,
  metadata,
}) {
  const safeMetadata = metadata || {};
  const experimentalRuntimeToggleEnabled =
    safeMetadata.experimentalRuntimeToggleEnabled === true &&
    typeof safeMetadata.toggleSignalPath === 'string' &&
    safeMetadata.toggleSignalPath.length > 0;
  const runtimeDiagnosticsEnabled = safeMetadata.runtimeDiagnosticsEnabled === true;
  const generalRuntimeMappings = Array.isArray(runtimeMappings)
    ? runtimeMappings
    : selectRuntimeMappings(workbenchSource, mappings);
  const scopedProductTipMappings = productTipScopedMappings(mappings);
  const runtimeHeader = [
    '/* Cursor ZH generated runtime: do not edit generated file directly. */',
    '(function () {',
    `  const translationMetadata = ${JSON.stringify(safeMetadata)};`,
    `  const translationMappings = ${serializeMappings(generalRuntimeMappings)};`,
    `  const productTipMappings = ${serializeMappings(scopedProductTipMappings)};`,
    '  function normalizeProductTipText(text) {',
    '    return String(text || "")',
    '      .replace(/\\u2026/g, "...")',
    '      .replace(/\\.{3,}/g, "...")',
    '      .replace(/&&/g, "")',
    '      .replace(/&/g, "")',
    '      .replace(/\\s+/g, " ")',
    '      .trim()',
    '      .toLowerCase();',
    '  }',
    '  function __cursorZhTranslateProductTipText(text) {',
    '    if (typeof text !== "string" || text.length === 0) return text;',
    '    let current = text;',
    '    for (let i = 0; i < productTipMappings.length; i++) {',
    '      const entry = productTipMappings[i];',
    '      if (!entry || !entry.originalText) continue;',
    '      if (entry.searchType === "exact") {',
    '        if (current.trim() === entry.originalText) current = entry.changeText;',
    '      } else if (entry.searchType === "normalizedExact") {',
    '        if (normalizeProductTipText(current) === normalizeProductTipText(entry.originalText)) current = entry.changeText;',
    '      } else if (entry.searchType === "partial") {',
    '        current = current.split(entry.originalText).join(entry.changeText);',
    '      } else if (entry.searchType === "regex") {',
    '        current = current.replace(new RegExp(entry.originalText, entry.flags || "g"), entry.changeText);',
    '      }',
    '    }',
    '    return current;',
    '  }',
    '  if (typeof globalThis !== "undefined") globalThis.__cursorZhTranslateProductTipText = __cursorZhTranslateProductTipText;',
    ...(runtimeDiagnosticsEnabled
      ? [
          '  function createCursorZhPerf() {',
          '    return {',
          '      translateCalls: 0, translateTime: 0,',
          '      scopeChecks: 0, scopeCacheHits: 0,',
          '      treeWalkCount: 0, treeWalkTime: 0,',
          '      mutationBatchCount: 0, mutationBatchTime: 0,',
          '      idleQueueDepth: 0, idleQueueProcessed: 0,',
          '      skippedTreeWalks: 0, idleQueueDeduped: 0,',
          '      _snapshotStart: 0,',
          '      snapshot() {',
          '        const p = this;',
          '        const elapsed = performance.now() - p._snapshotStart;',
          '        const scopeRatio = p.scopeChecks > 0 ? (p.scopeCacheHits / p.scopeChecks * 100).toFixed(1) : 0;',
          '        const avgTranslate = p.translateCalls > 0 ? (p.translateTime / p.translateCalls).toFixed(3) : 0;',
          '        const avgTreeWalk = p.treeWalkCount > 0 ? (p.treeWalkTime / p.treeWalkCount).toFixed(2) : 0;',
          '        const avgMutation = p.mutationBatchCount > 0 ? (p.mutationBatchTime / p.mutationBatchCount).toFixed(2) : 0;',
          '        return {',
          '          elapsedMs: +elapsed.toFixed(1),',
          '          translateCalls: p.translateCalls,',
          '          avgTranslateMs: +avgTranslate,',
          '          totalTranslateMs: +p.translateTime.toFixed(2),',
          '          scopeChecks: p.scopeChecks,',
          '          scopeCacheHits: p.scopeCacheHits,',
          '          scopeHitRate: +scopeRatio,',
          '          cacheLimit: window.__cursorZhRuntime ? window.__cursorZhRuntime._scopeCacheLimit : 0,',
          '          treeWalkCount: p.treeWalkCount,',
          '          avgTreeWalkMs: +avgTreeWalk,',
          '          mutationBatchCount: p.mutationBatchCount,',
          '          avgMutationBatchMs: +avgMutation,',
          '          idleQueueDepth: p.idleQueueDepth,',
          '          idleQueueProcessed: p.idleQueueProcessed,',
          '          skippedTreeWalks: p.skippedTreeWalks,',
          '          idleQueueDeduped: p.idleQueueDeduped,',
          '        };',
          '      },',
          '      report() {',
          '        const s = this.snapshot();',
          '        console.table(s);',
          '        return s;',
          '      },',
          '      reset() {',
          '        this.translateCalls = 0; this.translateTime = 0;',
          '        this.scopeChecks = 0; this.scopeCacheHits = 0;',
          '        this.treeWalkCount = 0; this.treeWalkTime = 0;',
          '        this.mutationBatchCount = 0; this.mutationBatchTime = 0;',
          '        this.idleQueueDepth = 0; this.idleQueueProcessed = 0;',
          '        this.skippedTreeWalks = 0; this.idleQueueDeduped = 0;',
          '        this._snapshotStart = performance.now();',
          '      },',
          '    };',
          '  }',
        ]
      : []),
    '  class TextTranslator {',
    '    constructor(entries, config) {',
    '      this.entries = Array.isArray(entries) ? entries : [];',
    '      this.config = config || {};',
    '      this.stageDocumentRoot = config.stageDocumentRoot !== false;',
    '      this.shortExactTextFallback = config.shortExactTextFallback !== false;',
    '      this.observeScopeSelectors = Array.isArray(this.config.observeScopeSelectors)',
    '        ? this.config.observeScopeSelectors',
    '        : [];',
    '      this.skipSelector = "pre, code, .monaco-editor, .xterm, .cm-editor, .cm-content, .view-lines";',
    '      this._seenNodes = new Map();',
    '      this._pendingMutations = [];',
    '      this._flushTimer = null;',
    '      this._isFlushing = false;',
    '      this._regexCache = new Map();',
    '      this._scopeCache = new Map();',
    '      this._scopeCacheLimit = 200;',
    '      this._scopeCacheWrites = 0;',
    '      this._exactMap = new Map();',
    '      this._buildExactMap();',
    '      this._precomputeScopeHints();',
    '      this._idleQueue = [];',
    '      this._idleTimer = null;',
    '      this._translatedSubtrees = new WeakSet();',
    '      this._pendingIdleRoots = new WeakSet();',
    '      this._stagedRootSet = new WeakSet();',
    '      this._perf = null;',
    ...(runtimeDiagnosticsEnabled
      ? [
          '      this._perf = createCursorZhPerf();',
          '      window.__cursorZhPerf = this._perf;',
          '      this._perf.reset();',
        ]
      : []),
    '      this._enabled = true;',
    '    }',
    '    get enabled() { return this._enabled; }',
    '    set enabled(value) {',
    '      const wasEnabled = this._enabled;',
    '      this._enabled = Boolean(value);',
    '      if (wasEnabled && !this._enabled) {',
    '        this._pendingMutations = [];',
    '        this._idleQueue = [];',
    '        if (this._flushTimer) { window.clearTimeout(this._flushTimer); this._flushTimer = null; }',
    '        if (this._idleTimer) { window.clearTimeout(this._idleTimer); this._idleTimer = null; }',
    '        if (this._stagedTimer) { window.clearTimeout(this._stagedTimer); this._stagedTimer = null; }',
    '        this._stagedRoots = [];',
    '        this._stagedRootSet = new WeakSet();',
    '      }',
    '    }',
    ...(experimentalRuntimeToggleEnabled
      ? [
          '    _saveOriginalText(element, originalText) {',
          '      if (!element || element.nodeType !== Node.ELEMENT_NODE) return;',
          '      try {',
          '        let data = {};',
          '        const raw = element.getAttribute("data-cursor-zh-origins");',
          '        if (raw) { try { data = JSON.parse(raw); } catch {} }',
          '        if (!data.text) data.text = originalText;',
          '        element.setAttribute("data-cursor-zh-origins", JSON.stringify(data));',
          '      } catch {}',
          '    }',
          '    _saveOriginalAttr(element, attr, originalValue) {',
          '      if (!element || element.nodeType !== Node.ELEMENT_NODE) return;',
          '      try {',
          '        let data = {};',
          '        const raw = element.getAttribute("data-cursor-zh-origins");',
          '        if (raw) { try { data = JSON.parse(raw); } catch {} }',
          '        if (!data.attrs) data.attrs = {};',
          '        if (!(attr in data.attrs)) data.attrs[attr] = originalValue;',
          '        element.setAttribute("data-cursor-zh-origins", JSON.stringify(data));',
          '      } catch {}',
          '    }',
          '    restoreOriginalText(root) {',
          '      const targetRoot = root || document;',
          '      if (!targetRoot) return;',
          '      const elements = targetRoot.querySelectorAll ? targetRoot.querySelectorAll("[data-cursor-zh-origins]") : [];',
          '      for (let i = 0; i < elements.length; i++) {',
          '        const el = elements[i];',
          '        try {',
          '          const raw = el.getAttribute("data-cursor-zh-origins");',
          '          if (!raw) continue;',
          '          const data = JSON.parse(raw);',
          '          if (data.text) {',
          '            if (this.isSegmentedTipElement(el)) {',
          '              while (el.firstChild) el.removeChild(el.firstChild);',
          '              el.appendChild(this._renderTipContent(data.text));',
          '            } else if (el.firstChild && el.firstChild.nodeType === Node.TEXT_NODE) {',
          '              el.firstChild.textContent = data.text;',
          '            }',
          '          }',
          '          if (data.attrs) {',
          '            for (const attr of ["title", "aria-label", "aria-description", "placeholder"]) {',
          '              if (attr in data.attrs) el.setAttribute(attr, data.attrs[attr]);',
          '            }',
          '          }',
          '          el.removeAttribute("data-cursor-zh-origins");',
          '        } catch {}',
          '      }',
          '      if (targetRoot.querySelectorAll) {',
          '        const allElements = targetRoot.querySelectorAll("*");',
          '        for (let i = 0; i < allElements.length; i++) {',
          '          const el = allElements[i];',
          '          if (el.shadowRoot) this.restoreOriginalText(el.shadowRoot);',
          '        }',
          '        const frames = targetRoot.querySelectorAll("iframe");',
          '        for (let i = 0; i < frames.length; i++) {',
          '          try {',
          '            const doc = frames[i].contentDocument;',
          '            if (doc) this.restoreOriginalText(doc);',
          '          } catch {}',
          '        }',
          '      }',
          '    }',
          '    clearTranslationState() {',
          '      this._seenNodes.clear();',
          '      this._translatedSubtrees = new WeakSet();',
          '      this._pendingIdleRoots = new WeakSet();',
          '      this._stagedRootSet = new WeakSet();',
          '      this._pendingMutations = [];',
          '      this._idleQueue = [];',
          '      this._pendingDiscoveryMutations = [];',
          '      if (this._flushTimer) { window.clearTimeout(this._flushTimer); this._flushTimer = null; }',
          '      if (this._idleTimer) { window.clearTimeout(this._idleTimer); this._idleTimer = null; }',
          '      if (this._stagedTimer) { window.clearTimeout(this._stagedTimer); this._stagedTimer = null; }',
          '      if (this._discoveryFlushTimer) { window.clearTimeout(this._discoveryFlushTimer); this._discoveryFlushTimer = null; }',
          '      this._stagedRoots = [];',
          '      this._treeWalkDone = false;',
          '      this._attributeWalkDone = false;',
          '    }',
          '    retranslateAll() {',
          '      this.clearTranslationState();',
          '      this._enabled = true;',
          '      const documentRoot = document.body || document.documentElement;',
          '      if (documentRoot) this._stageRootForTranslation(documentRoot);',
          '      const scopeRoots = this.collectScopeRoots(document);',
          '      for (let i = 0; i < scopeRoots.length; i++) {',
          '        this._stageRootForTranslation(scopeRoots[i]);',
          '        this.observeRoot(scopeRoots[i]);',
          '        this.observeExistingShadowRoots(scopeRoots[i]);',
          '        this.observeExistingFrames(scopeRoots[i]);',
          '      }',
          '      if (document.documentElement) this.observeDiscoveryRoot(document.documentElement);',
          '    }',
          '    _startTogglePolling() {',
          '      const signalPath = translationMetadata.toggleSignalPath;',
          '      if (!signalPath || typeof require === "undefined") return;',
          '      const fs = require("fs");',
          '      let lastMtime = 0;',
          '      let lastState = "zh";',
          '      const check = () => {',
          '        try {',
          '          const stat = fs.statSync(signalPath);',
          '          const mtime = stat.mtimeMs || stat.mtime.getTime();',
          '          if (mtime !== lastMtime) {',
          '            lastMtime = mtime;',
          '            const content = fs.readFileSync(signalPath, "utf8");',
          '            const signal = JSON.parse(content);',
          '            const desired = signal.desiredState || "zh";',
          '            if (desired !== lastState) {',
          '              lastState = desired;',
          '              if (desired === "en" && this._enabled) {',
          '                this.enabled = false;',
          '                this.restoreOriginalText();',
          '              } else if (desired === "zh" && !this._enabled) {',
          '                this.retranslateAll();',
          '              }',
          '            }',
          '          }',
          '        } catch {}',
          '      };',
          '      check();',
          '      this._togglePollInterval = window.setInterval(check, 2000);',
          '    }',
          '    _stopTogglePolling() {',
          '      if (this._togglePollInterval) {',
          '        window.clearInterval(this._togglePollInterval);',
          '        this._togglePollInterval = null;',
          '      }',
          '    }',
        ]
      : [
          '    _saveOriginalText(element, originalText) {}',
          '    _saveOriginalAttr(element, attr, originalValue) {}',
        ]),
    '    _buildExactMap() {',
    '      for (let i = 0; i < this.entries.length; i++) {',
    '        const entry = this.entries[i];',
    '        if (!entry || !entry.originalText) continue;',
    '        const hasScope = (Array.isArray(entry.scopeSelectors) && entry.scopeSelectors.length > 0)',
    '          || (Array.isArray(entry.scopeContainsText) && entry.scopeContainsText.length > 0);',
    '        if (hasScope || entry.searchType !== "exact") continue;',
    '        if (!this._exactMap.has(entry.originalText)) {',
    '          this._exactMap.set(entry.originalText, entry.changeText);',
    '        }',
    '      }',
    '    }',
    '    _precomputeScopeHints() {',
    '      for (let i = 0; i < this.entries.length; i++) {',
    '        const entry = this.entries[i];',
    '        if (!entry || !Array.isArray(entry.scopeContainsText)) continue;',
    '        entry.__normalizedHints = entry.scopeContainsText.map((h) => this.normalizeText(h));',
    '      }',
    '    }',
    '    _getTextHash(text) {',
    '      let h = 0;',
    '      for (let i = 0; i < text.length; i++) {',
    '        h = ((h << 5) - h) + text.charCodeAt(i);',
    '        h |= 0;',
    '      }',
    '      return h;',
    '    }',
    '    _scheduleIdleWork() {',
    '      if (this._idleTimer) return;',
    '      this._idleTimer = window.setTimeout(() => this._processIdleQueue(), 0);',
    '    }',
    '    _processIdleQueue() {',
    '      this._idleTimer = null;',
    '      let queue = this._idleQueue;',
    '      this._idleQueue = [];',
    '      const perf = this._perf;',
    '      if (perf) { perf.idleQueueDepth = Math.max(perf.idleQueueDepth, queue.length); }',
    '      const treeTasks = [];',
    '      const otherTasks = [];',
    '      for (let i = 0; i < queue.length; i++) {',
    '        const task = queue[i];',
    '        if (task.type === "translateTree") {',
    '          treeTasks.push(task);',
    '        } else {',
    '          otherTasks.push(task);',
    '        }',
    '      }',
    '      const merged = [];',
    '      for (let i = 0; i < treeTasks.length; i++) {',
    '        const a = treeTasks[i];',
    '        if (!a) continue;',
    '        let contained = false;',
    '        for (let j = 0; j < treeTasks.length; j++) {',
    '          if (i === j || !treeTasks[j]) continue;',
    '          const b = treeTasks[j];',
    '          try {',
    '            if (a.root !== b.root && a.root.closest && a.root.closest(b.root)) {',
    '              contained = true;',
    '              break;',
    '            }',
    '          } catch {}',
    '        }',
    '        if (!contained) merged.push(a);',
    '        else if (perf) perf.idleQueueDeduped += 1;',
    '      }',
    '      queue = merged.concat(otherTasks);',
    '      for (let i = 0; i < queue.length; i++) {',
    '        const task = queue[i];',
    '        if (task.type === "translateTree") {',
    '          this._pendingIdleRoots.delete(task.root);',
    '          this.translateTree(task.root);',
    '        } else if (task.type === "observeRoot") {',
    '          this.observeRoot(task.root);',
    '        }',
    '        if (perf) perf.idleQueueProcessed += 1;',
    '      }',
    '    }',
    '    normalizeText(text) {',
    '      return String(text || "")',
    '        .replace(/\\u2026/g, "...")',
    '        .replace(/\\.{3,}/g, "...")',
    '        .replace(/&&/g, "")',
    '        .replace(/&/g, "")',
    '        .replace(/\\s+/g, " ")',
    '        .trim()',
    '        .toLowerCase();',
    '    }',
    '    shouldSkipElement(element) {',
      '      if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;',
      '      try {',
      '        return Boolean(element.closest(this.skipSelector));',
      '      } catch {',
      '        return false;',
      '      }',
      '    }',
    '    matchesAnySelector(element, selectors) {',
    '      if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;',
    '      if (!Array.isArray(selectors) || selectors.length === 0) return false;',
    '      return selectors.some((selector) => {',
    '        try {',
    '          return Boolean(element.matches(selector) || element.closest(selector));',
    '        } catch {',
    '          return false;',
    '        }',
    '      });',
    '    }',
    '    _getRegex(pattern, flags) {',
    '      const key = pattern + "\0" + flags;',
    '      let cached = this._regexCache.get(key);',
    '      if (!cached) {',
    '        cached = new RegExp(pattern, flags);',
    '        this._regexCache.set(key, cached);',
    '      }',
    '      return cached;',
    '    }',
    '    matchesScope(entry, element) {',
    '      const hasScopeSelectors = Array.isArray(entry.scopeSelectors) && entry.scopeSelectors.length > 0;',
    '      const hasScopeHints = Array.isArray(entry.scopeContainsText) && entry.scopeContainsText.length > 0;',
    '      if (!hasScopeSelectors && !hasScopeHints) return true;',
    '      if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;',
    '      const cacheKey = entry.originalText + "\0" + (entry.searchType || "exact") + "\0" + (element.tagName || "");',
    '      const cached = this._scopeCache.get(cacheKey);',
    '      if (cached !== undefined) {',
    '        if (this._perf) this._perf.scopeCacheHits += 1;',
    '        return cached;',
    '      }',
    '      if (this._perf) this._perf.scopeChecks += 1;',
    '      let result = false;',
    '      if (hasScopeSelectors) {',
    '        try {',
    '          if (element.closest(entry.scopeSelectors.join(","))) { result = true; }',
    '        } catch {}',
    '      }',
    '      if (!result && hasScopeHints) {',
    '        let current = element;',
    '        for (let depth = 0; current && depth < 6; depth += 1, current = current.parentElement) {',
    '          const scopeText = this.normalizeText(current.textContent || "");',
    '          if (!scopeText) continue;',
    '          const hints = entry.__normalizedHints || entry.scopeContainsText;',
    '          if (hints.some((hint) => scopeText.includes(hint))) {',
    '            result = true;',
    '            break;',
    '          }',
    '        }',
    '      }',
    '      if (this._scopeCache.size >= this._scopeCacheLimit) {',
    '        const firstKey = this._scopeCache.keys().next().value;',
    '        this._scopeCache.delete(firstKey);',
    '      }',
    '      this._scopeCache.set(cacheKey, result);',
    '      this._scopeCacheWrites += 1;',
    '      if (this._scopeCacheWrites >= 100) {',
    '        this._scopeCacheWrites = 0;',
    '        this._adjustScopeCache();',
    '      }',
    '      return result;',
    '    }',
    '    _invalidateSubtree(element) {',
    '      let current = element;',
    '      while (current) {',
    '        if (this._translatedSubtrees.has(current)) {',
    '          this._translatedSubtrees.delete(current);',
    '          break;',
    '        }',
    '        current = current.parentElement;',
    '      }',
    '    }',
    '    _adjustScopeCache() {',
    '      const perf = this._perf;',
    '      if (!perf || perf.scopeChecks < 500) return;',
    '      const ratio = perf.scopeCacheHits / perf.scopeChecks;',
    '      if (ratio > 0.85 && this._scopeCacheLimit < 800) {',
    '        this._scopeCacheLimit += 50;',
    '      } else if (ratio < 0.3 && this._scopeCacheLimit > 50) {',
    '        this._scopeCacheLimit -= 50;',
    '      }',
    '      perf.scopeChecks = 0;',
    '      perf.scopeCacheHits = 0;',
    '    }',
    '    isScopeContainer(element) {',
    '      if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;',
    '      if (!Array.isArray(this.observeScopeSelectors) || this.observeScopeSelectors.length === 0) return true;',
    '      return this.matchesAnySelector(element, this.observeScopeSelectors);',
    '    }',
    '    hasScopedObservation() {',
    '      return Array.isArray(this.observeScopeSelectors) && this.observeScopeSelectors.length > 0;',
    '    }',
    '    isSegmentedTipElement(element) {',
    '      if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;',
    '      try {',
    '        return Boolean(element.matches(".glass-empty-state-rotating-tips__text"));',
    '      } catch {',
    '        return false;',
    '      }',
    '    }',
    '    findSegmentedTipRoot(node) {',
    '      if (!node) return null;',
    '      const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;',
    '      if (!element || element.nodeType !== Node.ELEMENT_NODE) return null;',
    '      if (this.isSegmentedTipElement(element)) return element;',
    '      try {',
    '        return element.closest ? element.closest(".glass-empty-state-rotating-tips__text") : null;',
    '      } catch {',
    '        return null;',
    '      }',
    '    }',
    '    _renderTipContent(text) {',
    '      const fragment = document.createDocumentFragment();',
    '      const wrapper = document.createElement("span");',
    '      wrapper.className = "cursor-zh-tip-inline";',
    '      wrapper.style.display = "block";',
    '      wrapper.style.width = "100%";',
    '      wrapper.style.maxWidth = "100%";',
    '      wrapper.style.whiteSpace = "normal";',
    '      wrapper.style.textAlign = "center";',
    '      wrapper.style.lineHeight = "inherit";',
    '      const parts = String(text || "").split(/(\\s+)/);',
    '      for (let i = 0; i < parts.length; i++) {',
    '        const part = parts[i];',
    '        if (!part) continue;',
    '        if (/^\\s+$/.test(part)) {',
    '          wrapper.appendChild(document.createTextNode(part));',
    '          continue;',
    '        }',
    '        if (part.startsWith("/") || part.startsWith("@")) {',
    '          const chip = document.createElement("span");',
    '          chip.className = "glass-empty-state-rotating-tips__chip";',
    '          chip.textContent = part;',
    '          wrapper.appendChild(chip);',
    '          continue;',
    '        }',
    '        wrapper.appendChild(document.createTextNode(part));',
    '      }',
    '      fragment.appendChild(wrapper);',
    '      return fragment;',
    '    }',
    '    translateSpecialElement(element) {',
    '      if (!this._enabled) return false;',
    '      if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;',
    '      if (this.shouldSkipElement(element)) return false;',
    '      if (!this.isSegmentedTipElement(element)) return false;',
    '      const text = element.textContent || "";',
    '      if (!text || text.length > 500) return false;',
    '      const translated = this.translateTextForElement(text, element);',
    '      if (translated === text) return false;',
    '      this._saveOriginalText(element, text);',
    '      while (element.firstChild) element.removeChild(element.firstChild);',
    '      element.appendChild(this._renderTipContent(translated));',
    '      return true;',
    '    }',
    '    translateText(text) {',
      '      return this.translateTextForElement(text, null);',
    '    }',
    '    translateTextForElement(text, element) {',
    '      if (typeof text !== "string" || text.length === 0) return text;',
    '      const perf = this._perf;',
    '      const start = perf ? performance.now() : 0;',
    '      let current = text;',
    '      const trimmed = current.trim();',
    '      const fast = this._exactMap.get(trimmed);',
    '      if (fast !== undefined) {',
    '        current = fast;',
    '      } else {',
    '        for (const entry of this.entries) {',
    '          if (!entry || !entry.originalText) continue;',
    '          if (!this.matchesScope(entry, element || null)) continue;',
    '          if (entry.searchType === "exact") {',
    '            if (trimmed === entry.originalText) current = entry.changeText;',
    '          } else if (entry.searchType === "normalizedExact") {',
    '            if (this.normalizeText(current) === this.normalizeText(entry.originalText)) current = entry.changeText;',
    '          } else if (entry.searchType === "partial") {',
    '            current = current.split(entry.originalText).join(entry.changeText);',
    '          } else if (entry.searchType === "regex") {',
    '            const regex = this._getRegex(entry.originalText, entry.flags || "g");',
    '            current = current.replace(regex, entry.changeText);',
    '          }',
    '        }',
    '      }',
    '      if (perf) { perf.translateCalls += 1; perf.translateTime += performance.now() - start; }',
    '      return current;',
    '    }',
    '    translateNode(node) {',
    '      if (!this._enabled) return;',
    '      if (!node || node.nodeType !== Node.TEXT_NODE) return;',
    '      const text = node.textContent;',
    '      if (!text || text.length > 500) return;',
    '      const hash = this._getTextHash(text);',
    '      const prev = this._seenNodes.get(node);',
    '      if (prev === hash) return;',
    '      this._seenNodes.set(node, hash);',
    '      const parent = node.parentElement;',
    '      if (!parent) return;',
    '      const specialRoot = this.findSegmentedTipRoot(parent);',
    '      if (specialRoot) {',
    '        this._translatedSubtrees.delete(specialRoot);',
    '        this.translateSpecialElement(specialRoot);',
    '        return;',
    '      }',
    '      if (this.shouldSkipElement(parent)) return;',
    '      const translated = this.translateTextForElement(text, parent);',
    '      if (translated !== text) {',
    '        this._saveOriginalText(parent, text);',
    '        node.textContent = translated;',
    '      }',
    '    }',
    '    translateExactTextNode(node) {',
    '      if (!this._enabled) return false;',
    '      if (!node || node.nodeType !== Node.TEXT_NODE) return false;',
    '      const text = node.textContent;',
    '      if (!text || text.length > 220) return false;',
    '      const parent = node.parentElement;',
    '      if (!parent || this.shouldSkipElement(parent)) return false;',
    '      let translated = this._exactMap.get(text);',
    '      if (!translated) {',
    '        const compact = text.replace(/\\s+/g, " ").trim();',
    '        if (!compact || compact.length > 220 || compact === text) return false;',
    '        translated = this._exactMap.get(compact);',
    '        if (!translated) return false;',
    '        node.textContent = text.replace(compact, translated);',
    '        return true;',
    '      }',
    '      node.textContent = translated;',
    '      return true;',
    '    }',
    '    translateAttributes(element) {',
    '      if (!this._enabled) return;',
    '      if (!element || element.nodeType !== Node.ELEMENT_NODE) return;',
    '      if (this.shouldSkipElement(element)) return;',
    '      for (const attr of ["title", "aria-label", "aria-description", "placeholder"]) {',
    '        const value = element.getAttribute(attr);',
    '        if (!value) continue;',
    '        const translated = this.translateTextForElement(value, element);',
    '        if (translated !== value) {',
    '          this._saveOriginalAttr(element, attr, value);',
    '          element.setAttribute(attr, translated);',
    '        }',
    '      }',
    '    }',
    '    collectScopeRoots(root) {',
    '      if (!root) return [];',
    '      const results = [];',
    '      const seen = new Set();',
    '      const add = (element) => {',
    '        if (!element || element.nodeType !== Node.ELEMENT_NODE) return;',
    '        if (seen.has(element)) return;',
    '        seen.add(element);',
    '        results.push(element);',
    '      };',
    '      if (root.nodeType === Node.ELEMENT_NODE && this.isScopeContainer(root)) {',
    '        add(root);',
    '      }',
    '      if (!Array.isArray(this.observeScopeSelectors) || this.observeScopeSelectors.length === 0) {',
    '        if (root === document || root === document.documentElement || root === document.body) {',
    '          add(document.body || document.documentElement);',
    '        }',
    '        return results.filter(Boolean);',
    '      }',
    '      if (root.querySelectorAll) {',
    '        try {',
    '          const mergedSelector = this.observeScopeSelectors.join(",");',
    '          const matched = root.querySelectorAll(mergedSelector);',
    '          for (let i = 0; i < matched.length; i++) {',
    '            add(matched[i]);',
    '          }',
    '        } catch {}',
    '      }',
    '      return results.filter(Boolean);',
    '    }',
    '    _chunkedTreeWalk(root, deadline) {',
    '      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);',
    '      let node;',
    '      while ((node = walker.nextNode())) {',
    '        this.translateNode(node);',
    '        if (deadline && deadline.timeRemaining() <= 2) return false;',
    '      }',
    '      return true;',
    '    }',
    '    _chunkedAttributeWalk(root, deadline) {',
    '      if (root.nodeType === Node.ELEMENT_NODE) {',
    '        this.translateAttributes(root);',
    '      }',
    '      return true;',
    '    }',
    '    runShortExactTextFallback(root) {',
    '      if (!this.shortExactTextFallback || !root || !root.createTreeWalker && !document.createTreeWalker) return;',
    '      const startRoot = root.nodeType === Node.DOCUMENT_NODE ? (root.body || root.documentElement) : root;',
    '      if (!startRoot) return;',
    '      let walker;',
    '      try {',
    '        walker = document.createTreeWalker(startRoot, NodeFilter.SHOW_TEXT, null, false);',
    '      } catch {',
    '        return;',
    '      }',
    '      const schedule = (fn) => {',
    '        if (typeof requestIdleCallback === "function") requestIdleCallback(fn, { timeout: 500 });',
    '        else window.setTimeout(() => fn({ timeRemaining: () => 0 }), 0);',
    '      };',
    '      const process = (deadline) => {',
    '        let node;',
    '        let visited = 0;',
    '        while ((node = walker.nextNode())) {',
    '          this.translateExactTextNode(node);',
    '          visited += 1;',
    '          if (visited >= 400 || (deadline && deadline.timeRemaining && deadline.timeRemaining() <= 2)) {',
    '            schedule(process);',
    '            return;',
    '          }',
    '        }',
    '      };',
    '      schedule(process);',
    '    }',
    '    translateTree(root) {',
    '      if (!root) return;',
    '      const perf = this._perf;',
    '      if (this._translatedSubtrees.has(root)) {',
    '        if (perf) perf.skippedTreeWalks += 1;',
    '        return;',
    '      }',
    '      const start = perf ? performance.now() : 0;',
    '      if (root.nodeType === Node.TEXT_NODE) {',
    '        this.translateNode(root);',
    '        if (perf) { perf.treeWalkCount += 1; perf.treeWalkTime += performance.now() - start; }',
    '        return;',
    '      }',
    '      if (root.nodeType === Node.ELEMENT_NODE) {',
    '        this.translateAttributes(root);',
    '        if (this.translateSpecialElement(root)) {',
    '          this._translatedSubtrees.add(root);',
    '          if (perf) { perf.treeWalkCount += 1; perf.treeWalkTime += performance.now() - start; }',
    '          return;',
    '        }',
    '        if (this.shouldSkipElement(root)) {',
    '          this._translatedSubtrees.add(root);',
    '          if (perf) { perf.treeWalkCount += 1; perf.treeWalkTime += performance.now() - start; }',
    '          return;',
    '        }',
    '      }',
    '      const hasIdle = typeof requestIdleCallback === "function";',
    '      if (!hasIdle || this._pendingAttributeElements) {',
    '        this._chunkedTreeWalk(root, null);',
    '        this._chunkedAttributeWalk(root, null);',
    '        this._translatedSubtrees.add(root);',
    '        if (perf) { perf.treeWalkCount += 1; perf.treeWalkTime += performance.now() - start; }',
    '        return;',
    '      }',
    '      const doChunked = (deadline) => {',
    '        let done = true;',
    '        if (!this._treeWalkDone) {',
    '          this._treeWalkDone = this._chunkedTreeWalk(root, deadline);',
    '          done = this._treeWalkDone;',
    '        }',
    '        if (this._treeWalkDone && !this._attributeWalkDone) {',
    '          this._attributeWalkDone = this._chunkedAttributeWalk(root, deadline);',
    '          done = this._attributeWalkDone;',
    '        }',
    '        if (!done) {',
    '          requestIdleCallback(doChunked, { timeout: 200 });',
    '        } else {',
    '          this._treeWalkDone = false;',
    '          this._attributeWalkDone = false;',
    '          this._translatedSubtrees.add(root);',
    '          if (perf) { perf.treeWalkCount += 1; perf.treeWalkTime += performance.now() - start; }',
    '        }',
    '      };',
    '      this._treeWalkDone = false;',
    '      this._attributeWalkDone = false;',
    '      requestIdleCallback(doChunked, { timeout: 200 });',
    '    }',
    '    _scheduleFlush() {',
    '      if (this._flushTimer) return;',
    '      this._flushTimer = window.setTimeout(() => this._flushMutations(), 16);',
    '    }',
    '    _flushMutations() {',
    '      this._flushTimer = null;',
    '      if (!this._enabled) { this._pendingMutations = []; return; }',
    '      if (this._isFlushing) return;',
    '      this._isFlushing = true;',
    '      const perf = this._perf;',
    '      const start = perf ? performance.now() : 0;',
    '      try {',
    '        const mutations = this._pendingMutations;',
    '        this._pendingMutations = [];',
    '        const addedElements = [];',
    '        const segmentedTipRoots = new Set();',
    '        for (const mutation of mutations) {',
    '          mutation.addedNodes.forEach((node) => {',
    '            const specialRoot = this.findSegmentedTipRoot(node);',
    '            if (specialRoot) {',
    '              this._translatedSubtrees.delete(specialRoot);',
    '              segmentedTipRoots.add(specialRoot);',
    '              return;',
    '            }',
    '            if (node.nodeType === Node.TEXT_NODE) {',
    '              this.translateNode(node);',
    '              this._invalidateSubtree(node.parentElement);',
    '            } else if (node.nodeType === Node.ELEMENT_NODE) {',
    '              addedElements.push(node);',
    '              this._invalidateSubtree(node);',
    '            }',
    '          });',
    '          if (mutation.type === "characterData") {',
    '            const specialRoot = this.findSegmentedTipRoot(mutation.target);',
    '            if (specialRoot) {',
    '              this._translatedSubtrees.delete(specialRoot);',
    '              segmentedTipRoots.add(specialRoot);',
    '            } else {',
    '              this.translateNode(mutation.target);',
    '              this._invalidateSubtree(mutation.target.parentElement);',
    '            }',
    '          }',
    '          if (mutation.type === "attributes" && mutation.target) {',
    '            this.translateAttributes(mutation.target);',
    '            this._invalidateSubtree(mutation.target);',
    '          }',
    '        }',
    '        segmentedTipRoots.forEach((specialRoot) => this.translateSpecialElement(specialRoot));',
    '        for (let i = 0; i < addedElements.length; i++) {',
    '          const element = addedElements[i];',
    '          this.translateAttributes(element);',
    '          if (!this._pendingIdleRoots.has(element)) {',
    '            this._pendingIdleRoots.add(element);',
    '            this._idleQueue.push({ type: "translateTree", root: element });',
    '          }',
    '          if (element.tagName === "IFRAME") {',
    '            this.bindFrame(element);',
    '          }',
    '          if (element.shadowRoot) {',
    '            if (!this._pendingIdleRoots.has(element.shadowRoot)) {',
    '              this._pendingIdleRoots.add(element.shadowRoot);',
    '              this._idleQueue.push({ type: "translateTree", root: element.shadowRoot });',
    '              this._idleQueue.push({ type: "observeRoot", root: element.shadowRoot });',
    '            }',
    '          }',
    '        }',
    '        if (this._idleQueue.length > 0) this._scheduleIdleWork();',
    '      } finally {',
    '        this._isFlushing = false;',
    '        if (perf) { perf.mutationBatchCount += 1; perf.mutationBatchTime += performance.now() - start; }',
    '      }',
    '    }',
    '    observeRoot(root) {',
    '      if (!root || root.__cursorZhObserver) return;',
    '      const observer = new MutationObserver((mutations) => {',
    '        for (const mutation of mutations) {',
    '          this._pendingMutations.push(mutation);',
    '        }',
    '        this._scheduleFlush();',
    '      });',
    '      observer.observe(root, {',
    '        subtree: true,',
    '        childList: true,',
    '        characterData: true,',
    '        attributes: true,',
    '        attributeFilter: ["title", "aria-label", "aria-description", "placeholder"]',
    '      });',
    '      root.__cursorZhObserver = observer;',
    '    }',
    '    observeScopedRoots(root) {',
    '      const scopeRoots = this.collectScopeRoots(root);',
    '      const shouldStageRoot = Boolean(',
    '        root &&',
    '        (root.nodeType === Node.ELEMENT_NODE || root.nodeType === Node.DOCUMENT_FRAGMENT_NODE) &&',
    '        !this.hasScopedObservation()',
    '      );',
    '      if (shouldStageRoot) this._stageRootForTranslation(root);',
    '      if (scopeRoots.length === 0) return;',
    '      for (let i = 0; i < scopeRoots.length; i++) {',
    '        const scopeRoot = scopeRoots[i];',
    '        this.translateTree(scopeRoot);',
    '        this.observeRoot(scopeRoot);',
    '        this.observeExistingShadowRoots(scopeRoot);',
    '        this.observeExistingFrames(scopeRoot);',
    '      }',
    '    }',
    '    _stagedRoots = [];',
    '    _stagedTimer = null;',
    '    _isStagedTranslating = false;',
    '    _stageRootForTranslation(root) {',
    '      if (!root) return;',
    '      if (this._translatedSubtrees.has(root)) return;',
    '      if (this._stagedRootSet.has(root)) return;',
    '      this._stagedRootSet.add(root);',
    '      this._stagedRoots.push(root);',
    '      if (this._stagedTimer) return;',
    '      this._stagedTimer = window.setTimeout(() => this._flushStagedRoots(), 100);',
    '    }',
    '    _flushStagedRoots() {',
    '      this._stagedTimer = null;',
    '      if (this._isStagedTranslating) {',
    '        this._stagedTimer = window.setTimeout(() => this._flushStagedRoots(), 100);',
    '        return;',
    '      }',
    '      this._isStagedTranslating = true;',
    '      const batchSize = 3;',
    '      let processed = 0;',
    '      const flushBatch = () => {',
    '        while (processed < batchSize && this._stagedRoots.length > 0) {',
    '          const root = this._stagedRoots.shift();',
    '          if (root) this._stagedRootSet.delete(root);',
    '          if (root && !this._translatedSubtrees.has(root)) {',
    '            this.translateTree(root);',
    '          }',
    '          processed += 1;',
    '        }',
    '        if (this._stagedRoots.length > 0) {',
    '          window.setTimeout(() => {',
    '            processed = 0;',
    '            flushBatch();',
    '          }, 50);',
    '        } else {',
    '          this._isStagedTranslating = false;',
    '        }',
    '      };',
    '      flushBatch();',
    '    }',
    '    observeExistingShadowRoots(root) {',
    '      if (!root || !root.querySelectorAll) return;',
    '      const elements = root.querySelectorAll("*");',
    '      for (let i = 0; i < elements.length; i++) {',
    '        const element = elements[i];',
    '        if (!element.shadowRoot) continue;',
    '        this.translateTree(element.shadowRoot);',
    '        this.observeRoot(element.shadowRoot);',
    '      }',
    '    }',
    '    bindFrame(frame) {',
    '      if (!frame || frame.__cursorZhFrameBound) return;',
    '      const translateFrame = () => {',
    '        try {',
    '          const doc = frame.contentDocument;',
    '          if (!doc) return;',
    '          const root = doc.documentElement || doc.body || doc;',
    '          this.translateTree(root);',
    '          if (doc.documentElement) this.observeDiscoveryRoot(doc.documentElement);',
    '        } catch {}',
    '      };',
    '      frame.addEventListener("load", translateFrame);',
    '      frame.__cursorZhFrameBound = true;',
    '      translateFrame();',
    '    }',
    '    observeExistingFrames(root) {',
    '      if (!root || !root.querySelectorAll) return;',
    '      const frames = root.querySelectorAll("iframe");',
    '      for (let i = 0; i < frames.length; i++) {',
    '        this.bindFrame(frames[i]);',
    '      }',
    '    }',
    '    _scheduleDiscoveryFlush() {',
    '      if (this._discoveryFlushTimer) return;',
    '      this._discoveryFlushTimer = window.setTimeout(() => this._flushDiscoveryMutations(), 16);',
    '    }',
    '    _flushDiscoveryMutations() {',
    '      this._discoveryFlushTimer = null;',
    '      if (!this._enabled) { this._pendingDiscoveryMutations = []; return; }',
    '      if (this._isDiscoveryFlushing) return;',
    '      this._isDiscoveryFlushing = true;',
    '      try {',
    '        const mutations = this._pendingDiscoveryMutations;',
    '        this._pendingDiscoveryMutations = [];',
    '        const addedElements = [];',
    '        for (const mutation of mutations) {',
    '          mutation.addedNodes.forEach((node) => {',
    '            if (node.nodeType === Node.TEXT_NODE) {',
    '              this.translateNode(node);',
    '            } else if (node.nodeType === Node.ELEMENT_NODE) {',
    '              addedElements.push(node);',
    '            }',
    '          });',
    '          if (mutation.type === "attributes" && mutation.target) {',
    '            this.translateAttributes(mutation.target);',
    '          }',
    '        }',
    '        for (const node of addedElements) {',
    '          this.translateAttributes(node);',
    '          this.observeScopedRoots(node);',
    '          if (this.shortExactTextFallback) {',
    '            const fallbackText = (node.textContent || "").replace(/\\s+/g, " ").trim();',
    '            if (fallbackText && fallbackText.length <= 220) {',
    '              const fallbackRoot = node;',
    '              this.runShortExactTextFallback(fallbackRoot);',
    '            }',
    '          }',
    '          if (node.shadowRoot) {',
    '            this.translateTree(node.shadowRoot);',
    '            this.observeRoot(node.shadowRoot);',
    '          }',
    '          if (node.tagName === "IFRAME") {',
    '            this.bindFrame(node);',
    '          }',
    '        }',
    '      } finally {',
    '        this._isDiscoveryFlushing = false;',
    '      }',
    '    }',
    '    observeDiscoveryRoot(root) {',
    '      if (!root || root.__cursorZhDiscoveryObserver) return;',
    '      this._pendingDiscoveryMutations = [];',
    '      this._discoveryFlushTimer = null;',
    '      this._isDiscoveryFlushing = false;',
    '      const observer = new MutationObserver((mutations) => {',
    '        for (const mutation of mutations) {',
    '          this._pendingDiscoveryMutations.push(mutation);',
    '        }',
    '        this._scheduleDiscoveryFlush();',
    '      });',
    '      observer.observe(root, {',
    '        subtree: true,',
    '        childList: true,',
    '        attributes: Boolean(translationMetadata.runtimeConfig.observeDiscoveryAttributes),',
    '        attributeFilter: Boolean(translationMetadata.runtimeConfig.observeDiscoveryAttributes)',
    '          ? ["title", "aria-label", "aria-description", "placeholder"]',
    '          : undefined',
    '      });',
    '      root.__cursorZhDiscoveryObserver = observer;',
    '    }',
    '    installShadowObserver() {',
    '      if (typeof Element === "undefined") return;',
    '      const proto = Element.prototype;',
    '      if (!proto || proto.__cursorZhAttachShadowPatched) return;',
    '      const originalAttachShadow = proto.attachShadow;',
    '      if (typeof originalAttachShadow !== "function") return;',
    '      const translator = this;',
    '      proto.attachShadow = function patchedAttachShadow(init) {',
    '        const shadowRoot = originalAttachShadow.call(this, init);',
    '        queueMicrotask(() => {',
    '          if (!translator.isScopeContainer(this) && !translator.collectScopeRoots(shadowRoot).length) return;',
    '          translator.translateTree(shadowRoot);',
    '          translator.observeRoot(shadowRoot);',
    '        });',
    '        return shadowRoot;',
    '      };',
    '      proto.__cursorZhAttachShadowPatched = true;',
    '    }',
    '    install() {',
    '      const run = () => {',
    '        const documentRoot = document.body || document.documentElement;',
    '        if (this.stageDocumentRoot && documentRoot) this._stageRootForTranslation(documentRoot);',
    '        if (this.shortExactTextFallback && documentRoot) {',
    '          const exactFallbackRoot = documentRoot;',
    '          this.runShortExactTextFallback(exactFallbackRoot);',
    '        }',
    '        const scopeRoots = this.collectScopeRoots(document);',
    '        for (let i = 0; i < scopeRoots.length; i++) {',
    '          this._stageRootForTranslation(scopeRoots[i]);',
    '          this.observeRoot(scopeRoots[i]);',
    '          this.observeExistingShadowRoots(scopeRoots[i]);',
    '          this.observeExistingFrames(scopeRoots[i]);',
    '        }',
    '      };',
    '      const periodicScan = () => {',
    '        run();',
    '      };',
    '      this.installShadowObserver();',
    '      if (document.readyState === "loading") {',
    '        document.addEventListener("DOMContentLoaded", periodicScan, { once: true });',
    '      } else {',
    '        periodicScan();',
    '      }',
    '      const rescanDelays = Array.isArray(translationMetadata.runtimeConfig.rescanDelaysMs)',
    '        ? translationMetadata.runtimeConfig.rescanDelaysMs',
    '        : [];',
    '      rescanDelays.forEach((delay) => {',
    '        if (!Number.isFinite(delay) || delay < 0) return;',
    '        window.setTimeout(() => periodicScan(), delay);',
    '      });',
    '      const startObserver = () => {',
    '        this.observeDiscoveryRoot(document.documentElement);',
    '        if (this._stagedRoots.length > 0 && !this._stagedTimer) {',
    '          this._stagedTimer = window.setTimeout(() => this._flushStagedRoots(), 100);',
    '        }',
    '      };',
    '      if (document.documentElement) startObserver();',
    '      else document.addEventListener("DOMContentLoaded", startObserver, { once: true });',
    '      window.__cursorZhRuntime = this;',
    '      window.__cursorZhMetadata = translationMetadata;',
    ...(experimentalRuntimeToggleEnabled
      ? [
          '      Object.defineProperty(window, "__cursorZhEnabled", {',
          '        get() { return window.__cursorZhRuntime ? window.__cursorZhRuntime.enabled : true; },',
          '        set(value) { if (window.__cursorZhRuntime) window.__cursorZhRuntime.enabled = value; },',
          '      });',
        ]
      : []),
    ...(experimentalRuntimeToggleEnabled ? ['      this._startTogglePolling();'] : []),
    '    }',
    '  }',
    '  new TextTranslator(translationMappings, translationMetadata.runtimeConfig || {}).install();',
    '})();',
    '',
  ].join('\n');

  const translatedSource = applyStaticSourceTranslations(workbenchSource, mappings);
  return `${runtimeHeader}${translatedSource}`;
}

module.exports = {
  applyStaticSourceTranslations,
  applyStaticSourceTranslationsDetailed,
  analyzeCursorWinCoverage,
  analyzeProductTipsCoverage,
  analyzeDynamicRuleCoverage,
  buildTranslatedWorkbenchBundle,
  compareLanguagePackVersion,
  cursorWinCoverageTargets,
  defaultCursorWinCommonMappings,
  defaultCursorWinDynamicMappings,
  defaultOverlayMappings,
  evaluatePatchContracts,
  mergeMappings,
  normalizeTextForComparison,
  productTipsCoverageTargets,
  parseJsonc,
  parseLegacyWorktreeMappings,
  selectRuntimeMappings,
  summarizeStaticPatchContractsFromTranslatedSource,
  summarizeRuntimeFootprint,
  translateTextWithMappings,
  withLocaleSetting,
};
