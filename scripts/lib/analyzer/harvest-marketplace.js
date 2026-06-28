function normalizeMarketplaceText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

const MARKETPLACE_SHELL_EXACT = new Set([
  'Discover',
  'Enable',
  'Popular',
  'Search Plugins, Skills, MCPs...',
  'Search skills, rules, subagents, MCPs, and hooks',
  'Search plugins',
  'Search marketplace plugins',
  'Browse Marketplace',
  'All Plugins',
]);

function looksLikeMarketplaceDescription(text) {
  if (text.length > 320) {
    return false;
  }
  if (!/^[A-Za-z"'"]/.test(text)) {
    return false;
  }
  if (/[{}\[\]`$\\]|=>|\bfunction\b|\bconst\b|\blet\b|\bvar\b|aiserver\.|\.v1\.|\bundefined\b|\bbreak e\b/.test(text)) {
    return false;
  }
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 4) {
    return false;
  }
  const alphaWords = words.filter((word) => /[a-zA-Z]{3,}/.test(word));
  return alphaWords.length / words.length >= 0.5;
}

function isMarketplaceDescriptionCandidate(text) {
  const normalized = normalizeMarketplaceText(text);
  if (normalized.length < 32) {
    return false;
  }
  if (MARKETPLACE_SHELL_EXACT.has(normalized)) {
    return false;
  }
  if (/^https?:\/\//i.test(normalized)) {
    return false;
  }
  if (!looksLikeMarketplaceDescription(normalized)) {
    return false;
  }
  return /[.!?]/.test(normalized) || normalized.split(' ').length >= 6;
}

function extractMarketplaceDescriptionCandidates(harvestStrings = []) {
  const entries = [];
  const seen = new Set();
  for (const item of harvestStrings) {
    const text = normalizeMarketplaceText(item?.text);
    if (!isMarketplaceDescriptionCandidate(text) || seen.has(text)) {
      continue;
    }
    seen.add(text);
    entries.push({
      id: text.slice(0, 48).replace(/[^a-zA-Z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || `entry-${entries.length + 1}`,
      originalText: text,
      changeText: text,
      searchType: 'exact',
    });
  }
  return entries;
}

function pluginsFromHarvestSnapshot(harvest = {}) {
  const strings = [];
  for (const file of harvest.files || []) {
    for (const entry of file.strings || []) {
      strings.push(entry);
    }
  }
  return extractMarketplaceDescriptionCandidates(strings).map((entry) => ({
    id: entry.id,
    description: entry.originalText,
  }));
}

function buildMarketplaceDescriptionEntries(plugins = []) {
  const entries = [];
  for (const plugin of plugins) {
    const description = normalizeMarketplaceText(plugin?.description);
    if (!description) {
      continue;
    }
    entries.push({
      id: String(plugin.id || plugin.name || description.slice(0, 48)),
      originalText: description,
      changeText: description,
      searchType: 'exact',
    });
  }
  return entries;
}

function mergeMarketplaceDescriptionsCatalog(existing = {}, plugins = []) {
  const previousEntries = Array.isArray(existing.entries) ? existing.entries : [];
  const previousById = new Map(previousEntries.map((entry) => [entry.id, entry]));
  const harvestedEntries = buildMarketplaceDescriptionEntries(plugins);
  const mergedEntries = [];

  for (const harvested of harvestedEntries) {
    const previous = previousById.get(harvested.id);
    mergedEntries.push({
      ...harvested,
      changeText: previous?.changeText || harvested.changeText,
    });
    previousById.delete(harvested.id);
  }

  for (const orphan of previousById.values()) {
    mergedEntries.push(orphan);
  }

  return {
    version: Number(existing.version || 0) + 1,
    generatedAt: new Date().toISOString(),
    entries: mergedEntries,
  };
}

module.exports = {
  buildMarketplaceDescriptionEntries,
  extractMarketplaceDescriptionCandidates,
  mergeMarketplaceDescriptionsCatalog,
  normalizeMarketplaceText,
  pluginsFromHarvestSnapshot,
};
