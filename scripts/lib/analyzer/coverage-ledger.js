'use strict';

const { mappingKey } = require('../mapping/merge');
const { translateTextWithMappings, mappingMatchesScope } = require('../engine/translator');
const { loadSurfaceDefinitions, inferHarvestEntrySurface } = require('../mapping/surfaces');
const { classifyRuntimeMappingPool } = require('../mapping/runtime-pools');
const { SURFACE_CONTRACTS } = require('../mapping/surface-contracts');
const { analyzeDynamicRuleCoverage } = require('./dynamic-coverage');

const LAYER_SPECS = [
  ['baseMappings', 'base', 'translations/base/workbench.mappings.json'],
  ['overlayMappings', 'overlay', 'translations/overlay/workbench.overlay.json'],
  ['cursorWinCommonMappings', 'cursor-win.common', 'translations/overlay/cursor-win.common.json'],
  ['anchorMappings', 'cursor-win.anchors', 'translations/overlay/cursor-win.anchors.json'],
  ['dynamicMappings', 'cursor-win.dynamic', 'translations/overlay/cursor-win.dynamic.json'],
];

function harvestOccurrenceKey(entry) {
  if (entry.kind === 'anchor') {
    return `anchor\0${entry.anchorId || entry.id}\0${entry.field || 'title'}\0${entry.path || ''}`;
  }

  return `${entry.path || ''}\0${entry.context || ''}\0${entry.text || ''}`;
}

function buildScopeText(entry = {}) {
  return [entry.path, entry.context, entry.lineHint].filter(Boolean).join(' ');
}

function anchorTextKey(path, text) {
  return `${path || ''}\0${text || ''}`;
}

function normalizeUnmappedReason(status, reason) {
  if (status === 'unmapped') {
    return reason || 'no_rule';
  }
  if (status === 'ambiguous') {
    return reason || 'ambiguous';
  }
  return null;
}

function buildAnchorTextIndex(harvest = {}) {
  const index = new Map();

  for (const anchor of harvest.anchors || []) {
    if (!anchor?.id || !anchor.text) {
      continue;
    }

    const field = anchor.field || 'title';
    if (field !== 'title') {
      continue;
    }

    index.set(anchorTextKey(anchor.path, anchor.text), {
      anchorId: anchor.id,
      field,
    });
  }

  return index;
}

function dedupeAnchorSupersededStrings(occurrences, anchorTextIndex = new Map()) {
  return occurrences.filter((occurrence) => {
    if (occurrence.kind !== 'string') {
      return true;
    }

    if (!String(occurrence.context || '').includes('title:')) {
      return true;
    }

    return !anchorTextIndex.has(anchorTextKey(occurrence.path, occurrence.text));
  });
}

function attachAnchorLinks(occurrences, anchorTextIndex = new Map()) {
  return occurrences.map((occurrence) => {
    if (occurrence.kind !== 'string') {
      return occurrence;
    }

    const linked = anchorTextIndex.get(anchorTextKey(occurrence.path, occurrence.text));
    if (!linked) {
      return occurrence;
    }

    return {
      ...occurrence,
      linkedAnchorId: linked.anchorId,
      linkedAnchorField: linked.field,
    };
  });
}

function flattenHarvestOccurrences(harvest = {}) {
  const occurrences = [];

  for (const file of harvest.files || []) {
    for (const stringEntry of file.strings || []) {
      occurrences.push({
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
    occurrences.push({
      kind: 'anchor',
      path: anchor.path,
      anchorId: anchor.id,
      field: anchor.field || 'title',
      text: anchor.text,
      context: `anchor:${anchor.field || 'title'}`,
    });
  }

  return occurrences;
}

function buildRuleIndex(mappingsByLayer = {}) {
  const byKey = new Map();
  const exactByText = new Map();
  const regexRules = [];
  const partialRules = [];
  const runtimeRules = [];
  const anchorByKey = new Map();
  const allRules = [];

  for (const [layerField, layerName, sourceFile] of LAYER_SPECS) {
    const mappings = Array.isArray(mappingsByLayer[layerField])
      ? mappingsByLayer[layerField]
      : [];

    for (const entry of mappings) {
      if (!entry) {
        continue;
      }

      const ruleKey = mappingKey(entry);
      const indexed = { entry, layer: layerName, sourceFile, ruleKey };
      byKey.set(ruleKey, indexed);
      allRules.push(indexed);

      if (entry.searchType === 'anchor' && entry.anchorId) {
        const anchorKey = `${entry.anchorId}:${entry.field || 'title'}`;
        anchorByKey.set(anchorKey, indexed);
        continue;
      }

      if (
        entry.searchType === 'exact' ||
        entry.searchType === 'normalizedExact' ||
        !entry.searchType
      ) {
        const textKey = entry.originalText;
        if (!exactByText.has(textKey)) {
          exactByText.set(textKey, []);
        }
        exactByText.get(textKey).push(indexed);
      } else if (entry.searchType === 'regex') {
        try {
          regexRules.push({ ...indexed, pattern: new RegExp(entry.originalText, entry.flags || 'g') });
        } catch {
          continue;
        }
      } else if (entry.searchType === 'partial') {
        partialRules.push(indexed);
      }

      if (entry.forceRuntime === true && typeof entry.originalText === 'string' && entry.originalText) {
        runtimeRules.push(indexed);
      }
    }
  }

  return {
    byKey,
    exactByText,
    regexRules,
    partialRules,
    runtimeRules,
    anchorByKey,
    allRules,
    mergedMappings: allRules.map((item) => item.entry),
  };
}

function resolveContractId(entry, contracts = SURFACE_CONTRACTS) {
  if (!entry?.originalText) {
    return null;
  }

  const contract = contracts.find(
    (item) =>
      item.kind === 'mapping' &&
      item.originalText === entry.originalText &&
      typeof item.changeText === 'string'
  );
  return contract?.id || null;
}

function toMatchedRuleRef(indexed, matchMode, contracts = SURFACE_CONTRACTS) {
  return {
    ruleKey: indexed.ruleKey,
    matchMode,
    layer: indexed.layer,
    sourceFile: indexed.sourceFile,
    changeText: indexed.entry.changeText,
    contractId: resolveContractId(indexed.entry, contracts),
  };
}

function hasEffectiveTranslation(entry) {
  return (
    typeof entry?.changeText === 'string' &&
    entry.changeText.length > 0 &&
    entry.changeText !== entry.originalText
  );
}

function hasEffectiveAnchorTranslation(entry) {
  return typeof entry?.changeText === 'string' && entry.changeText.length > 0;
}

function scopeOptionsForEntry(entry) {
  return { scopeText: buildScopeText(entry) };
}

function pickExactMatches(text, index, entry, contracts) {
  const candidates = index.exactByText.get(text) || [];
  const scoped = [];

  for (const indexed of candidates) {
    if (!mappingMatchesScope(indexed.entry, scopeOptionsForEntry(entry))) {
      continue;
    }
    if (!hasEffectiveTranslation(indexed.entry)) {
      continue;
    }
    scoped.push(toMatchedRuleRef(indexed, indexed.entry.searchType || 'exact', contracts));
  }

  if (scoped.length === 0) {
    return null;
  }

  const changeTexts = new Set(scoped.map((rule) => rule.changeText));
  if (changeTexts.size > 1) {
    return { status: 'ambiguous', matchedRules: scoped, unmappedReason: 'ambiguous' };
  }

  const winner = candidates.find((indexed) =>
    scoped.some((rule) => rule.ruleKey === indexed.ruleKey)
  );
  const pool = classifyRuntimeMappingPool(winner.entry, { staticLiteralPresent: true });
  const status = pool === 'static-only' ? 'covered_static' : 'covered_runtime';
  return { status, matchedRules: [scoped[0]], unmappedReason: null };
}

function resolveStringCoverage(entry, index, options = {}) {
  const contracts = options.contracts || SURFACE_CONTRACTS;
  const text = String(entry.text || '');
  const scopeOpts = scopeOptionsForEntry(entry);

  if (entry.linkedAnchorId) {
    const anchorResult = resolveAnchorCoverage(
      {
        id: entry.linkedAnchorId,
        anchorId: entry.linkedAnchorId,
        field: entry.linkedAnchorField || 'title',
        path: entry.path,
        text: entry.text,
      },
      index,
      options
    );
    if (anchorResult.status === 'covered_anchor') {
      return anchorResult;
    }
  }

  const exactResult = pickExactMatches(text, index, entry, contracts);
  if (exactResult) {
    return exactResult;
  }

  const hadScopeBlockedExact = (index.exactByText.get(text) || []).some(
    (indexed) =>
      hasEffectiveTranslation(indexed.entry) &&
      !mappingMatchesScope(indexed.entry, scopeOpts)
  );
  if (hadScopeBlockedExact) {
    return { status: 'unmapped', matchedRules: [], unmappedReason: 'scope_mismatch' };
  }

  const hadIdentityExact = (index.exactByText.get(text) || []).some(
    (indexed) =>
      mappingMatchesScope(indexed.entry, scopeOpts) &&
      typeof indexed.entry.changeText === 'string' &&
      indexed.entry.changeText === text
  );
  if (hadIdentityExact) {
    return {
      status: 'unmapped',
      matchedRules: [],
      unmappedReason: 'rule_exists_but_identity',
    };
  }

  for (const indexed of index.regexRules) {
    if (!indexed.pattern.test(text)) {
      continue;
    }
    if (!mappingMatchesScope(indexed.entry, scopeOpts)) {
      continue;
    }
    const translated = translateTextWithMappings(text, [indexed.entry], scopeOpts);
    if (translated !== text) {
      return {
        status: 'covered_dynamic',
        matchedRules: [toMatchedRuleRef(indexed, 'regex', contracts)],
        unmappedReason: null,
      };
    }
  }

  for (const indexed of index.partialRules) {
    if (!text.includes(indexed.entry.originalText)) {
      continue;
    }
    if (!mappingMatchesScope(indexed.entry, scopeOpts)) {
      continue;
    }
    const translated = translateTextWithMappings(text, [indexed.entry], scopeOpts);
    if (translated !== text) {
      return {
        status: 'covered_dynamic',
        matchedRules: [toMatchedRuleRef(indexed, 'partial', contracts)],
        unmappedReason: null,
      };
    }
  }

  for (const indexed of index.runtimeRules) {
    if (!text.includes(indexed.entry.originalText)) {
      continue;
    }
    if (!mappingMatchesScope(indexed.entry, scopeOpts)) {
      continue;
    }
    return {
      status: 'covered_runtime',
      matchedRules: [toMatchedRuleRef(indexed, 'exact', contracts)],
      unmappedReason: null,
    };
  }

  return { status: 'unmapped', matchedRules: [], unmappedReason: 'no_rule' };
}

function resolveAnchorCoverage(anchor, index, options = {}) {
  const contracts = options.contracts || SURFACE_CONTRACTS;
  const anchorKey = `${anchor.id || anchor.anchorId}:${anchor.field || 'title'}`;
  const indexed = index.anchorByKey.get(anchorKey);

  if (!indexed || !hasEffectiveAnchorTranslation(indexed.entry)) {
    return {
      status: 'unmapped',
      matchedRules: [],
      unmappedReason: indexed ? 'rule_exists_but_identity' : 'anchor_missing',
    };
  }

  return {
    status: 'covered_anchor',
    matchedRules: [toMatchedRuleRef(indexed, 'anchor', contracts)],
    unmappedReason: null,
  };
}

function buildRuleUsage(records, index) {
  const hitsByRule = new Map();

  for (const record of records) {
    for (const matchedRule of record.matchedRules || []) {
      if (!hitsByRule.has(matchedRule.ruleKey)) {
        hitsByRule.set(matchedRule.ruleKey, {
          ruleKey: matchedRule.ruleKey,
          hitCount: 0,
          occurrences: [],
          layer: matchedRule.layer,
          changeText: matchedRule.changeText,
        });
      }
      const usage = hitsByRule.get(matchedRule.ruleKey);
      usage.hitCount += 1;
      usage.occurrences.push(record.occurrenceKey);
    }
  }

  const ruleUsage = [];
  for (const indexed of index.allRules) {
    const usage = hitsByRule.get(indexed.ruleKey);
    const entry = indexed.entry;
    const isIdentity =
      entry.searchType === 'anchor'
        ? !hasEffectiveAnchorTranslation(entry)
        : entry.originalText === entry.changeText;

    if (usage) {
      ruleUsage.push({
        ...usage,
        status: isIdentity ? 'stale' : 'active',
      });
      continue;
    }

    ruleUsage.push({
      ruleKey: indexed.ruleKey,
      hitCount: 0,
      occurrences: [],
      layer: indexed.layer,
      changeText: entry.changeText,
      status: 'orphan',
    });
  }

  return ruleUsage.sort((left, right) => right.hitCount - left.hitCount);
}

function buildContractStatus(records, contracts = SURFACE_CONTRACTS, mappingsByLayer = {}) {
  const index = buildRuleIndex(mappingsByLayer);
  const mappingContracts = contracts.filter((contract) => contract.kind === 'mapping');

  return mappingContracts.map((contract) => {
    const matchingRules = index.allRules.filter(
      (indexed) => indexed.entry.originalText === contract.originalText
    );
    const matchedRecord = records.find((record) =>
      (record.matchedRules || []).some(
        (rule) =>
          rule.contractId === contract.id ||
          (rule.changeText === contract.changeText &&
            record.text === contract.originalText)
      )
    );

    if (!matchingRules.length) {
      return { id: contract.id, status: 'missing', occurrenceKey: matchedRecord?.occurrenceKey || null };
    }

    const hasDrift = matchingRules.some(
      (indexed) => indexed.entry.changeText !== contract.changeText
    );
    if (hasDrift) {
      return {
        id: contract.id,
        status: 'drift',
        occurrenceKey: matchedRecord?.occurrenceKey || null,
      };
    }

    if (matchedRecord) {
      return {
        id: contract.id,
        status: 'satisfied',
        occurrenceKey: matchedRecord.occurrenceKey,
      };
    }

    return { id: contract.id, status: 'missing', occurrenceKey: null };
  });
}

function buildForwardRuleHits(index, harvest, mappingsByLayer) {
  const workbenchSource = (harvest.files || [])
    .map((file) => (file.strings || []).map((entry) => entry.text).join('\n'))
    .join('\n');

  const dynamic = analyzeDynamicRuleCoverage({
    workbenchSource,
    mappings: index.mergedMappings,
    targets: index.mergedMappings,
  });

  return {
    totalRuleCount: dynamic.totalRuleCount,
    bundleRuleCount: dynamic.bundleRuleCount,
    mappedRuleCount: dynamic.mappedRuleCount,
    missingRules: dynamic.missingRules,
  };
}

function summarizeLedgerRecords(records) {
  const summary = {
    total: records.length,
    covered_static: 0,
    covered_runtime: 0,
    covered_dynamic: 0,
    covered_anchor: 0,
    covered_contract: 0,
    unmapped: 0,
    ambiguous: 0,
    mappedByLayer: {},
  };

  for (const record of records) {
    summary[record.status] = (summary[record.status] || 0) + 1;
    for (const matchedRule of record.matchedRules || []) {
      summary.mappedByLayer[matchedRule.layer] =
        (summary.mappedByLayer[matchedRule.layer] || 0) + 1;
    }
  }

  return summary;
}

function buildCoverageLedger({
  harvest = {},
  mappingsByLayer = {},
  contracts = SURFACE_CONTRACTS,
  onProgress,
} = {}) {
  const surfaces = loadSurfaceDefinitions();
  const index = buildRuleIndex(mappingsByLayer);
  const anchorTextIndex = buildAnchorTextIndex(harvest);
  const occurrences = attachAnchorLinks(
    dedupeAnchorSupersededStrings(flattenHarvestOccurrences(harvest), anchorTextIndex),
    anchorTextIndex
  );
  const total = occurrences.length;
  const reportEvery = Math.max(1, Math.floor(total / 20));

  if (onProgress) {
    onProgress({ stage: 'reverse-coverage', current: 0, total });
  }

  const records = [];
  for (let occurrenceIndex = 0; occurrenceIndex < occurrences.length; occurrenceIndex += 1) {
    const occurrence = occurrences[occurrenceIndex];
    const coverage =
      occurrence.kind === 'anchor'
        ? resolveAnchorCoverage(occurrence, index, { contracts })
        : resolveStringCoverage(occurrence, index, { contracts });

    const record = {
      occurrenceKey: harvestOccurrenceKey(occurrence),
      kind: occurrence.kind,
      text: occurrence.text,
      path: occurrence.path,
      context: occurrence.context,
      lineHint: occurrence.lineHint,
      surface: inferHarvestEntrySurface(occurrence, surfaces),
      status: coverage.status,
      matchedRules: coverage.matchedRules,
      unmappedReason: normalizeUnmappedReason(coverage.status, coverage.unmappedReason),
    };
    records.push(record);

    if (
      onProgress &&
      (occurrenceIndex === 0 ||
        occurrenceIndex % reportEvery === 0 ||
        occurrenceIndex === total - 1)
    ) {
      onProgress({ stage: 'reverse-coverage', current: occurrenceIndex + 1, total });
    }
  }

  const summary = summarizeLedgerRecords(records);
  const unmapped = records.filter((record) => record.status === 'unmapped');
  const unmappedBySurface = {};

  for (const record of unmapped) {
    if (!unmappedBySurface[record.surface]) {
      unmappedBySurface[record.surface] = [];
    }
    unmappedBySurface[record.surface].push(record);
  }

  const ruleUsage = buildRuleUsage(records, index);
  const contractStatus = buildContractStatus(records, contracts, mappingsByLayer);
  const forwardRuleHits = buildForwardRuleHits(index, harvest, mappingsByLayer);

  if (onProgress) {
    onProgress({
      stage: 'reverse-coverage-done',
      total: summary.total,
      unmapped: summary.unmapped,
    });
  }

  return {
    records,
    entries: records,
    summary,
    unmapped,
    unmappedBySurface,
    ruleUsage,
    contractStatus,
    forwardRuleHits,
  };
}

module.exports = {
  harvestOccurrenceKey,
  anchorTextKey,
  normalizeUnmappedReason,
  buildAnchorTextIndex,
  dedupeAnchorSupersededStrings,
  attachAnchorLinks,
  buildScopeText,
  flattenHarvestOccurrences,
  buildRuleIndex,
  resolveStringCoverage,
  resolveAnchorCoverage,
  buildRuleUsage,
  buildContractStatus,
  buildCoverageLedger,
};
