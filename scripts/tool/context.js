const path = require('path');
const os = require('os');
const {
  DESKTOP_WORKBENCH_BUNDLE,
  GLASS_WORKBENCH_BUNDLE,
  resolveWorkbenchBundlePaths,
} = require('../lib/patcher/workbench-bundles.js');
const {
  DEFAULT_HARVEST_TIER,
  normalizeHarvestTier,
} = require('../lib/analyzer/harvest-string-quality.js');
const {
  DEFAULT_ROLLOUT_MODE,
  ROLLOUT_MODES,
} = require('./rollout-state.js');

const OFFICIAL_COMMANDS = new Set([
  'apply',
  'ensure',
  'verify',
  'start',
  'uninstall',
  'harvest',
  'migrate-anchors',
  'validate-rollout-promotion',
]);
const EXPERIMENTAL_COMMANDS = new Set(['toggle', 'disable', 'enable', 'status']);
const EXPERIMENTAL_RUNTIME_TOGGLE_BUILD_ENV =
  'CURSOR_ZH_INCLUDE_EXPERIMENTAL_RUNTIME_TOGGLE';
const EXPERIMENTAL_RUNTIME_TOGGLE_ENV =
  'CURSOR_ZH_ENABLE_EXPERIMENTAL_RUNTIME_TOGGLE';

function normalizeRuntimeMode(value) {
  if (value === 'performance' || value === 'compatibility') {
    return value;
  }

  throw new Error(`Unsupported runtime mode: ${value}`);
}

function normalizeRolloutMode(value) {
  if (ROLLOUT_MODES.includes(value)) {
    return value;
  }
  throw new Error(`Unsupported rollout mode: ${value}`);
}

function assertCommandAllowed(command, env = process.env) {
  if (OFFICIAL_COMMANDS.has(command)) {
    return;
  }

  if (EXPERIMENTAL_COMMANDS.has(command)) {
    if (env[EXPERIMENTAL_RUNTIME_TOGGLE_ENV] === '1') {
      return;
    }

    throw new Error(
      `Command "${command}" is experimental and not part of the supported install or uninstall workflow. ` +
        `Set ${EXPERIMENTAL_RUNTIME_TOGGLE_ENV}=1 only when you intentionally need the legacy runtime toggle path.`
    );
  }
}

function shouldIncludeExperimentalRuntimeToggle(env = process.env) {
  return env[EXPERIMENTAL_RUNTIME_TOGGLE_BUILD_ENV] === '1';
}

function createContextModule({ detectCursorInstallDir }) {
  function createContext(rawArgs) {
    const detected = detectCursorInstallDir();
    const options = {
      installDir: detected,
      force: false,
      noShortcut: false,
      runtimeMode: 'performance',
      help: false,
      saveSnapshot: false,
      diff: false,
      out: null,
      quiet: false,
      suggest: false,
      marketplace: false,
      fromWorkbench: false,
      ledgerOnly: false,
      orphans: false,
      harvestTier: DEFAULT_HARVEST_TIER,
      noMarketplaceLazyTranslate: false,
      expectClean: false,
      seedOverlays: false,
      strictRuntime: false,
      backupDir: null,
      rolloutMode: DEFAULT_ROLLOUT_MODE,
      safetyNetCanary: false,
      legacyApply: false,
      deferCoverage: false,
      rolloutEvidencePath: null,
    };

    const args = [...rawArgs];
    const command = args.shift() || 'verify';

    while (args.length > 0) {
      const current = args.shift();
      if (current === '--force') {
        options.force = true;
      } else if (current === '--no-shortcut') {
        options.noShortcut = true;
      } else if (current === '--install-dir') {
        options.installDir = path.resolve(args.shift());
      } else if (current === '--runtime-mode') {
        if (command !== 'apply') {
          throw new Error('--runtime-mode is only supported for the apply command');
        }
        options.runtimeMode = normalizeRuntimeMode(args.shift());
      } else if (current === '--help') {
        options.help = true;
      } else if (current === '--save-snapshot') {
        if (command !== 'harvest') {
          throw new Error('--save-snapshot is only supported for the harvest command');
        }
        options.saveSnapshot = true;
      } else if (current === '--diff') {
        if (command !== 'harvest') {
          throw new Error('--diff is only supported for the harvest command');
        }
        options.diff = true;
      } else if (current === '--out') {
        if (command !== 'harvest') {
          throw new Error('--out is only supported for the harvest command');
        }
        options.out = path.resolve(args.shift());
      } else if (current === '--quiet') {
        if (command !== 'harvest') {
          throw new Error('--quiet is only supported for the harvest command');
        }
        options.quiet = true;
      } else if (current === '--marketplace') {
        if (command !== 'harvest') {
          throw new Error('--marketplace is only supported for the harvest command');
        }
        options.marketplace = true;
      } else if (current === '--from-workbench') {
        if (command !== 'harvest') {
          throw new Error('--from-workbench is only supported for the harvest command');
        }
        options.fromWorkbench = true;
      } else if (current === '--ledger-only') {
        if (command !== 'harvest') {
          throw new Error('--ledger-only is only supported for the harvest command');
        }
        options.ledgerOnly = true;
      } else if (current === '--orphans') {
        if (command !== 'harvest') {
          throw new Error('--orphans is only supported for the harvest command');
        }
        options.orphans = true;
      } else if (current === '--harvest-tier') {
        if (command !== 'harvest') {
          throw new Error('--harvest-tier is only supported for the harvest command');
        }
        options.harvestTier = normalizeHarvestTier(args.shift());
      } else if (current === '--no-marketplace-lazy-translate') {
        if (command !== 'apply') {
          throw new Error('--no-marketplace-lazy-translate is only supported for the apply command');
        }
        options.noMarketplaceLazyTranslate = true;
      } else if (current === '--seed-overlays') {
        if (command !== 'apply' && command !== 'ensure') {
          throw new Error('--seed-overlays is only supported for the apply and ensure commands');
        }
        options.seedOverlays = true;
      } else if (current === '--strict-runtime') {
        if (command !== 'verify' && command !== 'apply') {
          throw new Error('--strict-runtime is only supported for the apply and verify commands');
        }
        options.strictRuntime = true;
      } else if (current === '--expect-clean') {
        if (command !== 'verify') {
          throw new Error('--expect-clean is only supported for the verify command');
        }
        options.expectClean = true;
      } else if (current === '--suggest') {
        if (command !== 'migrate-anchors') {
          throw new Error('--suggest is only supported for the migrate-anchors command');
        }
        options.suggest = true;
      } else if (current === '--backup-dir') {
        if (command !== 'uninstall') {
          throw new Error('--backup-dir is only supported for the uninstall command');
        }
        options.backupDir = path.resolve(args.shift());
      } else if (current === '--safety-net-canary') {
        if (command !== 'apply' && command !== 'ensure') {
          throw new Error('--safety-net-canary is only supported for the apply and ensure commands');
        }
        options.safetyNetCanary = true;
        options.rolloutMode = 'canary';
      } else if (current === '--defer-coverage') {
        if (command !== 'apply') {
          throw new Error('--defer-coverage is only supported for the apply command');
        }
        // 任务 4.3 降级开关：保留一个 release 周期，默认不 defer。
        options.deferCoverage = true;
      } else if (current === '--legacy-apply') {
        if (command !== 'apply') {
          throw new Error('--legacy-apply is only supported for the apply command');
        }
        options.legacyApply = true;
        options.rolloutMode = 'legacy';
      } else if (current === '--rollout-mode') {
        if (command !== 'apply' && command !== 'ensure') {
          throw new Error('--rollout-mode is only supported for the apply and ensure commands');
        }
        options.rolloutMode = normalizeRolloutMode(args.shift());
      } else if (current === '--rollout-evidence') {
        if (command !== 'validate-rollout-promotion') {
          throw new Error('--rollout-evidence is only supported for validate-rollout-promotion');
        }
        options.rolloutEvidencePath = path.resolve(args.shift());
      } else if (current === '--require-promotable') {
        if (command !== 'validate-rollout-promotion') {
          throw new Error('--require-promotable is only supported for validate-rollout-promotion');
        }
        options.requirePromotable = true;
      } else {
        throw new Error(`Unknown argument: ${current}`);
      }
    }

    if (options.safetyNetCanary && options.legacyApply) {
      throw new Error('--safety-net-canary and --legacy-apply are mutually exclusive');
    }

    const installDir = options.installDir;
    const resourcesAppDir = path.join(installDir, 'resources', 'app');
    const productJsonPath = path.join(resourcesAppDir, 'product.json');
    const packageJsonPath = path.join(resourcesAppDir, 'package.json');
    const translatorBootstrapPath = path.join(resourcesAppDir, 'out', 'cursorTranslatorMain.js');
    const mainOriginalPath = path.join(resourcesAppDir, 'out', 'main.js');
    const mainTranslatedPath = path.join(resourcesAppDir, 'out', 'main_translated.js');
    const nlsKeysPath = path.join(resourcesAppDir, 'out', 'nls.keys.json');
    const nlsMessagesPath = path.join(resourcesAppDir, 'out', 'nls.messages.json');
    const desktopWorkbenchPaths = resolveWorkbenchBundlePaths(
      resourcesAppDir,
      DESKTOP_WORKBENCH_BUNDLE
    );
    const glassWorkbenchPaths = resolveWorkbenchBundlePaths(resourcesAppDir, GLASS_WORKBENCH_BUNDLE);
    const workbenchOriginalPath = desktopWorkbenchPaths.originalPath;
    const workbenchTranslatedPath = desktopWorkbenchPaths.translatedPath;
    const cursorExePath = path.join(installDir, 'Cursor.exe');
    const argvPath = path.join(os.homedir(), '.cursor', 'argv.json');
    const userLocaleMirrorPath = process.env.APPDATA
      ? path.join(process.env.APPDATA, 'Cursor', 'User', 'locale.json')
      : null;
    const userExtensionRoot = path.join(os.homedir(), '.cursor', 'extensions');

    return {
      command,
      options,
      paths: {
        argvPath,
        cursorExePath,
        installDir,
        mainOriginalPath,
        mainTranslatedPath,
        nlsKeysPath,
        nlsMessagesPath,
        packageJsonPath,
        productJsonPath,
        resourcesAppDir,
        translatorBootstrapPath,
        userExtensionRoot,
        userLocaleMirrorPath,
        workbenchOriginalPath,
        workbenchTranslatedPath,
        workbenchGlassOriginalPath: glassWorkbenchPaths.originalPath,
        workbenchGlassTranslatedPath: glassWorkbenchPaths.translatedPath,
      },
    };
  }

  return {
    OFFICIAL_COMMANDS,
    EXPERIMENTAL_COMMANDS,
    EXPERIMENTAL_RUNTIME_TOGGLE_BUILD_ENV,
    EXPERIMENTAL_RUNTIME_TOGGLE_ENV,
    assertCommandAllowed,
    createContext,
    normalizeRuntimeMode,
    normalizeRolloutMode,
    shouldIncludeExperimentalRuntimeToggle,
  };
}

module.exports = {
  OFFICIAL_COMMANDS,
  EXPERIMENTAL_COMMANDS,
  EXPERIMENTAL_RUNTIME_TOGGLE_BUILD_ENV,
  EXPERIMENTAL_RUNTIME_TOGGLE_ENV,
  createContextModule,
  normalizeRuntimeMode,
  normalizeRolloutMode,
  assertCommandAllowed,
  shouldIncludeExperimentalRuntimeToggle,
};
