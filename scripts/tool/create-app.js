const fs = require('fs');
const path = require('path');

const { resolveWorkspaceRoot, buildShortcutCommand } = require('../cursor-zh-config.js');
const { readDefaultMappings } = require('../lib/mapping/data.js');
const {
  applyStaticSourceTranslations,
  applyStaticSourceTranslationsDetailed,
  analyzeCursorWinCoverage,
  analyzeDynamicRuleCoverage,
  analyzeProductTipsCoverage,
  buildTranslatedWorkbenchBundle,
  buildTranslatedWorkbenchBundleParts,
  compareLanguagePackVersion,
  cursorWinCoverageTargets,
  defaultCursorWinDynamicMappings,
  evaluatePatchContracts,
  mergeMappings,
  parseJsonc,
  parseLegacyWorktreeMappings,
  productTipsCoverageTargets,
  selectRuntimeMappings,
  selectRuntimeMappingsUnion,
  summarizeStaticPatchContractsFromTranslatedSource,
  summarizeRuntimeFootprint,
  summarizeRuntimeFootprintFromParts,
  translateTextWithMappings,
  withLocaleSetting,
} = require('../cursor-zh-lib.js');

const { createToolPaths } = require('./paths.js');
const {
  ensureDir,
  readText,
  writeText,
  writeTextParts,
  readJson,
  readJsonIfExists,
  writeJson,
  sha256OfFile,
  timestampLabel,
  writeStartLauncherPath: writeStartLauncherPathToFile,
} = require('./io.js');
const { createContextModule, normalizeRuntimeMode } = require('./context.js');
const { createDetectorModule } = require('./detector.js');
const { createLocaleModule } = require('./locale.js');
const { createBackupModule } = require('./backup.js');
const { createOverlaySeedModule } = require('./overlay-seed.js');
const { createMappingsModule } = require('./mappings.js');
const { createInstallModule } = require('./install.js');
const { createRuntimeConfigModule } = require('./runtime-config.js');
const { createRuntimeArtifactModule } = require('./runtime-artifact.js');
const { createRuntimeStrategyModule } = require('./runtime-strategy.js');
const { createBootstrapBuilderModule } = require('./builder/bootstrap.js');
const { createPackageBuilderModule } = require('./builder/package.js');
const { createMainBuilderModule } = require('./builder/main.js');
const { createNlsBuilderModule } = require('./builder/nls.js');
const { createExtensionBuilderModule } = require('./builder/extension.js');
const { createWorkbenchBuilderModule } = require('./builder/workbench.js');
const { createCoverageModule } = require('./coverage.js');
const { createManifestModule } = require('./manifest.js');
const { createVerifyModule } = require('./verify.js');
const { createReportModule } = require('./report.js');
const { createShortcutModule } = require('./shortcut.js');
const { createToggleModule } = require('./toggle.js');
const { createCommandsModule } = require('./commands.js');
const { createCoverageWorkbenchContext } = require('../lib/analyzer/workbench-coverage-context.js');
const { createWorkbenchIndex } = require('../lib/patcher/workbench-index.js');
const { runParallelTasks, runParallelTasksSync } = require('./parallel.js');
const { createStageTimer } = require('./timing.js');
const { clearCursorExtensionCache } = require('./extension-cache.js');
const { syncLanguagePackCacheMessages } = require('./language-pack-cache.js');
const {
  createSessionCache,
  collectMappingSourceSnapshots,
  canReuseManifestCoverage,
  canReuseManifestStaticContracts,
  createMappingInfoFromManifest,
  canReuseAppliedArtifacts,
} = require('./session-cache.js');

function createToolApp() {
  const WORKSPACE_ROOT = resolveWorkspaceRoot({
    scriptDir: path.join(__dirname, '..'),
    env: process.env,
  });
  const TOOL_PATHS = createToolPaths(WORKSPACE_ROOT);

  const { detectCursorInstallDir, findLanguagePack } = createDetectorModule({ readJson });
  const boundDetectCursorInstallDir = () =>
    detectCursorInstallDir({
      workspaceRoot: WORKSPACE_ROOT,
      defaultInstallDir: TOOL_PATHS.defaultInstallDir,
    });

  const {
    assertCommandAllowed,
    createContext,
    shouldIncludeExperimentalRuntimeToggle,
  } = createContextModule({
    detectCursorInstallDir: boundDetectCursorInstallDir,
  });

  const { readArgvConfig, writeLocaleFiles } = createLocaleModule({
    readText,
    writeJson,
    parseJsonc,
    withLocaleSetting,
  });

  const { ensureBackup: runEnsureBackup } = createBackupModule({
    toolPaths: TOOL_PATHS,
    ensureDir,
    readJson,
    writeJson,
    timestampLabel,
  });

  const { asArray, seedOverlayFiles } = createOverlaySeedModule({
    toolPaths: TOOL_PATHS,
    ensureDir,
    readJsonIfExists,
    writeJson,
    mergeMappings,
    readDefaultMappings,
  });

  const { loadMergedMappings } = createMappingsModule({
    toolPaths: TOOL_PATHS,
    fs,
    readText,
    writeJson,
    readJsonIfExists,
    mergeMappings,
    parseLegacyWorktreeMappings,
    seedOverlayFiles,
    asArray,
  });

  const { assertPathExists, loadInstallMetadata } = createInstallModule({ fs, readJson });
  const { buildRuntimeConfig } = createRuntimeConfigModule({ normalizeRuntimeMode });
  const { parseInstalledRuntimeArtifact, hasInstalledRuntimeHeader } =
    createRuntimeArtifactModule();

  const {
    buildRuntimeMappingsInfo,
    buildRuntimeStrategyReport,
    detectAppliedRuntimeMode,
  } = createRuntimeStrategyModule({
    toolPaths: TOOL_PATHS,
    fs,
    readText,
    readJsonIfExists,
    selectRuntimeMappings,
    selectRuntimeMappingsUnion,
    buildRuntimeConfig,
    parseInstalledRuntimeArtifact,
    createWorkbenchIndex,
  });

  const { isTranslatorBootstrapSource, writeTranslatorBootstrap } = createBootstrapBuilderModule({
    writeText,
  });
  const { patchPackageJsonMain } = createPackageBuilderModule({ writeJson });
  const { buildTranslatedMainText, generateTranslatedMain } = createMainBuilderModule({
    toolPaths: TOOL_PATHS,
    readText,
    writeText,
    applyStaticSourceTranslations,
  });
  const { buildTranslatedNlsMessagesPayload, generateTranslatedNlsMessages } =
    createNlsBuilderModule({
      readJson,
      writeJson,
      translateTextWithMappings,
      assertPathExists,
      toolPaths: TOOL_PATHS,
    });
  const { writeExtensionTranslationFiles } = createExtensionBuilderModule({
    toolPaths: TOOL_PATHS,
    readJson,
    writeJson,
  });
  const { generateTranslatedWorkbench, generateTranslatedGlassWorkbench } =
    createWorkbenchBuilderModule({
    toolPaths: TOOL_PATHS,
    readText,
    writeText,
    writeTextParts,
    applyStaticSourceTranslationsDetailed,
    evaluatePatchContracts,
    buildTranslatedWorkbenchBundleParts,
    summarizeRuntimeFootprintFromParts,
  });
  const { buildCursorWinCoverage, buildDynamicCoverage, buildProductTipsCoverage } =
    createCoverageModule({
      readText,
      analyzeCursorWinCoverage,
      cursorWinCoverageTargets,
      analyzeDynamicRuleCoverage,
      analyzeProductTipsCoverage,
      productTipsCoverageTargets,
    });
  const { buildManifest, writeManifest } = createManifestModule({
    toolPaths: TOOL_PATHS,
    sha256OfFile,
    compareLanguagePackVersion,
    writeJson,
    collectMappingSourceSnapshots,
  });
  const { verifyState } = createVerifyModule({
    toolPaths: TOOL_PATHS,
    fs,
    readText,
    readJson,
    readJsonIfExists,
    sha256OfFile,
    compareLanguagePackVersion,
    readArgvConfig,
    loadMergedMappings,
    buildCursorWinCoverage,
    buildDynamicCoverage,
    buildProductTipsCoverage,
    defaultCursorWinDynamicMappings,
    detectAppliedRuntimeMode,
    buildRuntimeMappingsInfo,
    buildRuntimeStrategyReport,
    parseInstalledRuntimeArtifact,
    hasInstalledRuntimeHeader,
    summarizeStaticPatchContractsFromTranslatedSource,
    evaluatePatchContracts,
    summarizeRuntimeFootprint,
    isTranslatorBootstrapSource,
    createStageTimer,
    createSessionCache,
    canReuseManifestCoverage,
    canReuseManifestStaticContracts,
    createMappingInfoFromManifest,
    writeManifest,
    runParallelTasksSync,
    createCoverageWorkbenchContext,
  });
  const {
    printReport,
    printCursorWinCoverage,
    printDynamicCoverage,
    printProductTipsCoverage,
    printStaticPatchContracts,
    printRuntimeStrategy,
  } = createReportModule();
  const { writeStartLauncherPath, createDesktopShortcut } = createShortcutModule({
    toolPaths: TOOL_PATHS,
    buildShortcutCommand,
    writeStartLauncherPathToFile,
  });
  const { runToggle, runDisable, runEnable, runStatus } = createToggleModule({
    toolPaths: TOOL_PATHS,
    readText,
    writeText,
  });

  function ensureBackup(context, options = {}) {
    return runEnsureBackup(context, {
      seedOverlayFiles,
      ...options,
    });
  }

  const { runApply, runVerify, runEnsure, runStart } = createCommandsModule({
    toolPaths: TOOL_PATHS,
    fs,
    readText,
    readJson,
    readJsonIfExists,
    compareLanguagePackVersion,
    findLanguagePack,
    loadInstallMetadata,
    ensureBackup,
    loadMergedMappings,
    buildRuntimeConfig,
    buildRuntimeMappingsInfo,
    shouldIncludeExperimentalRuntimeToggle,
    applyStaticSourceTranslationsDetailed,
    evaluatePatchContracts,
    buildTranslatedMainText,
    buildTranslatedNlsMessagesPayload,
    writeStartLauncherPath,
    writeLocaleFiles,
    writeTranslatorBootstrap,
    patchPackageJsonMain,
    generateTranslatedMain,
    generateTranslatedNlsMessages,
    generateTranslatedWorkbench,
    generateTranslatedGlassWorkbench,
    writeExtensionTranslationFiles,
    buildCursorWinCoverage,
    buildDynamicCoverage,
    buildProductTipsCoverage,
    defaultCursorWinDynamicMappings,
    buildRuntimeStrategyReport,
    buildManifest,
    writeManifest,
    sha256OfFile,
    createDesktopShortcut,
    verifyState,
    printReport,
    printCursorWinCoverage,
    printDynamicCoverage,
    printProductTipsCoverage,
    printStaticPatchContracts,
    printRuntimeStrategy,
    createStageTimer,
    createSessionCache,
    canReuseAppliedArtifacts,
    createMappingInfoFromManifest,
    createWorkbenchIndex,
    runParallelTasks,
    clearCursorExtensionCache: () => clearCursorExtensionCache({ fs }),
    syncLanguagePackCacheMessages: (payload) => syncLanguagePackCacheMessages({ ...payload, fs }),
  });

  return {
    TOOL_PATHS,
    WORKSPACE_ROOT,
    ensureDir,
    assertCommandAllowed,
    createContext,
    ensureBackup,
    loadMergedMappings,
    buildRuntimeConfig,
    buildManifest,
    verifyState,
    runApply,
    runVerify,
    runEnsure,
    runStart,
    runToggle,
    runDisable,
    runEnable,
    runStatus,
  };
}

module.exports = {
  createToolApp,
};
