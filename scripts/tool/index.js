const { createToolApp } = require('./create-app.js');

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
  runToggle,
  runDisable,
  runEnable,
  runStatus,
  runHarvest,
  runMigrateAnchors,
} = createToolApp();

async function main() {
  if (process.stdout && typeof process.stdout.setBlocking === 'function') {
    process.stdout.setBlocking(true);
  }

  try {
    const args = process.argv.slice(2);
    const command = args[0] || 'verify';

    if (command === 'apply') {
      console.log('Cursor 汉化工具启动中...');
    }

    ensureDir(TOOL_PATHS.translationBaseDir);
    ensureDir(TOOL_PATHS.translationOverlayDir);
    ensureDir(TOOL_PATHS.stateDir);
    ensureDir(TOOL_PATHS.backupRoot);
    ensureDir(TOOL_PATHS.generatedDir);

    const context = createContext(args);
    assertCommandAllowed(context.command);

    if (context.command === 'harvest' && context.options.help) {
      console.log(
        [
          'Usage: node scripts/cursor-zh-tool.js harvest [--install-dir <path>] [--save-snapshot] [--diff] [--out <file>] [--quiet]',
          '',
          'Scan Cursor workbench bundles for UI strings and write harvest reports under state/reports/.',
          'Progress logs print by default; use --quiet to suppress [harvest] stage output.',
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
