const HARVEST_NOISE_WORDS = new Set([
  'undefined',
  'function',
  'object',
  'boolean',
  'string',
  'number',
  'symbol',
  'bigint',
  'getter',
  'setter',
  'accessor',
  'value',
  'access',
  'auto',
  'get',
  'set',
]);

const MINIFIED_CODE_MARKERS = [
  /=>/,
  /void 0/,
  /precondition:/,
  /menuId:/,
  /\border:\d/,
  /\.plugins/,
  /iYn\(/,
  /x\(\d+,null\)/,
  /title:x\(/,
  /group:`/,
  /},\{/,
  /null\)/,
  /fe\(\{/,
  /[:;](return|case|break|var|let|const)\b/,
  /\$\{/,
  /\.push\s*\(/,
  /\w+\s*\(\s*\{/,
];

const TSLIB_NOISE_PATTERNS = [
  /^Class extends value /,
  /^ is not a constructor or null$/,
  /^Function expected$/,
  /^Cannot add initializers after decoration has completed$/,
  /^accessor$/,
];

const RUNTIME_LIBRARY_MESSAGE_PATTERNS = [
  ...TSLIB_NOISE_PATTERNS,
  /^Object expected\.?$/,
  /^Generator is already executing\.?$/,
  /^Object is not iterable\.?$/,
  /^Symbol\./,
  /^Private /,
  /^Cannot /,
  /^An error was suppressed/,
  /^Dynamic require of "/,
  /^SuppressedError$/,
  / is not defined\.?$/,
  / is not writable$/,
  / is not iterable\.?$/,
  /^Object not disposable\.?$/,
];

const DEVELOPER_DIAGNOSTIC_PATTERNS = [
  /Monaco.*renderer/i,
  /shader module/i,
  /uniform buffer/i,
  /command encoder/i,
  /render pass/i,
  /vertex buffer/i,
  /bind group/i,
];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuidString(text) {
  return UUID_RE.test(text);
}

function isHarvestNoiseWord(text) {
  return HARVEST_NOISE_WORDS.has(String(text || '').trim().toLowerCase());
}

function isTslibOrRuntimeNoise(text) {
  return TSLIB_NOISE_PATTERNS.some((pattern) => pattern.test(text));
}

function isRuntimeLibraryMessage(text) {
  const value = String(text || '').trim();
  return RUNTIME_LIBRARY_MESSAGE_PATTERNS.some((pattern) => pattern.test(value));
}

function looksLikeMinifiedCodeFragment(text) {
  const value = String(text || '');
  if (MINIFIED_CODE_MARKERS.some((pattern) => pattern.test(value))) {
    return true;
  }

  if (/^[,;.{(\[`):]/.test(value) || /[},);]\s*$/.test(value)) {
    return true;
  }

  if (/[{}();=]/.test(value)) {
    return true;
  }

  const specialCount = (value.match(/[^A-Za-z0-9\s\u4e00-\u9fff.'’\-–—]/g) || []).length;
  if (value.length >= 16 && specialCount / value.length > 0.2) {
    return true;
  }

  return false;
}

function looksLikeChildrenBadgeText(text) {
  const badge = String(text || '').trim();
  if (!badge || /[{}();=]/.test(badge)) {
    return false;
  }

  if (/^[[(][^\]();=]{0,40}\]?$/.test(badge)) {
    return true;
  }

  return /^[A-Za-z\u4e00-\u9fff]/.test(badge) || /queued/i.test(badge);
}

function hasNlsMnemonic(text) {
  const value = String(text || '');
  if (!value.includes('&&')) {
    return false;
  }

  if (/&&\w*[\.\(\[{`]/.test(value)) {
    return false;
  }

  return /(^|\s)&&\s*[A-Za-z]/.test(value);
}

function looksLikeReadablePhrase(text) {
  const trimmed = String(text || '').trim();
  if (!/\s/.test(trimmed) || !/[A-Za-z\u4e00-\u9fff]/.test(trimmed)) {
    return false;
  }

  if (/[{}();=]/.test(trimmed)) {
    return false;
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  return (
    parts.length >= 2 &&
    parts.every((part) => /[A-Za-z\u4e00-\u9fff]/.test(part) && !/^[:;]/.test(part))
  );
}

function isDeveloperDiagnosticLabel(text) {
  return DEVELOPER_DIAGNOSTIC_PATTERNS.some((pattern) => pattern.test(text));
}

function isDomOrCssToken(text) {
  const value = String(text || '').trim();
  if (!value || /\s/.test(value)) {
    return false;
  }

  if (/^[a-z][a-z0-9]*(@[a-z][a-z0-9-]*)?$/.test(value)) {
    return true;
  }

  if (/^[a-z0-9]+(-[a-z0-9]+)+$/.test(value)) {
    return true;
  }

  if (/[.@]/.test(value) && /^[a-z0-9.@_-]+$/.test(value)) {
    return true;
  }

  return false;
}

function isImplIdentifier(text) {
  const value = String(text || '').trim();
  if (!value || /\s/.test(value)) {
    return false;
  }

  if (/^[a-z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)+$/.test(value)) {
    return true;
  }

  if (/^[a-z]+[A-Z][a-zA-Z0-9]*$/.test(value)) {
    return true;
  }

  if (/^[A-Z][a-zA-Z0-9]{8,}$/.test(value)) {
    return true;
  }

  return false;
}

function looksLikeCssClassChain(text) {
  const value = String(text || '').trim();
  if (!/\s/.test(value)) {
    return false;
  }

  const tokens = value.split(/\s+/).filter(Boolean);
  if (tokens.length < 3) {
    return false;
  }

  const cssLikeCount = tokens.filter(
    (token) =>
      /^ui-[a-z0-9]+$/.test(token) ||
      /^[a-z0-9]+(-[a-z0-9]+){2,}$/.test(token) ||
      isDomOrCssToken(token)
  ).length;

  return cssLikeCount >= 3 && cssLikeCount / tokens.length >= 0.75;
}

function isReactDevInvariant(text) {
  const value = String(text || '').trim();
  return (
    /components must be used within/i.test(value) ||
    /rendered more hooks than/i.test(value) ||
    /invalid hook call/i.test(value)
  );
}

function shouldSkipHarvestString(text) {
  if (typeof text !== 'string') {
    return true;
  }

  if (text.length < 2 || text.length > 200) {
    return true;
  }

  if (/^https?:\/\//i.test(text) || /^[\w+-]+:\/\//.test(text)) {
    return true;
  }

  if (/^[a-f0-9]{32,}$/i.test(text) || isUuidString(text)) {
    return true;
  }

  if (/\.(js|css|ts|json|svg|png|woff2?)($|\?)/i.test(text)) {
    return true;
  }

  if (/^[./\\]/.test(text)) {
    return true;
  }

  if (/^codicon-/.test(text) || text === 'className') {
    return true;
  }

  if (/^[A-Z0-9_]+$/.test(text) && text.length > 3) {
    return true;
  }

  if (!/[A-Za-z\u4e00-\u9fff]/.test(text)) {
    return true;
  }

  if (isHarvestNoiseWord(text) || isTslibOrRuntimeNoise(text) || isRuntimeLibraryMessage(text)) {
    return true;
  }

  if (looksLikeMinifiedCodeFragment(text)) {
    return true;
  }

  return false;
}

function isLikelyUserVisibleLiteral(text) {
  const value = String(text || '').trim();
  if (!value || shouldSkipHarvestString(value)) {
    return false;
  }

  if (isDeveloperDiagnosticLabel(value)) {
    return false;
  }

  if (/[\u4e00-\u9fff]/.test(value)) {
    return true;
  }

  if (!/[A-Z]/.test(value)) {
    return false;
  }

  if (/\s/.test(value)) {
    return true;
  }

  return value.length >= 10;
}

function isPlausibleUiCopy(text, context = 'literal') {
  const value = String(text || '');
  const trimmed = value.trim();

  if (
    shouldSkipHarvestString(text) ||
    isRuntimeLibraryMessage(trimmed) ||
    isDeveloperDiagnosticLabel(trimmed) ||
    isDomOrCssToken(trimmed) ||
    isImplIdentifier(trimmed) ||
    looksLikeCssClassChain(trimmed) ||
    isReactDevInvariant(trimmed)
  ) {
    return false;
  }

  if (/[\u4e00-\u9fff]/.test(trimmed)) {
    return true;
  }

  if (hasNlsMnemonic(trimmed)) {
    return true;
  }

  if (context === 'children:' && /^\s+/.test(value) && looksLikeChildrenBadgeText(value)) {
    return true;
  }

  if (looksLikeReadablePhrase(trimmed)) {
    return true;
  }

  if (/^[A-Z][a-z]+$/.test(trimmed) && trimmed.length >= 6) {
    return true;
  }

  return false;
}

function shouldIncludeHarvestEntry(text, context = 'literal') {
  if (shouldSkipHarvestString(text)) {
    return false;
  }

  if (!context || context === 'literal' || context === 'original:') {
    return false;
  }

  return isPlausibleUiCopy(text, context);
}

module.exports = {
  HARVEST_NOISE_WORDS,
  isUuidString,
  isHarvestNoiseWord,
  isTslibOrRuntimeNoise,
  isRuntimeLibraryMessage,
  looksLikeMinifiedCodeFragment,
  hasNlsMnemonic,
  looksLikeReadablePhrase,
  looksLikeChildrenBadgeText,
  looksLikeCssClassChain,
  isReactDevInvariant,
  isDeveloperDiagnosticLabel,
  isDomOrCssToken,
  isImplIdentifier,
  shouldSkipHarvestString,
  isLikelyUserVisibleLiteral,
  isPlausibleUiCopy,
  shouldIncludeHarvestEntry,
};
