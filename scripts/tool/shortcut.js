const path = require('path');
const os = require('os');
const childProcess = require('child_process');

function createShortcutModule({
  toolPaths,
  buildShortcutCommand,
  writeStartLauncherPathToFile,
  childProcess: childProcessModule,
}) {
  const cp = childProcessModule || childProcess;

  function writeStartLauncherPath(context) {
    writeStartLauncherPathToFile(toolPaths.startCursorPathFile, context);
  }

  function createDesktopShortcut(context) {
    if (process.platform !== 'win32') {
      return null;
    }

    const desktopPath = path.join(os.homedir(), 'Desktop', toolPaths.desktopShortcutName);
    const launcherPath = path.join(toolPaths.workspaceRoot, 'scripts', 'start-cursor-zh.vbs');
    const command = buildShortcutCommand({
      desktopPath,
      launcherPath,
      workspaceRoot: toolPaths.workspaceRoot,
      iconPath: context.paths.cursorExePath,
    });

    cp.spawnSync('powershell.exe', ['-NoProfile', '-Command', command], {
      stdio: 'inherit',
    });

    return desktopPath;
  }

  return {
    writeStartLauncherPath,
    createDesktopShortcut,
  };
}

module.exports = {
  createShortcutModule,
};
