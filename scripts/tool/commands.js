const fs = require('fs');
const childProcess = require('child_process');
const { runParallelTasks: defaultRunParallelTasks } = require('./parallel.js');

const DEFERRED_CURSOR_WIN_COVERAGE = {
  deferred: true,
  totalTargetCount: 0,
  bundleTargetCount: 0,
  mappedTargetCount: 0,
  missingTargets: [],
  sourceAvailable: true,
};

const DEFERRED_DYNAMIC_COVERAGE = {
  deferred: true,
  totalRuleCount: 0,
  bundleRuleCount: 0,
  mappedRuleCount: 0,
  missingRules: [],
  sourceAvailable: true,
};

function createCommandsModule({
  toolPaths,
  fs: fsModule,
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
  clearCursorExtensionCache,
}) {
  const fsRef = fsModule || fs;
  const clearExtensionCache =
    clearCursorExtensionCache ||
    (() => require('./extension-cache.js').clearCursorExtensionCache());
  const parallelRunner = runParallelTasks || defaultRunParallelTasks;
  const buildWorkbenchIndex =
    createWorkbenchIndex ||
    ((sourceText) =>
      require('../lib/patcher/workbench-index.js').createWorkbenchIndex(sourceText));

  function mergeContractEvaluations(...evaluations) {
    return {
      issues: evaluations.flatMap((evaluation) => evaluation?.issues || []),
      warnings: evaluations.flatMap((evaluation) => evaluation?.warnings || []),
    };
  }

  function hasGlassWorkbench(context) {
    return (
      context.paths.workbenchGlassOriginalPath &&
      fsRef.existsSync(context.paths.workbenchGlassOriginalPath)
    );
  }

  function buildWorkbenchSources(context, applyCache) {
    const desktopSource = applyCache.readTextCached(context.paths.workbenchOriginalPath);
    const sources = [
      {
        workbenchSource: desktopSource,
        workbenchIndex: buildWorkbenchIndex(desktopSource),
      },
    ];

    if (hasGlassWorkbench(context)) {
      const glassSource = applyCache.readTextCached(context.paths.workbenchGlassOriginalPath);
      sources.push({
        workbenchSource: glassSource,
        workbenchIndex: buildWorkbenchIndex(glassSource),
      });
    }

    return sources;
  }
  const stageTimerFactory = createStageTimer || (() => ({
    start() {},
    end() {},
    printSummary() {
      return { label: '耗时', totalMs: 0, stages: [] };
    },
  }));
  const sessionCacheFactory =
    createSessionCache ||
    ((deps) => ({
      readTextCached: (filePath) => (deps.readText || readText)(filePath),
      sha256Cached: (filePath) => (deps.sha256OfFile || sha256OfFile)(filePath),
    }));

  function runStart(context) {
    if (!fsRef.existsSync(context.paths.cursorExePath)) {
      throw new Error(`找不到 Cursor.exe: ${context.paths.cursorExePath}`);
    }

    const child = childProcess.spawn(context.paths.cursorExePath, [], {
      cwd: context.paths.installDir,
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    console.log(`已启动 Cursor: ${context.paths.cursorExePath}`);
  }

  async function runApply(context) {
    const timer = stageTimerFactory({ label: 'Apply 耗时' });
    const applyCache = sessionCacheFactory({ readText, sha256OfFile, fs: fsRef });

    timer.start('01 检测安装与语言包');
    console.log('正在检测 Cursor 安装...');
    const installMetadata = loadInstallMetadata(context);
    console.log('正在查找语言包...');
    const languagePack = findLanguagePack(context.paths.userExtensionRoot);

    if (!languagePack) {
      throw new Error(
        '未找到官方简体中文语言包。请先在 Cursor 扩展市场安装 Chinese (Simplified) Language Pack。'
      );
    }

    const compatibility = compareLanguagePackVersion(
      languagePack.version,
      installMetadata.product.vscodeVersion
    );
    if (!compatibility.compatible) {
      throw new Error(
        `语言包 ${languagePack.version} 与 Cursor 内置 VS Code ${installMetadata.product.vscodeVersion} 不兼容，请先升级语言包。`
      );
    }
    timer.end();

    timer.start('02 备份与加载映射');
    const runtimeMode = context.options.runtimeMode;
    const existingManifest =
      !context.options.force && readJsonIfExists
        ? readJsonIfExists(toolPaths.buildManifestPath, null)
        : null;
    const reuseArtifacts =
      Boolean(existingManifest) &&
      typeof canReuseAppliedArtifacts === 'function' &&
      canReuseAppliedArtifacts(
        existingManifest,
        applyCache,
        context,
        fsRef,
        toolPaths,
        runtimeMode
      );

    let backupDir;
    if (reuseArtifacts && existingManifest?.backupDir) {
      backupDir = existingManifest.backupDir;
      console.log('输入未变化，跳过备份...');
    } else {
      console.log('正在创建备份...');
      backupDir = ensureBackup(context);
    }

    let mappingInfo;
    if (reuseArtifacts && createMappingInfoFromManifest) {
      mappingInfo = createMappingInfoFromManifest(existingManifest);
    } else {
      console.log('正在加载翻译映射...');
      mappingInfo = loadMergedMappings(context);
    }
    timer.end();

    let runtimeMappingsInfo;
    let staticTranslationResult;
    let staticPatchContractEvaluation;
    let translatedWorkbench;
    let cursorWinCoverage;
    let dynamicCoverage;
    let productTipsCoverage;
    let runtimeStrategy;
    let resolvedMappingInfo = mappingInfo;
    let nextPackage = installMetadata.pkg;
    const includeExperimentalRuntimeToggle = shouldIncludeExperimentalRuntimeToggle();

    if (reuseArtifacts) {
      timer.start('03-09 复用已有汉化产物');
      console.log('汉化输入未变化，复用已有产物...');
      resolvedMappingInfo = createMappingInfoFromManifest
        ? createMappingInfoFromManifest(existingManifest)
        : mappingInfo;
      runtimeMappingsInfo = {
        workbenchSource: applyCache.readTextCached(context.paths.workbenchOriginalPath),
        runtimeMappings: [],
      };
      staticTranslationResult = {
        translatedSource: '',
        contracts: existingManifest.staticPatchContracts || {},
      };
      staticPatchContractEvaluation = existingManifest.staticPatchContractEvaluation || {
        issues: [],
        warnings: [],
      };
      translatedWorkbench = {
        runtimeFootprint: {
          runtimeMappingCount: existingManifest.runtimeStrategy?.runtimeMappingCount ?? 0,
          runtimeHeaderChars: existingManifest.runtimeStrategy?.runtimeHeaderChars ?? 0,
          runtimeHeaderKB: existingManifest.runtimeStrategy?.runtimeHeaderKB ?? 0,
        },
        staticTranslationResult,
        contractEvaluation: staticPatchContractEvaluation,
      };
      cursorWinCoverage = existingManifest.cursorWinCoverage;
      dynamicCoverage = existingManifest.dynamicCoverage;
      productTipsCoverage = existingManifest.productTipsCoverage;
      runtimeStrategy = existingManifest.runtimeStrategy;
      timer.end();

      timer.start('06 写入 locale / bootstrap / package');
      console.log('正在写入启动器配置...');
      writeStartLauncherPath(context);
      console.log('正在写入区域设置...');
      writeLocaleFiles(context);
      console.log('正在写入翻译引导程序...');
      writeTranslatorBootstrap(context);
      nextPackage = patchPackageJsonMain(context, installMetadata.pkg);
      timer.end();
    } else {
      timer.start('03 构建运行时映射');
      console.log('正在构建运行时映射...');
      const workbenchSources = buildWorkbenchSources(context, applyCache);
      runtimeMappingsInfo = buildRuntimeMappingsInfo(context, mappingInfo, runtimeMode, {
        workbenchSources,
      });
      const runtimeConfig = buildRuntimeConfig(runtimeMode);
      const glassWorkbenchAvailable = hasGlassWorkbench(context);
      timer.end();

      timer.start('04-05 并行 static / main / NLS');
      console.log('正在并行应用静态翻译与 main / NLS 预检...');
      const preflightParallel = await parallelRunner({
        staticDesktop: () => {
          const desktopSource = workbenchSources[0].workbenchSource;
          const desktopIndex = workbenchSources[0].workbenchIndex;
          const result = applyStaticSourceTranslationsDetailed(
            desktopSource,
            mappingInfo.mergedMappings,
            desktopIndex
          );
          const evaluation = evaluatePatchContracts({
            runtimeMode,
            contracts: result.contracts,
          });
          if (evaluation.issues.length > 0) {
            throw new Error(evaluation.issues.join('\n'));
          }
          return { result, evaluation };
        },
        staticGlass: () => {
          if (!glassWorkbenchAvailable) {
            return { result: null, evaluation: { issues: [], warnings: [] } };
          }

          const glassSource = workbenchSources[1].workbenchSource;
          const glassIndex = workbenchSources[1].workbenchIndex;
          const result = applyStaticSourceTranslationsDetailed(
            glassSource,
            mappingInfo.mergedMappings,
            glassIndex
          );
          const evaluation = evaluatePatchContracts({
            runtimeMode,
            contracts: result.contracts,
          });
          if (evaluation.issues.length > 0) {
            throw new Error(evaluation.issues.join('\n'));
          }
          return { result, evaluation };
        },
        main: () =>
          buildTranslatedMainText(
            applyCache.readTextCached(context.paths.mainOriginalPath),
            mappingInfo.mergedMappings
          ),
        nls: () =>
          buildTranslatedNlsMessagesPayload(context, languagePack, mappingInfo.mergedMappings),
      });
      staticTranslationResult = preflightParallel.staticDesktop.result;
      staticPatchContractEvaluation = mergeContractEvaluations(
        preflightParallel.staticDesktop.evaluation,
        preflightParallel.staticGlass.evaluation
      );
      const glassStaticTranslationResult = preflightParallel.staticGlass.result;
      const preflightMainText = preflightParallel.main;
      const preflightNlsMessages = preflightParallel.nls;
      timer.end();

      timer.start('06 写入 locale / bootstrap / package');
      console.log('正在写入启动器配置...');
      writeStartLauncherPath(context);
      console.log('正在写入区域设置...');
      writeLocaleFiles(context);
      console.log('正在写入翻译引导程序...');
      writeTranslatorBootstrap(context);
      nextPackage = patchPackageJsonMain(context, installMetadata.pkg);
      timer.end();

      timer.start('07-08 并行 main / NLS 产物 / Workbench Bundle');
      console.log('正在并行生成 main / NLS 产物与 Workbench Bundle...');
      const artifactParallel = await parallelRunner({
        main: () =>
          generateTranslatedMain(context, mappingInfo.mergedMappings, preflightMainText),
        nls: () =>
          generateTranslatedNlsMessages(
            context,
            languagePack,
            mappingInfo.mergedMappings,
            preflightNlsMessages
          ),
        workbenchDesktop: () =>
          generateTranslatedWorkbench(
            context,
            {
              version: nextPackage.version,
              distro: nextPackage.distro,
              generatedAt: new Date().toISOString(),
              mappingCount: mappingInfo.mergedMappings.length,
              runtimeMappingCount: runtimeMappingsInfo.runtimeMappings.length,
              runtimeConfig,
              ...(includeExperimentalRuntimeToggle
                ? {
                    experimentalRuntimeToggleEnabled: true,
                    toggleSignalPath: toolPaths.toggleSignalPath,
                  }
                : {}),
            },
            mappingInfo.mergedMappings,
            runtimeMappingsInfo.runtimeMappings,
            workbenchSources[0].workbenchSource,
            staticTranslationResult,
            staticPatchContractEvaluation
          ),
        workbenchGlass: () =>
          glassWorkbenchAvailable && generateTranslatedGlassWorkbench
            ? generateTranslatedGlassWorkbench(
                context,
                {
                  version: nextPackage.version,
                  distro: nextPackage.distro,
                  generatedAt: new Date().toISOString(),
                  mappingCount: mappingInfo.mergedMappings.length,
                  runtimeMappingCount: runtimeMappingsInfo.runtimeMappings.length,
                  runtimeConfig,
                  ...(includeExperimentalRuntimeToggle
                    ? {
                        experimentalRuntimeToggleEnabled: true,
                        toggleSignalPath: toolPaths.toggleSignalPath,
                      }
                    : {}),
                },
                mappingInfo.mergedMappings,
                runtimeMappingsInfo.runtimeMappings,
                workbenchSources[1].workbenchSource,
                glassStaticTranslationResult,
                staticPatchContractEvaluation
              )
            : null,
      });
      translatedWorkbench = artifactParallel.workbenchDesktop;
      if (glassWorkbenchAvailable && artifactParallel.workbenchGlass) {
        console.log('已生成 Glass workbench 汉化 bundle。');
      }
      timer.end();

      timer.start('09 扩展翻译');
      console.log('正在写入扩展翻译文件...');
      writeExtensionTranslationFiles(context);
      productTipsCoverage = buildProductTipsCoverage(mappingInfo.mergedMappings);
      runtimeStrategy = buildRuntimeStrategyReport(
        mappingInfo,
        runtimeMappingsInfo.runtimeMappings,
        translatedWorkbench.runtimeFootprint,
        runtimeMode
      );
      cursorWinCoverage = DEFERRED_CURSOR_WIN_COVERAGE;
      dynamicCoverage = DEFERRED_DYNAMIC_COVERAGE;
      console.log('覆盖率分析已 defer 至 verify');
      timer.end();
    }

    timer.start('10 写入 manifest / 快捷方式');
    console.log('正在生成构建清单...');
    const manifest = buildManifest(
      context,
      { pkg: nextPackage, product: installMetadata.product },
      languagePack,
      resolvedMappingInfo,
      backupDir,
      cursorWinCoverage,
      dynamicCoverage,
      productTipsCoverage,
      runtimeStrategy,
      translatedWorkbench.staticTranslationResult.contracts,
      translatedWorkbench.contractEvaluation,
      applyCache
    );
    if (cursorWinCoverage?.deferred) {
      manifest.coverageDeferred = true;
    }
    writeManifest(manifest);

    for (const warning of translatedWorkbench.contractEvaluation.warnings) {
      console.log(`Warning: ${warning}`);
    }

    printStaticPatchContracts(translatedWorkbench.staticTranslationResult.contracts);
    console.log(`Product tips total: ${productTipsCoverage.totalTipCount}`);
    console.log(`Product tips mapped: ${productTipsCoverage.mappedTipCount}`);
    console.log(`Product tips missing: ${productTipsCoverage.missingTips.length}`);

    let shortcutPath = null;
    if (!context.options.noShortcut) {
      shortcutPath = createDesktopShortcut(context);
    }
    timer.end();
    timer.printSummary();

    console.log(`已完成应用，备份目录：${backupDir}`);
    console.log(`基础翻译条目：${resolvedMappingInfo.baseMappings.length}`);
    console.log(`零散覆盖条目：${resolvedMappingInfo.overlayMappings.length}`);
    console.log(`Cursor Win 常用页条目：${resolvedMappingInfo.cursorWinCommonMappings.length}`);
    console.log(`Cursor Win 动态规则条目：${resolvedMappingInfo.dynamicMappings.length}`);
    console.log(`合并后翻译条目：${resolvedMappingInfo.mergedMappings.length}`);
    if (cursorWinCoverage?.deferred) {
      console.log('Cursor Win 覆盖率：已 defer 至 verify');
      console.log('动态规则覆盖率：已 defer 至 verify');
    } else {
      console.log(`Cursor Win 命中 bundle：${cursorWinCoverage.bundleTargetCount}`);
      console.log(`Cursor Win 缺失关键词：${cursorWinCoverage.missingTargets.length}`);
      console.log(`动态规则命中 bundle：${dynamicCoverage.bundleRuleCount}`);
      console.log(`动态规则缺失：${dynamicCoverage.missingRules.length}`);
    }
    console.log(`运行模式：${runtimeStrategy.mode}`);
    console.log(`Runtime mapping count: ${runtimeStrategy.runtimeMappingCount}`);
    console.log(`Runtime header chars: ${runtimeStrategy.runtimeHeaderChars}`);
    console.log(`Runtime header KB: ${runtimeStrategy.runtimeHeaderKB}`);
    console.log(`Pruned from runtime: ${runtimeStrategy.prunedMappingCount}`);
    if (includeExperimentalRuntimeToggle) {
      console.log('实验性 runtime toggle 注入：已启用');
    }
    if (shortcutPath) {
      console.log(`已创建桌面快捷方式：${shortcutPath}`);
    }

    const cacheResult = clearExtensionCache();
    if (cacheResult.removed.length > 0) {
      console.log(
        `已清理 Cursor 扩展缓存目录（${cacheResult.removed.length} 个），避免「Extensions have been modified on disk」循环弹窗。`
      );
    }

    return manifest;
  }

  function runVerify(context) {
    const installMetadata = loadInstallMetadata(context);
    const languagePack = findLanguagePack(context.paths.userExtensionRoot);
    const result = verifyState(context, installMetadata, languagePack);
    printReport('Cursor 汉化状态', result);
    printCursorWinCoverage(result.cursorWinCoverage);
    printDynamicCoverage(result.dynamicCoverage);
    printProductTipsCoverage(result.productTipsCoverage);
    printStaticPatchContracts(result.staticPatchContracts);
    printRuntimeStrategy(result.runtimeStrategy);
    console.log(`Runtime mapping count: ${result.runtimeStrategy.runtimeMappingCount}`);
    console.log(`Runtime header chars: ${result.runtimeStrategy.runtimeHeaderChars}`);
    console.log(`Runtime header KB: ${result.runtimeStrategy.runtimeHeaderKB}`);
    console.log(`Pruned from runtime: ${result.runtimeStrategy.prunedMappingCount}`);

    if (fsRef.existsSync(toolPaths.buildManifestPath)) {
      const manifest = readJson(toolPaths.buildManifestPath);
      console.log('\n[最近一次构建]');
      console.log(`  - 时间: ${manifest.generatedAt}`);
      console.log(`  - Cursor 版本: ${manifest.cursorVersion}`);
      console.log(`  - VS Code 内核: ${manifest.vscodeVersion}`);
      console.log(`  - 合并后翻译条目: ${manifest.mappingCounts?.merged ?? 'unknown'}`);
      console.log(
        `  - Cursor Win 条目: ${manifest.mappingCounts?.cursorWinCommon ?? 'unknown'}`
      );
      console.log(`  - 动态规则条目: ${manifest.mappingCounts?.dynamic ?? 'unknown'}`);
      console.log(`  - 观察范围选择器: ${manifest.mappingCounts?.scopeSelectors ?? 'unknown'}`);
    }

    if (result.issues.length > 0) {
      process.exitCode = 1;
    }
  }

  async function runEnsure(context) {
    const installMetadata = loadInstallMetadata(context);
    const languagePack = findLanguagePack(context.paths.userExtensionRoot);
    const verification = verifyState(context, installMetadata, languagePack);
    const summaryOnly = context.options.summaryOnly !== false;

    if (verification.issues.length === 0 && !context.options.force) {
      printReport('Cursor 汉化状态', verification);
      if (!summaryOnly) {
        printCursorWinCoverage(verification.cursorWinCoverage);
        printDynamicCoverage(verification.dynamicCoverage);
        printProductTipsCoverage(verification.productTipsCoverage);
        printStaticPatchContracts(verification.staticPatchContracts);
        printRuntimeStrategy(verification.runtimeStrategy);
      }
      console.log('\n无需重新应用，当前状态已满足要求。');
      return;
    }

    console.log('\n检测到需要修复的项目，开始自动重建汉化层...');
    await runApply(context);
  }

  return {
    runApply,
    runVerify,
    runEnsure,
    runStart,
  };
}

module.exports = {
  createCommandsModule,
};
