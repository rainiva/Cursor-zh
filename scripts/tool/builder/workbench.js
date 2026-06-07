function createWorkbenchBuilderModule({
  toolPaths,
  readText,
  writeText,
  applyStaticSourceTranslationsDetailed,
  evaluatePatchContracts,
  buildTranslatedWorkbenchBundle,
  summarizeRuntimeFootprint,
}) {
  function summarizeInstalledRuntimeFootprint(
    generatedBundle,
    translatedSourceText,
    runtimeMappings
  ) {
    return summarizeRuntimeFootprint(generatedBundle, translatedSourceText, runtimeMappings);
  }

  function generateTranslatedWorkbench(
    context,
    metadata,
    mergedMappings,
    runtimeMappings,
    workbenchSource,
    staticTranslationResult,
    contractEvaluation
  ) {
    const effectiveWorkbenchSource =
      typeof workbenchSource === 'string'
        ? workbenchSource
        : readText(context.paths.workbenchOriginalPath);
    const resolvedStaticTranslationResult =
      staticTranslationResult ||
      applyStaticSourceTranslationsDetailed(effectiveWorkbenchSource, mergedMappings);
    const resolvedContractEvaluation =
      contractEvaluation ||
      evaluatePatchContracts({
        runtimeMode: metadata?.runtimeConfig?.mode || 'performance',
        contracts: resolvedStaticTranslationResult.contracts,
      });

    if (resolvedContractEvaluation.issues.length > 0) {
      throw new Error(resolvedContractEvaluation.issues.join('\n'));
    }

    const generatedBundle = buildTranslatedWorkbenchBundle({
      workbenchSource: effectiveWorkbenchSource,
      mappings: mergedMappings,
      runtimeMappings,
      metadata,
    });
    const runtimeFootprint = summarizeInstalledRuntimeFootprint(
      generatedBundle,
      resolvedStaticTranslationResult.translatedSource,
      runtimeMappings
    );

    writeText(toolPaths.generatedWorkbenchPath, generatedBundle);
    writeText(context.paths.workbenchTranslatedPath, generatedBundle);

    return {
      contractEvaluation: resolvedContractEvaluation,
      generatedBundle,
      runtimeFootprint,
      staticTranslationResult: resolvedStaticTranslationResult,
    };
  }

  return {
    summarizeInstalledRuntimeFootprint,
    generateTranslatedWorkbench,
  };
}

module.exports = {
  createWorkbenchBuilderModule,
};
