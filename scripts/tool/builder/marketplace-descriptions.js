function createMarketplaceDescriptionsModule({ toolPaths, readJsonIfExists, writeJson, ensureDir }) {
  function loadMarketplaceDescriptionsCatalog() {
    return readJsonIfExists(toolPaths.marketplaceDescriptionsCachePath, {
      version: 0,
      generatedAt: null,
      entries: [],
    });
  }

  function writeMarketplaceDescriptionsFile() {
    const catalog = loadMarketplaceDescriptionsCatalog();
    ensureDir(toolPaths.generatedDir);
    writeJson(toolPaths.marketplaceDescriptionsGeneratedPath, catalog);
    return catalog;
  }

  function buildMarketplaceDescriptionsMetadata(catalog) {
    const entries = Array.isArray(catalog?.entries) ? catalog.entries : [];
    return {
      marketplaceDescriptionsVersion: catalog?.version ?? 0,
      marketplaceDescriptionsGeneratedAt: catalog?.generatedAt ?? null,
      marketplaceDescriptionsPath: toolPaths.marketplaceDescriptionsGeneratedPath,
      marketplaceDescriptionsUrl: 'cursor-zh://marketplace.descriptions.json',
      marketplaceMappingCount: entries.length,
    };
  }

  return {
    loadMarketplaceDescriptionsCatalog,
    writeMarketplaceDescriptionsFile,
    buildMarketplaceDescriptionsMetadata,
  };
}

module.exports = {
  createMarketplaceDescriptionsModule,
};
