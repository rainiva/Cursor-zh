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

module.exports = {
  createMapping,
  createExactMapping,
  createNormalizedExactMapping,
  createRegexMapping,
};
