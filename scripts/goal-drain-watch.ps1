param(
    [string]$ProjectRoot = (Get-Location).Path,
    [int]$PollSeconds = 15
)

$ErrorActionPreference = "Stop"
$sessionPath = Join-Path $ProjectRoot ".cursor\goals\session.json"
$triggerScript = Join-Path $ProjectRoot "scripts\goal-drain-trigger.ps1"

if (-not (Test-Path $sessionPath)) {
    Write-Host "goal-drain-watch: no session.json — waiting for drain session"
}

Write-Host "goal-drain-watch: polling $sessionPath every ${PollSeconds}s"
$lastPending = $false

while ($true) {
    if (Test-Path $sessionPath) {
        try {
            $session = Get-Content $sessionPath -Raw -Encoding UTF8 | ConvertFrom-Json
            $pending = $session.continuation_pending -eq $true -and $session.status -eq "running"
            if ($pending -and -not $lastPending) {
                Write-Host "goal-drain-watch: continuation_pending detected — firing webhook"
                & powershell -NoProfile -ExecutionPolicy Bypass -File $triggerScript -ProjectRoot $ProjectRoot
            }
            $lastPending = $pending
        } catch {
            Write-Warning "goal-drain-watch: failed to read session.json: $_"
        }
    }
    Start-Sleep -Seconds $PollSeconds
}
