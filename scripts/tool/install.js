function createInstallModule({ fs, readJson }) {
  function assertPathExists(filePath, label) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`${label} not found: ${filePath}`);
    }
  }

  function loadInstallMetadata(context) {
    assertPathExists(context.paths.packageJsonPath, 'Cursor package.json');
    assertPathExists(context.paths.mainOriginalPath, 'Cursor main bundle');
    assertPathExists(context.paths.nlsKeysPath, 'Cursor nls keys');
    assertPathExists(context.paths.nlsMessagesPath, 'Cursor nls messages');
    assertPathExists(context.paths.productJsonPath, 'Cursor product.json');
    assertPathExists(context.paths.workbenchOriginalPath, 'Cursor workbench bundle');

    const pkg = readJson(context.paths.packageJsonPath);
    const product = readJson(context.paths.productJsonPath);

    return { pkg, product };
  }

  return {
    assertPathExists,
    loadInstallMetadata,
  };
}

module.exports = {
  createInstallModule,
};
