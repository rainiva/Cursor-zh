const fs = require('fs');
const { createToolApp } = require('./create-app.js');
const {
  buildUninstallFailureLines,
  printUninstallGuidance,
} = require('./uninstall-guidance.js');

const {
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
  runUninstall,
  runUninstallTargets,
  runToggle,
  runDisable,
  runEnable,
  runStatus,
  runHarvest,
  runMigrateAnchors,
} = createToolApp();

function shouldEnsureGeneratedDir(context) {
  if (context.command === 'uninstall-targets' || context.command === 'uninstall') {
    return false;
  }

  if (context.command === 'verify' && context.options.expectClean) {
    return false;
  }

  if (context.command === 'start') {
    return false;
  }

  return true;
}

async function main() {
  if (process.stdout && typeof process.stdout.setBlocking === 'function') {
    process.stdout.setBlocking(true);
  }

  let context = null;

  try {
    const args = process.argv.slice(2);
    const command = args[0] || 'verify';

    if (command === 'apply') {
      console.log('Cursor 汉化工具启动中...');
    }

    context = createContext(args);

    ensureDir(TOOL_PATHS.translationBaseDir);
    ensureDir(TOOL_PATHS.translationOverlayDir);
    ensureDir(TOOL_PATHS.stateDir);
    ensureDir(TOOL_PATHS.backupRoot);
    if (shouldEnsureGeneratedDir(context)) {
      ensureDir(TOOL_PATHS.generatedDir);
    }

    if (context.command === 'uninstall-targets') {
      runUninstallTargets(context);
      return;
    }

    assertCommandAllowed(context.command);

    if (context.command === 'harvest' && context.options.help) {
      console.log(
        [
          'Usage: node scripts/cursor-zh-tool.js harvest [--install-dir <path>] [--marketplace] [--from-workbench] [--save-snapshot] [--diff] [--ledger-only] [--orphans] [--harvest-tier actionable|full] [--out <file>] [--quiet]',
          '',
          'Scan Cursor workbench bundles for UI strings and write harvest reports under state/reports/.',
          'Default harvest tier is actionable (strict children gate). Use --harvest-tier full for inventory scans.',
          'Use --marketplace to merge plugins from state/marketplace-api-snapshot.json into translations/cache/marketplace.descriptions.json.',
          'Use --marketplace --from-workbench to prefer workbench harvest description candidates when API snapshot is missing.',
          'Progress logs print by default; use --quiet to suppress [harvest] stage output.',
          'Use --ledger-only to write coverage-ledger JSON without harvest report/markdown.',
          'Use --orphans to print top orphan mapping rules after harvest.',
        ].join('\n')
      );
      return;
    }

    switch (context.command) {
      case 'apply':
        await runApply(context);
        break;
      case 'ensure':
        await runEnsure(context);
        break;
      case 'verify':
        runVerify(context);
        break;
      case 'start':
        runStart(context);
        break;
      case 'uninstall':
        runUninstall(context);
        break;
      case 'harvest':
        runHarvest(context, context.options);
        break;
      case 'migrate-anchors':
        runMigrateAnchors(context, context.options);
        break;
      case 'toggle':
        runToggle(context);
        break;
      case 'disable':
        runDisable(context);
        break;
      case 'enable':
        runEnable(context);
        break;
      case 'status':
        runStatus(context);
        break;
      default:
        throw new Error(`Unknown command: ${context.command}`);
    }
  } catch (error) {
    if (context?.command === 'uninstall') {
      printUninstallGuidance(
        buildUninstallFailureLines({
          message: error.message,
          installDir: context.paths.installDir,
          manifestKept: fs.existsSync(TOOL_PATHS.buildManifestPath),
          verifyFailed: Boolean(error.verifyResult),
        }),
        { log: console.error }
      );
    }
    console.error(`Cursor ZH tool failed: ${error.message}`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Cursor ZH tool failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  main,
  TOOL_PATHS,
  WORKSPACE_ROOT,
  ensureBackup,
  loadMergedMappings,
  buildRuntimeConfig,
  buildManifest,
  verifyState,
  runApply,
  runVerify,
  runEnsure,
  runStart,
};
