# Goal Drain 完全零输入续跑

无需发消息、无需说「继续」。CHECKPOINT 后由 **Webhook + 本地监视** 自动拉起下一轮 Agent。

## 架构

```
Agent 回合将尽 (CHECKPOINT)
  → session.continuation_pending = true
  → scripts/goal-drain-trigger.ps1  (POST Webhook)
  → Cursor Automation 启动
  → 读 session.json + queue.json → 继续 drain

备用：goal-drain-watch.ps1 轮询 session（Webhook 失败时）
备用：Automation Cron 每 15 分钟（仅当 continuation_pending 仍为 true）
```

## 一次性配置（约 5 分钟）

**只做一次。** Webhook URL 和 Automation 保存后永久有效，不用每次重建。

| 频率 | 做什么 |
|------|--------|
| **仅首次** | 创建 Automation + 保存 Webhook 到 `drain-webhook.url.local` |
| **每次长跑** | 运行 `scripts/start-goal-drain.ps1`，然后 Chat 里 `/goal start` |
| **不必每次** | 不必重配 Webhook、不必重开 Automations 编辑器、不必重抄 prefill |

一键启动（推荐每次 drain 前）：

```powershell
cd D:\Project\Cursor-zh
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-goal-drain.ps1
```

然后在 Cursor 发 `/goal start` 即可。

### 1. 创建 Cursor Automation（仅首次）

在 Cursor 中打开 Automations，新建自动化（或使用本目录 `automation/workflow-prefill.json` 预填草稿）：

| 字段 | 值 |
|------|-----|
| 名称 | Goal Drain Zero-Input Continue |
| 触发器 | **Webhook**（主）+ **Cron `*/15 * * * *`**（备用） |
| 仓库 | `rainiva/Cursor-zh`，分支 `main` |
| 运行位置 | **本机 / 本地工作区**（必须能读到 `D:\Project\Cursor-zh\.cursor\goals\`） |

保存后复制 **Webhook URL**。

### 2. 保存 Webhook URL（仅首次，勿提交）

任选其一：

```powershell
# 方式 A：环境变量（用户级）
[System.Environment]::SetEnvironmentVariable('GOAL_DRAIN_WEBHOOK_URL', 'https://...', 'User')

# 方式 B：本地文件（推荐）
Copy-Item .cursor\goals\drain-webhook.url.local.example .cursor\goals\drain-webhook.url.local
# 编辑文件，写入 Webhook URL（一行）
```

### 3. 每次 drain 前（`start-goal-drain.ps1` 会自动开监视器）

也可手动：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\goal-drain-watch.ps1
```

### 4. 开始 drain

```text
/goal start
```

之后 CHECKPOINT 会自动触发续跑，**你无需输入任何内容**。

## Automation 指令（已写入 prefill）

Agent 被触发后：

1. 读 `.cursor/goals/session.json` 与 `queue.json`
2. 若 `continuation_pending !== true` 或 `status !== running` → 一行报告 idle 并停止
3. 将 `continuation_pending` 设为 `false`（防止 Cron 重复触发）
4. 从 `active_goal_id` 继续 goal-runner drain（遵守 `goal-runner-drain.mdc`）
5. 新 CHECKPOINT 时：更新 session、`continuation_pending: true`、运行 `scripts/goal-drain-trigger.ps1`

## 手动测试 Webhook

```powershell
# 先模拟 checkpoint
# 编辑 session.json：continuation_pending: true

powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\goal-drain-trigger.ps1
```

## 云 Agent 限制

若 Automation **只在云端** 跑且 checkout 远程 `main`：

- 本地未 push 的 `session.json` **云端看不见**
- 解决：启用 **本地运行**，或每次 checkpoint 后 push（不推荐）

本机 drain 请始终用 **本地工作区 + watch 脚本**。

## 文件

| 文件 | 作用 |
|------|------|
| `scripts/goal-drain-trigger.ps1` | CHECKPOINT 时 POST Webhook |
| `scripts/goal-drain-watch.ps1` | 轮询 `continuation_pending` |
| `scripts/tool/goal-drain-trigger.js` | Webhook 实现 |
| `scripts/lib/goal-drain/session-state.js` | 续跑状态逻辑 |
| `.cursor/goals/drain-webhook.url.local` | Webhook URL（本地，勿提交） |
