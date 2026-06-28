param(
    [string]$ProjectRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"
$nodeScript = Join-Path $ProjectRoot "scripts\tool\goal-drain-trigger.js"
if (-not (Test-Path $nodeScript)) {
    Write-Error "Missing $nodeScript"
    exit 1
}

$env:CURSOR_ZH_WORKSPACE_ROOT = $ProjectRoot
& node $nodeScript --root=$ProjectRoot
exit $LASTEXITCODE
