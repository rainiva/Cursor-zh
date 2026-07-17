# 兼容性说明

## 当前已验证

| 项目 | 版本 |
|---|---|
| Cursor | **`3.10.17`**（推荐；维护与 CI 测试基准） |
| VS Code 内核 | `1.125.0` |
| 官方中文语言包 | 与内置 VS Code 版本匹配（安装时自动校验） |
| 平台 | Windows |

> **建议**：请优先使用**已验证的最新 Cursor 版本**（当前为 `3.10.17`），以获得更完整的汉化与更少的英文遗漏。较旧版本（例如 `3.9.16` 及更早）不再作为维护基准，部分 embedded patch 与 Glass 锚点可能无法命中。

## 维护策略

- 每次 Cursor 版本更新后，先在目标版本上本地验证，再更新本文档与 README
- 这里只承诺「已验证版本可用」
- 不承诺所有未来版本自动兼容
- 已退役的旧版本锚点会从测试与文档中移除，避免误导

## 已知边界

- 只支持 Windows Cursor
- 默认运行模式为 `performance`（轻量），插件市场描述走懒加载本地 catalog，不再默认开启在线远程翻译
- `performance` 模式保留静态汉化与作用域内 DOM 监听，不做持续性全局轮询，也不安排延迟补扫
- 需要更强补扫时可使用 `compatibility` 模式（`apply --runtime-mode compatibility`）
- 品牌名、模型名、技能 ID、命令 ID、技术缩写默认保留原文

## 更新韧性安全网（Update Safety Net）

### 更新状态机

`prepare → admit → lease → commit → verify`：

| 状态 | 含义 | 对安装目录的写入 |
|---|---|---|
| `UNCHANGED` | 无漂移 | 可走复用/跳过重建 |
| `KNOWN_DRIFT` | 主定位全部 resolved | 允许提交新 proof |
| `DEGRADED` | 阻塞项失败但**每一项**都有当前版本 fallback proof | 自动安全提交（保留英文未知文案） |
| `BLOCKED` | 任一阻塞项缺 proof / 歧义 / 过期 | **零写入** managed targets；仅生成诊断 |

`BLOCKED` 绝不自动回退到 legacy writer。卸载恢复仍以 `state/backups/` + `verify --expect-clean` 为准。

### 隔离区（Quarantine）

- 未知文案保持英文，写入本地 quarantine 报告，不计入 covered。
- 运行时原始文本仅来自显式 UI-chrome allowlist；用户输入/编辑器/终端/聊天/代码/动态值区域一律拒绝捕获。
- 其余未知仅保留会话内 HMAC fingerprint、surface、count。

### 自动安全 DEGRADED

仅当每个 blocking failure 都具备**当前版本** fallback proof（`testPassed`、`shardCompiled`、四类 contracts、capability matched、proofKey 匹配）时才自动 `DEGRADED` 提交。任一缺失、歧义、失败或过期 proof → `BLOCKED`。

### 性能预算与基线采样

硬预算（任何环境均强制）：

- core runtime payload `<= 80 KB`
- 每个 surface shard `<= 20 KB`

墙钟预算（仅 `QUALIFIED` 基线机）：

- 协议：1 次不计时 warmup + 5 次 warm + 3 次 cold（cold 前只清 `state/cache/verify-session.json`，不冲 OS cache）
- 最慢 warm verify `<= 3 s`；最慢 cold verify `<= 8 s`
- 聚合方式：slowest-sample

指纹由规范化 Windows build、CPU 型号/逻辑核数、内存档位、Node 主版本、Cursor fixture 版本/安装标识、runtime mode、measurement-profile ID 计算，并与受保护的 `CURSOR_ZH_BASELINE_FINGERPRINT` 比较。

| 资格 | 含义 |
|---|---|
| `QUALIFIED` | 指纹匹配且样本完整；可执行墙钟门禁与 release proof |
| `UNQUALIFIED` | 通用机器/指纹缺失或不匹配；**打印但不因墙钟失败**；当 `CURSOR_ZH_REQUIRE_PERFORMANCE_PROOF=1` 时禁止发版 |

Release workflow 在 GitHub-hosted `release` 任务之前，要求 self-hosted `[self-hosted, Windows, cursor-zh-baseline]` 的 `performance-baseline` 任务通过并上传 `performance-evidence.json`。托管发布机不得用自身墙钟结果替代。

### 发布模式（shadow → canary → enforced）

过渡版本默认 `shadow`（见 `translations/meta/runtime-governance.json` → `rollout.defaultMode`）。

| 模式 | 命令 | 写入行为 |
|---|---|---|
| `shadow` | `apply` / `ensure`（默认） | 完整 prepare/准入/证明对比；**新引擎受管写入为 0**；随后走过渡 `runLegacyApply` |
| `canary` | `apply --safety-net-canary --install-dir "<可抛弃安装>"` | 需同时设置 `CURSOR_ZH_CANARY_INSTALL_DIR` 且与 `--install-dir` 规范化后完全相等；拒绝日常安装路径 |
| `enforced` | `apply --rollout-mode enforced` | 仅当 `validateRolloutPromotion` 通过（全部门禁绿 + 两个不同构建且含一次 `upstreamUpdate: true`） |
| 维护 legacy | `apply --legacy-apply` | 仅维护；到期版本 `0.3.0`（`legacyWriterExpiresAt`）起失败 |

```powershell
# shadow（默认）
node scripts/cursor-zh-tool.js apply --install-dir "<Cursor path>"

# canary（仅登记的可抛弃安装）
$env:CURSOR_ZH_CANARY_INSTALL_DIR = "D:\Apps\cursor-canary"
node scripts/cursor-zh-tool.js apply --safety-net-canary --install-dir $env:CURSOR_ZH_CANARY_INSTALL_DIR

# 提升门禁（release 在 packaging 前执行；过渡版可不要求已 promotable）
node scripts/tool/validate-rollout-promotion-cli.js --file state/reports/rollout-evidence.json
# 强制要求可提升到 enforced：
node scripts/tool/validate-rollout-promotion-cli.js --file state/reports/rollout-evidence.json --require-promotable
```

`BLOCKED` **绝不**自动回退 legacy writer。证据写入 `state/reports/rollout-evidence.json`。

### Readiness 与 lastKnownGood 恢复

被接受的 canary/enforced 提交会记录 `lastKnownGood` 与一次性激活 nonce。若 readiness 未确认：

- Cursor 仍在运行 → 只 `wait-for-stop`，**绝不杀进程**
- Cursor 已停止 → 在安装锁下恢复 `lastKnownGood` 并验证后，再启动

### 恢复命令

灾难性半应用（白屏/半安装）时，对**可丢弃测试安装**或确认无误的目标：

```powershell
# 先完全退出 Cursor
node scripts/cursor-zh-tool.js uninstall --install-dir "<Cursor path>"
node scripts/cursor-zh-tool.js verify --expect-clean --install-dir "<Cursor path>"
```

日常 Cursor 升级后优先：

```powershell
node scripts/cursor-zh-tool.js ensure --install-dir "<Cursor path>"
```

`BLOCKED` 后只读排查：

```powershell
node scripts/cursor-zh-tool.js verify --install-dir "<Cursor path>"
# 查看 state/reports/quarantine-report.json 与 admission blockers
```
