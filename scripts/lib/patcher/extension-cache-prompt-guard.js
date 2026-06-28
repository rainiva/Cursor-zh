const UNSUPPRESSED_EXTENSION_CACHE_RELOAD_PROMPT_RE =
  /onDidChangeCache\(\(\)=>\{[a-z]\.dispose\(\),this\._notificationService\.prompt/;

function hasUnsuppressedExtensionCacheReloadPrompt(sourceText) {
  return UNSUPPRESSED_EXTENSION_CACHE_RELOAD_PROMPT_RE.test(String(sourceText || ''));
}

module.exports = {
  hasUnsuppressedExtensionCacheReloadPrompt,
  UNSUPPRESSED_EXTENSION_CACHE_RELOAD_PROMPT_RE,
};
