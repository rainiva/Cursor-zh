const LEGACY_MAPPING_PATTERN =
  /const translationMappings = (\[.*?\]); \/\/ don't modify string/s;

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

module.exports = {
  LEGACY_MAPPING_PATTERN,
  stripJsonComments,
  parseJsonc,
  parseLegacyWorktreeMappings,
};
