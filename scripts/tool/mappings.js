function createMappingsModule({
  toolPaths,
  fs,
  readText,
  writeJson,
  readJsonIfExists,
  mergeMappings,
  parseLegacyWorktreeMappings,
  seedOverlayFiles,
  asArray,
}) {
  function readLegacyBaseMappings(context, options = {}) {
    if (fs.existsSync(toolPaths.baseMappingPath)) {
      return readJsonIfExists(toolPaths.baseMappingPath, []);
    }

    if (!fs.existsSync(context.paths.workbenchTranslatedPath)) {
      return [];
    }

    const extracted = parseLegacyWorktreeMappings(readText(context.paths.workbenchTranslatedPath));
    if (options.persist !== false && extracted.length > 0) {
      writeJson(toolPaths.baseMappingPath, extracted);
    }
    return extracted;
  }

  function loadMergedMappings(context, options = {}) {
    if (options.seed !== false) {
      seedOverlayFiles();
    }
    const baseMappings = readLegacyBaseMappings(context, {
      persist: options.persistBaseMappings,
    });
    const overlayMappings = asArray(readJsonIfExists(toolPaths.overlayMappingPath, []));
    const cursorWinCommonMappings = asArray(readJsonIfExists(toolPaths.cursorWinCommonPath, []));
    const anchorMappings = asArray(readJsonIfExists(toolPaths.cursorWinAnchorsPath, []));
    const dynamicMappings = asArray(readJsonIfExists(toolPaths.dynamicMappingPath, []));
    return {
      baseMappings,
      overlayMappings,
      cursorWinCommonMappings,
      anchorMappings,
      dynamicMappings,
      mergedMappings: mergeMappings(
        mergeMappings(
          mergeMappings(baseMappings, overlayMappings),
          cursorWinCommonMappings
        ),
        mergeMappings(anchorMappings, dynamicMappings)
      ),
    };
  }

  return {
    readLegacyBaseMappings,
    loadMergedMappings,
  };
}

module.exports = {
  createMappingsModule,
};
