const path = require('path');

const NLS_MODULE_LOOKUP_ALIASES = {
  'vs/workbench/services/extensions/electron-sandbox/cachedExtensionScanner':
    'vs/workbench/services/extensions/electron-browser/cachedExtensionScanner',
};

function resolveModuleTranslations(translationContents, moduleId) {
  if (
    moduleId &&
    translationContents[moduleId] &&
    typeof translationContents[moduleId] === 'object'
  ) {
    return translationContents[moduleId];
  }

  const aliasModuleId = NLS_MODULE_LOOKUP_ALIASES[moduleId];
  if (
    aliasModuleId &&
    translationContents[aliasModuleId] &&
    typeof translationContents[aliasModuleId] === 'object'
  ) {
    return translationContents[aliasModuleId];
  }

  return {};
}

function createNlsBuilderModule({
  readJson,
  writeJson,
  translateTextWithMappings,
  assertPathExists,
  toolPaths,
}) {
  function buildTranslatedNlsMessagesPayload(context, languagePack, mergedMappings) {
    const mainI18nPath = path.join(languagePack.path, 'translations', 'main.i18n.json');
    assertPathExists(mainI18nPath, '官方语言包 main.i18n.json');

    const nlsKeys = readJson(context.paths.nlsKeysPath);
    const nlsMessages = readJson(context.paths.nlsMessagesPath);
    const translationContents = readJson(mainI18nPath).contents || {};
    const translatedMessages = [...nlsMessages];
    let messageIndex = 0;

    for (const entry of nlsKeys) {
      const moduleId = Array.isArray(entry) ? entry[0] : null;
      const messageKeys = Array.isArray(entry) ? entry[1] : null;
      const moduleTranslations = resolveModuleTranslations(translationContents, moduleId);

      if (!Array.isArray(messageKeys)) {
        continue;
      }

      for (const messageKey of messageKeys) {
        const originalText = translatedMessages[messageIndex];
        const officialTranslation =
          typeof moduleTranslations[messageKey] === 'string'
            ? moduleTranslations[messageKey]
            : originalText;

        translatedMessages[messageIndex] = translateTextWithMappings(
          officialTranslation,
          mergedMappings
        );
        messageIndex += 1;
      }
    }

    return translatedMessages;
  }

  function generateTranslatedNlsMessages(
    context,
    languagePack,
    mergedMappings,
    precomputedMessages,
    options = {}
  ) {
    const translatedMessages = Array.isArray(precomputedMessages)
      ? precomputedMessages
      : buildTranslatedNlsMessagesPayload(context, languagePack, mergedMappings);

    writeJson(toolPaths.generatedNlsMessagesPath, translatedMessages);
    writeJson(context.paths.nlsMessagesPath, translatedMessages);

    if (typeof options.syncLanguagePackCacheMessages === 'function') {
      options.syncLanguagePackCacheMessages({ messages: translatedMessages });
    }

    return translatedMessages;
  }

  return {
    buildTranslatedNlsMessagesPayload,
    generateTranslatedNlsMessages,
  };
}

module.exports = {
  NLS_MODULE_LOOKUP_ALIASES,
  resolveModuleTranslations,
  createNlsBuilderModule,
};
