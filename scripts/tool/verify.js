const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

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
const { summarizeUpdateAdmission } = require('../lib/compatibility/quarantine-report.js');
const {
  evaluateAnchorLanding,
  evaluateExactLanding,
} = require('../lib/analyzer/anchor-landing.js');
const { measureRuntimeShards } = require('../lib/mapping/runtime-shards.js');
const {
  clearVerifySessionCache,
  buildVerifyReuseKey,
  readVerifySessionCache,
  writeVerifySessionCache,
  canReuseVerifySession,
} = require('./session-cache.js');

const DEFAULT_SAFETY_NET_LIMITS = {
  maxCoreKB: 80,
  maxSurfaceKB: 20,
  maxWarmVerifyMs: 3000,
  maxColdVerifyMs: 8000,
};

function evaluateSafetyNetBudgets(actual, limits = DEFAULT_SAFETY_NET_LIMITS) {
  const issues = [];
  if (
    actual.sizeEvidenceMissing === true ||
    actual.coreRuntimeKB == null ||
    Number.isNaN(Number(actual.coreRuntimeKB))
  ) {
    issues.push('runtime size evidence missing (runtimeShards absent)');
  } else if (actual.coreRuntimeKB > limits.maxCoreKB) {
    issues.push(
      `core runtime payload (${actual.coreRuntimeKB} KB > ${limits.maxCoreKB} KB)`
    );
  }
  for (const [surface, size] of Object.entries(actual.surfaceShardKB || {})) {
    if (size == null || Number.isNaN(Number(size))) {
      issues.push(`runtime size evidence missing for surface shard ${surface}`);
      continue;
    }
    if (size > limits.maxSurfaceKB) {
      issues.push(`surface shard ${surface} (${size} KB > ${limits.maxSurfaceKB} KB)`);
    }
  }
  if (
    actual.qualification === 'QUALIFIED' &&
    Array.isArray(actual.warmVerifySamplesMs) &&
    actual.warmVerifySamplesMs.length > 0 &&
    Math.max(...actual.warmVerifySamplesMs) > limits.maxWarmVerifyMs
  ) {
    issues.push('warm verify budget exceeded');
  }
  if (
    actual.qualification === 'QUALIFIED' &&
    Array.isArray(actual.coldVerifySamplesMs) &&
    actual.coldVerifySamplesMs.length > 0 &&
    Math.max(...actual.coldVerifySamplesMs) > limits.maxColdVerifyMs
  ) {
    issues.push('cold verify budget exceeded');
  }
  return { issues, withinBudget: issues.length === 0 };
}

function evaluatePerformanceQualification({
  computedFingerprint,
  registeredFingerprint,
  requireReleaseProof = false,
  samplesComplete = true,
} = {}) {
  if (!registeredFingerprint) {
    return {
      status: 'UNQUALIFIED',
      releaseAllowed: false,
      reason: 'fingerprint-missing',
    };
  }
  if (!computedFingerprint || computedFingerprint !== registeredFingerprint) {
    return {
      status: 'UNQUALIFIED',
      releaseAllowed: false,
      reason: 'fingerprint-mismatch',
    };
  }
  if (!samplesComplete) {
    return {
      status: 'UNQUALIFIED',
      releaseAllowed: false,
      reason: 'incomplete-samples',
    };
  }
  return {
    status: 'QUALIFIED',
    releaseAllowed: true,
    reason: 'fingerprint-match',
  };
}

function normalizeRamBucket(totalMemBytes) {
  const gib = Number(totalMemBytes || 0) / (1024 ** 3);
  if (gib < 8) return 'lt8';
  if (gib < 16) return '8-16';
  if (gib < 32) return '16-32';
  if (gib < 64) return '32-64';
  return 'ge64';
}

function computeBaselineFingerprint({
  windowsBuild,
  cpuModel,
  logicalCpuCount,
  ramBucket,
  nodeMajor,
  cursorFixtureVersion,
  installIdentity,
  runtimeMode,
  measurementProfileId,
} = {}) {
  const payload = [
    String(windowsBuild || ''),
    String(cpuModel || ''),
    String(logicalCpuCount || ''),
    String(ramBucket || ''),
    String(nodeMajor || ''),
    String(cursorFixtureVersion || ''),
    String(installIdentity || ''),
    String(runtimeMode || 'performance'),
    String(measurementProfileId || 'default'),
  ].join('\0');
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function resolveLocalBaselineFingerprint(context, env = process.env) {
  const cpus = os.cpus() || [];
  return computeBaselineFingerprint({
    windowsBuild: env.CURSOR_ZH_WINDOWS_BUILD || os.release(),
    cpuModel: env.CURSOR_ZH_CPU_MODEL || cpus[0]?.model || 'unknown',
    logicalCpuCount: env.CURSOR_ZH_LOGICAL_CPUS || cpus.length || 0,
    ramBucket: env.CURSOR_ZH_RAM_BUCKET || normalizeRamBucket(os.totalmem()),
    nodeMajor: Number(process.versions.node.split('.')[0]),
    cursorFixtureVersion:
      env.CURSOR_ZH_FIXTURE_VERSION ||
      context?.installMetadata?.pkg?.version ||
      context?.paths?.installDir ||
      '',
    installIdentity:
      env.CURSOR_ZH_BASELINE_INSTALL_DIR ||
      context?.paths?.installDir ||
      '',
    runtimeMode: context?.options?.runtimeMode || 'performance',
    measurementProfileId: env.CURSOR_ZH_MEASUREMENT_PROFILE_ID || 'default',
  });
}

function resolveSafetyNetLimits(governance = {}) {
  return {
    maxCoreKB: Number(governance.maxCoreRuntimeKB) || DEFAULT_SAFETY_NET_LIMITS.maxCoreKB,
    maxSurfaceKB: Number(governance.maxSurfaceShardKB) || DEFAULT_SAFETY_NET_LIMITS.maxSurfaceKB,
    maxWarmVerifyMs: DEFAULT_SAFETY_NET_LIMITS.maxWarmVerifyMs,
    maxColdVerifyMs: DEFAULT_SAFETY_NET_LIMITS.maxColdVerifyMs,
  };
}

function collectRuntimeSizeActual(manifest) {
  const shards = manifest?.runtimeShards;
  if (!shards || typeof shards !== 'object' || !Array.isArray(shards.core)) {
    return {
      coreRuntimeKB: null,
      surfaceShardKB: {},
      sizeEvidenceMissing: true,
    };
  }
  const measured = measureRuntimeShards(shards);
  return {
    coreRuntimeKB: measured.coreKB,
    surfaceShardKB: measured.surfaceKB,
    sizeEvidenceMissing: false,
  };
}

function measureVerifySamples({
  runOnce,
  clearColdCache,
  warmupCount = 1,
  warmSamples = 5,
  coldSamples = 3,
} = {}) {
  for (let i = 0; i < warmupCount; i += 1) {
    runOnce({ kind: 'warmup' });
  }

  const warmVerifySamplesMs = [];
  for (let i = 0; i < warmSamples; i += 1) {
    const started = Date.now();
    runOnce({ kind: 'warm' });
    warmVerifySamplesMs.push(Date.now() - started);
  }

  const coldVerifySamplesMs = [];
  for (let i = 0; i < coldSamples; i += 1) {
    if (typeof clearColdCache === 'function') {
      clearColdCache();
    }
    const started = Date.now();
    runOnce({ kind: 'cold' });
    coldVerifySamplesMs.push(Date.now() - started);
  }

  return { warmVerifySamplesMs, coldVerifySamplesMs };
}

function writePerformanceEvidence(evidencePath, evidence, { fs: fsModule } = {}) {
  const fsRef = fsModule || fs;
  if (!evidencePath) {
    return null;
  }
  fsRef.mkdirSync(path.dirname(evidencePath), { recursive: true });
  fsRef.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  return evidencePath;
}

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
  assertRuntimeFootprintBudget,
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
  const evaluateRuntimeFootprintBudget =
    assertRuntimeFootprintBudget ||
    (() => ({ warnings: [], issues: [], withinBudget: true }));
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
    const workspaceRoot = toolPaths?.workspaceRoot || null;
    const reuseKey = buildVerifyReuseKey({
      bundleHashes: {
        workbenchOriginal: manifest?.hashes?.workbenchOriginal || null,
        workbenchGlassOriginal: manifest?.hashes?.workbenchGlassOriginal || null,
      },
      nlsInventoryHash: manifest?.hashes?.nlsMessages || '',
      translationUnitsSnapshot: manifest?.mappingSourceSnapshots
        ? JSON.stringify(manifest.mappingSourceSnapshots)
        : '',
      runtimeGovernanceSnapshot: JSON.stringify(options.governancePolicy || {}),
      toolVersion: options.toolVersion || env.npm_package_version || '',
    });
    const existingSession = workspaceRoot
      ? readVerifySessionCache(workspaceRoot, { fs: fsRef })
      : null;
    const warmReuse = canReuseVerifySession(existingSession, reuseKey);

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
    let glassWorkbenchText = null;
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
          glassWorkbenchText = cache.readTextCached(
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
      (warmReuse || reuseCoverage) && createMappingInfoFromManifest
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

    // skipCoverage 仅在首次 ensure（manifest 缺失）时生效：显式跳过覆盖率重算。
    // manifest 存在时（含 coverageDeferred fail-closed 路径）必须照常重算，不得跳过。
    const skipCoverageFirstEnsure = options.skipCoverage === true && !manifest;

    if (skipCoverageFirstEnsure) {
      cursorWinCoverage = {
        skipped: true,
        totalTargetCount: 0,
        bundleTargetCount: 0,
        mappedTargetCount: 0,
        missingTargets: [],
        sourceAvailable: false,
      };
      dynamicCoverage = {
        skipped: true,
        totalRuleCount: 0,
        bundleRuleCount: 0,
        mappedRuleCount: 0,
        missingRules: [],
        sourceAvailable: false,
      };
      productTipsCoverage = {
        skipped: true,
        totalTipCount: 0,
        mappedTipCount: 0,
        missingTips: [],
      };
      info.push('skipCoverage：首次 ensure（无 manifest），已跳过覆盖率分析。');
    } else if (warmReuse) {
      cursorWinCoverage = existingSession.coverage.cursorWinCoverage;
      dynamicCoverage = existingSession.coverage.dynamicCoverage;
      productTipsCoverage = existingSession.coverage.productTipsCoverage;
      info.push('verify session cache reused (source-hash composite key matched).');
    } else if (reuseCoverage) {
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

      const workbenchOriginalHash = cache.sha256Cached(
        context.paths.workbenchOriginalPath,
        'workbenchOriginal'
      );
      const coverageOptions = {
        workbenchSource: runtimeMappingsInfo.workbenchSource,
        workbenchIndex: runtimeMappingsInfo.workbenchIndex,
        cache,
        sourceHash: workbenchOriginalHash || undefined,
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

    // 任务 4.1/4.2：锚点命中报告 + changeText 落地逐条抽验。
    // B6 硬线：单趟组合 alternation + 局部窗口核验，抽验预算 ≤2s。
    timer.start('07 锚点与落地逐条验证');
    const anchorEntries = readJsonIfExists(toolPaths.cursorWinAnchorsPath, []);
    const landingBundles = [];
    if (translatedWorkbenchText) {
      const desktopBody =
        installedRuntimeArtifact?.translatedSourceText || translatedWorkbenchText;
      landingBundles.push({
        name: 'desktop',
        bodyText: desktopBody,
        headerText: translatedWorkbenchText.slice(
          0,
          translatedWorkbenchText.length - desktopBody.length
        ),
      });
    }
    if (glassWorkbenchText) {
      const glassArtifact = parseInstalledRuntimeArtifact(glassWorkbenchText);
      const glassBody = glassArtifact?.translatedSourceText || glassWorkbenchText;
      landingBundles.push({
        name: 'glass',
        bodyText: glassBody,
        headerText: glassWorkbenchText.slice(0, glassWorkbenchText.length - glassBody.length),
      });
    }

    if (Array.isArray(anchorEntries) && anchorEntries.length > 0 && landingBundles.length > 0) {
      const reconcileEntries = manifest?.staticReconcile?.entries || [];
      const reconciledAnchorIds = new Set(
        reconcileEntries.filter((entry) => entry.anchorId).map((entry) => entry.anchorId)
      );
      const exemptOriginals = new Set(
        reconcileEntries
          .filter((entry) => typeof entry.originalText === 'string')
          .map((entry) => entry.originalText)
      );

      const anchorLanding = evaluateAnchorLanding({
        anchors: anchorEntries,
        bundles: landingBundles,
      });
      const missingStable = anchorLanding.verdicts.filter(
        (verdict) => verdict.status === 'missing' && !verdict.unstable
      );
      const missingUnstable = anchorLanding.verdicts.filter(
        (verdict) => verdict.status === 'missing' && verdict.unstable
      );
      const foundNotApplied = anchorLanding.verdicts.filter(
        (verdict) => verdict.status === 'found-not-applied' && !verdict.unstable
      );
      // 静态结构漂移已由 static-reconcile 对账层回补（B4）：不视为翻译失效，
      // 仅提示静态模式需随版本修订。
      const reconciledDrift = foundNotApplied.filter((verdict) =>
        reconciledAnchorIds.has(verdict.anchorId)
      );
      const unresolvedNotApplied = foundNotApplied.filter(
        (verdict) => !reconciledAnchorIds.has(verdict.anchorId)
      );

      for (const verdict of missingStable) {
        issues.push(
          `稳定锚点 ${verdict.anchorId}（${verdict.anchorType}）在已安装 bundle 中缺席，请核查版本漂移并更新锚点资产。`
        );
      }
      if (missingUnstable.length > 0) {
        warnings.push(
          `unstable 锚点缺席 ${missingUnstable.length} 条（已知易漂移，降级提示，证据见 state/reports/anchor-stage3-unstable-evidence.json）：${missingUnstable
            .slice(0, 10)
            .map((verdict) => verdict.anchorId)
            .join('、')}${missingUnstable.length > 10 ? ' 等' : ''}`
        );
      }
      for (const verdict of unresolvedNotApplied) {
        issues.push(
          `锚点 ${verdict.anchorId} 在场但 changeText 未落地（found-not-applied，bundle: ${verdict.bundle}），请重新运行 apply。`
        );
      }
      if (reconciledDrift.length > 0) {
        info.push(
          `${reconciledDrift.length} 条锚点静态结构漂移已由运行时对账回补生效，静态模式需随版本修订：${reconciledDrift
            .map((verdict) => verdict.anchorId)
            .join('、')}`
        );
      }
      info.push(
        `锚点命中：stable ${anchorLanding.stats.stableFound}/${anchorLanding.stats.stableTotal} 在场、${anchorLanding.stats.stableApplied} 条已落地；unstable ${anchorLanding.stats.unstableFound}/${anchorLanding.stats.unstableTotal} 在场。`
      );

      // coverage 复用路径下 mappingInfo 是计数占位（null 数组），exact 抽验
      // 必须回退真实加载映射，否则被静默短路（任务 4.2 fail-closed）。
      const landingMappings =
        Array.isArray(mappingInfo.mergedMappings) &&
        mappingInfo.mergedMappings.some((entry) => entry && typeof entry === 'object')
          ? mappingInfo.mergedMappings
          : loadMergedMappings(context, { seed: false, persistBaseMappings: false })
              .mergedMappings || [];
      const exactLanding = evaluateExactLanding({
        mappings: landingMappings,
        bundles: landingBundles,
        exemptOriginals,
      });
      for (const failure of exactLanding.failures) {
        issues.push(
          `exact 词条「${failure.originalText}」原文残留且译文缺席（bundle: ${failure.bundle}），静态替换未落地。`
        );
      }

      // 任务 4.2：manifest anchors 快照哈希比对——锚点资产在 apply 后被改动时
      // 报告结果不可信，必须重新 apply（防未重新 apply 的假阳性）。
      if (manifest?.hashes?.cursorWinAnchors && fsRef.existsSync(toolPaths.cursorWinAnchorsPath)) {
        const currentAnchorsHash = sha256OfFile(toolPaths.cursorWinAnchorsPath);
        if (currentAnchorsHash !== manifest.hashes.cursorWinAnchors) {
          issues.push(
            'anchors 快照哈希与 manifest 记录不一致：锚点资产在上次 apply 后已改动，请重新运行 apply 再 verify。'
          );
        }
      }

      const landingReport = {
        generatedAt: new Date().toISOString(),
        anchors: {
          stats: anchorLanding.stats,
          missingStable: missingStable.map((verdict) => verdict.anchorId),
          missingUnstable: missingUnstable.map((verdict) => verdict.anchorId),
          foundNotApplied: unresolvedNotApplied,
          reconciledDrift: reconciledDrift.map((verdict) => verdict.anchorId),
          verdicts: anchorLanding.verdicts,
        },
        exact: {
          checkedCount: exactLanding.checkedCount,
          failures: exactLanding.failures,
        },
      };
      fsRef.mkdirSync(toolPaths.harvestReportsDir, { recursive: true });
      fsRef.writeFileSync(
        path.join(toolPaths.harvestReportsDir, 'verify-landing-report.json'),
        `${JSON.stringify(landingReport, null, 2)}\n`
      );
    }
    timer.end();

    if (productTipsCoverage.missingTips.length > 0) {
      warnings.push('Product tips coverage is missing maintained targets.');
    }

    // 任务 1.3：apply 侧 coverage defer 后的首次 verify 重算必须 fail-closed，
    // 缺失覆盖直接产 issue（含数量与前 10 条样例），不得静默降级为 warning。
    const coverageWasDeferred = manifest?.coverageDeferred === true;

    if (!skipCoverageFirstEnsure && !cursorWinCoverage.sourceAvailable) {
      warnings.push('无法读取 workbench 原始 bundle，未执行 Cursor Win 覆盖检查。');
    } else if (cursorWinCoverage.missingTargets.length > 0) {
      if (coverageWasDeferred) {
        issues.push(
          `覆盖率 defer 重算发现 ${cursorWinCoverage.missingTargets.length} 个 Cursor Win 未覆盖关键词（前 10 条样例：${cursorWinCoverage.missingTargets
            .slice(0, 10)
            .join('、')}）。`
        );
      } else {
        warnings.push('Cursor Win 常用页面仍有未覆盖关键词。');
      }
    }

    if (!skipCoverageFirstEnsure && !dynamicCoverage.sourceAvailable) {
      warnings.push('无法读取 workbench 原始 bundle，未执行动态规则覆盖检查。');
    } else if (dynamicCoverage.missingRules.length > 0) {
      if (coverageWasDeferred) {
        issues.push(
          `覆盖率 defer 重算发现 ${dynamicCoverage.missingRules.length} 条动态规则未命中 bundle（前 10 条样例：${dynamicCoverage.missingRules
            .slice(0, 10)
            .join('、')}）。`
        );
      } else {
        warnings.push('仍有动态规则未命中当前 bundle。');
      }
    }

    warnings.push(...staticPatchContractEvaluation.warnings);
    issues.push(...staticPatchContractEvaluation.issues);

    const budgetEvaluation = evaluateRuntimeFootprintBudget(runtimeStrategy, {
      strict: context?.options?.strictRuntime !== false,
      baselineMappingCount: manifest?.runtimeStrategy?.runtimeMappingCount,
    });
    warnings.push(...budgetEvaluation.warnings);
    issues.push(...budgetEvaluation.issues);

    let updateAdmission = null;
    if (warmReuse && existingSession?.locatorOutcomes) {
      updateAdmission = existingSession.locatorOutcomes;
      warnings.push(...(updateAdmission.warnings || []));
      issues.push(...(updateAdmission.issues || []));
    } else if (manifest) {
      const manifestForAdmission = { ...manifest };
      if (
        !manifestForAdmission.quarantineReport &&
        manifestForAdmission.quarantineReportPath &&
        fsRef.existsSync(manifestForAdmission.quarantineReportPath)
      ) {
        manifestForAdmission.quarantineReport = readJsonIfExists(
          manifestForAdmission.quarantineReportPath,
          null
        );
      }
      updateAdmission = summarizeUpdateAdmission(manifestForAdmission);
      warnings.push(...updateAdmission.warnings);
      issues.push(...updateAdmission.issues);
    }

    const timing =
      options.profile === false || options.summaryOnly ? null : timer.printSummary();

    const requireReleaseProof =
      options.requirePerformanceProof === true ||
      env.CURSOR_ZH_REQUIRE_PERFORMANCE_PROOF === '1';
    const registeredFingerprint =
      options.baselineFingerprint || env.CURSOR_ZH_BASELINE_FINGERPRINT || null;
    const computedFingerprint = resolveLocalBaselineFingerprint(
      { ...context, installMetadata },
      env
    );
    const providedWarmSamples = options.warmVerifySamplesMs || null;
    const providedColdSamples = options.coldVerifySamplesMs || null;
    const samplesComplete = Boolean(
      Array.isArray(providedWarmSamples) &&
        providedWarmSamples.length >= 5 &&
        Array.isArray(providedColdSamples) &&
        providedColdSamples.length >= 3
    );
    const qualification = evaluatePerformanceQualification({
      computedFingerprint,
      registeredFingerprint,
      requireReleaseProof,
      samplesComplete: samplesComplete || !requireReleaseProof,
    });

    const sizeActual =
      warmReuse && existingSession?.shardMeasurements
        ? existingSession.shardMeasurements
        : collectRuntimeSizeActual(manifest);
    const limits = resolveSafetyNetLimits(options.governancePolicy || {});
    const budgetActual = {
      ...sizeActual,
      warmVerifySamplesMs: providedWarmSamples || [],
      coldVerifySamplesMs: providedColdSamples || [],
      qualification: qualification.status,
    };
    const safetyNetBudgets = evaluateSafetyNetBudgets(budgetActual, limits);
    issues.push(...safetyNetBudgets.issues);

    if (requireReleaseProof && !qualification.releaseAllowed) {
      issues.push(
        `performance proof rejected: ${qualification.status} (${qualification.reason})`
      );
    }

    // skipCoverage 跳过时的占位覆盖率不得写入 session cache，避免后续 warm reuse 复用假数据。
    if (workspaceRoot && options.persistVerifySession !== false && !skipCoverageFirstEnsure) {
      writeVerifySessionCache(
        workspaceRoot,
        {
          reuseKey,
          coverage: {
            cursorWinCoverage,
            dynamicCoverage,
            productTipsCoverage,
          },
          locatorOutcomes: updateAdmission,
          shardMeasurements: sizeActual,
          computedFingerprint,
          qualification: qualification.status,
        },
        { fs: fsRef }
      );
    }

    const performance = {
      computedFingerprint,
      registeredFingerprint,
      qualification: qualification.status,
      releaseAllowed: qualification.releaseAllowed,
      reason: qualification.reason,
      samples: {
        warmVerifySamplesMs: providedWarmSamples,
        coldVerifySamplesMs: providedColdSamples,
        complete: samplesComplete,
      },
      budgets: safetyNetBudgets,
      warmReuse,
      reuseKey,
    };

    if (qualification.status === 'UNQUALIFIED' && !requireReleaseProof) {
      info.push(
        `performance timing UNQUALIFIED (${qualification.reason}); wall-clock budgets not enforced.`
      );
    }

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
      updateAdmission,
      performance,
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
  evaluateSafetyNetBudgets,
  evaluatePerformanceQualification,
  computeBaselineFingerprint,
  resolveLocalBaselineFingerprint,
  resolveSafetyNetLimits,
  collectRuntimeSizeActual,
  measureVerifySamples,
  writePerformanceEvidence,
  clearVerifySessionCache,
  DEFAULT_SAFETY_NET_LIMITS,
};
