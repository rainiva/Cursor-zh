[CmdletBinding()]
param(
  [string]$InstallDir
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Get-WorkspaceRoot {
  if (-not [string]::IsNullOrWhiteSpace($env:CURSOR_ZH_WORKSPACE_ROOT)) {
    return [IO.Path]::GetFullPath($env:CURSOR_ZH_WORKSPACE_ROOT)
  }
  return Split-Path -Parent $PSScriptRoot
}

function Get-BuildManifest {
  param([string]$WorkspaceRoot)

  $manifestPath = Join-Path $WorkspaceRoot 'state\build-manifest.json'
  if (-not (Test-Path $manifestPath)) {
    return $null
  }

  return Get-Content $manifestPath -Raw -Encoding utf8 | ConvertFrom-Json
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

  foreach ($knownRoot in @(
    [Environment]::GetFolderPath('StartMenu'),
    [Environment]::GetFolderPath('CommonStartMenu')
  )) {
    if (-not [string]::IsNullOrWhiteSpace($knownRoot)) {
      [void]$shortcutRoots.Add($knownRoot)
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

function Resolve-CursorInstallDir {
  param(
    [string]$WorkspaceRoot,
    [string]$RequestedInstallDir,
    $Manifest
  )

  $candidates = @()
  if ($RequestedInstallDir) {
    $candidates += [IO.Path]::GetFullPath($RequestedInstallDir)
  }
  if ($Manifest -and $Manifest.installDir) {
    $candidates += $Manifest.installDir
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
    if ((Test-Path (Join-Path $candidate 'resources\app\package.json')) -and (Test-Path (Join-Path $candidate 'Cursor.exe'))) {
      return $candidate
    }
  }

  throw 'No Cursor install directory was found for uninstall.'
}

$workspaceRoot = Get-WorkspaceRoot
$manifest = Get-BuildManifest -WorkspaceRoot $workspaceRoot
$resolvedInstallDir = Resolve-CursorInstallDir -WorkspaceRoot $workspaceRoot -RequestedInstallDir $InstallDir -Manifest $manifest

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  throw 'Node.js was not found in PATH. Please install Node.js first.'
}

$toolPath = Join-Path $PSScriptRoot 'cursor-zh-tool.js'
$previousWorkspaceRoot = $env:CURSOR_ZH_WORKSPACE_ROOT
$env:CURSOR_ZH_WORKSPACE_ROOT = $workspaceRoot

try {
  & $node.Source $toolPath uninstall --install-dir $resolvedInstallDir
  if ($LASTEXITCODE -ne 0) {
    throw 'Uninstall failed.'
  }
} finally {
  if ($null -eq $previousWorkspaceRoot) {
    Remove-Item Env:CURSOR_ZH_WORKSPACE_ROOT -ErrorAction SilentlyContinue
  } else {
    $env:CURSOR_ZH_WORKSPACE_ROOT = $previousWorkspaceRoot
  }
}
