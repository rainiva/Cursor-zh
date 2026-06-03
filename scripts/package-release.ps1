[CmdletBinding()]
param(
  [string]$OutputDir
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repoRoot = Split-Path -Parent $PSScriptRoot
$packageJsonPath = Join-Path $repoRoot 'package.json'
$packageJson = Get-Content $packageJsonPath -Raw -Encoding utf8 | ConvertFrom-Json
$version = $packageJson.version

if (-not $OutputDir) {
  $OutputDir = Join-Path $repoRoot 'dist'
}

$stagingRoot = Join-Path $OutputDir "cursor-zh-installer-$version"
$archivePath = Join-Path $OutputDir "cursor-zh-installer-v$version.zip"

if (Test-Path $stagingRoot) {
  Remove-Item -LiteralPath $stagingRoot -Recurse -Force
}

if (Test-Path $archivePath) {
  Remove-Item -LiteralPath $archivePath -Force
}

New-Item -ItemType Directory -Force -Path $stagingRoot | Out-Null

$includePaths = @(
  'README.md',
  'AGENTS.md',
  'LICENSE',
  '.gitignore',
  'package.json',
  'assets',
  'scripts',
  'translations',
  'templates',
  'docs',
  '.github'
)

foreach ($relativePath in $includePaths) {
  $sourcePath = Join-Path $repoRoot $relativePath
  if (-not (Test-Path $sourcePath)) {
    continue
  }

  $targetPath = Join-Path $stagingRoot $relativePath
  Copy-Item -LiteralPath $sourcePath -Destination $targetPath -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
Compress-Archive -Path (Join-Path $stagingRoot '*') -DestinationPath $archivePath -Force

Write-Host "Created release archive: $archivePath"

if ($env:GITHUB_OUTPUT) {
  "asset_path=$archivePath" | Add-Content -Path $env:GITHUB_OUTPUT
  "asset_name=$([IO.Path]::GetFileName($archivePath))" | Add-Content -Path $env:GITHUB_OUTPUT
}
