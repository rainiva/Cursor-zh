# 任务 #15-17 最终交付摘要索引

> 生成: 2026-08-01 | 版本: Cursor 3.13.25 | 汇总者: Jason

本文档汇总任务 #15、#16、#17 的目标、关键文件与证据文件路径，供三维评审与后续维护查阅。

---

## 任务 #15 — 弹窗抑制与 Marketplace hook 修复

### 目标
- 抑制 Cursor 更新后扩展缓存变更触发的重载弹窗（避免用户误以为汉化导致异常）。
- 修复 Marketplace `map` hook 缺失导致部分插件列表渲染失败的问题。

### 关键文件
- `scripts/lib/mapping/extension-cache-prompt-suppress.js` — 弹窗抑制逻辑（glass v7 / desktop v5 精确变体）。
- `scripts/lib/mapping/critical-ui-targets.js` — Marketplace hook 注入补丁。

### 证据文件
- [state/reports/task15-drift-evidence-3.13.21.txt](../../state/reports/task15-drift-evidence-3.13.21.txt) — 3.13.21 双 bundle drift 取证（marker、onDidChangeCache、listMarketplacePlugins、installedPluginIdSet 命中点）。
- Git commits: `aa1683a`（Marketplace map hook 修复）、`d8ffc5a`（扩展缓存弹窗抑制漂移修复）。

### 结论
弹窗抑制已全面生效（`apply` 时自动清理扩展缓存），Marketplace hook 7 条 z0 站点韧性包裹 + 2 条 activate 注入变体已落地。测试基线恢复为 0 fail。

---

## 任务 #16 — 五词条翻译（6 条 exact 映射）

### 目标
补齐 Cursor 3.13.25 中高频但未翻译的 5 个词条簇（6 条字面量）。

### 关键映射

| originalText | changeText | surface | commit |
|---|---|---|---|
| `Copy Branch` | 复制分支 | glass_menu | `310e052` |
| `Follow System High Contrast` | 跟随系统高对比度 | settings | `2dff527` |
| `Switch to a high contrast theme when your OS is in a high contrast mode` | 当操作系统处于高对比度模式时切换到高对比度主题 | settings | `2dff527` |
| `Default Model` | 默认模型 | settings | `08c22e0` |
| `What model new agents use by default` | 新 Agent 默认使用的模型 | settings | `08c22e0` |
| `Cursor Default` | Cursor 默认 | model_picker | `08c22e0` |

### 关键文件
- `translations/overlay/cursor-win.common.json` — 6 条新增 exact 映射（根数组头部）。
- `translations/overlay/defaults/cursor-win.common.json` — 已同步包含全部 6 条。
- `scripts/tests/tool/mappings.test.js` — 守护测试（hits===1、exact、forceRuntime false）。

### 证据文件
- [state/reports/task16-evidence.txt](../../state/reports/task16-evidence.txt) — 完整 Buffer 双 bundle 取证、apply 字节核验、红线检查。
- [state/reports/task16-anchor-debt.md](../../state/reports/task16-anchor-debt.md) — 审查提供方混合文案 + Cycle Effort 欠账分析。

### 结论
6 条映射全部落地，双 bundle 字节核验 ALL PASS。审查提供方混合文案和 Cycle Effort 作为欠账移交任务 #17。

---

## 任务 #17 — 审查提供方混合文案重锚与 Cycle Effort 评估

### 目标
1. 修复任务 #16 遗留的「审查提供方」混合文案（英文外层 + 中文连接符）。
2. 评估 Cycle Effort 模板翻译可行性。

### 修复方案（审查提供方）
采用「抗漂移重锚」策略：以稳定英文文案 + 模板反引号结构为主锚，拆 head/tail 两条补丁，不嵌入易变 minified 标识符。desktop/glass 共用同一对补丁。
- head: `` from: 'return`Choose ${' `` → `` to: 'return`选择 ${' ``
- tail: `from: '} for pull request links on web and desktop`}'` → `to: '} 作为 Web 和桌面端的拉取请求链接`}'`

### Cycle Effort 评估结论
**无需改动**。Select Model 已由其他路径译为「选择模型」；Cycle 前缀为模板拼接 `` `Cycle ${MT}` ``，整字面量 count=0，五重不确定性叠加不满足抗漂移要求。

### 关键文件
- `scripts/lib/mapping/critical-ui-targets.js` — head/tail 补丁（抗漂移重锚）。
- `scripts/tests/lib/settings-pull-requests-anchor-drift.test.js` — 离线锚点漂移断言。
- `scripts/tests/lib/critical-ui-coverage.test.js` — 真机覆盖率断言。

### 证据文件
- [state/reports/task17-closure.md](../../state/reports/task17-closure.md) — 收尾记录（方案、多版本兼容、失效可感知口径）。
- [state/reports/task17-evidence.txt](../../state/reports/task17-evidence.txt) — apply --force 后双 bundle Buffer 核验。
- [state/reports/task17-patch-health-3.13.25.txt](../../state/reports/task17-patch-health-3.13.25.txt) — 全量 patch 体检（487 total / 260 stale 历史变体）。

### 结论
审查提供方混合文案已修复，英文尾句残留 = 0，整句中文通顺。Cycle Effort 评估为不动。红线持平。

---

## 跨任务测试基线

| 指标 | 值 |
|---|---|
| tests | 1068+ |
| pass | 1066+ |
| fail | 0 |
| skipped | 2 |
| runtime mode | performance |
| rescanDelaysMs | [] |
| runtimeHeaderKB | ≈110.8 |

## 弹窗抑制行为说明

> **重要**：扩展缓存弹窗全面抑制是**预期行为**，不是回归。详见 [docs/troubleshooting.md §10](../troubleshooting.md#10-扩展缓存重载弹窗不再提示)。
