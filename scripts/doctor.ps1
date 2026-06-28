[CmdletBinding()]
param(
  [string]$InstallDir,
  [switch]$PostUninstall
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

  return (Test-Path (Join-Path $Path 'Cursor.exe')) -and (Test-Path (Join-Path $Path 'resources\app\package.json'))
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

  $shortcutRoots = @(
    [Environment]::GetFolderPath('StartMenu'),
    [Environment]::GetFolderPath('CommonStartMenu'),
    (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'),
    (Join-Path $env:PROGRAMDATA 'Microsoft\Windows\Start Menu\Programs')
  )

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

function Resolve-CursorInstallDir {
  param(
    [string]$WorkspaceRoot,
    [string]$RequestedInstallDir
  )

  $candidates = @()
  if ($RequestedInstallDir) {
    $candidates += [IO.Path]::GetFullPath($RequestedInstallDir)
  }

  $manifestPath = Join-Path $WorkspaceRoot 'state\build-manifest.json'
  if ((Test-Path $manifestPath) -and -not $RequestedInstallDir) {
    try {
      $manifest = Get-Content $manifestPath -Raw -Encoding utf8 | ConvertFrom-Json
      if ($manifest.installDir) {
        $candidates += $manifest.installDir
      }
    } catch {
    }
  }

  foreach ($regPath in Get-CursorInstallFromRegistry) {
    $candidates += $regPath
  }

  foreach ($shortcutPath in Get-CursorInstallFromShortcuts) {
    $candidates += $shortcutPath
  }

  $candidates += Join-Path $WorkspaceRoot 'cursor'
  if ($env:LOCALAPPDATA) {
    $candidates += Join-Path $env:LOCALAPPDATA 'Programs\Cursor'
    $candidates += Join-Path $env:LOCALAPPDATA 'Programs\cursor'
    $candidates += Join-Path $env:LOCALAPPDATA 'cursor'
  }
  if ($env:USERPROFILE) {
    $candidates += Join-Path $env:USERPROFILE 'AppData\Local\Programs\Cursor'
    $candidates += Join-Path $env:USERPROFILE 'cursor'
  }

  foreach ($candidate in ($candidates | Where-Object { $_ } | Select-Object -Unique)) {
    if (Test-CursorInstallDir -Path $candidate) {
      return $candidate
    }
  }

  throw 'No supported Cursor install directory was found.'
}

$workspaceRoot = Get-WorkspaceRoot
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  throw 'Node.js was not found in PATH. Please install Node.js first.'
}

$resolvedInstallDir = Resolve-CursorInstallDir -WorkspaceRoot $workspaceRoot -RequestedInstallDir $InstallDir

Write-Host '[Environment]'
Write-Host "  - Workspace root: $workspaceRoot"
Write-Host "  - Cursor path: $resolvedInstallDir"
Write-Host "  - Node path: $($node.Source)"
Write-Host ''

if ($PostUninstall) {
  Write-Host '[Post-uninstall check]'
} else {
  Write-Host '[Applied state check]'
}
Write-Host ''

$verifyArgs = @(
  (Join-Path $PSScriptRoot 'cursor-zh-tool.js'),
  'verify',
  '--install-dir',
  $resolvedInstallDir
)
if ($PostUninstall) {
  $verifyArgs += '--expect-clean'
}

& $node.Source @verifyArgs
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
