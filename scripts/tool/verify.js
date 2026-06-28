const fs = require('fs');
const path = require('path');

const {
  hasUnsuppressedExtensionCacheReloadPrompt,
} = require('../lib/patcher/extension-cache-prompt-guard.js');
const { inspectMarketplaceWorkbenchPatches } = require('../lib/patcher/marketplace-map-hook-guard.js');
const {
  walkWorkbenchTranslatedRelativePaths,
} = require('../lib/install/managed-install-artifacts.js');
const { NLS_BACKUP_RELATIVE } = require('../lib/install/validate-backup.js');
const {
  findLanguagePackCacheMessagePaths: defaultFindLanguagePackCacheMessagePaths,
} = require('./language-pack-cache.js');

function createVerifyModule({
  toolPaths,
  fs: fsModule,
  env = process.env,
  getManagedExtensionTranslationFiles = () => [],
  findLanguagePackCacheMessagePaths = defaultFindLanguagePackCacheMessagePaths,
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
  createBootstrapSource,
  createStageTimer,
  createSessionCache,
  canReuseManifestCoverage,
  canReuseManifestStaticContracts,
  createMappingInfoFromManifest,
  writeManifest,
  runParallelTasksSync,
  createCoverageWorkbenchContext,
}) {
  const fsRef = fsModule || fs;
  const parallelRunner =
    runParallelTasksSync ||
    ((taskMap) => {
      const results = {};
      for (const [key, task] of Object.entries(taskMap)) {
        results[key] = task();
      }
      return results;
    });
  const buildCoverageContext =
    createCoverageWorkbenchContext ||
    ((workbenchSource, workbenchIndex) => {
      const { createCoverageWorkbenchContext: factory } = require('../lib/analyzer/workbench-coverage-context.js');
      return factory(workbenchSource, workbenchIndex);
    });
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
      readTextPrefix: () => '',
      sha256Cached: (filePath) => (deps.sha256OfFile || sha256OfFile)(filePath),
      filesEqualByHash: (pathA, pathB) => {
        if (!pathA || !pathB) {
          return false;
        }
        return (deps.sha256OfFile || sha256OfFile)(pathA) === (deps.sha256OfFile || sha256OfFile)(pathB);
      },
    }));

  function verifyState(context, installMetadata, languagePack, options = {}) {
    const manifest = readJsonIfExists(toolPaths.buildManifestPath, null);
    const timer = stageTimerFactory({ label: 'Verify 耗时' });
    const cache = sessionCacheFactory({ readText, sha256OfFile, fs: fsRef, manifest });
    const packageJson = installMetadata.pkg;
    const issues = [];
    const info = [];
    const warnings = [];
    let reuseCoverage = false;
    let reuseStaticContracts = false;

    timer.start('01 安装与 locale 检查');
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
    timer.end();

    timer.start('02 bootstrap / main 检查');
    if (!fsRef.existsSync(context.paths.translatorBootstrapPath)) {
      issues.push('缺少 cursorTranslatorMain.js。');
    } else {
      const installedBootstrapText = readText(context.paths.translatorBootstrapPath);
      if (!isTranslatorBootstrapSource(installedBootstrapText)) {
        issues.push('cursorTranslatorMain.js 存在，但不是当前生成器写入的 bootstrap。');
      } else if (typeof createBootstrapSource === 'function') {
        const expectedBootstrapText = createBootstrapSource({
          resourcesAppDir: context.paths.resourcesAppDir,
          packageType: packageJson.type,
        });
        if (installedBootstrapText !== expectedBootstrapText) {
          issues.push('已安装的 cursorTranslatorMain.js 与当前生成 bootstrap 不一致。');
        } else {
          info.push('cursorTranslatorMain.js 存在且为当前 bootstrap。');
        }
      } else {
        info.push('cursorTranslatorMain.js 存在且为当前 bootstrap。');
      }
    }

    if (!fsRef.existsSync(context.paths.mainTranslatedPath)) {
      issues.push('缺少 main_translated.js。');
    } else {
      info.push('translated main 文件已生成。');
      if (
        fsRef.existsSync(toolPaths.generatedMainPath) &&
        !cache.filesEqualByHash(
          context.paths.mainTranslatedPath,
          toolPaths.generatedMainPath,
          'mainTranslated',
          'generatedMain'
        )
      ) {
        issues.push('已安装的 main_translated.js 与当前生成产物不一致。');
      }
    }
    timer.end();

    timer.start('03 NLS / workbench 哈希检查');
    if (!fsRef.existsSync(toolPaths.generatedNlsMessagesPath)) {
      issues.push('缺少生成的 nls.messages 文件。');
    } else if (
      !cache.filesEqualByHash(
        context.paths.nlsMessagesPath,
        toolPaths.generatedNlsMessagesPath,
        'nlsMessages',
        'generatedNlsMessages'
      )
    ) {
      issues.push('nls.messages.json 未同步到当前生成产物。');
    } else {
      info.push('translated nls 消息文件已生成。');
    }

    let installedRuntimeArtifact = null;
    let translatedWorkbenchText = null;
    if (!fsRef.existsSync(context.paths.workbenchTranslatedPath)) {
      issues.push('缺少 workbench.desktop.main_translated.js。');
    } else {
      const headerOk = hasInstalledRuntimeHeader
        ? hasInstalledRuntimeHeader(context.paths.workbenchTranslatedPath, cache.readTextPrefix)
        : cache.readTextPrefix(context.paths.workbenchTranslatedPath, 256).includes(
            'Cursor ZH generated runtime'
          );
      if (!headerOk) {
        issues.push('translated workbench 文件存在，但不是当前生成器写入的产物。');
      } else {
        info.push('translated workbench 文件已生成。');
        translatedWorkbenchText = cache.readTextCached(context.paths.workbenchTranslatedPath);
        installedRuntimeArtifact = parseInstalledRuntimeArtifact(translatedWorkbenchText);
        if (hasUnsuppressedExtensionCacheReloadPrompt(translatedWorkbenchText)) {
          issues.push(
            '已安装的 workbench.desktop.main_translated.js 仍包含「扩展在磁盘上已被修改」弹窗逻辑，请重新运行 apply。'
          );
        }
        const desktopMarketplaceReport = inspectMarketplaceWorkbenchPatches(translatedWorkbenchText);
        if (!desktopMarketplaceReport.skipped && !desktopMarketplaceReport.ok) {
          issues.push(...desktopMarketplaceReport.issues);
        }
      }

      if (
        fsRef.existsSync(toolPaths.generatedWorkbenchPath) &&
        !cache.filesEqualByHash(
          context.paths.workbenchTranslatedPath,
          toolPaths.generatedWorkbenchPath,
          'workbenchTranslated',
          'generatedWorkbench'
        )
      ) {
        issues.push('已安装的 workbench.desktop.main_translated.js 与当前生成产物不一致。');
      }
    }

    if (
      context.paths.workbenchGlassOriginalPath &&
      fsRef.existsSync(context.paths.workbenchGlassOriginalPath)
    ) {
      if (!fsRef.existsSync(context.paths.workbenchGlassTranslatedPath)) {
        issues.push('缺少 workbench.glass.main_translated.js。');
      } else {
        const glassHeaderOk = hasInstalledRuntimeHeader
          ? hasInstalledRuntimeHeader(
              context.paths.workbenchGlassTranslatedPath,
              cache.readTextPrefix
            )
          : cache
              .readTextPrefix(context.paths.workbenchGlassTranslatedPath, 256)
              .includes('Cursor ZH generated runtime');
        if (!glassHeaderOk) {
          issues.push('translated glass workbench 文件存在，但不是当前生成器写入的产物。');
        } else {
          info.push('translated glass workbench 文件已生成。');
          const glassWorkbenchText = cache.readTextCached(
            context.paths.workbenchGlassTranslatedPath
          );
          if (hasUnsuppressedExtensionCacheReloadPrompt(glassWorkbenchText)) {
            issues.push(
              '已安装的 workbench.glass.main_translated.js 仍包含「扩展在磁盘上已被修改」弹窗逻辑，请重新运行 apply。'
            );
          }
          const glassMarketplaceReport = inspectMarketplaceWorkbenchPatches(glassWorkbenchText);
          if (!glassMarketplaceReport.skipped && !glassMarketplaceReport.ok) {
            issues.push(...glassMarketplaceReport.issues);
          }
        }

        if (
          fsRef.existsSync(toolPaths.generatedGlassWorkbenchPath) &&
          !cache.filesEqualByHash(
            context.paths.workbenchGlassTranslatedPath,
            toolPaths.generatedGlassWorkbenchPath,
            'workbenchGlassTranslated',
            'generatedGlassWorkbench'
          )
        ) {
          issues.push('已安装的 workbench.glass.main_translated.js 与当前生成产物不一致。');
        }
      }
    }
    timer.end();

    timer.start('04 翻译源检查');
    reuseCoverage = canReuseManifestCoverage
      ? canReuseManifestCoverage(manifest, cache, context, fsRef, toolPaths)
      : false;

    if (!fsRef.existsSync(toolPaths.baseMappingPath)) {
      issues.push('基础翻译源不存在。');
    } else {
      info.push('基础翻译源存在。');
    }

    const mappingInfo =
      reuseCoverage && createMappingInfoFromManifest
        ? createMappingInfoFromManifest(manifest)
        : loadMergedMappings(context, {
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
    timer.end();

    timer.start('05 覆盖率分析');
    let cursorWinCoverage;
    let dynamicCoverage;
    let productTipsCoverage;
    let workbenchOriginalSource = '';
    let runtimeMappingsInfo = null;

    const runtimeMode = detectAppliedRuntimeMode(context, {
      installedRuntimeArtifact,
      translatedWorkbenchText,
    });

    if (reuseCoverage) {
      cursorWinCoverage = manifest.cursorWinCoverage;
      dynamicCoverage = manifest.dynamicCoverage;
      productTipsCoverage = manifest.productTipsCoverage;
      info.push('覆盖率结果已从最近一次构建 manifest 复用。');
    } else {
      if (installedRuntimeArtifact) {
        workbenchOriginalSource = fsRef.existsSync(context.paths.workbenchOriginalPath)
          ? cache.readTextCached(context.paths.workbenchOriginalPath)
          : '';
        runtimeMappingsInfo = {
          workbenchSource: workbenchOriginalSource,
          runtimeMappings: installedRuntimeArtifact.runtimeMappings,
        };
      } else {
        workbenchOriginalSource = fsRef.existsSync(context.paths.workbenchOriginalPath)
          ? cache.readTextCached(context.paths.workbenchOriginalPath)
          : '';
        runtimeMappingsInfo = buildRuntimeMappingsInfo(context, mappingInfo, runtimeMode, {
          workbenchSource: workbenchOriginalSource,
        });
        workbenchOriginalSource = runtimeMappingsInfo.workbenchSource;
      }

      const coverageContext = buildCoverageContext(
        runtimeMappingsInfo.workbenchSource,
        runtimeMappingsInfo.workbenchIndex
      );
      const coverageOptions = {
        workbenchSource: runtimeMappingsInfo.workbenchSource,
        workbenchIndex: runtimeMappingsInfo.workbenchIndex,
        coverageContext,
      };
      const coverageResults = parallelRunner({
        cursorWin: () =>
          buildCursorWinCoverage(context, mappingInfo.mergedMappings, coverageOptions),
        dynamic: () =>
          buildDynamicCoverage(
            context,
            mappingInfo.dynamicMappings,
            defaultCursorWinDynamicMappings(),
            coverageOptions
          ),
        productTips: () => buildProductTipsCoverage(mappingInfo.mergedMappings),
      });
      cursorWinCoverage = coverageResults.cursorWin;
      dynamicCoverage = coverageResults.dynamic;
      productTipsCoverage = coverageResults.productTips;

      if (writeManifest && manifest) {
        writeManifest({
          ...manifest,
          cursorWinCoverage,
          dynamicCoverage,
          productTipsCoverage,
          coverageDeferred: false,
        });
        info.push('覆盖率结果已写回 manifest，后续 verify 将直接复用。');
      }
    }
    timer.end();

    timer.start('06 运行时策略与静态合约');
    reuseStaticContracts = canReuseManifestStaticContracts
      ? canReuseManifestStaticContracts(manifest, cache, context)
      : false;

    if (!runtimeMappingsInfo) {
      if (!workbenchOriginalSource && fsRef.existsSync(context.paths.workbenchOriginalPath)) {
        workbenchOriginalSource = cache.readTextCached(context.paths.workbenchOriginalPath);
      }

      runtimeMappingsInfo = installedRuntimeArtifact
        ? {
            workbenchSource: workbenchOriginalSource,
            runtimeMappings: installedRuntimeArtifact.runtimeMappings,
          }
        : buildRuntimeMappingsInfo(context, mappingInfo, runtimeMode, {
            workbenchSource: workbenchOriginalSource,
          });
    }
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

    let staticPatchContracts;
    let staticPatchContractEvaluation;
    if (reuseStaticContracts) {
      staticPatchContracts = manifest.staticPatchContracts || {};
      staticPatchContractEvaluation = manifest.staticPatchContractEvaluation || {
        issues: [],
        warnings: [],
      };
      info.push('静态合约结果已从最近一次构建 manifest 复用。');
    } else {
      staticPatchContracts = installedRuntimeArtifact
        ? summarizeStaticPatchContractsFromTranslatedSource(
            installedRuntimeArtifact.translatedSourceText,
            workbenchOriginalSource || ''
          )
        : {};
      staticPatchContractEvaluation = evaluatePatchContracts({
        runtimeMode: installedRuntimeArtifact?.runtimeStrategy?.mode ?? runtimeMode,
        contracts: staticPatchContracts,
      });
    }
    timer.end();

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

    const timing =
      options.profile === false || options.summaryOnly ? null : timer.printSummary();

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
      timing,
    };
  }

  function verifyCleanState(context, installMetadata, options = {}) {
    const { backupDir, backupMetadata } = options;
    const issues = [];
    const info = [];
    const warnings = [];
    const packageJson = installMetadata.pkg;

    if (packageJson.main !== './out/main.js') {
      issues.push('resources/app/package.json 入口仍指向汉化 bootstrap。');
    } else {
      info.push('package.json 已恢复为 ./out/main.js。');
    }

    if (fsRef.existsSync(context.paths.translatorBootstrapPath)) {
      issues.push('仍残留 cursorTranslatorMain.js。');
    } else {
      info.push('未发现 cursorTranslatorMain.js。');
    }

    if (fsRef.existsSync(context.paths.mainTranslatedPath)) {
      issues.push('仍残留 main_translated.js。');
    } else {
      info.push('未发现 main_translated.js。');
    }

    const translatedWorkbenchPaths = walkWorkbenchTranslatedRelativePaths(
      context.paths.resourcesAppDir,
      fsRef
    );
    if (translatedWorkbenchPaths.length > 0) {
      issues.push(`仍残留 ${translatedWorkbenchPaths.length} 个 workbench *_translated.js 文件。`);
    } else {
      info.push('未发现 workbench *_translated.js 残留。');
    }

    const argvConfig = readArgvConfig(context.paths.argvPath);
    if (argvConfig.locale === 'zh-cn') {
      issues.push('argv.json 仍将 locale 设为 zh-cn。');
    } else {
      info.push('argv.json 未强制 zh-cn locale。');
    }

    if (context.paths.userLocaleMirrorPath && fsRef.existsSync(context.paths.userLocaleMirrorPath)) {
      const localeMirror = readJsonIfExists(context.paths.userLocaleMirrorPath, {});
      if (localeMirror?.locale === 'zh-cn' || localeMirror?.source === 'cursor-zh-tool') {
        issues.push('locale.json 仍保留 cursor-zh 中文区域设置。');
      } else {
        info.push('locale.json 未保留 cursor-zh 中文区域设置。');
      }
    } else {
      info.push('未发现 cursor-zh locale mirror。');
    }

    const extensionTranslationFiles = getManagedExtensionTranslationFiles(context);
    const remainingExtensionTranslations = extensionTranslationFiles.filter((entry) =>
      fsRef.existsSync(entry.targetPath)
    );
    if (remainingExtensionTranslations.length > 0) {
      issues.push(
        `仍残留 ${remainingExtensionTranslations.length} 个扩展 package.nls.zh-cn.json 文件。`
      );
    } else {
      info.push('未发现扩展 package.nls.zh-cn.json 残留。');
    }

    const clpMessagePaths = findLanguagePackCacheMessagePaths(env, fsRef);
    if (clpMessagePaths.length > 0) {
      issues.push(`仍残留 ${clpMessagePaths.length} 个 clp zh-cn nls.messages.json 缓存文件。`);
    } else {
      info.push('未发现 clp zh-cn 缓存残留。');
    }

    const nlsSnapshotHash = backupMetadata?.snapshot?.hashes?.nlsMessages;
    if (nlsSnapshotHash && fsRef.existsSync(context.paths.nlsMessagesPath)) {
      const currentNlsHash = sha256OfFile(context.paths.nlsMessagesPath);
      if (currentNlsHash !== nlsSnapshotHash) {
        issues.push('nls.messages.json 内容与 backup 快照哈希不一致。');
      } else {
        info.push('nls.messages.json 内容与 backup 快照一致。');
      }
    } else if (backupDir && fsRef.existsSync(context.paths.nlsMessagesPath)) {
      const nlsBackupPath = path.join(backupDir, NLS_BACKUP_RELATIVE);
      if (fsRef.existsSync(nlsBackupPath)) {
        const backupNlsHash = sha256OfFile(nlsBackupPath);
        const currentNlsHash = sha256OfFile(context.paths.nlsMessagesPath);
        if (backupNlsHash && currentNlsHash && backupNlsHash !== currentNlsHash) {
          issues.push('nls.messages.json 内容与 backup 文件不一致。');
        }
      }
    }

    const packageSnapshotHash = backupMetadata?.snapshot?.hashes?.packageJson;
    if (packageSnapshotHash && fsRef.existsSync(context.paths.packageJsonPath)) {
      const currentPackageHash = sha256OfFile(context.paths.packageJsonPath);
      if (currentPackageHash !== packageSnapshotHash) {
        issues.push('package.json 内容与 backup 快照哈希不一致。');
      }
    }

    return {
      issues,
      info,
      warnings,
      cursorWinCoverage: null,
      dynamicCoverage: null,
      productTipsCoverage: null,
      staticPatchContracts: null,
      staticPatchContractEvaluation: null,
      runtimeStrategy: null,
      mappingInfo: null,
      timing: null,
    };
  }

  return {
    verifyState,
    verifyCleanState,
  };
}

module.exports = {
  createVerifyModule,
};
