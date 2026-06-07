const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

function createDetectorModule({ readJson }) {
  function detectCursorInstallDir(options = {}) {
    const env = options.env ?? process.env;
    const workspaceRoot = options.workspaceRoot;
    const defaultInstallDir =
      options.defaultInstallDir ?? path.join(workspaceRoot, 'cursor');
    const execSync = options.execSync ?? childProcess.execSync;
    const candidates = [];

    const addIfValid = (dir) => {
      if (!dir) return;
      const pkg = path.join(dir, 'resources', 'app', 'package.json');
      if (fs.existsSync(pkg)) candidates.push(dir);
    };

    if (env.CURSOR_INSTALL_DIR) {
      addIfValid(env.CURSOR_INSTALL_DIR);
      if (candidates.length > 0) return candidates[0];
    }

    const commonPaths = [
      path.join(env.LOCALAPPDATA || '', 'Programs', 'Cursor'),
      path.join(env.LOCALAPPDATA || '', 'cursor'),
      path.join(env.USERPROFILE || '', 'AppData', 'Local', 'Programs', 'Cursor'),
      path.join(env.USERPROFILE || '', 'cursor'),
      path.join(env.ProgramFiles || '', 'Cursor'),
      path.join(env['ProgramFiles(x86)'] || '', 'Cursor'),
      path.join(workspaceRoot, 'cursor'),
    ];
    for (const candidatePath of commonPaths) {
      addIfValid(candidatePath);
      if (candidates.length > 0) return candidates[0];
    }

    const registryPaths = [
      'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
      'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
      'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    ];
    for (const regPath of registryPaths) {
      try {
        const result = execSync(`reg query "${regPath}" /s /f "Cursor" /d 2>nul`, {
          encoding: 'utf8',
          timeout: 2000,
        });
        const lines = result.split(/\r?\n/);
        for (const line of lines) {
          const match =
            line.match(/InstallLocation\s+REG_SZ\s+(.+)/i) ||
            line.match(/DisplayIcon\s+REG_SZ\s+(.+)/i);
          if (match) {
            const dir = path.dirname(match[1].trim());
            addIfValid(dir);
            if (candidates.length > 0) return candidates[0];
          }
        }
      } catch {}
    }

    try {
      const startMenu = path.join(
        env.APPDATA || '',
        'Microsoft',
        'Windows',
        'Start Menu',
        'Programs'
      );
      const lnkResult = execSync(
        `powershell -NoProfile -Command "Get-ChildItem -Path '${startMenu}' -Filter '*Cursor*.lnk' -Recurse -ErrorAction SilentlyContinue | ForEach-Object { \$s = (New-Object -ComObject WScript.Shell).CreateShortcut(\$_.FullName); Write-Output \$s.TargetPath }"`,
        { encoding: 'utf8', timeout: 2000 }
      );
      const lnkLines = lnkResult.split(/\r?\n/).filter(Boolean);
      for (const line of lnkLines) {
        addIfValid(path.dirname(line.trim()));
        if (candidates.length > 0) return candidates[0];
      }
    } catch {}

    return candidates[0] || defaultInstallDir;
  }

  function findLanguagePack(extensionRoot) {
    if (!fs.existsSync(extensionRoot)) {
      return null;
    }

    const candidates = fs
      .readdirSync(extensionRoot, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isDirectory() &&
          entry.name.startsWith('ms-ceintl.vscode-language-pack-zh-hans-')
      )
      .map((entry) => {
        const fullPath = path.join(extensionRoot, entry.name);
        const packageJsonPath = path.join(fullPath, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
          return null;
        }
        const packageJson = readJson(packageJsonPath);
        return {
          path: fullPath,
          version: packageJson.version,
        };
      })
      .filter(Boolean)
      .sort((left, right) =>
        right.version.localeCompare(left.version, undefined, { numeric: true })
      );

    return candidates[0] || null;
  }

  return {
    detectCursorInstallDir,
    findLanguagePack,
  };
}

module.exports = {
  createDetectorModule,
};
