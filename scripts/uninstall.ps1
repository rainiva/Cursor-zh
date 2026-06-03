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

function Get-BackupRoot {
  param(
    [string]$WorkspaceRoot,
    $Manifest
  )

  if ($Manifest -and $Manifest.backupDir -and (Test-Path $Manifest.backupDir)) {
    return $Manifest.backupDir
  }

  $backupRoot = Join-Path $WorkspaceRoot 'state\backups'
  if (-not (Test-Path $backupRoot)) {
    return $null
  }

  $latest = Get-ChildItem $backupRoot -Directory | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  return $latest.FullName
}

function Get-BackupMetadata {
  param([string]$BackupDir)

  if (-not $BackupDir) {
    return $null
  }

  $metadataPath = Join-Path $BackupDir 'backup-metadata.json'
  if (-not (Test-Path $metadataPath)) {
    return $null
  }

  return Get-Content $metadataPath -Raw -Encoding utf8 | ConvertFrom-Json
}

function Restore-FromBackup {
  param(
    [string]$BackupDir,
    [string]$RelativePath,
    [string]$TargetPath
  )

  if (-not $BackupDir) {
    return $false
  }

  $sourcePath = Join-Path $BackupDir $RelativePath
  if (-not (Test-Path $sourcePath)) {
    return $false
  }

  Copy-Item -LiteralPath $sourcePath -Destination $TargetPath -Force
  return $true
}

function Restore-Or-RemoveManagedFile {
  param(
    $Entry,
    [string]$BackupDir
  )

  if (-not $Entry -or [string]::IsNullOrWhiteSpace($Entry.targetPath)) {
    return
  }

  if ($Entry.existed) {
    $sourcePath = Join-Path $BackupDir $Entry.backupRelativePath
    if (-not (Test-Path $sourcePath)) {
      throw "Missing backup for managed file: $($Entry.targetPath)"
    }

    $targetDir = Split-Path -Parent $Entry.targetPath
    if ($targetDir) {
      New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
    }
    Copy-Item -LiteralPath $sourcePath -Destination $Entry.targetPath -Force
    return
  }

  if (Test-Path $Entry.targetPath) {
    Remove-Item -LiteralPath $Entry.targetPath -Force
  }
}

$workspaceRoot = Get-WorkspaceRoot
$manifest = Get-BuildManifest -WorkspaceRoot $workspaceRoot
$resolvedInstallDir = Resolve-CursorInstallDir -WorkspaceRoot $workspaceRoot -RequestedInstallDir $InstallDir -Manifest $manifest
$backupDir = Get-BackupRoot -WorkspaceRoot $workspaceRoot -Manifest $manifest
$backupMetadata = Get-BackupMetadata -BackupDir $backupDir

$packageJsonPath = Join-Path $resolvedInstallDir 'resources\app\package.json'
$nlsMessagesPath = Join-Path $resolvedInstallDir 'resources\app\out\nls.messages.json'
$translatorBootstrapPath = Join-Path $resolvedInstallDir 'resources\app\out\cursorTranslatorMain.js'
$mainTranslatedPath = Join-Path $resolvedInstallDir 'resources\app\out\main_translated.js'
$workbenchTranslatedPath = Join-Path $resolvedInstallDir 'resources\app\out\vs\workbench\workbench.desktop.main_translated.js'
$desktopFolder = [Environment]::GetFolderPath('Desktop')
$desktopShortcutPath = $null
if (-not [string]::IsNullOrWhiteSpace($desktopFolder)) {
  $desktopShortcutPath = Join-Path $desktopFolder 'Cursor 中文版.lnk'
}

$restoredPackage = Restore-FromBackup -BackupDir $backupDir -RelativePath 'resources\app\package.json' -TargetPath $packageJsonPath
$restoredNls = Restore-FromBackup -BackupDir $backupDir -RelativePath 'resources\app\out\nls.messages.json' -TargetPath $nlsMessagesPath

if (-not $restoredPackage -and (Test-Path $packageJsonPath)) {
  $packageJson = Get-Content $packageJsonPath -Raw -Encoding utf8 | ConvertFrom-Json
  if ($packageJson.main -ne './out/main.js') {
    throw 'Cannot safely uninstall without a package.json backup.'
  }
}

if (-not $restoredNls -and (Test-Path $translatorBootstrapPath -or Test-Path $mainTranslatedPath -or Test-Path $workbenchTranslatedPath)) {
  throw 'Cannot safely uninstall without an nls.messages.json backup.'
}

if ($backupMetadata -and $backupMetadata.externalFiles) {
  foreach ($entry in $backupMetadata.externalFiles) {
    Restore-Or-RemoveManagedFile -Entry $entry -BackupDir $backupDir
  }
}

foreach ($file in @($translatorBootstrapPath, $mainTranslatedPath, $workbenchTranslatedPath)) {
  if (Test-Path $file) {
    Remove-Item -LiteralPath $file -Force
  }
}

if ($desktopShortcutPath -and (Test-Path $desktopShortcutPath)) {
  Remove-Item -LiteralPath $desktopShortcutPath -Force
}

Write-Host '[Uninstall complete]'
Write-Host "  - Cursor path: $resolvedInstallDir"
Write-Host "  - Backup source: $backupDir"
Write-Host "  - package.json restored: $restoredPackage"
Write-Host "  - nls.messages.json restored: $restoredNls"
Write-Host '  - User data was not deleted.'
