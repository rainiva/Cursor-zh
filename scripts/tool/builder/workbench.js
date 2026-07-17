'use strict';

const fs = require('node:fs');
const { loadSurfaceDefinitions } = require('../../lib/mapping/surfaces.js');
const { loadTranslationUnits } = require('../../lib/mapping/translation-units.js');

function resolveWorkbenchShardInputs(toolPaths, metadata = {}) {
  if (Array.isArray(metadata.units) && metadata.surfaces && typeof metadata.surfaces === 'object') {
    return { units: metadata.units, surfaces: metadata.surfaces };
  }

  const workspaceRoot = toolPaths?.workspaceRoot;
  const surfacesPath = toolPaths?.surfacesMetaPath;
  const unitsPath = toolPaths?.translationUnitsPath;

  let surfaces = metadata.surfaces;
  if (!surfaces || typeof surfaces !== 'object') {
    if (surfacesPath && fs.existsSync(surfacesPath)) {
      surfaces = JSON.parse(fs.readFileSync(surfacesPath, 'utf8'));
    } else if (workspaceRoot) {
      surfaces = loadSurfaceDefinitions(workspaceRoot);
    } else {
      surfaces = {};
    }
  }

  let units = metadata.units;
  if (!Array.isArray(units)) {
    if (unitsPath && fs.existsSync(unitsPath)) {
      units = loadTranslationUnits(unitsPath, surfaces).units;
    } else {
      units = [];
    }
  }

  return { units, surfaces };
}

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

    const { units, surfaces } = resolveWorkbenchShardInputs(toolPaths, metadata || {});
    const { runtimeHeader, translatedSource, runtimeShards } = buildTranslatedWorkbenchBundleParts({
      workbenchSource: effectiveWorkbenchSource,
      mappings: mergedMappings,
      runtimeMappings,
      metadata,
      translatedSource: resolvedStaticTranslationResult.translatedSource,
      units,
      surfaces,
      ...(metadata?.runtimeShards ? { runtimeShards: metadata.runtimeShards } : {}),
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
      runtimeShards,
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
    resolveWorkbenchShardInputs,
  };
}

module.exports = {
  createWorkbenchBuilderModule,
  resolveWorkbenchShardInputs,
};
