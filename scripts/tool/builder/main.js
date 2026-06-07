function createMainBuilderModule({ toolPaths, readText, writeText, applyStaticSourceTranslations }) {
  const SAFE_MAIN_TRANSLATION_TEXTS = new Set([
    'Recent Agents',
    'No recent agents',
    'Clear All Notifications',
    'New Agent',
    'Open Cursor',
    'Settings',
    'Quit',
  ]);

  function buildTranslatedMainText(mainSource, mergedMappings) {
    const safeMainMappings = mergedMappings.filter(
      (mapping) =>
        mapping &&
        mapping.searchType === 'exact' &&
        SAFE_MAIN_TRANSLATION_TEXTS.has(mapping.originalText)
    );
    return safeMainMappings.length > 0
      ? applyStaticSourceTranslations(mainSource, safeMainMappings)
      : mainSource;
  }

  function generateTranslatedMain(context, mergedMappings, precomputedMainText) {
    const generatedMain =
      typeof precomputedMainText === 'string'
        ? precomputedMainText
        : buildTranslatedMainText(readText(context.paths.mainOriginalPath), mergedMappings);

    writeText(toolPaths.generatedMainPath, generatedMain);
    writeText(context.paths.mainTranslatedPath, generatedMain);
  }

  return {
    SAFE_MAIN_TRANSLATION_TEXTS,
    buildTranslatedMainText,
    generateTranslatedMain,
  };
}

module.exports = {
  createMainBuilderModule,
};
