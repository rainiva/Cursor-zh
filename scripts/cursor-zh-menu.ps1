# Cursor 中文版交互菜单（PowerShell 承载中文，避免 cmd 编码乱码）
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$scriptRoot = $PSScriptRoot
$workspaceRoot = Split-Path -Parent $scriptRoot
$invokeScript = Join-Path $scriptRoot 'invoke-cursor-zh.ps1'
$startVbs = Join-Path $scriptRoot 'start-cursor-zh.vbs'

function Show-Menu {
    Clear-Host
    Write-Host '========================================'
    Write-Host '         Cursor 中文版工具菜单'
    Write-Host '========================================'
    Write-Host ''
    Write-Host '  1. 应用汉化（首次安装 / 强制重建）'
    Write-Host '  2. 检查并自动修复（Cursor 更新后推荐）'
    Write-Host '  3. 仅检查状态（只读，不修改文件）'
    Write-Host '  4. 启动 Cursor'
    Write-Host '  5. 卸载汉化（恢复英文界面）'
    Write-Host '  6. 扫描未翻译字符串（开发者选项）'
    Write-Host '  0. 退出'
    Write-Host ''
    Write-Host '  提示：日常维护选 2；只想看报告选 3；6 仅供开发者维护翻译'
    Write-Host ''
}

function Invoke-VerifyFromMenu {
    Write-Host ''
    Write-Host '正在检查汉化状态（只读，不修改文件）...'
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $invokeScript -Command verify
    if ($LASTEXITCODE -ne 0) {
        Write-Host ''
        Write-Host '检查完成：发现上述 Issues，表示汉化需要修复。'
        Write-Host '建议：返回菜单选择 2（检查并自动修复）。'
    } else {
        Write-Host ''
        Write-Host '检查完成：未发现需要修复的问题。'
    }
    Write-Host ''
    Read-Host '按回车返回菜单'
}

function Invoke-VerifyFromMenu {
    Write-Host ''
    Write-Host '正在检查汉化状态（只读，不修改文件）...'
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $invokeScript -Command verify
    Write-Host ''
    if ($LASTEXITCODE -ne 0) {
        Write-Host '检查完成：发现 Issues（见上方报告），表示汉化需要修复。'
        Write-Host '建议：返回菜单选择 2（检查并自动修复）。'
    } else {
        Write-Host '检查完成：未发现需要修复的问题。'
    }
    Write-Host ''
    Read-Host '按回车返回菜单'
}

function Invoke-ToolCommand {
    param([string]$Command)

    Write-Host ''
    Write-Host "正在执行 $Command ..."
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $invokeScript -Command $Command
    if ($LASTEXITCODE -ne 0) {
        Write-Host ''
        Write-Host "命令失败，退出码: $LASTEXITCODE"
    }
    Write-Host ''
    Read-Host '按回车返回菜单'
}

function Start-CursorFromMenu {
    Write-Host ''
    Write-Host '正在启动 Cursor...'
    & wscript.exe $startVbs
    Write-Host ''
    Read-Host '按回车返回菜单'
}

function Invoke-HarvestFromMenu {
    Write-Host ''
    Write-Host '[开发者选项] 正在扫描未翻译字符串（保存快照并与上一版对比）...'
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $invokeScript -Command harvest -HarvestSaveSnapshot -HarvestDiff
    if ($LASTEXITCODE -ne 0) {
        Write-Host ''
        Write-Host "扫描失败，退出码: $LASTEXITCODE"
    } else {
        Write-Host ''
        Write-Host '报告已写入 state/reports/harvest-*.md，可用编辑器打开查看未翻译列表。'
    }
    Write-Host ''
    Read-Host '按回车返回菜单'
}

while ($true) {
    Show-Menu
    $choice = Read-Host '请输入序号并按回车'

    switch ($choice) {
        '1' { Invoke-ToolCommand -Command 'apply' }
        '2' { Invoke-ToolCommand -Command 'ensure' }
        '3' { Invoke-VerifyFromMenu }
        '4' { Start-CursorFromMenu }
        '5' { Invoke-ToolCommand -Command 'uninstall' }
        '6' { Invoke-HarvestFromMenu }
        '0' { return }
        default {
            Write-Host ''
            Write-Host '输入无效，请输入 0-6。'
            Read-Host '按回车继续'
        }
    }
}
