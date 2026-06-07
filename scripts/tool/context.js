const path = require('path');
const os = require('os');

const OFFICIAL_COMMANDS = new Set(['apply', 'ensure', 'verify', 'start']);
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
      } else {
        throw new Error(`Unknown argument: ${current}`);
      }
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
    const workbenchOriginalPath = path.join(
      resourcesAppDir,
      'out',
      'vs',
      'workbench',
      'workbench.desktop.main.js'
    );
    const workbenchTranslatedPath = path.join(
      resourcesAppDir,
      'out',
      'vs',
      'workbench',
      'workbench.desktop.main_translated.js'
    );
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
  assertCommandAllowed,
  shouldIncludeExperimentalRuntimeToggle,
};
