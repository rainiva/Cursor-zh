function createPackageBuilderModule({ writeJson }) {
  function patchPackageJsonMain(context, pkg) {
    const nextPackage = { ...pkg };

    if (!nextPackage.main_original) {
      nextPackage.main_original = nextPackage.main || './out/main.js';
    }

    nextPackage.main = './out/cursorTranslatorMain.js';
    writeJson(context.paths.packageJsonPath, nextPackage);

    return nextPackage;
  }

  return {
    patchPackageJsonMain,
  };
}

module.exports = {
  createPackageBuilderModule,
};
