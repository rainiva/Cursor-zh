# Cursor 中文增强包

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub](https://img.shields.io/github/stars/rainiva/Cursor-zh?style=social)](https://github.com/rainiva/Cursor-zh)

面向 **Windows Cursor** 的第三方汉化增强工具仓库。

**仓库地址：** https://github.com/rainiva/Cursor-zh

它不是 Cursor 官方产品，也不是 Cursor Marketplace 插件，与 Cursor 无官方关联。它的定位是：

- 可审查源码的独立工具仓库
- 对 Codex / Cursor / Claude 等 agent 友好的自动安装方案
- 可持续维护、可重新安装 / 完整卸载的 Cursor 中文增强工具

本工具会修改本机 Cursor 安装目录内的应用文件；使用前请自行评估风险。安装前会自动备份，卸载可回滚汉化层，不会删除你的 Cursor 用户数据与历史对话。

## 适用范围

- 已支持：Windows 上的 Cursor（含 Glass 界面 `workbench.glass.main.js`）
- 已验证版本：
  - Cursor `3.8.11`
  - VS Code 内核 `1.105.1`
  - 官方中文语言包 `1.105.0`
- 其他版本通常也可使用，安装后建议运行 `doctor.ps1` 验证兼容性

## 工作原理

这套工具不是 Marketplace 插件，而是向 Cursor 安装目录注入汉化层：

- 写入翻译引导与汉化 bundle（`workbench.desktop.main_translated.js` 与 `workbench.glass.main_translated.js`：静态替换 + 运行时 DOM 翻译）
- 替换 NLS 消息目录与内置扩展文案
- 保持原始 `main.js` 与原版字节一致，避免 profile 路径异常
- 安装前备份受管文件到工作区 `state/backups/`，卸载时按清单回滚

更完整的架构说明见 [AGENTS.md](AGENTS.md)。

## 仓库包含什么

- 汉化核心脚本（`scripts/lib/` 领域逻辑 + `scripts/tool/` CLI 编排）
- 翻译词库与运行时规则（静态替换 + 运行时 DOM 翻译）
- 安装、诊断、卸载、打包脚本
- 面向人类和 agent 的安装文档
- GitHub Actions 工作流

## 默认模式

默认采用**轻量运行时模式**（内部代号 `performance`），在可见中文覆盖和性能之间取平衡。

默认会：

- 保留静态汉化，并在限定 UI 作用域内做运行时 DOM 翻译
- 覆盖设置页、Marketplace 壳层、Glass 聊天 / 画布 / 上下文用量等界面
- 关闭 Marketplace 第三方描述的在线自动翻译
- 不做持续性全局轮询；默认不安排延迟补扫，仅在作用域内响应 DOM 变化

需要更强补扫时，可在 apply 时指定 `compatibility` 模式：

```powershell
node scripts/cursor-zh-tool.js apply --runtime-mode compatibility
```

## 仓库不包含什么

- Cursor 原始安装文件
- 任意用户账号数据、历史对话、配置备份
- 仓库内的 `state/` 运行时目录（含本地生成的备份、manifest、生成物；安装后会在工作区创建，卸载不会删除 `state/backups/`）

## 当前边界

- 生产环境不提供官方支持的中英动态切换；需要切换语言时，请卸载后重新安装
- 实验性 `toggle` / `disable` / `enable` / `status` 命令需设置 `CURSOR_ZH_ENABLE_EXPERIMENTAL_RUNTIME_TOGGLE=1` 才可用，仅供调试，不建议日常使用
- 品牌名、模型名、技能 ID、命令 ID、技术缩写与用户自定义规则内容默认保留原文
- 需要恢复英文界面时，请直接执行卸载；卸载已完整对齐汉化行为，会清理所有汉化运行时产物
- 需要回到中文界面时，请重新执行安装或 `apply`
- `doctor.ps1` / `verify` 是只读诊断，不会自动修复或回填文件

## 前提

- Windows 系统，PowerShell 可用
- 已安装 **Node.js >= 18** 且 `node` 在 `PATH` 中
- 本机已安装 Windows 版 Cursor
- Cursor 可用的**官方中文语言包**（安装时会检查兼容性，详见 [兼容性说明](docs/compatibility.md)）

## 快速安装

克隆仓库后在根目录执行：

```powershell
git clone https://github.com/rainiva/Cursor-zh.git
cd Cursor-zh
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

也可以双击仓库根目录的 `cursor-zh-menu.cmd`，在菜单中选择安装（Apply localization）。

Cursor 安装在非常规路径时，可手动指定目录：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -InstallDir "D:\Apps\Cursor"
```

其他常用参数：`-Force`（强制重建）、`-NoShortcut`（不创建桌面快捷方式）。

安装完成后执行诊断：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\doctor.ps1
```

克隆后仓库根目录即有主菜单入口 `cursor-zh-menu.cmd`（交互式菜单，可执行安装、校验、启动、卸载等操作）。`install.ps1` 还会从 `templates/` 同步以下快捷入口：`apply-cursor-zh.cmd`、`ensure-cursor-zh.cmd`、`verify-cursor-zh.cmd`、`start-cursor-zh.cmd`、`uninstall-cursor-zh.cmd`。默认还会创建桌面快捷方式 `Cursor 中文版.lnk`。

## Cursor 更新后

Cursor 自动更新后，汉化层可能需要重建。建议按这个顺序操作：

1. **优先运行 `ensure`**（有问题时会自动重建）；只想先看状态时再用 `doctor.ps1`
2. 确认诊断通过后再用 `start-cursor-zh.cmd` 或桌面 `Cursor 中文版.lnk` 启动
3. 不要直接双击 `Cursor.exe`，否则可能出现「扩展在磁盘上已被修改」弹窗

`start` 与桌面快捷方式是快速启动路径，不会在启动前自动执行 `ensure`。`apply` 与 `start` 都会清理扩展缓存，有助于减少上述弹窗。

## 快速卸载

```powershell
.\uninstall-cursor-zh.cmd
```

或直接使用 PowerShell：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\uninstall.ps1
```

卸载会完整回滚汉化行为：恢复 `package.json` 与 `nls.messages.json`、删除翻译引导与汉化 bundle、恢复/删除 `argv.json` 和 `locale.json`、清理 CLP 语言包缓存、删除 `state/build-manifest.json` 与 `state/generated/`、删除 install 同步的根目录 wrapper cmd 以及 `state/runtime-toggle.json`。卸载不会删除 Cursor 用户数据、历史对话与备份目录，也不会删除仓库自带的 `cursor-zh-menu.cmd`。

## 常用入口

### 主入口

| 命令 | 说明 |
|------|------|
| `.\cursor-zh-menu.cmd` | 交互式菜单，可执行 apply / ensure / verify / start / uninstall |

### 日常使用

| 命令 | 说明 |
|------|------|
| `.\start-cursor-zh.cmd` | 快速启动 Cursor（不自动执行 ensure） |
| 桌面 `Cursor 中文版.lnk` | 安装后创建的桌面快捷启动方式 |
| `powershell -ExecutionPolicy Bypass -File .\scripts\doctor.ps1` | 只读诊断（语言包、安装状态、运行模式） |

### 维护

| 命令 | 说明 |
|------|------|
| `.\apply-cursor-zh.cmd` | 检测、备份、写入汉化层并清理扩展缓存 |
| `.\ensure-cursor-zh.cmd` | 校验状态，必要时自动重建 |
| `.\verify-cursor-zh.cmd` | 只读诊断与覆盖率报告 |
| `.\uninstall-cursor-zh.cmd` | 完整卸载汉化层 |
| `powershell -ExecutionPolicy Bypass -File .\scripts\uninstall.ps1` | 直接调用卸载脚本 |

### Node 直调

| 命令 | 说明 |
|------|------|
| `node scripts/cursor-zh-tool.js apply` | 上述 apply 的 Node 直调方式（可加 `--runtime-mode compatibility`） |
| `node scripts/cursor-zh-tool.js ensure` | 上述 ensure 的 Node 直调方式 |
| `node scripts/cursor-zh-tool.js verify` | 上述 verify 的 Node 直调方式 |
| `node scripts/cursor-zh-tool.js start` | 清理扩展缓存后启动 Cursor |

## 适合谁用

- 想把 Windows Cursor 汉化得更完整的人
- 不想每次 Cursor 更新后重新手改文件的人
- 希望让 agent 自动完成安装、校验和启动的人

## 给 agent 的说明

如果你是让 Codex / Cursor / Claude 之类的 agent 自动帮你安装，请优先读取 [AGENTS.md](AGENTS.md) 和 [docs/install-agent.md](docs/install-agent.md)。

## 文档

- [人工安装说明](docs/install-human.md)
- [Agent 安装说明](docs/install-agent.md)
- [兼容性说明](docs/compatibility.md)
- [常见问题排查](docs/troubleshooting.md)

## 许可证

本仓库脚本、词库和文档使用 [MIT](LICENSE) 许可证。
