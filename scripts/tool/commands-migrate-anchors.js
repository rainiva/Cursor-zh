const { suggestAnchorMappings } = require('../lib/analyzer/migrate-anchors.js');
const { harvestInstallDir } = require('../lib/analyzer/string-harvest.js');

function createMigrateAnchorsModule({
  fs,
  readText,
  readJson,
  loadMergedMappings,
}) {
  function runMigrateAnchors(context, options = {}) {
    const pkg = readJson(context.paths.packageJsonPath);
    const product = readJson(context.paths.productJsonPath);
    const mappingInfo = loadMergedMappings(context, { seed: false });
    const harvest = harvestInstallDir({
      resourcesAppDir: context.paths.resourcesAppDir,
      cursorVersion: pkg.version,
      vscodeVersion: product.vscodeVersion,
      fs,
      readText,
    });

    const suggestions = suggestAnchorMappings({
      harvest,
      commonMappings: mappingInfo.cursorWinCommonMappings,
    });

    if (options.suggest) {
      console.log(JSON.stringify(suggestions, null, 2));
      return suggestions;
    }

    console.log(JSON.stringify(suggestions, null, 2));
    return suggestions;
  }

  return {
    runMigrateAnchors,
  };
}

module.exports = {
  createMigrateAnchorsModule,
};
