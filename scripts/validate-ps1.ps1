[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$scripts = Get-ChildItem -Path $PSScriptRoot -Filter '*.ps1' | Where-Object { $_.Name -ne 'validate-ps1.ps1' }

foreach ($script in $scripts) {
  $tokens = $null
  $errors = $null
  [void][System.Management.Automation.Language.Parser]::ParseFile($script.FullName, [ref]$tokens, [ref]$errors)
  if ($errors.Count -gt 0) {
    throw "PowerShell parse failed: $($script.Name)`n$($errors | Out-String)"
  }
}

Write-Host 'All PS1 scripts parsed OK'
