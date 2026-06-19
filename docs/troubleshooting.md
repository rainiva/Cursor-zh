# 常见问题排查

## 1. 提示找不到 Node.js

原因：

- `node` 不在系统 `PATH` 中

处理：

- 安装 Node.js >= 18
- 重新打开终端后再执行安装脚本

## 2. 提示找不到 Cursor 安装目录

原因：

- Cursor 安装在非常规路径

处理：

- 手动传入安装目录：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -InstallDir "你的 Cursor 路径"
```

## 3. 安装后像是切到了新 profile

这套工具已经内置了保护，避免把 `User` 路径误翻成 `用户`。如果仍出现异常：

- 先运行 `doctor.ps1`
- 再检查是否用了正确的启动入口（`start-cursor-zh.cmd` 或桌面 `Cursor 中文版.lnk`，不要直接双击 `Cursor.exe`）

`doctor.ps1` 只会报告状态，不会自动修改文件。

## 4. Marketplace 还有少量英文

这通常属于下面几类之一：

- 品牌名
- 技术缩写
- 技能 ID / 命令 ID
- 用户自定义规则内容

这类默认不强翻。

另外，从 `v0.1.2` 开始默认是轻量汉化模式，Marketplace 第三方描述不再默认做在线翻译，目的是减少卡顿。

## 5. 感觉滚动或切页有点卡

先执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\doctor.ps1
```

确认输出里的：

- `运行模式` 是 `balanced`
- `已启用` 是 `否`

这表示当前已经是默认轻量模式。

## 6. Cursor 更新后界面异常或弹窗

Cursor 自动更新后，汉化层可能需要重建：

```powershell
.\ensure-cursor-zh.cmd
```

或

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\doctor.ps1
```

确认诊断通过后再用 `start-cursor-zh.cmd` 或桌面快捷方式启动，不要直接双击 `Cursor.exe`。

## 7. 想完全回退

执行下面任一方式：

```powershell
.\uninstall-cursor-zh.cmd
```

或

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\uninstall.ps1
```

卸载会完整回滚汉化行为：恢复 `package.json` 与 `nls.messages.json`、删除翻译引导与汉化 bundle、恢复/删除 `argv.json` 和 `locale.json`、清理 CLP 语言包缓存、删除 `state/build-manifest.json` 与 `state/generated/`、删除 install 同步的根目录 wrapper cmd 以及 `state/runtime-toggle.json`。不会删除你的 Cursor 用户数据、历史对话与备份目录，也不会删除仓库自带的 `cursor-zh-menu.cmd`。

## 8. 想恢复英文界面

生产环境不提供官方支持的中英动态切换。恢复英文界面的标准路径是卸载：

```powershell
.\uninstall-cursor-zh.cmd
```

或

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\uninstall.ps1
```

需要重新回到中文界面时，再重新执行安装：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

实验性 `toggle` / `disable` / `enable` / `status` 命令需设置 `CURSOR_ZH_ENABLE_EXPERIMENTAL_RUNTIME_TOGGLE=1` 才可用，仅供调试，不建议日常使用。

## 9. `npm test` 在 PowerShell 下被拦截

有些 Windows 环境会因为执行策略拦截 `npm.ps1`。这种情况下优先查看 [AGENTS.md](../AGENTS.md) 中的测试说明；也可改用与 `package.json` 中 `test` 脚本等价的 `node --test` 命令。
