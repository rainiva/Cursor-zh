const fs = require('fs');

function createCoverageModule({
  readText,
  analyzeCursorWinCoverage,
  cursorWinCoverageTargets,
  analyzeDynamicRuleCoverage,
  analyzeProductTipsCoverage,
  productTipsCoverageTargets,
}) {
  function buildCursorWinCoverage(context, mappings) {
    if (!fs.existsSync(context.paths.workbenchOriginalPath)) {
      return {
        totalTargetCount: cursorWinCoverageTargets().length,
        bundleTargetCount: 0,
        mappedTargetCount: 0,
        missingTargets: [],
        sourceAvailable: false,
      };
    }

    return {
      ...analyzeCursorWinCoverage({
        workbenchSource: readText(context.paths.workbenchOriginalPath),
        mappings,
        targets: cursorWinCoverageTargets(),
      }),
      sourceAvailable: true,
    };
  }

  function buildDynamicCoverage(context, mappings, targets) {
    if (!fs.existsSync(context.paths.workbenchOriginalPath)) {
      return {
        totalRuleCount: targets.length,
        bundleRuleCount: 0,
        mappedRuleCount: 0,
        missingRules: [],
        sourceAvailable: false,
      };
    }

    return {
      ...analyzeDynamicRuleCoverage({
        workbenchSource: readText(context.paths.workbenchOriginalPath),
        mappings,
        targets,
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
