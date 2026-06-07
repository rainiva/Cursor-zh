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

module.exports = {
  normalizeTextForComparison,
};
