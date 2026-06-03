[CmdletBinding()]
param(
  [ValidateSet('apply', 'ensure', 'verify', 'start')]
  [string]$Command = 'verify',

  [switch]$Force,

  [switch]$NoShortcut,

  [string]$InstallDir
)

$ErrorActionPreference = 'Stop'

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$workspaceRoot = Split-Path -Parent $scriptRoot
$toolPath = Join-Path $scriptRoot 'cursor-zh-tool.js'

function Test-CursorInstallPath($p) {
  if (-not $p) { return $false }
  return Test-Path (Join-Path $p 'resources\app\package.json')
}

function Get-CursorInstallCandidates {
  $candidates = @()

  # 环境变量
  if (Test-CursorInstallPath $env:CURSOR_INSTALL_DIR) {
    $candidates += $env:CURSOR_INSTALL_DIR
  }

  # 注册表
  $regPaths = @(
    'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall',
    'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall',
    'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall'
  )
  foreach ($rp in $regPaths) {
    if (-not (Test-Path $rp)) { continue }
    $items = Get-ChildItem $rp -ErrorAction SilentlyContinue
    foreach ($item in $items) {
      $props = Get-ItemProperty $item.PSPath -ErrorAction SilentlyContinue
      if ($props.DisplayName -like '*Cursor*' -or $props.Publisher -like '*Cursor*') {
        if (Test-CursorInstallPath $props.InstallLocation) { $candidates += $props.InstallLocation }
        if ($props.DisplayIcon) {
          $iconDir = Split-Path $props.DisplayIcon
          if (Test-CursorInstallPath $iconDir) { $candidates += $iconDir }
        }
      }
    }
  }

  # 开始菜单快捷方式
  $startMenu = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
  if (Test-Path $startMenu) {
    $lnks = Get-ChildItem $startMenu -Filter '*Cursor*.lnk' -Recurse -ErrorAction SilentlyContinue
    foreach ($lnk in $lnks) {
      $shell = New-Object -ComObject WScript.Shell
      $target = $shell.CreateShortcut($lnk.FullName).TargetPath
      $dir = Split-Path $target
      if (Test-CursorInstallPath $dir) { $candidates += $dir }
    }
  }

  # 常见路径
  $commonPaths = @(
    (Join-Path $env:LOCALAPPDATA 'Programs\Cursor'),
    (Join-Path $env:LOCALAPPDATA 'cursor'),
    (Join-Path $env:USERPROFILE 'AppData\Local\Programs\Cursor'),
    (Join-Path $env:USERPROFILE 'cursor'),
    (Join-Path $env:ProgramFiles 'Cursor'),
    (Join-Path ${env:ProgramFiles(x86)} 'Cursor'),
    (Join-Path $workspaceRoot 'cursor')
  )
  foreach ($cp in $commonPaths) {
    if (Test-CursorInstallPath $cp) { $candidates += $cp }
  }

  return $candidates | Select-Object -First 1
}

if (-not $InstallDir) {
  $InstallDir = Get-CursorInstallCandidates
  if (-not $InstallDir) {
    $InstallDir = Join-Path $workspaceRoot 'cursor'
  }
}

$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCommand) {
  throw 'Node.js was not found in PATH. Please install Node.js or add it to PATH first.'
}

$arguments = @($toolPath, $Command, '--install-dir', $InstallDir)

if ($Force) {
  $arguments += '--force'
}

if ($NoShortcut) {
  $arguments += '--no-shortcut'
}

& $nodeCommand.Source @arguments
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
  exit $exitCode
}
