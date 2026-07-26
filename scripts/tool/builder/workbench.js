'use strict';

const fs = require('node:fs');
const { loadSurfaceDefinitions } = require('../../lib/mapping/surfaces.js');
const { loadTranslationUnits } = require('../../lib/mapping/translation-units.js');
const {
  reconcilePrunedMappings,
  summarizeStaticReconcile,
} = require('../../lib/patcher/static-reconcile.js');

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
    contractEvaluation,
    workbenchIndex
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

    // builder 汇合层对账（D1/B4）：静态未落地且被剪枝的 exact 词条回补进运行时集合。
    const reconciliation = reconcilePrunedMappings({
      translatedSource: resolvedStaticTranslationResult.translatedSource,
      mergedMappings,
      runtimeMappings,
      workbenchIndex,
    });
    const effectiveRuntimeMappings = reconciliation.runtimeMappings;
    const staticReconcile = summarizeStaticReconcile(reconciliation.reconciled);
    const effectiveMetadata =
      metadata && typeof metadata.runtimeMappingCount === 'number'
        ? { ...metadata, runtimeMappingCount: effectiveRuntimeMappings.length }
        : metadata;

    const { units, surfaces } = resolveWorkbenchShardInputs(toolPaths, effectiveMetadata || {});
    const { runtimeHeader, translatedSource, runtimeShards } = buildTranslatedWorkbenchBundleParts({
      workbenchSource: effectiveWorkbenchSource,
      mappings: mergedMappings,
      runtimeMappings: effectiveRuntimeMappings,
      metadata: effectiveMetadata,
      translatedSource: resolvedStaticTranslationResult.translatedSource,
      units,
      surfaces,
      ...(metadata?.runtimeShards ? { runtimeShards: metadata.runtimeShards } : {}),
    });
    const runtimeFootprint = summarizeRuntimeFootprintFromParts(
      runtimeHeader,
      translatedSource,
      effectiveRuntimeMappings
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
      runtimeMappings: effectiveRuntimeMappings,
      staticReconcile,
    };
  }

  function generateTranslatedWorkbench(
    context,
    metadata,
    mergedMappings,
    runtimeMappings,
    workbenchSource,
    staticTranslationResult,
    contractEvaluation,
    workbenchIndex
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
      contractEvaluation,
      workbenchIndex
    );
  }

  function generateTranslatedGlassWorkbench(
    context,
    metadata,
    mergedMappings,
    runtimeMappings,
    workbenchSource,
    staticTranslationResult,
    contractEvaluation,
    workbenchIndex
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
      contractEvaluation,
      workbenchIndex
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
