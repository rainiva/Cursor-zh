param(
    [string]$ProjectRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"
$goalsDir = Join-Path $ProjectRoot ".cursor\goals"
$webhookLocal = Join-Path $goalsDir "drain-webhook.url.local"
$watchScript = Join-Path $ProjectRoot "scripts\goal-drain-watch.ps1"
$queuePath = Join-Path $goalsDir "queue.json"

function Test-WebhookConfigured {
    if ($env:GOAL_DRAIN_WEBHOOK_URL -and $env:GOAL_DRAIN_WEBHOOK_URL.Trim()) { return $true }
    if (Test-Path $webhookLocal) {
        $line = Get-Content $webhookLocal -Encoding UTF8 | Where-Object { $_.Trim() -and $_.Trim() -notmatch '^https://YOUR_' }
        return ($line.Count -gt 0)
    }
    return $false
}

if (-not (Test-Path $queuePath)) {
    Write-Host "未找到 .cursor/goals/queue.json — 请先 /goal import 规划文档。"
    exit 1
}

if (-not (Test-WebhookConfigured)) {
    Write-Host @"
首次使用需配置 Webhook（约 5 分钟，只做一次）：
  1. Cursor → Automations → 保存「Goal Drain Zero-Input Continue」
  2. 复制 Webhook URL 到：
     .cursor\goals\drain-webhook.url.local
  详见：.cursor\goals\ZERO-INPUT.md
"@
    exit 2
}

$watchRunning = Get-Process powershell -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*goal-drain-watch.ps1*"
}

if (-not $watchRunning) {
    Write-Host "启动后台监视器（goal-drain-watch）..."
    Start-Process powershell -WindowStyle Minimized -ArgumentList @(
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $watchScript, '-ProjectRoot', $ProjectRoot
    )
} else {
    Write-Host "监视器已在运行，跳过启动。"
}

Write-Host ""
Write-Host "零输入续跑已就绪。在 Cursor Agent 里发送："
Write-Host "  /goal start"
Write-Host ""
Write-Host "CHECKPOINT 后会自动 Webhook 续跑，无需再发消息。"
Write-Host "暂停：/goal pause，并关闭后台 PowerShell（监视器）。"
