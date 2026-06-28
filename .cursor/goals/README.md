# Goal Runner（本仓库）

## 操作

```powershell
/goal start          # drain 模式下会一直跑到队列空或 blocked
/goal status
/goal pause
```

## 队列字段（`queue.json`）

| 字段 | 说明 |
|------|------|
| `drain_mode` | `true`：单会话内连续执行 priority，禁止阶段后收工 |
| `auto_advance` | `true`：goal 完成后自动把 `active_goal_id` 指向下一个并 **继续执行** |
| `plan_ref` | 同一规划文档来源（如 `docs/maintainability-plan.md`） |

## 会话（`session.json`）

`/goal start` 在 drain 时会写入 `mode: drain`, `status: running`。  
**Logical session** 可跨 **多轮** Cursor 对话；单轮跑不完整个规划是正常的。

| 结束本回合 | 条件 |
|------------|------|
| CHECKPOINT | 上下文/时间将尽，`turn_handoff.auto_continue: true`，下轮自动续跑 |
| SESSION COMPLETE | 队列空，`status: completed` |
| BLOCKED | 缺密钥/决策，`status: blocked` |

下轮续跑：发任意消息或 `/goal resume` — **不必**说「继续」。

**完全零输入**：见 [ZERO-INPUT.md](ZERO-INPUT.md)（Webhook + `goal-drain-watch.ps1`）。

校验：

```powershell
powershell -NoProfile -File $env:USERPROFILE\.cursor\skills\goal-runner\scripts\validate-goal.ps1
```
