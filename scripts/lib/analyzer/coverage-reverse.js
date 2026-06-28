'use strict';

const { translateTextWithMappings } = require('../engine/translator');
const { buildExactMappingLookup } = require('./coverage-helpers');
const { loadSurfaceDefinitions, inferHarvestEntrySurface } = require('../mapping/surfaces');

function flattenHarvestEntries(harvest = {}) {
  const entries = [];
  for (const file of harvest.files || []) {
    for (const stringEntry of file.strings || []) {
      entries.push({
        path: file.path,
        text: stringEntry.text,
        context: stringEntry.context,
        lineHint: stringEntry.lineHint,
      });
    }
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

function analyzeReverseCoverage({ harvest = {}, mappings = [], onProgress } = {}) {
  const surfaces = loadSurfaceDefinitions();
  const classifier = createHarvestClassifier(mappings);
  const flatEntries = flattenHarvestEntries(harvest);
  const total = flatEntries.length;
  const reportEvery = Math.max(1, Math.floor(total / 20));

  if (onProgress) {
    onProgress({ stage: 'reverse-coverage', current: 0, total });
  }

  const entries = [];
  for (let index = 0; index < flatEntries.length; index += 1) {
    const entry = flatEntries[index];
    entries.push({
      ...entry,
      status: classifier.classify(entry.text),
    });

    if (onProgress && (index === 0 || index % reportEvery === 0 || index === total - 1)) {
      onProgress({ stage: 'reverse-coverage', current: index + 1, total });
    }
  }

  const summary = {
    total: entries.length,
    covered_static: 0,
    covered_runtime: 0,
    covered_dynamic: 0,
    unmapped: 0,
  };

  for (const entry of entries) {
    summary[entry.status] += 1;
  }

  const unmapped = entries.filter((entry) => entry.status === 'unmapped');
  const unmappedBySurface = {};

  for (const entry of unmapped) {
    const surface = inferHarvestEntrySurface(entry, surfaces);
    if (!unmappedBySurface[surface]) {
      unmappedBySurface[surface] = [];
    }
    unmappedBySurface[surface].push(entry);
  }

  if (onProgress) {
    onProgress({
      stage: 'reverse-coverage-done',
      total: summary.total,
      unmapped: summary.unmapped,
    });
  }

  return {
    entries,
    summary,
    unmapped,
    unmappedBySurface,
  };
}

module.exports = {
  createHarvestClassifier,
  classifyHarvestString,
  analyzeReverseCoverage,
};
