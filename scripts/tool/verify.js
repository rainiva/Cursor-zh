const fs = require('fs');

function createVerifyModule({
  toolPaths,
  fs: fsModule,
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
  summarizeStaticPatchContractsFromTranslatedSource,
  evaluatePatchContracts,
  summarizeRuntimeFootprint,
  isTranslatorBootstrapSource,
}) {
  const fsRef = fsModule || fs;

  function verifyState(context, installMetadata, languagePack) {
    const packageJson = installMetadata.pkg;
    const issues = [];
    const info = [];
    const warnings = [];

    if (!languagePack) {
      issues.push('未找到官方简体中文语言包扩展。');
    } else {
      const compatibility = compareLanguagePackVersion(
        languagePack.version,
        installMetadata.product.vscodeVersion
      );
      if (!compatibility.compatible) {
        issues.push(
          `语言包版本 ${languagePack.version} 与 Cursor 内置 VS Code ${installMetadata.product.vscodeVersion} 不兼容。`
        );
      } else {
        info.push(
          `语言包 ${languagePack.version} 与 Cursor 内置 VS Code ${installMetadata.product.vscodeVersion} 兼容。`
        );
      }
    }

    const argvConfig = readArgvConfig(context.paths.argvPath);
    if (argvConfig.locale !== 'zh-cn') {
      issues.push('argv.json 中的 locale 不是 zh-cn。');
    } else {
      info.push('argv.json 已设置为 zh-cn。');
    }

    if (packageJson.main !== './out/cursorTranslatorMain.js') {
      issues.push('resources/app/package.json 入口未指向汉化 bootstrap。');
    } else {
      info.push('package.json 已指向 cursorTranslatorMain.js。');
    }

    if (!fsRef.existsSync(context.paths.translatorBootstrapPath)) {
      issues.push('缺少 cursorTranslatorMain.js。');
    } else if (!isTranslatorBootstrapSource(readText(context.paths.translatorBootstrapPath))) {
      issues.push('cursorTranslatorMain.js 存在，但不是当前生成器写入的 bootstrap。');
    } else {
      info.push('cursorTranslatorMain.js 存在且为当前 bootstrap。');
    }

    if (!fsRef.existsSync(context.paths.mainTranslatedPath)) {
      issues.push('缺少 main_translated.js。');
    } else {
      info.push('translated main 文件已生成。');
      if (
        fsRef.existsSync(toolPaths.generatedMainPath) &&
        sha256OfFile(context.paths.mainTranslatedPath) !== sha256OfFile(toolPaths.generatedMainPath)
      ) {
        issues.push('已安装的 main_translated.js 与当前生成产物不一致。');
      }
    }

    if (!fsRef.existsSync(toolPaths.generatedNlsMessagesPath)) {
      issues.push('缺少生成的 nls.messages 文件。');
    } else if (
      sha256OfFile(context.paths.nlsMessagesPath) !== sha256OfFile(toolPaths.generatedNlsMessagesPath)
    ) {
      issues.push('nls.messages.json 未同步到当前生成产物。');
    } else {
      info.push('translated nls 消息文件已生成。');
    }

    if (!fsRef.existsSync(context.paths.workbenchTranslatedPath)) {
      issues.push('缺少 workbench.desktop.main_translated.js。');
    } else {
      const translatedText = readText(context.paths.workbenchTranslatedPath);
      if (!translatedText.includes('Cursor ZH generated runtime')) {
        issues.push('translated workbench 文件存在，但不是当前生成器写入的产物。');
      } else {
        info.push('translated workbench 文件已生成。');
      }
      if (
        fsRef.existsSync(toolPaths.generatedWorkbenchPath) &&
        sha256OfFile(context.paths.workbenchTranslatedPath) !==
          sha256OfFile(toolPaths.generatedWorkbenchPath)
      ) {
        issues.push('已安装的 workbench.desktop.main_translated.js 与当前生成产物不一致。');
      }
    }

    if (!fsRef.existsSync(toolPaths.baseMappingPath)) {
      issues.push('基础翻译源不存在。');
    } else {
      info.push('基础翻译源存在。');
    }

    const mappingInfo = loadMergedMappings(context, {
      seed: false,
      persistBaseMappings: false,
    });
    if (!fsRef.existsSync(toolPaths.overlayMappingPath)) {
      issues.push('覆盖翻译源不存在。');
    } else {
      info.push('覆盖翻译源存在。');
    }
    if (!fsRef.existsSync(toolPaths.cursorWinCommonPath)) {
      issues.push('Cursor Win 常用页面覆盖源不存在。');
    } else {
      info.push('Cursor Win 常用页面覆盖源存在。');
    }
    if (!fsRef.existsSync(toolPaths.dynamicMappingPath)) {
      issues.push('Cursor Win 动态规则覆盖源不存在。');
    } else {
      info.push('Cursor Win 动态规则覆盖源存在。');
    }

    const runtimeMode = detectAppliedRuntimeMode(context);
    const runtimeMappingsInfo = buildRuntimeMappingsInfo(context, mappingInfo, runtimeMode);
    const cursorWinCoverage = buildCursorWinCoverage(context, mappingInfo.mergedMappings);
    const dynamicCoverage = buildDynamicCoverage(
      context,
      mappingInfo.dynamicMappings,
      defaultCursorWinDynamicMappings()
    );
    const productTipsCoverage = buildProductTipsCoverage(mappingInfo.mergedMappings);
    const installedRuntimeArtifact = fsRef.existsSync(context.paths.workbenchTranslatedPath)
      ? parseInstalledRuntimeArtifact(readText(context.paths.workbenchTranslatedPath))
      : null;
    const runtimeFootprint = installedRuntimeArtifact
      ? {
          runtimeMappingCount: installedRuntimeArtifact.runtimeStrategy.runtimeMappingCount,
          runtimeHeaderChars: installedRuntimeArtifact.runtimeStrategy.runtimeHeaderChars,
          runtimeHeaderKB: installedRuntimeArtifact.runtimeStrategy.runtimeHeaderKB,
        }
      : summarizeRuntimeFootprint('', '', runtimeMappingsInfo.runtimeMappings);
    const runtimeStrategy = buildRuntimeStrategyReport(
      mappingInfo,
      installedRuntimeArtifact?.runtimeMappings ?? runtimeMappingsInfo.runtimeMappings,
      runtimeFootprint,
      installedRuntimeArtifact?.runtimeStrategy?.mode ?? runtimeMode
    );
    const staticPatchContracts = installedRuntimeArtifact
      ? summarizeStaticPatchContractsFromTranslatedSource(
          installedRuntimeArtifact.translatedSourceText
        )
      : {};
    const staticPatchContractEvaluation = evaluatePatchContracts({
      runtimeMode: installedRuntimeArtifact?.runtimeStrategy?.mode ?? runtimeMode,
      contracts: staticPatchContracts,
    });

    if (productTipsCoverage.missingTips.length > 0) {
      warnings.push('Product tips coverage is missing maintained targets.');
    }

    if (!cursorWinCoverage.sourceAvailable) {
      warnings.push('无法读取 workbench 原始 bundle，未执行 Cursor Win 覆盖检查。');
    } else if (cursorWinCoverage.missingTargets.length > 0) {
      warnings.push('Cursor Win 常用页面仍有未覆盖关键词。');
    }

    if (!dynamicCoverage.sourceAvailable) {
      warnings.push('无法读取 workbench 原始 bundle，未执行动态规则覆盖检查。');
    } else if (dynamicCoverage.missingRules.length > 0) {
      warnings.push('仍有动态规则未命中当前 bundle。');
    }

    warnings.push(...staticPatchContractEvaluation.warnings);
    issues.push(...staticPatchContractEvaluation.issues);

    return {
      issues,
      info,
      warnings,
      cursorWinCoverage,
      dynamicCoverage,
      productTipsCoverage,
      staticPatchContracts,
      staticPatchContractEvaluation,
      runtimeStrategy,
      mappingInfo,
    };
  }

  return {
    verifyState,
  };
}

module.exports = {
  createVerifyModule,
};
