const fs = require('fs');
const crypto = require('crypto');
const { createCoverageWorkbenchContext } = require('../lib/analyzer/workbench-coverage-context.js');

function sha256OfText(text) {
  return crypto.createHash('sha256').update(String(text || '')).digest('hex');
}

function createCoverageModule({
  readText,
  analyzeCursorWinCoverage,
  cursorWinCoverageTargets,
  analyzeDynamicRuleCoverage,
  analyzeProductTipsCoverage,
  productTipsCoverageTargets,
}) {
  function resolveCoverageContext(workbenchSource, options = {}) {
    if (options.coverageContext) {
      return options.coverageContext;
    }
    if (typeof options.cache?.getCoverageContextCached === 'function') {
      const sourceHash =
        options.sourceHash ||
        options.cache.sha256Cached?.(options.workbenchPath, options.manifestHashKey) ||
        sha256OfText(workbenchSource);
      return options.cache.getCoverageContextCached(
        sourceHash,
        workbenchSource,
        options.workbenchIndex
      );
    }
    return createCoverageWorkbenchContext(workbenchSource, options.workbenchIndex);
  }

  function buildCursorWinCoverage(context, mappings, options = {}) {
    if (!fs.existsSync(context.paths.workbenchOriginalPath)) {
      return {
        totalTargetCount: cursorWinCoverageTargets().length,
        bundleTargetCount: 0,
        mappedTargetCount: 0,
        missingTargets: [],
        sourceAvailable: false,
      };
    }

    const workbenchSource =
      typeof options.workbenchSource === 'string'
        ? options.workbenchSource
        : readText(context.paths.workbenchOriginalPath);
    const coverageContext = resolveCoverageContext(workbenchSource, {
      ...options,
      workbenchPath: context.paths.workbenchOriginalPath,
      manifestHashKey: 'workbenchOriginal',
    });

    return {
      ...analyzeCursorWinCoverage({
        workbenchSource,
        mappings,
        targets: cursorWinCoverageTargets(),
        coverageContext,
      }),
      sourceAvailable: true,
    };
  }

  function buildDynamicCoverage(context, mappings, targets, options = {}) {
    if (!fs.existsSync(context.paths.workbenchOriginalPath)) {
      return {
        totalRuleCount: targets.length,
        bundleRuleCount: 0,
        mappedRuleCount: 0,
        missingRules: [],
        sourceAvailable: false,
      };
    }

    const workbenchSource =
      typeof options.workbenchSource === 'string'
        ? options.workbenchSource
        : readText(context.paths.workbenchOriginalPath);
    const coverageContext = resolveCoverageContext(workbenchSource, {
      ...options,
      workbenchPath: context.paths.workbenchOriginalPath,
      manifestHashKey: 'workbenchOriginal',
    });

    return {
      ...analyzeDynamicRuleCoverage({
        workbenchSource,
        mappings,
        targets,
        coverageContext,
      }),
      sourceAvailable: true,
    };
  }
  function buildProductTipsCoverage(mappings) {
    return analyzeProductTipsCoverage({
      mappings,
      targets: productTipsCoverageTargets(),
    });
  }

  return {
    buildCursorWinCoverage,
    buildDynamicCoverage,
    buildProductTipsCoverage,
  };
}

module.exports = {
  createCoverageModule,
};
