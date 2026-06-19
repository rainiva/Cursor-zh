# Agent 安装说明

这个文档是给 `Codex / Cursor / Claude` 这类 agent 用的。

## 非交互安装流程

1. 读取仓库根目录的 `AGENTS.md`
2. 确认以下条件成立：
   - Windows
   - PowerShell 可用
   - `node`（>= 18）在 `PATH` 中
   - 本机已安装 Windows 版 Cursor
   - Cursor 可用的官方简体中文语言包
3. 检测 Cursor 安装目录
4. 执行（也可用仓库根目录 `cursor-zh-menu.cmd` 菜单项 1）：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

非常规安装路径时：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -InstallDir "Cursor 安装路径"
```

5. 再执行只读诊断：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\doctor.ps1
```

6. 最终报告应包含：
   - Cursor 路径
   - Cursor 版本
   - VS Code 内核版本
   - 官方语言包兼容状态
   - 运行时模式（默认应为 `performance`）
   - 快捷方式是否创建成功
   - 主入口：`cursor-zh-menu.cmd`
   - 日常启动：`start-cursor-zh.cmd` 或桌面 `Cursor 中文版.lnk`

## Cursor 更新后

Cursor 自动更新后，优先运行 `ensure`（会自动重建）；`doctor` / `verify` 只读，不会修复：

```powershell
node scripts/cursor-zh-tool.js ensure
```

## 诊断边界

- `doctor.ps1` / `node scripts/cursor-zh-tool.js verify` 是只读检查
- 发现缺失或不一致时，应报告问题；需要修复时运行 `ensure` 或 `apply`，不要把 `verify` 当作自动修复命令
- 需要恢复英文界面时，标准做法是执行卸载，而不是尝试“切换语言”

## 测试说明

优先使用 `npm test`。若 PowerShell 执行策略拦截 `npm.ps1`，请复制 [package.json](../package.json) 中 `test` 脚本的完整文件列表，等价为 `node --test ...`。不要依赖与 CI 不一致的宽泛 glob。

## 推荐输出格式

- `Cursor path`
- `Cursor version`
- `VS Code core version`
- `Language pack compatibility`
- `Runtime mode`（`performance` or `compatibility`）
- `Install result`
- `Verify result`
- `Shortcut result`
- `Primary entry`（`cursor-zh-menu.cmd`）
- `Start command`

## 禁止事项

- 不上传 `cursor/` 安装目录
- 不上传 `state/` 运行时数据
- 不修改用户 profile 数据
- 不把这个仓库描述成 Cursor 官方插件
