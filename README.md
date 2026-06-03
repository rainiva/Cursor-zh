# Cursor 中文增强包

这是一个面向 **Windows Cursor** 的第三方汉化增强工具仓库。

它不是 Cursor 官方产品，也不是 Cursor Marketplace 插件，更不是单独的 skill。它的定位是：

- 一个可审查源码的独立工具仓库
- 一个对 `Codex / Cursor / Claude` 这类 agent 友好的自动安装仓库
- 一个可持续维护、可重新安装/完整卸载的 Cursor 中文增强方案

## 适用范围

- 已支持：Windows 上的 Cursor
- 已验证版本：
  - Cursor `3.0.12`
  - VS Code 内核 `1.105.1`
  - 官方中文语言包 `1.105.0`

## 仓库包含什么

- 汉化核心脚本
- 翻译词库与运行时规则
- 安装、诊断、卸载、打包脚本
- 面向人类和 agent 的安装文档
- GitHub Actions 工作流

## 默认模式

从 `v0.1.2` 开始，默认采用**轻量汉化模式**，目标是“尽量保留可见中文，同时减少卡顿感”。

轻量模式默认会：

- 保留静态汉化和大部分安全的运行时中文覆盖
- 保留设置页、Marketplace 壳层、常用窗口的本地汉化
- 关闭 Marketplace 第三方描述的在线自动翻译
- 取消持续性的定时全局扫描，改成有限次数的补扫

如果你更在意流畅度，这就是推荐模式。

## 仓库不包含什么

- Cursor 原始安装文件
- 任意用户账号数据、历史对话、配置备份
- 运行时缓存、日志、备份目录

## 当前边界

- 不支持中英动态切换
- 需要恢复英文界面时，请直接执行卸载
- 需要回到中文界面时，请重新执行安装或 `apply`
- `doctor.ps1` / `verify` 是只读诊断，不会自动修复或回填文件

## 快速安装

先把仓库拉到本地，然后在仓库根目录执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

安装完成后执行诊断：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\doctor.ps1
```

如果你的 PowerShell 执行策略会拦截 `npm.ps1`，测试和诊断脚本建议直接用 `node` 入口，例如：

```powershell
node --test "scripts/tests/cursor-zh-config.test.js" "scripts/tests/cursor-zh-lib.test.js" "scripts/tests/cursor-zh-tool.integration.test.js"
```

## 快速卸载

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\uninstall.ps1
```

卸载是恢复英文界面的标准路径。它会回滚入口文件、NLS、locale 覆盖和本工具写入的扩展汉化文件，但不会删除你的 Cursor 用户数据。

## 常用入口

- `node scripts/cursor-zh-tool.js apply`
- `node scripts/cursor-zh-tool.js ensure`
- `node scripts/cursor-zh-tool.js verify`
- `node scripts/cursor-zh-tool.js start`

`start` 现在是快速启动入口，只负责直接启动 Cursor，不会自动执行 `ensure`、校验或修复。
如需重建或确认安装状态，请单独运行 `ensure` 或 `verify`。

## 效果截图

下面这些截图来自当前仓库作者的真实效果图，桌面原图 `1-7` 已整理进仓库，方便别人直接看结果。

### Marketplace 与插件详情

| Marketplace 首页 | Marketplace 分类页 | 插件详情页 |
|---|---|---|
| ![Marketplace localized overview](assets/screenshots/01-marketplace-localized-overview.png) | ![Marketplace categories](assets/screenshots/06-marketplace-categories.png) | ![Marketplace Superpowers detail](assets/screenshots/07-marketplace-superpowers-detail.png) |

### 设置页覆盖效果

| 常规 | 外观 | 标签 |
|---|---|---|
| ![General settings](assets/screenshots/02-settings-general.png) | ![Appearance settings](assets/screenshots/03-settings-appearance.png) | ![Tabs settings](assets/screenshots/04-settings-tabs.png) |

### 智能体工作流配置

| 规则、技能、子智能体 |
|---|
| ![Rules skills subagents](assets/screenshots/05-settings-rules-skills-subagents.png) |

## 适合谁用

- 想把 Windows Cursor 汉化得更完整的人
- 不想每次 Cursor 更新后重新手改文件的人
- 希望让 agent 自动完成安装、校验和启动的人

## 给 agent 的说明

如果你是让 `Codex / Cursor / Claude` 之类的 agent 自动帮你安装，请优先让它读取 [AGENTS.md](AGENTS.md) 和 [docs/install-agent.md](docs/install-agent.md)。

## 文档

- [人工安装说明](docs/install-human.md)
- [Agent 安装说明](docs/install-agent.md)
- [兼容性说明](docs/compatibility.md)
- [常见问题排查](docs/troubleshooting.md)

## 许可证

本仓库脚本、词库和文档使用 [MIT](LICENSE) 许可证。
