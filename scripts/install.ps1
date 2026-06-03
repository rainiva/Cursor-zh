[CmdletBinding()]
param(
  [string]$InstallDir,
  [switch]$Force,
  [switch]$NoShortcut
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Get-WorkspaceRoot {
  if (-not [string]::IsNullOrWhiteSpace($env:CURSOR_ZH_WORKSPACE_ROOT)) {
    return [IO.Path]::GetFullPath($env:CURSOR_ZH_WORKSPACE_ROOT)
  }
  return Split-Path -Parent $PSScriptRoot
}

function Test-CursorInstallDir {
  param([string]$Path)

  if ([string]::IsNullOrWhiteSpace($Path)) {
    return $false
  }

  $cursorExe = Join-Path $Path 'Cursor.exe'
  $packageJson = Join-Path $Path 'resources\app\package.json'
  return (Test-Path $cursorExe) -and (Test-Path $packageJson)
}

function Get-CursorInstallFromRegistry {
  $paths = New-Object System.Collections.Generic.List[string]

  $registryKeys = @(
    'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*',
    'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*',
    'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*'
  )

  foreach ($key in $registryKeys) {
    try {
      $items = Get-ItemProperty $key -ErrorAction SilentlyContinue | Where-Object {
        $_.DisplayName -like '*Cursor*' -or $_.Publisher -like '*Cursor*'
      }
      foreach ($item in $items) {
        if ($item.InstallLocation) {
          [void]$paths.Add($item.InstallLocation)
        }
        if ($item.DisplayIcon) {
          $iconDir = Split-Path -Parent $item.DisplayIcon
          if ($iconDir) {
            [void]$paths.Add($iconDir)
          }
        }
      }
    } catch {
    }
  }

  return $paths | Where-Object { $_ } | Select-Object -Unique
}

function Get-CursorInstallFromShortcuts {
  $paths = New-Object System.Collections.Generic.List[string]
  $shortcutRoots = New-Object System.Collections.Generic.List[string]

  foreach ($path in @(
    [Environment]::GetFolderPath('StartMenu'),
    [Environment]::GetFolderPath('CommonStartMenu')
  )) {
    if (-not [string]::IsNullOrWhiteSpace($path)) {
      [void]$shortcutRoots.Add($path)
    }
  }

  if (-not [string]::IsNullOrWhiteSpace($env:APPDATA)) {
    [void]$shortcutRoots.Add((Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'))
  }

  if (-not [string]::IsNullOrWhiteSpace($env:PROGRAMDATA)) {
    [void]$shortcutRoots.Add((Join-Path $env:PROGRAMDATA 'Microsoft\Windows\Start Menu\Programs'))
  }

  foreach ($root in $shortcutRoots) {
    if (-not (Test-Path $root)) {
      continue
    }

    $shortcuts = Get-ChildItem -Path $root -Filter '*.lnk' -Recurse -ErrorAction SilentlyContinue | Where-Object {
      $_.Name -like '*Cursor*'
    }

    foreach ($shortcut in $shortcuts) {
      try {
        $shell = New-Object -ComObject WScript.Shell
        $target = $shell.CreateShortcut($shortcut.FullName).TargetPath
        if ($target) {
          $targetDir = Split-Path -Parent $target
          if ($targetDir) {
            [void]$paths.Add($targetDir)
          }
        }
      } catch {
      }
    }
  }

  return $paths | Where-Object { $_ } | Select-Object -Unique
}

function Get-CursorInstallCandidates {
  param(
    [string]$WorkspaceRoot,
    [string]$RequestedInstallDir
  )

  $items = New-Object System.Collections.Generic.List[string]

  if ($RequestedInstallDir) {
    [void]$items.Add([IO.Path]::GetFullPath($RequestedInstallDir))
  }

  [void]$items.Add((Join-Path $WorkspaceRoot 'cursor'))

  foreach ($regPath in Get-CursorInstallFromRegistry) {
    [void]$items.Add($regPath)
  }

  foreach ($shortcutPath in Get-CursorInstallFromShortcuts) {
    [void]$items.Add($shortcutPath)
  }

  if ($env:LOCALAPPDATA) {
    [void]$items.Add((Join-Path $env:LOCALAPPDATA 'Programs\Cursor'))
    [void]$items.Add((Join-Path $env:LOCALAPPDATA 'Programs\cursor'))
    [void]$items.Add((Join-Path $env:LOCALAPPDATA 'cursor'))
  }

  if ($env:ProgramFiles) {
    [void]$items.Add((Join-Path $env:ProgramFiles 'Cursor'))
  }

  if (${env:ProgramFiles(x86)}) {
    [void]$items.Add((Join-Path ${env:ProgramFiles(x86)} 'Cursor'))
  }

  if ($env:USERPROFILE) {
    [void]$items.Add((Join-Path $env:USERPROFILE 'AppData\Local\Programs\Cursor'))
    [void]$items.Add((Join-Path $env:USERPROFILE 'cursor'))
  }

  return $items | Where-Object { $_ } | Select-Object -Unique
}

function Resolve-CursorInstallDir {
  param(
    [string]$WorkspaceRoot,
    [string]$RequestedInstallDir
  )

  foreach ($candidate in Get-CursorInstallCandidates -WorkspaceRoot $WorkspaceRoot -RequestedInstallDir $RequestedInstallDir) {
    if (Test-CursorInstallDir -Path $candidate) {
      return $candidate
    }
  }

  throw 'No supported Cursor install directory was found. Re-run with -InstallDir "<Cursor install path>".'
}

function Ensure-Node {
  $node = Get-Command node -ErrorAction SilentlyContinue
  if (-not $node) {
    throw 'Node.js was not found in PATH. Please install Node.js first.'
  }

  return $node.Source
}

function Ensure-RootWrapperFiles {
  param([string]$WorkspaceRoot)

  $templateRoot = Join-Path $WorkspaceRoot 'templates'
  $names = @(
    'apply-cursor-zh.cmd',
    'ensure-cursor-zh.cmd',
    'verify-cursor-zh.cmd',
    'start-cursor-zh.cmd'
  )

  foreach ($name in $names) {
    $templatePath = Join-Path $templateRoot $name
    $targetPath = Join-Path $WorkspaceRoot $name

    if (-not (Test-Path $templatePath)) {
      continue
    }

    Copy-Item -LiteralPath $templatePath -Destination $targetPath -Force
  }
}

$workspaceRoot = Get-WorkspaceRoot
$resolvedInstallDir = Resolve-CursorInstallDir -WorkspaceRoot $workspaceRoot -RequestedInstallDir $InstallDir
$nodePath = Ensure-Node

Write-Host '[Environment]'
Write-Host "  - Workspace root: $workspaceRoot"
Write-Host "  - Requested install dir: $(if ($InstallDir) { [IO.Path]::GetFullPath($InstallDir) } else { '<auto-detect>' })"
Write-Host "  - Cursor path: $resolvedInstallDir"
Write-Host "  - Node path: $nodePath"
Write-Host ''

New-Item -ItemType Directory -Force -Path (Join-Path $workspaceRoot 'state') | Out-Null
Ensure-RootWrapperFiles -WorkspaceRoot $workspaceRoot

$toolArgs = @(
  (Join-Path $PSScriptRoot 'cursor-zh-tool.js'),
  'apply',
  '--install-dir',
  $resolvedInstallDir
)

if ($Force) {
  $toolArgs += '--force'
}

if ($NoShortcut) {
  $toolArgs += '--no-shortcut'
}

& $nodePath @toolArgs
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

Write-Host ''
Write-Host '[Install complete]'
Write-Host "  - Workspace root: $workspaceRoot"
Write-Host "  - Cursor path: $resolvedInstallDir"
Write-Host '  - Verify command: powershell -ExecutionPolicy Bypass -File .\scripts\doctor.ps1'
Write-Host '  - Start command: .\start-cursor-zh.cmd'
