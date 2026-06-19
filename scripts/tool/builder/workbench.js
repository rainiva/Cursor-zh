function createWorkbenchBuilderModule({

  toolPaths,

  readText,

  writeText,

  writeTextParts,

  applyStaticSourceTranslationsDetailed,

  evaluatePatchContracts,

  buildTranslatedWorkbenchBundleParts,

  summarizeRuntimeFootprintFromParts,

}) {

  function writeBundleParts(filePath, runtimeHeader, translatedSource) {

    if (typeof writeTextParts === 'function') {

      writeTextParts(filePath, [runtimeHeader, translatedSource]);

      return;

    }



    writeText(filePath, `${runtimeHeader}${translatedSource}`);

  }



  function generateTranslatedWorkbenchBundle(

    bundlePaths,

    generatedPath,

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

        : readText(bundlePaths.originalPath);

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



    const { runtimeHeader, translatedSource } = buildTranslatedWorkbenchBundleParts({

      workbenchSource: effectiveWorkbenchSource,

      mappings: mergedMappings,

      runtimeMappings,

      metadata,

      translatedSource: resolvedStaticTranslationResult.translatedSource,

    });

    const runtimeFootprint = summarizeRuntimeFootprintFromParts(

      runtimeHeader,

      translatedSource,

      runtimeMappings

    );



    writeBundleParts(generatedPath, runtimeHeader, translatedSource);

    writeBundleParts(bundlePaths.translatedPath, runtimeHeader, translatedSource);



    return {

      contractEvaluation: resolvedContractEvaluation,

      runtimeFootprint,

      staticTranslationResult: resolvedStaticTranslationResult,

      runtimeHeader,

      translatedSource,

    };

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

    return generateTranslatedWorkbenchBundle(

      {

        originalPath: context.paths.workbenchOriginalPath,

        translatedPath: context.paths.workbenchTranslatedPath,

      },

      toolPaths.generatedWorkbenchPath,

      context,

      metadata,

      mergedMappings,

      runtimeMappings,

      workbenchSource,

      staticTranslationResult,

      contractEvaluation

    );

  }



  function generateTranslatedGlassWorkbench(

    context,

    metadata,

    mergedMappings,

    runtimeMappings,

    workbenchSource,

    staticTranslationResult,

    contractEvaluation

  ) {

    if (!context.paths.workbenchGlassOriginalPath || !context.paths.workbenchGlassTranslatedPath) {

      return null;

    }

    if (!toolPaths.generatedGlassWorkbenchPath) {

      throw new Error('Missing generatedGlassWorkbenchPath in tool paths.');

    }



    return generateTranslatedWorkbenchBundle(

      {

        originalPath: context.paths.workbenchGlassOriginalPath,

        translatedPath: context.paths.workbenchGlassTranslatedPath,

      },

      toolPaths.generatedGlassWorkbenchPath,

      context,

      metadata,

      mergedMappings,

      runtimeMappings,

      workbenchSource,

      staticTranslationResult,

      contractEvaluation

    );

  }



  return {

    generateTranslatedWorkbench,

    generateTranslatedGlassWorkbench,

    generateTranslatedWorkbenchBundle,

  };

}



module.exports = {

  createWorkbenchBuilderModule,

};
