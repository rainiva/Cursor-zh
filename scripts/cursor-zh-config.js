const path = require('path');

function resolveWorkspaceRoot({ scriptDir, env = process.env }) {
  if (env && env.CURSOR_ZH_WORKSPACE_ROOT) {
    return path.resolve(env.CURSOR_ZH_WORKSPACE_ROOT);
  }

  return path.resolve(scriptDir, '..');
}

function escapePowerShellSingleQuoted(value) {
  return String(value).replace(/'/g, "''");
}

function buildShortcutCommand({
  desktopPath,
  launcherPath,
  workspaceRoot,
  iconPath,
}) {
  return [
    '$shell = New-Object -ComObject WScript.Shell',
    `$shortcut = $shell.CreateShortcut('${escapePowerShellSingleQuoted(desktopPath)}')`,
    "$shortcut.TargetPath = 'wscript.exe'",
    `$shortcut.Arguments = '"${escapePowerShellSingleQuoted(launcherPath)}"'`,
    `$shortcut.WorkingDirectory = '${escapePowerShellSingleQuoted(workspaceRoot)}'`,
    `$shortcut.IconLocation = '${escapePowerShellSingleQuoted(iconPath)},0'`,
    '$shortcut.Save()',
  ].join('; ');
}

module.exports = {
  buildShortcutCommand,
  resolveWorkspaceRoot,
};
