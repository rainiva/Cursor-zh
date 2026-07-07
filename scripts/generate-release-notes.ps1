[CmdletBinding()]
param(
  [string]$Version,
  [string]$OutputPath
)

# GitHub Release 说明必须中文。发新版时在 $versionHighlights 补充该版本中文变更要点。
# 校验：node scripts/tool/validate-release-notes-cli.js --file <path> --version <version>

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repoRoot = Split-Path -Parent $PSScriptRoot

if (-not $Version) {
  $packageJsonPath = Join-Path $repoRoot 'package.json'
  $packageJson = Get-Content $packageJsonPath -Raw -Encoding utf8 | ConvertFrom-Json
  $Version = $packageJson.version
}

$versionHighlights = @{
  '0.1.3' = @(
    '- Glass 界面、智能体侧边栏、自动化页与审批对话框等核心 UI 汉化'
    '- Product Tips 与工具菜单本地化'
    '- 安装、诊断、卸载脚本与 README 文档'
  )
  '0.2.0' = @(
    '- 以 Cursor 3.9.8 为验证基准，补充 Glass round30–38 与插件市场懒加载翻译'
    '- 新增 harvest / anchors / surfaces 维护流程（P1–P6 可维护性架构）'
    '- Goal Runner 队列 drain 基础设施与 CI/TDD 门禁'
    '- 静态翻译批量化与 runtime pools 性能优化'
  )
  '0.2.1' = @(
    '- P0 卸载恢复增强：verify-clean 前置校验与完整回滚保障'
    '- 主菜单整合与插件市场翻译强化'
    '- harvest 覆盖率台账、round 40–41 UI 映射与 Composer 相关汉化补全'
  )
  '0.2.2' = @(
    '- 以 Cursor **3.10.17** 为验证基准，补全 Glass v6 模型选择器（Auto、档位后缀 Fast/Low/High/Extra High）'
    '- Product Tips glass-v6 锚点、slash 命令菜单与模型参数（Context/Reasoning/Options）汉化'
    '- runtime DOM 兜底：模型行组合 displayName 在 ui-model-picker 作用域内自动翻译'
    '- compact serialization、runtime governance 与 round 46–54 Glass 截图缺口测试'
  )
}

$highlights = $versionHighlights[$Version]
if (-not $highlights) {
  $highlights = @()
}

$assetName = "cursor-zh-installer-v$Version.zip"

$lines = @(
  "## Cursor 中文增强包 v$Version",
  '',
  '面向 **Windows Cursor** 的第三方汉化增强工具安装包（非官方产品，与 Cursor 无关联）。',
  '',
  '### 下载与安装',
  '',
  ("1. 下载下方附件 ``{0}``" -f $assetName),
  '2. 解压到任意目录',
  '3. 在 PowerShell 中执行：',
  '',
  '```powershell',
  'powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1',
  '```',
  '',
  '4. 安装完成后运行诊断：',
  '',
  '```powershell',
  'powershell -ExecutionPolicy Bypass -File .\scripts\doctor.ps1',
  '```',
  '',
  '### 安装前提',
  '',
  '- Windows 系统，PowerShell 可用',
  '- 已安装 **Node.js >= 18** 且 `node` 在 PATH 中',
  '- 本机已安装 Windows 版 Cursor',
  '- Cursor 可用的官方中文语言包',
  '',
  '### 卸载',
  '',
  '```powershell',
  'powershell -ExecutionPolicy Bypass -File .\scripts\uninstall.ps1',
  '```',
  '',
  '卸载会回滚汉化层，不会删除 Cursor 用户数据与历史对话。',
  '',
  '### 更多说明',
  '',
  '- 仓库主页：<https://github.com/rainiva/Cursor-zh>',
  '- 人工安装说明见包内 `docs/install-human.md`',
  '- Agent 安装说明见包内 `docs/install-agent.md`',
  '- Cursor 更新后请运行 `ensure-cursor-zh.cmd` 或 `node scripts/cursor-zh-tool.js ensure` 重建汉化层'
)

if ($highlights.Count -gt 0) {
  $lines += ''
  $lines += '### 本版本变更'
  $lines += ''
  $lines += $highlights
}

$body = $lines -join "`n"

if ($OutputPath) {
  [System.IO.File]::WriteAllText($OutputPath, $body, [System.Text.UTF8Encoding]::new($false))
}

$body