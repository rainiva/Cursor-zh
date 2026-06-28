'use strict';

const { translateTextWithMappings } = require('../engine/translator');
const { buildExactMappingLookup } = require('./coverage-helpers');
const { buildCoverageLedger } = require('./coverage-ledger');
const { SURFACE_CONTRACTS } = require('../mapping/surface-contracts');

function flattenHarvestEntries(harvest = {}) {
  const entries = [];
  for (const file of harvest.files || []) {
    for (const stringEntry of file.strings || []) {
      entries.push({
        kind: 'string',
        path: file.path,
        text: stringEntry.text,
        context: stringEntry.context,
        lineHint: stringEntry.lineHint,
      });
    }
  }

  for (const anchor of harvest.anchors || []) {
    if (!anchor?.id) {
      continue;
    }
    entries.push({
      kind: 'anchor',
      path: anchor.path,
      anchorId: anchor.id,
      field: anchor.field || 'title',
      text: anchor.text,
      context: `anchor:${anchor.field || 'title'}`,
    });
  }

  return entries;
}

function createHarvestClassifier(mappings = []) {
  const lookup = buildExactMappingLookup(mappings);
  const regexRules = [];

  for (const rule of mappings) {
    if (rule?.searchType !== 'regex') {
      continue;
    }
    try {
      regexRules.push({ rule, pattern: new RegExp(rule.originalText) });
    } catch {
      continue;
    }
  }

  const runtimeRules = mappings.filter(
    (entry) =>
      entry?.forceRuntime === true &&
      typeof entry.originalText === 'string' &&
      entry.originalText.length > 0
  );

  function classify(text) {
    const exact = lookup.get(text);

    if (exact) {
      if (exact.forceRuntime === true) {
        return 'covered_runtime';
      }

      if (exact.searchType === 'regex') {
        const translated = translateTextWithMappings(text, [exact], { scopeMatched: true });
        return translated !== text ? 'covered_dynamic' : 'unmapped';
      }

      if (
        typeof exact.changeText === 'string' &&
        exact.changeText.length > 0 &&
        exact.changeText !== text
      ) {
        return 'covered_static';
      }
    }

    for (const { rule, pattern } of regexRules) {
      if (!pattern.test(text)) {
        continue;
      }
      const translated = translateTextWithMappings(text, [rule], { scopeMatched: true });
      if (translated !== text) {
        return 'covered_dynamic';
      }
    }

    for (const rule of runtimeRules) {
      if (text.includes(rule.originalText)) {
        return 'covered_runtime';
      }
    }

    return 'unmapped';
  }

  return { classify };
}

function classifyHarvestString(text, mappings = []) {
  return createHarvestClassifier(mappings).classify(text);
}

function analyzeReverseCoverage({
  harvest = {},
  mappings = [],
  mappingsByLayer,
  contracts = SURFACE_CONTRACTS,
  onProgress,
} = {}) {
  const layerInput = mappingsByLayer || {
    baseMappings: [],
    overlayMappings: [],
    cursorWinCommonMappings: mappings,
    anchorMappings: [],
    dynamicMappings: [],
  };

  const ledger = buildCoverageLedger({
    harvest,
    mappingsByLayer: layerInput,
    contracts,
    onProgress,
  });

  return {
    entries: ledger.entries,
    summary: ledger.summary,
    unmapped: ledger.unmapped,
    unmappedBySurface: ledger.unmappedBySurface,
    ruleUsage: ledger.ruleUsage,
    contractStatus: ledger.contractStatus,
    forwardRuleHits: ledger.forwardRuleHits,
    coverageLedger: ledger,
  };
}

module.exports = {
  createHarvestClassifier,
  classifyHarvestString,
  analyzeReverseCoverage,
  flattenHarvestEntries,
};
