const fs = require('fs');
const childProcess = require('child_process');

function createCommandsModule({
  toolPaths,
  fs: fsModule,
  readText,
  readJson,
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
  writeExtensionTranslationFiles,
  buildCursorWinCoverage,
  buildDynamicCoverage,
  buildProductTipsCoverage,
  defaultCursorWinDynamicMappings,
  buildRuntimeStrategyReport,
  buildManifest,
  writeManifest,
  createDesktopShortcut,
  verifyState,
  printReport,
  printCursorWinCoverage,
  printDynamicCoverage,
  printProductTipsCoverage,
  printStaticPatchContracts,
  printRuntimeStrategy,
}) {
  const fsRef = fsModule || fs;

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

  function runApply(context) {
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

    console.log('正在创建备份...');
    const backupDir = ensureBackup(context);
    console.log('正在加载翻译映射...');
    const mappingInfo = loadMergedMappings(context);
    const runtimeMode = context.options.runtimeMode;
    console.log('正在构建运行时映射...');
    const runtimeMappingsInfo = buildRuntimeMappingsInfo(context, mappingInfo, runtimeMode);
    const runtimeConfig = buildRuntimeConfig(runtimeMode);
    const includeExperimentalRuntimeToggle = shouldIncludeExperimentalRuntimeToggle();
    console.log('正在应用静态翻译（Workbench Bundle）...');
    const staticTranslationResult = applyStaticSourceTranslationsDetailed(
      runtimeMappingsInfo.workbenchSource,
      mappingInfo.mergedMappings
    );
    const staticPatchContractEvaluation = evaluatePatchContracts({
      runtimeMode,
      contracts: staticTranslationResult.contracts,
    });

    if (staticPatchContractEvaluation.issues.length > 0) {
      throw new Error(staticPatchContractEvaluation.issues.join('\n'));
    }

    console.log('正在翻译主进程入口...');
    const preflightMainText = buildTranslatedMainText(
      readText(context.paths.mainOriginalPath),
      mappingInfo.mergedMappings
    );
    console.log('正在翻译 NLS 消息...');
    const preflightNlsMessages = buildTranslatedNlsMessagesPayload(
      context,
      languagePack,
      mappingInfo.mergedMappings
    );

    console.log('正在写入启动器配置...');
    writeStartLauncherPath(context);
    console.log('正在写入区域设置...');
    writeLocaleFiles(context);
    console.log('正在写入翻译引导程序...');
    writeTranslatorBootstrap(context);
    const nextPackage = patchPackageJsonMain(context, installMetadata.pkg);
    console.log('正在生成翻译后的主进程文件...');
    generateTranslatedMain(context, mappingInfo.mergedMappings, preflightMainText);
    console.log('正在生成翻译后的 NLS 消息文件...');
    generateTranslatedNlsMessages(
      context,
      languagePack,
      mappingInfo.mergedMappings,
      preflightNlsMessages
    );

    console.log('正在生成翻译后的 Workbench Bundle...');
    const translatedWorkbench = generateTranslatedWorkbench(
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
      runtimeMappingsInfo.workbenchSource,
      staticTranslationResult,
      staticPatchContractEvaluation
    );

    console.log('正在写入扩展翻译文件...');
    writeExtensionTranslationFiles(context);
    console.log('正在分析覆盖率...');
    const cursorWinCoverage = buildCursorWinCoverage(context, mappingInfo.mergedMappings);
    const dynamicCoverage = buildDynamicCoverage(
      context,
      mappingInfo.dynamicMappings,
      defaultCursorWinDynamicMappings()
    );
    const productTipsCoverage = buildProductTipsCoverage(mappingInfo.mergedMappings);
    const runtimeStrategy = buildRuntimeStrategyReport(
      mappingInfo,
      runtimeMappingsInfo.runtimeMappings,
      translatedWorkbench.runtimeFootprint,
      runtimeMode
    );

    console.log('正在生成构建清单...');
    const manifest = buildManifest(
      context,
      { pkg: nextPackage, product: installMetadata.product },
      languagePack,
      mappingInfo,
      backupDir,
      cursorWinCoverage,
      dynamicCoverage,
      productTipsCoverage,
      runtimeStrategy,
      translatedWorkbench.staticTranslationResult.contracts,
      translatedWorkbench.contractEvaluation
    );
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

    console.log(`已完成应用，备份目录：${backupDir}`);
    console.log(`基础翻译条目：${mappingInfo.baseMappings.length}`);
    console.log(`零散覆盖条目：${mappingInfo.overlayMappings.length}`);
    console.log(`Cursor Win 常用页条目：${mappingInfo.cursorWinCommonMappings.length}`);
    console.log(`Cursor Win 动态规则条目：${mappingInfo.dynamicMappings.length}`);
    console.log(`合并后翻译条目：${mappingInfo.mergedMappings.length}`);
    console.log(`Cursor Win 命中 bundle：${cursorWinCoverage.bundleTargetCount}`);
    console.log(`Cursor Win 缺失关键词：${cursorWinCoverage.missingTargets.length}`);
    console.log(`动态规则命中 bundle：${dynamicCoverage.bundleRuleCount}`);
    console.log(`动态规则缺失：${dynamicCoverage.missingRules.length}`);
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

  function runEnsure(context) {
    const installMetadata = loadInstallMetadata(context);
    const languagePack = findLanguagePack(context.paths.userExtensionRoot);
    const verification = verifyState(context, installMetadata, languagePack);

    if (verification.issues.length === 0 && !context.options.force) {
      printReport('Cursor 汉化状态', verification);
      printCursorWinCoverage(verification.cursorWinCoverage);
      printDynamicCoverage(verification.dynamicCoverage);
      printProductTipsCoverage(verification.productTipsCoverage);
      printStaticPatchContracts(verification.staticPatchContracts);
      printRuntimeStrategy(verification.runtimeStrategy);
      console.log('\n无需重新应用，当前状态已满足要求。');
      return;
    }

    console.log('\n检测到需要修复的项目，开始自动重建汉化层...');
    runApply(context);
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
