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

module.exports = {
  parseVersionParts,
  compareLanguagePackVersion,
  withLocaleSetting,
};
