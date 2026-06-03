# 常见问题排查

## 1. 提示找不到 Node.js

原因：

- `node` 不在系统 `PATH` 中

处理：

- 安装 Node.js
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
- 再检查是否用了正确的启动入口

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

## 6. 想完全回退

执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\uninstall.ps1
```

它会恢复启动入口、`nls.messages.json`、locale 覆盖和本工具写入的扩展汉化文件，不会删你的用户数据。

## 7. 想恢复英文界面

当前仓库不提供中英动态切换。

恢复英文界面的标准路径是：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\uninstall.ps1
```

需要重新回到中文界面时，再重新执行安装：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

## 8. `npm test` 在 PowerShell 下被拦截

有些 Windows 环境会因为执行策略拦截 `npm.ps1`。这种情况下直接改用：

```powershell
node --test "scripts/tests/cursor-zh-config.test.js" "scripts/tests/cursor-zh-lib.test.js" "scripts/tests/cursor-zh-tool.integration.test.js"
```
