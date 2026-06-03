# Agent 安装说明

这个文档是给 `Codex / Cursor / Claude` 这类 agent 用的。

## 非交互安装流程

1. 读取仓库根目录的 `AGENTS.md`
2. 确认以下条件成立：
   - Windows
   - PowerShell 可用
   - `node` 在 `PATH` 中
3. 检测 Cursor 安装目录
4. 执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

5. 再执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\doctor.ps1
```

6. 最终报告应包含：
   - Cursor 路径
   - Cursor 版本
   - VS Code 内核版本
   - 官方语言包兼容状态
   - 快捷方式是否创建成功
   - 日常启动命令

## 诊断边界

- `doctor.ps1` / `node scripts/cursor-zh-tool.js verify` 是只读检查
- 发现缺失或不一致时，应报告问题，不要把它们当作自动修复命令
- 需要恢复英文界面时，标准做法是执行卸载，而不是尝试“切换语言”

## 测试说明

在某些 PowerShell 环境中，`npm test` 可能被本机执行策略拦截。需要运行测试时，优先使用：

```powershell
node --test "scripts/tests/cursor-zh-config.test.js" "scripts/tests/cursor-zh-lib.test.js" "scripts/tests/cursor-zh-tool.integration.test.js"
```

## 推荐输出格式

- `Cursor path`
- `Cursor version`
- `VS Code core version`
- `Language pack compatibility`
- `Install result`
- `Verify result`
- `Shortcut result`
- `Start command`

## 禁止事项

- 不上传 `cursor/` 安装目录
- 不上传 `state/` 运行时数据
- 不修改用户 profile 数据
- 不把这个仓库描述成 Cursor 官方插件
