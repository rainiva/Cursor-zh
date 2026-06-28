function createReportModule() {
  function printReport(title, result) {
    console.log(`\n[${title}]`);
    for (const line of result.info) {
      console.log(`  - ${line}`);
    }
    if (result.warnings?.length > 0) {
      console.log('  Warnings:');
      for (const warning of result.warnings) {
        console.log(`    * ${warning}`);
      }
    }
    if (result.issues.length > 0) {
      console.log('  Issues:');
      for (const issue of result.issues) {
        console.log(`    * ${issue}`);
      }
    } else {
      console.log('  - 未发现阻塞问题。');
    }
  }

  function printCursorWinCoverage(coverage) {
    console.log('\n[Cursor Win 覆盖]');
    console.log(`  - 目标关键词: ${coverage.totalTargetCount}`);
    console.log(`  - 命中当前 bundle: ${coverage.bundleTargetCount}`);
    console.log(`  - 已覆盖关键词: ${coverage.mappedTargetCount}`);
    console.log(`  - 缺失关键词: ${coverage.missingTargets.length}`);

    if (coverage.missingTargets.length > 0) {
      console.log('  Missing:');
      for (const target of coverage.missingTargets) {
        console.log(`    * ${target}`);
      }
    }
  }

  function printDynamicCoverage(coverage) {
    console.log('\n[动态规则覆盖]');
    console.log(`  - 目标规则: ${coverage.totalRuleCount}`);
    console.log(`  - 命中当前 bundle: ${coverage.bundleRuleCount}`);
    console.log(`  - 已覆盖规则: ${coverage.mappedRuleCount}`);
    console.log(`  - 缺失规则: ${coverage.missingRules.length}`);

    if (coverage.missingRules.length > 0) {
      for (const rule of coverage.missingRules) {
        console.log(`    * ${rule}`);
      }
    }
  }

  function printProductTipsCoverage(coverage) {
    console.log('\n[Product Tips Coverage]');
    console.log(`  - Total tips: ${coverage.totalTipCount}`);
    console.log(`  - Mapped tips: ${coverage.mappedTipCount}`);
    console.log(`  - Missing tips: ${coverage.missingTips.length}`);

    if (coverage.missingTips.length > 0) {
      for (const tip of coverage.missingTips) {
        console.log(`    * ${tip}`);
      }
    }
  }

  function printStaticPatchContracts(contracts = {}) {
    const { SURFACE_CONTRACTS, listSurfaceContractsBySeverity } = require('../lib/mapping/surface-contracts');
    const grouped = listSurfaceContractsBySeverity();

    console.log('\n[Static Patch Contracts]');
    console.log(
      `  - 契约面注册: ${SURFACE_CONTRACTS.length} 项 (error: ${grouped.error.length}, warning: ${grouped.warning.length})`
    );

    for (const [contractId, contract] of Object.entries(contracts)) {
      const status =
        contract.notApplicable
          ? 'n/a'
          : contract.matchCount > 0
            ? 'ok'
            : contract.severityOnMiss;
      console.log(
        `  - ${contractId}: matches=${contract.matchCount}, fallback=${contract.fallbackMode}, severity=${contract.severityOnMiss}, surface=${contract.surface}, status=${status}`
      );
    }
  }

  function printRuntimeStrategy(report) {
    console.log('\n[运行时策略]');
    console.log(`  - 运行模式: ${report.mode}`);
    console.log(
      `  - 补扫延迟: ${Array.isArray(report.rescanDelaysMs) ? report.rescanDelaysMs.join(', ') : 'none'}`
    );
    console.log(`  - 观察范围选择器: ${report.scopeSelectorCount}`);
    console.log(
      `  - Marketplace 远端描述翻译: ${
        report.marketplaceRemoteTranslationEnabled ? '开启' : '关闭'
      }`
    );
  }

  return {
    printReport,
    printCursorWinCoverage,
    printDynamicCoverage,
    printProductTipsCoverage,
    printStaticPatchContracts,
    printRuntimeStrategy,
  };
}

module.exports = {
  createReportModule,
};
