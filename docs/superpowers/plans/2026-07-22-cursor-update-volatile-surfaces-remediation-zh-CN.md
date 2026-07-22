# Cursor 升级后高波动界面翻译失效专项修复实施计划

> **供智能体执行：** 必须使用 `subagent-driven-development`（推荐）或 `executing-plans` 逐任务执行本计划。所有步骤使用复选框跟踪；生产代码必须严格遵循 RED → GREEN → REFACTOR。

**Goal（目标）：** 消除 Cursor 升级后设置页、Agent/审批、工作树、菜单和新功能入口反复漏翻的问题，使每个高波动翻译单元都具有稳定身份、唯一归属、可证明兜底和真实界面验收，同时不引入轮询、全页扫描、全局模糊匹配或未受控运行时载荷。

**Architecture（架构）：** 继续沿用现有 NLS → 静态字面量 → 语义定位器 → 界面域运行时分片四层安全网，不重写安装、恢复和回滚架构。高波动文案以 `translationId` 为唯一身份，英文大小写/措辞只作为 alias；构建阶段对**首批 surface + error 级**条目证明当前生效 owner 唯一（static / semantic / runtime 三选一生效；fallback 可声明但主路径命中后不算 duplicate）。覆盖率改为以当前 bundle harvest 为分母，更新准入和真实 UI 门禁共同决定 `UNCHANGED / KNOWN_DRIFT / DEGRADED / BLOCKED`。

**Tech Stack（技术栈）：** Windows、PowerShell、Node.js >= 18、Node.js 内置测试运行器、现有 Cursor-zh translation units、semantic locator、runtime shards、harvest、verify、update admission 和 recovery capsule。

## 〇、Grill 已决议（2026-07-22）

以下决议覆盖计划正文；若后文示例与本节冲突，**以本节为准**。

| # | 决议 | 选择 |
|---|---|---|
| 1 | 设置表面 ID | 新建 `settings_page`，与现有 L2 `settings` **并存** |
| 2 | `settings` vs `settings_page` | `settings` = L2 合同/入口（如 Open Settings）；`settings_page` = L3 设置页正文（§1.2 首批） |
| 3 | 运行时根选择器 | 统一 `[data-cursor-zh-surface="<surfaceId>"]`；禁止 class 模糊兜底；删掉任何 `data-cursor-settings-root` 示例 |
| 4 | 与 `settings_search` | **收窄** `settings_search` scopes；设置正文由 `settings_page` 独占 |
| 5 | 标记注入失败时准入 | **按 unit 分级**：已 `covered_static`/`covered_semantic` 可放行；仅依赖 runtime 且无当前 proof → `BLOCKED`；有当前 scoped fallback proof 才允许 `DEGRADED` |
| 6 | primary + fallback 归属 | **当前生效 owner 唯一**：primary 命中后 runtime 只作声明式兜底，不算 `duplicateOwners`；duplicate 仅打双主路径或双分片冲突 |
| 7 | 非 unit 的普通 L3 mapping | **首批 surface + error → 构建硬失败**；其余 L3 → warning + 隔离报告，不炸全库 |
| 8 | 与 `glass_menu` | **收窄** `glass_menu`；对话/任务上下文菜单由标记后的 `context_menu` 独占 |
| 9 | 与 `composer_chrome` | 新建 `composer_empty_state` 并独占空状态；**收窄** `composer_chrome`；顺带修正触及的 `owner: "composer"` 与表面登记不一致 |
| 10 | `Copy Branch` 身份 | 与 `Copy Branch Name` **同一** `context_menu.copy_branch`；aliases 含二者；中文权威「复制分支」 |
| 11 | 三条模板描述 | primary = semantic `template-prefix`；fallback = `settings_page` 分片对**前缀** `normalizedExact`；禁止整句全局 partial |
| 12 | surfaces 登记时机 | **Task 2 之前（Step 0）** 登记三个新 surface 的最终标记选择器，并提交旧表面收窄的 RED；无标记则分片不激活 |
| 13 | 合入 vs 专项完成 | **Task 1–9 全绿可合 `main`**；Task 10 双构建+真实 UI 只卡 **release / enforced** |
| 14 | 脏树 `workbench-index` | **先单独提交** `workbench-index.js` 及相关测试到 `main`，再从更新后的 `main` 开 remediation worktree |
| 15 | Task 1 夹具权威 | 必须对 `D:\Apps\cursor`（当前 3.12.30）**只读 live 核对**；§1.2 表只是候选清单 |
| 16 | 可写测试安装路径 | 统一 `D:\Apps\cursor-canary` + `CURSOR_ZH_CANARY_INSTALL_DIR`；计划禁止再写 `cursor-test` |
| 17 | 其它零分片表面 | **不纳入完成定义**；只保证机制下不再静默漏报（warning/orphan 可见），不承诺填满 `command_palette` 等 |
| 18 | 文档 | 本决议已写回本计划正文 |

### 表面职责速查

| surfaceId | 层 | 职责 | runtimeScopes |
|---|---|---|---|
| `settings` | L2 | 合同/入口文案 | 无（保持现状） |
| `settings_search` | L3 | 仅设置搜索框/结果 | **收窄后**的搜索专用选择器（禁止再覆盖整页 settings） |
| `settings_page` | L3 | 设置页正文 | `[data-cursor-zh-surface="settings_page"]` |
| `glass_menu` | L3 | Glass 顶栏/窗口菜单等 | **收窄**；不再用裸 `[role="menu"]` 吞掉上下文菜单 |
| `context_menu` | L3 | 对话/任务等上下文菜单 | `[data-cursor-zh-surface="context_menu"]` |
| `composer_chrome` | L3 | Composer 工具栏/chrome | **收窄**；不再吞掉空状态 |
| `composer_empty_state` | L3 | Composer 空状态 CTA | `[data-cursor-zh-surface="composer_empty_state"]` |

---

## Global Constraints（全局约束）

- 默认运行模式保持 `performance`。
- 不新增生产依赖；如果必须新增解析器或浏览器自动化依赖，停止执行并请求用户批准。
- 不启用联网翻译；未知新文案保留英文并进入本地隔离报告。
- 不添加全局短词映射、无作用域模糊匹配、定时轮询或周期性全页面补扫。
- 全局发现观察器最多一个，只监听 `childList + subtree`，每个 idle 批次最多检查 `30` 个新增根节点，不执行全局文本翻译。
- 每个已挂载界面域最多一个翻译观察器；每批最多处理 `30` 个文本节点；卸载后必须断开。
- 核心运行时载荷 `<= 80 KB`；每个延迟加载界面域分片 `<= 20 KB`。
- 合格基线最慢热 `verify <= 3 s`，最慢冷 `verify <= 8 s`；普通开发机只报告 `UNQUALIFIED`，不得伪装成性能通过。
- `main.js` 必须保持字节级不变；不得改变 Cursor 用户配置目录、历史或工作区状态。
- 所有手工文件修改使用 `apply_patch`；中文文件必须显式 UTF-8 读取并做字节级编码验证。
- 当前工作树中的既有修改属于用户；执行时优先使用隔离 worktree，不得覆盖、回退或提交无关改动。
- **先单独提交**未完成的 `scripts/lib/patcher/workbench-index.js` 及相关测试，再从干净 `main` 创建本专项 worktree。
- 每个生产改动必须先有能够以预期原因失败的测试；既有绿测不能替代 RED。
- 本计划继承 `docs/superpowers/specs/2026-07-17-update-resilient-translation-safety-net-design-zh-CN/translation.md` 和 `docs/superpowers/plans/2026-07-17-update-resilient-translation-safety-net-zh-CN/translation.md`，冲突时以前者的安全、隐私、事务和恢复约束为准；与「〇、Grill 已决议」冲突时以决议为准（不得放松安全/隐私）。

---

## 一、问题基线与完成定义

### 1.1 已确认根因

当前 Cursor `3.12.30` / VS Code `1.128.0` 的证据表明：

1. 截图抽样的 17 个英文标签都存在于当前 desktop/Glass bundle，但没有大小写完全一致的映射。
2. 其中 14 个完全没有映射；3 个只有旧大小写 alias：
   - `Max worktrees` → `Max Worktrees`
   - `Max total size (GB)` → `Max Total Size (GB)`
   - `Explore subagent model` → `Explore Subagent Model`
3. 三条已经存在的描述映射仍显示英文，因为源码已变成包含 `${...}` 条件后缀的模板字面量，静态完整字面量替换无法命中：
   - `Prevent Agent from deleting files automatically`
   - `Prevent Agent from creating or modifying files outside of the workspace automatically`
   - `Mark pull requests as made with Cursor`
4. `selectRuntimeMappings()` 会排除未静态命中的 L3 映射，而 `buildRuntimeShards()` 当前只消费 translation units，不消费普通 mappings，导致部分条目静态、旧运行时和分片运行时三条路径都没有归属。
5. 当前构建 manifest 中 `command_palette`、`composer_chrome`、`app_menu`、`plan_context_menu`、`customize_onboarding` 分片均为 `0` 条，`settings_search` 只有 `1` 条。
6. 旧 Cursor Win 覆盖率以已知 mapping targets 为分母；新增文案不在目标集，旧 alias 从 bundle 消失后也不会被计为缺失。
7. Update Admission 当前只治理 20 个 translation units，因此能够报告 bundle `KNOWN_DRIFT`，却可能同时报告 `unknown: 0`，无法解释截图中的用户可见退化。

### 1.2 首批受保护界面

| 界面域 | 首批代表文案 | 目标中文 | 首选路径 | 兜底路径 |
|---|---|---|---|---|
| 设置/启动 | `Startup`、`Window Restoration` | 启动、窗口恢复 | 静态字面量 | `settings_page` 分片 |
| Agent 对话 | `Agent Conversations`、`Code Block Word Wrap` | Agent 对话、代码块自动换行 | 静态字面量 | `settings_page` 分片 |
| Agent 环境 | `Default Environment`、`Voice Submit Keywords` | 默认环境、语音提交关键词 | 静态字面量 | `settings_page` 分片 |
| 远程控制 | `Remote Control`、`Keep This Computer Awake` | 远程控制、保持此计算机唤醒 | 静态字面量 | `settings_page` 分片 |
| 执行与审批 | `Execution and Approvals`、`Allowlist Options` | 执行与审批、允许列表选项 | 静态/语义 | `settings_page` 分片 |
| 语言服务 | `Enable LSPs`、`Enable LSPs for Worktrees` | 启用语言服务器、为工作树启用语言服务器 | 静态字面量 | `settings_page` 分片 |
| 模型 | `Task Models`、`Explore Subagent Model` | 任务模型、探索子智能体模型 | 静态字面量 + alias | `settings_page` 分片 |
| Git/PR | `Mark pull requests as made with Cursor` | 将拉取请求标记为由 Cursor 创建 | 语义模板定位 | `settings_page` 分片 |
| 工作树 | `Max Worktrees`、`Max Total Size (GB)` | 最大工作树数量、最大总大小（GB） | 静态字面量 + alias | `settings_page` 分片 |
| 浏览器与网络 | `Browser & Network` | 浏览器与网络 | 静态字面量 | `settings_page` 分片 |
| 上下文菜单 | `Copy ID`、`Copy Branch` / `Copy Branch Name`、`Copy Transcript` | 复制 ID、复制分支、复制对话记录 | action/菜单 ID 语义定位 | `context_menu` 分片 |
| Composer 空状态 | `Connect Your Repos` | 连接你的仓库 | action ID/静态字面量 | `composer_empty_state` 分片 |

说明：`Copy Branch` 与仓库已有 `Copy Branch Name` 共用 translationId `context_menu.copy_branch`（aliases 含二者；中文「复制分支」）。`settings`（L2）不承接上表正文；上表设置类文案的 owner/fallback 均为 `settings_page`。

产品名、模型名、协议名和固定标识值继续保留原文，例如 `Cursor Light`、`Cursor Dark`、`GitHub`、`Graphite`、`HTTP/2`、`Composer 2.5`。`Default`、`System`、`Last Used` 等枚举值只有在能绑定设置键或控件归属时才翻译，禁止添加全局短词规则。

本专项**不**要求填满 `command_palette` / `app_menu` / `plan_context_menu` / `customize_onboarding` 等零分片；它们只须在机制下可见（warning/orphan），另开计划治理。

### 1.3 完成定义

拆成两层，避免把上游双构建绑死代码合入：

**可合入 `main`（Task 1–9）：**

- 上表每个翻译单元都有唯一 `translationId`、owner、aliases、主路径、兜底路径、severity 和占位符声明。
- 当前 bundle 中每个受保护英文 occurrence 都能被证明为 `covered_static`、`covered_semantic` 或 `covered_runtime`，不能只证明“仓库里存在一条映射”。
- 首批 surface + error 级 L3 条目不可能静默掉出路径；孤儿在构建前明确错误。非首批普通 L3 可为 warning，不得伪绿。
- 大小写或空白变化被同一 translation unit 的 alias/`normalizedExact` 吸收，不新增同义 mapping 身份。
- 模板插值描述：primary = semantic `template-prefix`；fallback = `settings_page` 前缀 `normalizedExact`；禁止全局 partial/regex。
- `verify` 能显示当前 bundle 新增、changed alias、L3 orphan、分片归属和真实用户可见合约状态。
- 性能、事务、恢复、卸载和隐私相关自动化门禁通过（含 canary 安装上的 ensure/verify，若用户同意写入）。

**专项发布完成 / enforced 提升（Task 10，不阻塞合入）：**

- 至少在两个不同 Cursor 构建上通过验收，其中一个必须是真实上游升级。
- Task 10 人工 UI 操作矩阵与卸载干净验证全部通过。
- release 工作流依赖上述证据；缺一项不得提升 enforced。

---

## 二、文件结构与权威归属

### 新建文件

- `scripts/lib/mapping/translation-unit-projection.js`：把 translation unit aliases 投影为构建期静态候选，不保存第二份译文。
- `scripts/lib/mapping/runtime-ownership.js`：证明每条受治理映射的静态/语义/运行时唯一归属，输出 orphan/duplicate。
- `scripts/lib/compatibility/volatile-ui-locators.js`：设置卡片、菜单 action、Composer CTA 的稳定语义定位器注册表。
- `scripts/lib/analyzer/volatile-surface-coverage.js`：以当前 harvest occurrence 为分母计算专项覆盖率。
- `scripts/tests/fixtures/update-drift/cursor-3.12.30-volatile-surfaces.json`：只保存人工核准的 UI 文案、字段类型和稳定 ID，不包含 Cursor bundle。
- `scripts/tests/lib/translation-unit-projection.test.js`
- `scripts/tests/lib/runtime-ownership.test.js`
- `scripts/tests/lib/volatile-ui-locators.test.js`
- `scripts/tests/lib/volatile-ui-static-patch.test.js`
- `scripts/tests/lib/volatile-surface-coverage.test.js`
- `scripts/tests/tool/verify-volatile-surfaces.test.js`
- `scripts/tests/tool/volatile-surface-two-build.test.js`

### 修改文件

- `translations/meta/translation-units.json`：高波动文案唯一身份和译文权威来源。
- `translations/meta/surfaces.json`：新增并限定 `settings_page`、`context_menu`、`composer_empty_state`。
- `translations/overlay/cursor-win.common.json`：移除已迁移 translation unit 的重复译文，只保留未迁移普通映射。
- `scripts/lib/mapping/translation-units.js`：严格 schema、alias 规范化、投影输入校验。
- `scripts/lib/mapping/runtime-shards.js`：按 translation unit 构建并接收归属审计结果。
- `scripts/lib/patcher/runtime-selector.js`：不得仅凭 L3 标签静默丢弃未证明条目。
- `scripts/tool/builder/workbench.js`：把投影映射、静态结果和运行时分片归属统一到同一构建证据。
- `scripts/lib/compatibility/prepare-admission.js`：加载全部受保护 translation units 和 locator outcomes。
- `scripts/lib/analyzer/coverage-ledger.js`：新增 `covered_semantic`、`case_drift`、`runtime_orphan` 状态。
- `scripts/tool/commands-harvest.js`：当前 bundle 专项队列优先展示阻断项和 changed alias。
- `scripts/tool/verify.js`：输出专项覆盖、归属、准入和性能证据，并拒绝虚假绿灯。
- `scripts/tool/manifest.js`：持久化可复用的专项证据哈希，不保存 Cursor 专有源码。
- `scripts/lib/runtime/surface-registry.js`、`scripts/lib/runtime/surface-translator.js`：仅在测试证明需要时扩充参数模板匹配；不得扩大全局发现职责。
- `docs/compatibility.md`：记录升级流程、报告解释、真实 UI 验收与停止条件。

---

## 三、执行前检查

- [ ] 确认工作树状态并记录用户已有改动：

```powershell
git status --short
```

预期：输出可以非空；执行者记录已有文件，后续提交不得包含这些无关改动。

- [ ] **先单独提交** `workbench-index` 增强（若仍脏）：

```powershell
git add scripts/lib/patcher/workbench-index.js scripts/tests/lib/workbench-index-reliability.test.js scripts/tests/lib/workbench-index-authoritative-fallback.test.js scripts/tests/lib/product-tips-hook.test.js
git commit -m "fix: harden workbench index template and regex scanning"
```

预期：该 commit 进入 `main` 后再开专项分支；本专项 PR 不混入该 diff 的无关叙述。

- [ ] 从**已更新**的 `main` 创建隔离 worktree；不得在用户脏工作树直接实施：

```powershell
git worktree add .worktrees/volatile-surfaces-remediation -b fix/volatile-surfaces-remediation main
```

预期：新 worktree 位于 `.worktrees/volatile-surfaces-remediation`，分支为 `fix/volatile-surfaces-remediation`。

- [ ] 在隔离 worktree 读取目标文件并确认编码：

```powershell
node -e "const fs=require('fs'); for (const p of ['translations/meta/translation-units.json','translations/meta/surfaces.json','translations/overlay/cursor-win.common.json']) { const b=fs.readFileSync(p); new TextDecoder('utf-8',{fatal:true}).decode(b); console.log(p+': UTF-8 OK'); }"
```

预期：三个文件均输出 `UTF-8 OK`。

- [ ] 运行基线测试与只读 verify（日常安装）：

```powershell
node scripts/run-tests.js
node scripts/cursor-zh-tool.js verify --install-dir "D:\Apps\cursor"
```

预期：测试退出码为 `0`；`verify` 的现有 issue、warning、耗时、runtime mapping count、header KB、admission 状态完整保存到执行记录。现有问题不得被误写为本计划引入。可写操作仅允许针对 `D:\Apps\cursor-canary`（须设置 `CURSOR_ZH_CANARY_INSTALL_DIR` 与之相等）。

---

## 四、分阶段执行清单

### 任务 1：固化 3.12.30 高波动界面 RED 基线

**文件：**

- 新建：`scripts/tests/fixtures/update-drift/cursor-3.12.30-volatile-surfaces.json`
- 新建：`scripts/tests/lib/volatile-surface-coverage.test.js`
- 修改：`scripts/tests/lib/coverage-ledger.test.js`

**接口：**

- 夹具结构固定为 `{ build, occurrences[] }`。
- occurrence 固定字段为 `{ translationId, text, surface, field, stableKey, expectedChangeText }`。
- `stableKey` 必须来自设置键、action ID、字段路径或人工注册的语义 ID，不能使用压缩变量名。

- [ ] **Step 1：对 `D:\Apps\cursor` 只读 live 核对后再写夹具**

§1.2 表仅为候选。对每个候选英文串在当前 desktop/Glass bundle 中确认存在（或确认模板前缀存在）；不存在则移出夹具并记录。夹具至少覆盖 live 确认后的代表文案；对三条模板描述使用 `field: "description-prefix"`；对菜单使用 `field: "action-label"`。`Copy Branch` / `Copy Branch Name` 可作同一 translationId 的两条 occurrence 或一条多 alias 证明，但 stableKey 相同。

夹具示例（字段形状；具体 text 以 live 为准）：

```json
{
  "build": { "cursorVersion": "3.12.30", "vscodeVersion": "1.128.0" },
  "occurrences": [
    {
      "translationId": "settings.startup.window_restoration.title",
      "text": "Window Restoration",
      "surface": "settings_page",
      "field": "label",
      "stableKey": "window-restoration",
      "expectedChangeText": "窗口恢复"
    },
    {
      "translationId": "settings.execution.file_deletion_protection.description",
      "text": "Prevent Agent from deleting files automatically",
      "surface": "settings_page",
      "field": "description-prefix",
      "stableKey": "File-Deletion Protection",
      "expectedChangeText": "防止 Agent 自动删除文件"
    },
    {
      "translationId": "context_menu.copy_branch",
      "text": "Copy Branch",
      "surface": "context_menu",
      "field": "action-label",
      "stableKey": "copy-branch",
      "expectedChangeText": "复制分支"
    },
    {
      "translationId": "context_menu.copy_transcript",
      "text": "Copy Transcript",
      "surface": "context_menu",
      "field": "action-label",
      "stableKey": "copy-transcript",
      "expectedChangeText": "复制对话记录"
    }
  ]
}
```

- [ ] **Step 2：写失败测试，证明旧覆盖率会漏报**

```js
test('current-bundle occurrences expose missing, case drift, and template-prefix gaps', () => {
  const report = analyzeVolatileSurfaceCoverage({ occurrences, units: [], ownership: [] });
  assert.ok(report.blockers.some((item) => item.reason === 'translation_unit_missing'));
  assert.ok(report.blockers.some((item) => item.field === 'description-prefix'));
  assert.equal(report.coveredCount, 0);
});
```

- [ ] **Step 3：运行 RED**

```powershell
node --test scripts/tests/lib/volatile-surface-coverage.test.js scripts/tests/lib/coverage-ledger.test.js
```

预期：因 `volatile-surface-coverage.js` 不存在或没有 `translation_unit_missing` 分类而失败。

- [ ] **Step 4：只提交测试与夹具**

```powershell
git add scripts/tests/fixtures/update-drift/cursor-3.12.30-volatile-surfaces.json scripts/tests/lib/volatile-surface-coverage.test.js scripts/tests/lib/coverage-ledger.test.js
git commit -m "test: capture volatile Cursor surface regressions"
```

**任务验收：** 夹具不包含整段 bundle、用户数据、路径或截图；每条 occurrence 经 live 核对；每个 occurrence 都有 stableKey 和预期中文；测试以预期原因失败。

### 任务 1.5：登记新表面并收窄旧宽 scopes（Task 2 之前）

**文件：**

- 修改：`translations/meta/surfaces.json`
- 修改：`scripts/tests/lib/surfaces.test.js`（若不存在则新建等价表面契约测试）
- 修改：相关 runtime-shards / surface-registry 测试中依赖旧 scopes 的断言

- [ ] **Step 0：写 RED，锁定最终标记选择器与收窄契约**

证明：

1. `settings_page` / `context_menu` / `composer_empty_state` 已登记为 L3，且 `runtimeScopes` **恰好**为对应 `[data-cursor-zh-surface="…"]`。
2. `settings_search` 不再包含会匹配整页 settings 的宽 `[class*="settings"]`（改为搜索专用选择器；具体选择器由 RED 固定）。
3. `glass_menu` 不再用裸 `[role="menu"]` 吞掉上下文菜单。
4. `composer_chrome` 不再用宽 `[class*="composer"]` 吞掉空状态。

- [ ] **Step 1：最小登记与收窄实现**

写入三个新 surface；收窄三个旧 surface。此时尚未注入标记 → 新分片不激活，属预期。

- [ ] **Step 2：GREEN 后提交**

```powershell
git add translations/meta/surfaces.json scripts/tests/lib/surfaces.test.js
git commit -m "feat: register volatile surfaces and narrow legacy scopes"
```

**任务验收：** units 尚未迁移也可通过 validate；新 surface 可被后续 Task 2 引用；旧宽 scopes 有失败测试证明已被收窄。

### 任务 2：让 translation unit 成为高波动文案唯一权威来源

**文件：**

- 新建：`scripts/lib/mapping/translation-unit-projection.js`
- 新建：`scripts/tests/lib/translation-unit-projection.test.js`
- 修改：`scripts/lib/mapping/translation-units.js`
- 修改：`scripts/tests/lib/translation-units.test.js`
- 修改：`translations/meta/translation-units.json`
- 修改：`translations/overlay/cursor-win.common.json`

**接口：**

- `projectTranslationUnitMappings(units) -> Mapping[]`
- 每个派生 mapping 固定包含 `{ translationId, originalText, changeText, searchType, surface, source: 'translation-unit' }`。
- `normalizedExact` 只用于界面域运行时 alias；静态投影仍生成每个明确 alias 的 `exact` 条目。

- [ ] **Step 1：写 RED，要求 alias 投影和唯一译文**

```js
test('projects every approved alias without duplicating translation ownership', () => {
  const mappings = projectTranslationUnitMappings([{
    translationId: 'settings.worktrees.max_worktrees',
    changeText: '最大工作树数量',
    aliases: ['Max worktrees', 'Max Worktrees'],
    owner: 'settings_page',
    primary: { kind: 'mapping' },
    fallback: { kind: 'runtime-surface', surface: 'settings_page', match: 'normalizedExact' },
    severity: 'error',
    placeholders: [],
  }]);
  assert.deepEqual(mappings.map((item) => item.originalText), ['Max worktrees', 'Max Worktrees']);
  assert.ok(mappings.every((item) => item.translationId === 'settings.worktrees.max_worktrees'));
  assert.ok(mappings.every((item) => item.changeText === '最大工作树数量'));
});
```

- [ ] **Step 2：运行 RED**

```powershell
node --test scripts/tests/lib/translation-unit-projection.test.js scripts/tests/lib/translation-units.test.js
```

预期：因投影模块不存在而失败。

- [ ] **Step 3：实现最小投影器**

```js
'use strict';

function projectTranslationUnitMappings(units = []) {
  return units.flatMap((unit) => unit.aliases.map((alias) => ({
    translationId: unit.translationId,
    originalText: alias,
    changeText: unit.changeText,
    searchType: 'exact',
    surface: unit.fallback?.surface || unit.owner,
    source: 'translation-unit',
  })));
}

module.exports = { projectTranslationUnitMappings };
```

- [ ] **Step 4：强化 schema**

`validateTranslationUnits()` 必须拒绝：空 owner、重复 alias、同一 translationId 内规范化后重复 alias、无 severity、无 primary、无 fallback、占位符声明与 alias/changeText 不一致。错误必须包含 translationId。

- [ ] **Step 5：迁移首批单元**

把第 1.2 节条目写入 `translation-units.json`；大小写变体放在同一 aliases 数组。迁移后从 `cursor-win.common.json` 删除对应重复条目，避免 changeText 双重所有权。产品名和未确认短枚举不进入单元。

- [ ] **Step 6：运行 GREEN**

```powershell
node --test scripts/tests/lib/translation-unit-projection.test.js scripts/tests/lib/translation-units.test.js scripts/tests/cursor-zh-config.test.js
```

预期：全部通过；重复 source-of-truth 测试证明迁移条目不再同时存在于 common mappings。

- [ ] **Step 7：提交**

```powershell
git add scripts/lib/mapping/translation-unit-projection.js scripts/tests/lib/translation-unit-projection.test.js scripts/lib/mapping/translation-units.js scripts/tests/lib/translation-units.test.js translations/meta/translation-units.json translations/overlay/cursor-win.common.json
git commit -m "feat: govern volatile copy by translation id"
```

**任务验收：** `Max worktrees` 与 `Max Worktrees` 共享一个 translationId；没有全局 `Mode`、`Agent`、`Default`、`System` 映射；每条迁移文案只有一个中文权威来源。

### 任务 3：关闭 L3 静态/运行时无归属漏洞

**文件：**

- 新建：`scripts/lib/mapping/runtime-ownership.js`
- 新建：`scripts/tests/lib/runtime-ownership.test.js`
- 修改：`scripts/lib/mapping/runtime-shards.js`
- 修改：`scripts/tests/lib/runtime-shards.test.js`
- 修改：`scripts/lib/patcher/runtime-selector.js`
- 修改：`scripts/tests/lib/l3-surface-runtime.test.js`
- 修改：`scripts/tool/builder/workbench.js`
- 修改：`scripts/tests/tool/workbench-builder.test.js`

**接口：**

- `auditRuntimeOwnership({ mappings, units, surfaces, staticEvidence, semanticEvidence, options })`
- 返回 `{ owned, orphaned, duplicateOwners, warnings }`。
- **当前生效 owner** 只能是 `static`、`semantic:<locatorId>` 或 `runtime:<surfaceId>` 之一（决议 #6）。
- primary（static/semantic）已命中时，声明的 runtime fallback **不计入** `duplicateOwners`，可记录为 `declaredFallback`。
- `duplicateOwners` 仅用于双主路径冲突或两个 runtime surface 争用。
- 孤儿硬失败范围（决议 #7）：`options.firstBatchSurfaces` ∪ severity=error；其余 L3 进 `warnings`，不阻断构建。

- [ ] **Step 1：写 RED，复现当前静默丢失**

```js
test('reports an L3 mapping that is neither statically replaced nor present in a shard', () => {
  const report = auditRuntimeOwnership({
    mappings: [{ originalText: 'Prevent Agent from deleting files automatically', changeText: '防止 Agent 自动删除文件', searchType: 'exact', surface: 'settings_page' }],
    units: [],
    surfaces: { settings_page: { defaultLayer: 'L3', runtimeScopes: ['[data-cursor-zh-surface="settings_page"]'] } },
    staticEvidence: new Map(),
    semanticEvidence: new Map(),
    options: { firstBatchSurfaces: ['settings_page', 'context_menu', 'composer_empty_state'] },
  });
  assert.equal(report.orphaned.length, 1);
  assert.equal(report.orphaned[0].reason, 'l3_without_static_semantic_or_runtime_owner');
});

test('primary static hit plus declared runtime fallback is not duplicateOwners', () => {
  const report = auditRuntimeOwnership({
    mappings: [{ translationId: 'settings.worktrees.max_worktrees', originalText: 'Max Worktrees', surface: 'settings_page' }],
    units: [{ translationId: 'settings.worktrees.max_worktrees', aliases: ['Max Worktrees'], fallback: { kind: 'runtime-surface', surface: 'settings_page' } }],
    surfaces: { settings_page: { defaultLayer: 'L3', runtimeScopes: ['[data-cursor-zh-surface="settings_page"]'] } },
    staticEvidence: new Map([['Max Worktrees', { status: 'applied' }]]),
    semanticEvidence: new Map(),
    options: { firstBatchSurfaces: ['settings_page'] },
  });
  assert.equal(report.duplicateOwners.length, 0);
  assert.equal(report.owned[0].owner, 'static');
});
```

- [ ] **Step 2：运行 RED**

```powershell
node --test scripts/tests/lib/runtime-ownership.test.js scripts/tests/lib/runtime-shards.test.js scripts/tests/lib/l3-surface-runtime.test.js
```

预期：因归属审计模块不存在而失败。

- [ ] **Step 3：实现归属审计（当前生效 owner 唯一）**

```js
function auditRuntimeOwnership({ mappings = [], units = [], surfaces = {}, staticEvidence = new Map(), semanticEvidence = new Map(), options = {} }) {
  const firstBatch = new Set(options.firstBatchSurfaces || []);
  const unitByAlias = new Map(units.flatMap((unit) => (unit.aliases || []).map((alias) => [alias, unit])));
  const owned = [];
  const orphaned = [];
  const duplicateOwners = [];
  const warnings = [];
  for (const mapping of mappings) {
    const primaryOwners = [];
    if (staticEvidence.get(mapping.originalText)?.status === 'applied') primaryOwners.push('static');
    const semantic = semanticEvidence.get(mapping.translationId);
    if (semantic?.status === 'resolved') primaryOwners.push(`semantic:${semantic.locatorId}`);
    const unit = unitByAlias.get(mapping.originalText) || units.find((item) => item.translationId === mapping.translationId);
    const declaredRuntime = unit?.fallback?.kind === 'runtime-surface' ? `runtime:${unit.fallback.surface}` : null;
    if (primaryOwners.length > 1) {
      duplicateOwners.push({ mapping, owners: primaryOwners });
      continue;
    }
    if (primaryOwners.length === 1) {
      owned.push({ mapping, owner: primaryOwners[0], declaredFallback: declaredRuntime || undefined });
      continue;
    }
    if (declaredRuntime) {
      owned.push({ mapping, owner: declaredRuntime });
      continue;
    }
    const isFirstBatch = firstBatch.has(mapping.surface) || unit?.severity === 'error';
    const gap = { mapping, reason: 'l3_without_static_semantic_or_runtime_owner' };
    if (surfaces[mapping.surface]?.defaultLayer === 'L3' && isFirstBatch) orphaned.push(gap);
    else if (surfaces[mapping.surface]?.defaultLayer === 'L3') warnings.push(gap);
    else owned.push({ mapping, owner: 'static-candidate' });
  }
  return { owned, orphaned, duplicateOwners, warnings };
}
```

- [ ] **Step 4：构建前硬门禁**

`generateTranslatedWorkbenchBundle()`（及实际写盘前的 bundle-builder 路径）在写入 generated/installed 文件之前运行审计。`orphaned` 或 `duplicateOwners` 非空时抛出包含 translationId、originalText 和 surface 的错误。`warnings` 写入报告但不阻断。禁止在失败后退回旧的全局运行时池。

- [ ] **Step 5：修正 runtime selector 不变量（同步改旧绿测）**

`selectRuntimeMappings()` 不再以 `isL3SurfaceMapping(...) -> false` 作为无证据终点。

- 调用方提供 ownership / 首批上下文时：未证明条目交给审计（首批硬失败，非首批 warning）。
- **必须同步修改**现有把「未静态命中的 L3 exact 被排除」当作正确行为的测试（如 `runtime-pool-prune-ux`、`l3-surface-runtime`、`patcher-runtime`）：改为断言「进入 orphan/warning 路径」或「有 unit fallback 则进分片」，禁止静默丢弃。

- [ ] **Step 6：运行 GREEN**

```powershell
node --test scripts/tests/lib/runtime-ownership.test.js scripts/tests/lib/runtime-shards.test.js scripts/tests/lib/l3-surface-runtime.test.js scripts/tests/tool/workbench-builder.test.js scripts/tests/lib/runtime-selector-glass.test.js scripts/tests/lib/runtime-pool-prune-ux.test.js
```

预期：孤儿测试明确失败语义、合法静态/语义/分片路径通过、旧选择器测试已按新不变量更新且通过。

- [ ] **Step 7：提交**

```powershell
git add scripts/lib/mapping/runtime-ownership.js scripts/tests/lib/runtime-ownership.test.js scripts/lib/mapping/runtime-shards.js scripts/tests/lib/runtime-shards.test.js scripts/lib/patcher/runtime-selector.js scripts/tests/lib/l3-surface-runtime.test.js scripts/tool/builder/workbench.js scripts/tests/tool/workbench-builder.test.js scripts/tests/lib/runtime-pool-prune-ux.test.js
git commit -m "fix: close L3 runtime ownership gaps"
```

**任务验收：** 构建 manifest 中每条首批单元都有唯一**当前生效** ownership；声明式 fallback 可并存；`command_palette` 等非首批零分片不再静默吞掉，但本专项不要求填满其条目。

### 任务 4：为模板描述和菜单 action 增加稳定语义定位

**文件：**

- 新建：`scripts/lib/compatibility/volatile-ui-locators.js`
- 新建：`scripts/tests/lib/volatile-ui-locators.test.js`
- 修改：`scripts/lib/compatibility/prepare-admission.js`
- 修改：`scripts/tests/lib/prepare-admission.test.js`
- 修改：`scripts/lib/compatibility/semantic-locator.js`
- 修改：`scripts/tests/lib/semantic-locator.test.js`
- 修改：`scripts/lib/patcher/static.js`
- 新建：`scripts/tests/lib/volatile-ui-static-patch.test.js`

**接口：**

- `VOLATILE_UI_LOCATORS` 以 locatorId 索引。
- locator 至少包含 `{ locatorId, capabilityId, anchor, required, field, cardinality, replacementMode }`。
- `replacementMode` 仅允许 `whole-literal`、`template-prefix`、`object-field`。

- [ ] **Step 1：写模板前缀 RED**

```js
test('relocates a settings description by stable card id after minified variable rename', () => {
  const source = 'K(Card,{id:X,label:"File-Deletion Protection",get description(){return`Prevent Agent from deleting files automatically${admin?" (controlled by admin)":""}`}})';
  const outcome = resolveSemanticLocator(source, VOLATILE_UI_LOCATORS['settings.execution.file_deletion_protection.description']);
  assert.equal(outcome.status, 'resolved');
  assert.equal(outcome.matches.length, 1);
});

test('blocks when the stable card id resolves to two descriptions', () => {
  const source = fixture + fixture;
  const outcome = resolveSemanticLocator(source, locator);
  assert.equal(outcome.status, 'ambiguous');
});
```

- [ ] **Step 2：运行 RED**

```powershell
node --test scripts/tests/lib/volatile-ui-locators.test.js scripts/tests/lib/semantic-locator.test.js scripts/tests/lib/prepare-admission.test.js
```

预期：因 locator 注册表和 template-prefix 结果不存在而失败。

- [ ] **Step 3：登记首批 locator**

至少登记：

- `settings.execution.file_deletion_protection.description`，anchor=`File-Deletion Protection`
- `settings.execution.external_file_protection.description`，anchor=`External-File Protection`
- `settings.git.pr_attribution.description`，anchor=`PR Attribution`
- `context_menu.copy_id`，anchor=`copy-id`
- `context_menu.copy_branch`，anchor=`copy-branch`
- `context_menu.copy_transcript`，anchor=`copy-transcript`
- `composer.empty_state.connect_repos`，anchor=`connect-repos`

每个 locator 的 required tokens 必须包含字段名和稳定 ID；不得使用压缩变量名、函数名或大段版本源码片段。

- [ ] **Step 4：实现受限替换**

`template-prefix` 只替换同一模板字面量 `${` 之前的前缀，并保留其余模板、占位符数量和表达式字节。修改后必须重新 tokenize 并证明 locator 基数仍为 1、中文前缀出现 1 次、英文前缀出现 0 次。

同一组语义 hook 还必须给三个已确认的表面根写入固定标记，供任务 5 精确激活分片：

```text
data-cursor-zh-surface="settings_page"
data-cursor-zh-surface="context_menu"
data-cursor-zh-surface="composer_empty_state"
```

标记只能插入语义 locator 唯一命中的根组件属性对象；每个根恰好一次。若不能证明唯一根，则该表面 **fallback proof 缺失**：按决议 #5 **按 unit 分级**——已 static/semantic 覆盖的 unit 不因缺标记而整单 BLOCKED；仅依赖 runtime 的 error 级 unit → `BLOCKED`。禁止退回 class 模糊猜测。

三条模板描述的分片兜底：在 `settings_page` 分片中只放入**前缀**的 `normalizedExact` 条目，不放入带动态后缀的整句。

- [ ] **Step 5：运行变形 GREEN**

```powershell
node --test scripts/tests/lib/volatile-ui-locators.test.js scripts/tests/lib/volatile-ui-static-patch.test.js scripts/tests/lib/semantic-locator.test.js scripts/tests/lib/prepare-admission.test.js
```

预期：压缩变量重命名、引号/空白变化、无关邻近字面量插入均通过；三个表面标记各出现一次；重复稳定 ID、字段缺失和基数错误得到 `ambiguous` 或 `missing`，绝不修改源码。

- [ ] **Step 6：提交**

```powershell
git add scripts/lib/compatibility/volatile-ui-locators.js scripts/tests/lib/volatile-ui-locators.test.js scripts/tests/lib/volatile-ui-static-patch.test.js scripts/lib/compatibility/prepare-admission.js scripts/tests/lib/prepare-admission.test.js scripts/lib/compatibility/semantic-locator.js scripts/tests/lib/semantic-locator.test.js scripts/lib/patcher/static.js
git commit -m "feat: relocate volatile UI copy semantically"
```

**任务验收：** 三条模板描述在 3.12.30 夹具中静态/语义处理成功；任一 locator 歧义都进入 fallback 或 BLOCKED；不新增版本专用长片段。

### 任务 5：建立限定的设置页、上下文菜单和 Composer 分片

**文件：**

- 修改：`translations/meta/surfaces.json`
- 修改：`scripts/lib/mapping/runtime-shards.js`
- 修改：`scripts/lib/runtime/surface-registry.js`
- 修改：`scripts/lib/runtime/surface-translator.js`
- 修改：`scripts/tests/lib/runtime-shards.test.js`
- 修改：`scripts/tests/lib/runtime-surface-lifecycle.test.js`
- 修改：`scripts/tests/lib/runtime-translate-perf.test.js`
- 修改：`scripts/tests/lib/helpers/runtime-dom-harness.js`

**接口：**

- 新增表面：`settings_page`、`context_menu`、`composer_empty_state`。
- 分片 entry 固定为 `{ translationId, aliases, changeText, match }`。
- 首批 `match` 只允许 `exact`、`normalizedExact`；参数模板由任务 4 语义路径处理，不增加全局 partial。

- [ ] **Step 1：写生命周期 RED**

```js
test('loads settings aliases only after settings root mounts and disposes on unmount', () => {
  const harness = createRuntimeDomHarness({ shards });
  assert.equal(harness.parsedShardCount('settings_page'), 0);
  const root = harness.mountSurface('settings_page');
  harness.flushDiscoveryIdleBatch();
  assert.equal(harness.activeSurfaceObserverCount(), 1);
  assert.equal(root.textContent.includes('窗口恢复'), true);
  harness.unmount(root);
  harness.flushDiscoveryIdleBatch();
  assert.equal(harness.activeSurfaceObserverCount(), 0);
});
```

- [ ] **Step 2：运行 RED**

```powershell
node --test scripts/tests/lib/runtime-shards.test.js scripts/tests/lib/runtime-surface-lifecycle.test.js scripts/tests/lib/runtime-translate-perf.test.js
```

预期：因新表面未登记或没有 entries 而失败。

- [ ] **Step 3：登记精确表面根（若 Task 1.5 已写入则此处只做注入联动验证）**

`surfaces.json` 必须使用任务 4 注入的固定标记，不登记 class contains 或裸 `[role="menu"]`（旧表面收窄已在 Task 1.5 完成）：

```json
{
  "settings_page": {
    "defaultLayer": "L3",
    "runtimeScopes": ["[data-cursor-zh-surface=\"settings_page\"]"]
  },
  "context_menu": {
    "defaultLayer": "L3",
    "runtimeScopes": ["[data-cursor-zh-surface=\"context_menu\"]"]
  },
  "composer_empty_state": {
    "defaultLayer": "L3",
    "runtimeScopes": ["[data-cursor-zh-surface=\"composer_empty_state\"]"]
  }
}
```

如果上游升级导致任务 4 无法重新定位并注入标记，prepare 必须按决议 #5 分级：`BLOCKED`（仅 runtime 依赖）或带当前 proof 的 `DEGRADED`；不得临时扩大选择器，不得回退到已收窄前的宽 class。

- [ ] **Step 4：验证 observer 边界**

测试必须证明：

- 未挂载时不解析三个分片；
- 全局发现观察器只有一个；
- 发现批次最多 30 个新增根节点；
- 每个表面最多一个 observer；
- 表面外同名文本不翻译；
- input、textarea、contenteditable、编辑器、终端、聊天正文和代码不采集、不翻译；
- 卸载后 pending 队列清空且 observer 断开。

- [ ] **Step 5：运行 GREEN 与大小门禁**

```powershell
node --test scripts/tests/lib/runtime-shards.test.js scripts/tests/lib/runtime-surface-lifecycle.test.js scripts/tests/lib/runtime-translate-perf.test.js scripts/tests/lib/l3-surface-runtime.test.js
```

预期：全部通过；三个分片各自 `<= 20 KB`；核心 payload 不增加未挂载分片正文。

- [ ] **Step 6：提交**

```powershell
git add translations/meta/surfaces.json scripts/lib/mapping/runtime-shards.js scripts/lib/runtime/surface-registry.js scripts/lib/runtime/surface-translator.js scripts/tests/lib/runtime-shards.test.js scripts/tests/lib/runtime-surface-lifecycle.test.js scripts/tests/lib/runtime-translate-perf.test.js scripts/tests/lib/helpers/runtime-dom-harness.js
git commit -m "feat: add bounded volatile surface fallbacks"
```

**任务验收：** 分片只在表面出现时激活；无轮询和全页扫描；同名业务内容不被误翻；所有大小与批次预算通过。

### 任务 6：把覆盖率分母改为当前 bundle occurrence

**文件：**

- 新建：`scripts/lib/analyzer/volatile-surface-coverage.js`
- 修改：`scripts/tests/lib/volatile-surface-coverage.test.js`
- 修改：`scripts/lib/analyzer/coverage-ledger.js`
- 修改：`scripts/tests/lib/coverage-ledger.test.js`
- 修改：`scripts/tool/commands-harvest.js`
- 修改：`scripts/tests/tool/commands-harvest.test.js`

**接口：**

- `analyzeVolatileSurfaceCoverage({ occurrences, units, ownership, locatorOutcomes })`
- 返回 `{ total, coveredCount, blockers, changedAliases, unknown, bySurface }`。
- `total` 必须来自当前 harvest occurrence；不能来自旧 mapping target 数。

- [ ] **Step 1：扩充 RED**

```js
test('counts new current-bundle text as unknown instead of dropping it from the denominator', () => {
  const report = analyzeVolatileSurfaceCoverage({
    occurrences: [{ text: 'Brand New Setting', surface: 'settings_page', stableKey: 'brand-new-setting' }],
    units: [],
    ownership: [],
    locatorOutcomes: [],
  });
  assert.equal(report.total, 1);
  assert.equal(report.coveredCount, 0);
  assert.equal(report.unknown[0].text, 'Brand New Setting');
});

test('classifies capitalization changes as changed aliases', () => {
  const report = analyzeVolatileSurfaceCoverage({ occurrences, units, ownership, locatorOutcomes: [] });
  assert.ok(report.changedAliases.some((item) => item.before === 'Max worktrees' && item.after === 'Max Worktrees'));
});
```

- [ ] **Step 2：运行 RED**

```powershell
node --test scripts/tests/lib/volatile-surface-coverage.test.js scripts/tests/lib/coverage-ledger.test.js scripts/tests/tool/commands-harvest.test.js
```

预期：新文案未进入 unknown 或 capitalization drift 未识别，测试失败。

- [ ] **Step 3：实现确定性分类**

优先级固定为：

1. `blocked_contract`
2. `runtime_orphan`
3. `changed_alias`
4. `critical_unknown`
5. `visible_unknown`
6. `covered_semantic`
7. `covered_static`
8. `covered_runtime`

大小写/空白规范化只能建议 alias，不能自动生成中文或自动提交映射。

- [ ] **Step 4：更新 harvest 队列**

`P0 Contract gate` 先显示 blocked/orphan；`P1 Diff additions` 显示当前 bundle 新文案；`P1 Alias drift` 显示稳定 ID 相同但文本变化；报告必须显示分母、每表面 unknown 数和真实覆盖路径。

- [ ] **Step 5：运行 GREEN**

```powershell
node --test scripts/tests/lib/volatile-surface-coverage.test.js scripts/tests/lib/coverage-ledger.test.js scripts/tests/tool/commands-harvest.test.js scripts/tests/lib/harvest-diff.test.js scripts/tests/lib/harvest-string-quality.test.js
```

预期：全部通过；`Brand New Setting` 必须计入总数和 unknown，不能消失。

- [ ] **Step 6：提交**

```powershell
git add scripts/lib/analyzer/volatile-surface-coverage.js scripts/tests/lib/volatile-surface-coverage.test.js scripts/lib/analyzer/coverage-ledger.js scripts/tests/lib/coverage-ledger.test.js scripts/tool/commands-harvest.js scripts/tests/tool/commands-harvest.test.js
git commit -m "fix: measure coverage from current Cursor surfaces"
```

**任务验收：** 报告分母等于当前 harvest occurrence 数；新增文案、case drift 和孤儿映射都可见；旧 1244-target 统计只作为兼容指标，不再作为用户可见完成证明。

### 任务 7：把专项证据接入 Update Admission 和隔离报告

**文件：**

- 修改：`scripts/lib/compatibility/prepare-admission.js`
- 修改：`scripts/lib/compatibility/admission.js`
- 修改：`scripts/tests/lib/prepare-admission.test.js`
- 修改：`scripts/tests/lib/update-admission.test.js`
- 修改：`scripts/tool/manifest.js`
- 修改：`scripts/tests/tool/manifest.test.js`
- 修改：`scripts/tool/report.js`

**接口：**

- 每个 unit outcome 增加 `{ translationId, severity, primary, fallback, ownership, occurrenceStatus }`。
- admission 理由增加 `critical-unknown`、`runtime-orphan`、`semantic-ambiguous`、`fallback-proof-missing`。

- [ ] **Step 1：写 RED**

```js
test('blocks when a critical current occurrence has no translation unit', () => {
  const result = classifyUpdateAdmission({
    drift: true,
    outcomes: [{ translationId: 'settings.execution.new_guard', severity: 'error', primary: 'missing', occurrenceStatus: 'critical-unknown' }],
    currentProofKey: 'proof',
  });
  assert.equal(result.status, 'BLOCKED');
  assert.match(result.reasons.join('\n'), /critical-unknown/);
});

test('allows DEGRADED only with a current scoped fallback proof', () => {
  const result = classifyUpdateAdmission({ drift: true, outcomes: [provedFallback], currentProofKey: provedFallback.fallbackProof.proofKey });
  assert.equal(result.status, 'DEGRADED');
});
```

- [ ] **Step 2：运行 RED**

```powershell
node --test scripts/tests/lib/prepare-admission.test.js scripts/tests/lib/update-admission.test.js scripts/tests/tool/manifest.test.js
```

预期：critical occurrence 尚未进入 admission，测试失败。

- [ ] **Step 3：接线 outcomes**

prepare 必须合并 semantic locator、runtime ownership、current occurrence coverage 和 fallback proof。以下情况必须 `BLOCKED`：error 级且仅依赖 runtime 的 unknown、首批 L3 orphan、semantic ambiguous（针对该 unit 主路径）、重复**主路径** owner、过期 proof、分片超预算。已 static/semantic 覆盖的 unit 不因同表面标记缺失而株连整单。没有当前 proof 的 fallback 不能得到 `DEGRADED`。

- [ ] **Step 4：保护隔离报告隐私**

静态 harvest 可保存 UI 字面量；运行时只有显式 allowlisted chrome 可以保存原文。输入框、编辑器、终端、聊天、代码和动态值保持零原文；其他只保存会话 HMAC 指纹或聚合计数。manifest 只保存报告路径、哈希和计数。

- [ ] **Step 5：运行 GREEN**

```powershell
node --test scripts/tests/lib/prepare-admission.test.js scripts/tests/lib/update-admission.test.js scripts/tests/tool/manifest.test.js scripts/tests/lib/runtime-surface-lifecycle.test.js
```

预期：全部通过；没有当前 proof 的 fallback 不能得到 DEGRADED。

- [ ] **Step 6：提交**

```powershell
git add scripts/lib/compatibility/prepare-admission.js scripts/lib/compatibility/admission.js scripts/tests/lib/prepare-admission.test.js scripts/tests/lib/update-admission.test.js scripts/tool/manifest.js scripts/tests/tool/manifest.test.js scripts/tool/report.js
git commit -m "fix: gate updates on visible volatile surfaces"
```

**任务验收：** `KNOWN_DRIFT + unknown: 0` 只有在当前 occurrence 已全部分类后才可能出现；BLOCKED 零安装写入；DEGRADED 每个失败主路径都有当前版本分片证明。

### 任务 8：让 verify 报告真实归属、覆盖和性能

**文件：**

- 新建：`scripts/tests/tool/verify-volatile-surfaces.test.js`
- 修改：`scripts/tool/verify.js`
- 修改：`scripts/tests/tool/verify.test.js`
- 修改：`scripts/tool/runtime-strategy.js`
- 修改：`scripts/tests/tool/runtime-strategy.test.js`

**接口：**

- verify 新增 `[Volatile Surface Coverage]` 和机器可读同构字段。
- 输出 `currentOccurrences / coveredStatic / coveredSemantic / coveredRuntime / changedAliases / unknown / runtimeOrphans / duplicateOwners`。
- runtime bucket 统计必须与 manifest/runtime header 解析结果一致。

- [ ] **Step 1：写 RED**

```js
test('verify fails when legacy target coverage is green but a current volatile occurrence is unknown', () => {
  const report = verifyFixture({
    cursorWinCoverage: { mappedTargetCount: 859, missingTargets: [] },
    volatileSurfaceCoverage: { total: 1, coveredCount: 0, unknown: [{ text: 'Brand New Setting', severity: 'error' }], blockers: [] },
  });
  assert.ok(report.issues.some((issue) => issue.includes('Brand New Setting')));
});

test('verify reports identical runtime buckets from manifest and installed header', () => {
  assert.deepEqual(report.installedRuntimePoolCounts, report.manifestRuntimePoolCounts);
});
```

- [ ] **Step 2：运行 RED**

```powershell
node --test scripts/tests/tool/verify-volatile-surfaces.test.js scripts/tests/tool/verify.test.js scripts/tests/tool/runtime-strategy.test.js
```

预期：专项段落或 runtime bucket 一致性检查不存在，测试失败。

- [ ] **Step 3：实现输出和失败语义**

error 级 unknown/orphan/duplicate/ambiguous 进入 Issues；warning 级 visible unknown 进入 Warnings；changed alias 显示 before/after/stableKey，但未核准前不计覆盖。复用缓存键必须包含 current harvest hash、translation units hash、locator registry hash、surfaces hash 和 runtime governance hash。

- [ ] **Step 4：运行 GREEN**

```powershell
node --test scripts/tests/tool/verify-volatile-surfaces.test.js scripts/tests/tool/verify.test.js scripts/tests/tool/runtime-strategy.test.js scripts/tests/tool/coverage.test.js
```

预期：全部通过；manifest/header buckets 不一致会明确失败，不能把全部 473 条误报成同一 bucket。

- [ ] **Step 5：提交**

```powershell
git add scripts/tests/tool/verify-volatile-surfaces.test.js scripts/tool/verify.js scripts/tests/tool/verify.test.js scripts/tool/runtime-strategy.js scripts/tests/tool/runtime-strategy.test.js
git commit -m "fix: make volatile surface verification truthful"
```

**任务验收：** verify 不再以旧映射目标绿灯代替当前界面覆盖；专项问题包含 translationId、surface、路径和修复队列；性能证据仍区分 QUALIFIED/UNQUALIFIED。

### 任务 9：3.12.30 构建、全量测试和编码门禁

**文件：**

- 修改：`scripts/tests/cursor-zh-tool.integration.test.js`
- 修改：`scripts/tests/cursor-zh-config.test.js`
- 修改：`docs/compatibility.md`

- [ ] **Step 1：运行专项测试矩阵**

```powershell
node --test scripts/tests/lib/translation-units.test.js scripts/tests/lib/translation-unit-projection.test.js scripts/tests/lib/runtime-ownership.test.js scripts/tests/lib/volatile-ui-locators.test.js scripts/tests/lib/runtime-shards.test.js scripts/tests/lib/runtime-surface-lifecycle.test.js scripts/tests/lib/runtime-translate-perf.test.js scripts/tests/lib/volatile-surface-coverage.test.js scripts/tests/lib/prepare-admission.test.js scripts/tests/lib/update-admission.test.js scripts/tests/tool/commands-harvest.test.js scripts/tests/tool/verify-volatile-surfaces.test.js scripts/tests/tool/verify.test.js
```

预期：全部通过，失败数为 `0`。

- [ ] **Step 2：运行全量测试**

```powershell
node scripts/run-tests.js
```

预期：退出码 `0`，失败数 `0`；跳过项只能是仓库已声明的允许跳过项。

- [ ] **Step 3：运行 PowerShell AST 门禁**

```powershell
$errors = @()
Get-ChildItem -Path .\scripts -Filter *.ps1 -Recurse | ForEach-Object {
  $tokens = $null
  $parseErrors = $null
  [void][System.Management.Automation.Language.Parser]::ParseFile($_.FullName, [ref]$tokens, [ref]$parseErrors)
  $errors += $parseErrors
}
if ($errors.Count -gt 0) { $errors | Format-List; exit 1 }
```

预期：退出码 `0`，没有 parse error。

- [ ] **Step 4：验证 JSON UTF-8 与 schema**

```powershell
node -e "const fs=require('fs'); for (const p of ['translations/meta/translation-units.json','translations/meta/surfaces.json','translations/overlay/cursor-win.common.json']) { const text=new TextDecoder('utf-8',{fatal:true}).decode(fs.readFileSync(p)); JSON.parse(text); console.log(p+': UTF-8 JSON OK'); }"
```

预期：三个文件均输出 `UTF-8 JSON OK`，不存在替换字符或 NUL。

- [ ] **Step 5：运行 3.12.30 预构建/verify**

只在用户明确同意的可抛弃 canary 安装执行写入；日常安装 `D:\Apps\cursor` 只允许运行 read-only verify。测试安装命令：

```powershell
$env:CURSOR_ZH_CANARY_INSTALL_DIR = "D:\Apps\cursor-canary"
node scripts/cursor-zh-tool.js ensure --install-dir $env:CURSOR_ZH_CANARY_INSTALL_DIR
node scripts/cursor-zh-tool.js verify --install-dir $env:CURSOR_ZH_CANARY_INSTALL_DIR
```

预期：无首批 orphan、duplicate **主路径** owner、critical unknown、semantic ambiguous；受保护 occurrence 覆盖率为 100%；core/分片预算通过。

- [ ] **Step 6：提交集成门禁和文档**

```powershell
git add scripts/tests/cursor-zh-tool.integration.test.js scripts/tests/cursor-zh-config.test.js docs/compatibility.md
git commit -m "test: gate volatile surface remediation"
```

### 任务 10：真实 UI、双构建、升级和恢复验收（release / enforced 门禁；不阻塞合入 main）

**文件：**

- 新建：`scripts/tests/tool/volatile-surface-two-build.test.js`
- 修改：`.github/workflows/release.yml`
- 修改：`docs/compatibility.md`

前置：Task 1–9 已可合入 `main`。本任务失败不得用放宽覆盖率换发布，但**不**要求 revert 已合入的机制修复。

- [ ] **Step 1：增加双构建证据 RED**

```js
test('promotion requires two distinct Cursor builds and one real upstream update', () => {
  const result = validateVolatileSurfacePromotion({ builds: [buildA, buildA] });
  assert.equal(result.ok, false);
  assert.match(result.issues.join('\n'), /two distinct Cursor builds/);
});
```

- [ ] **Step 2：运行 RED**

```powershell
node --test scripts/tests/tool/volatile-surface-two-build.test.js
```

预期：提升验证不存在或没有专项证据，测试失败。

- [ ] **Step 3：在两个构建生成证据**

要求：构建 A 为 3.12.30，构建 B 为后续真实 Cursor 上游版本；两者都在登记的可抛弃安装目录 `D:\Apps\cursor-canary`（或第二 canary 路径）运行 `ensure` 和 `verify`。证据只保存版本、hash、合约结果、计数、性能资格和人工 UI 结果，不保存 bundle。

- [ ] **Step 4：执行真实用户操作矩阵**

每个构建都必须人工执行并记录：

1. 打开 Settings → Startup，确认分组、窗口恢复标题和描述为中文。
2. 打开 Agent Conversations，确认代码块换行标题和描述为中文。
3. 打开 Default Environment、Voice、Remote Control、Execution and Approvals、LSP、Task Models、Git/PR、Worktrees、Browser & Network 区域，确认表内受保护文案为中文，产品名/协议名保持原文。
4. 打开对话/任务上下文菜单，确认 Copy ID、Copy Branch（或 Copy Branch Name）、Copy Transcript 为中文。
5. 打开 Composer 空状态，确认 Connect Your Repos 为中文。
6. 切换设置、关闭菜单并返回编辑器，确认 observer 数量回落，无输入延迟、闪烁、重复翻译或业务正文误翻。
7. 冷启动和正常工作区启动各一次，确认无白屏、配置目录漂移或历史丢失。

- [ ] **Step 5：执行卸载/恢复**

完全退出测试 Cursor 后运行：

```powershell
$env:CURSOR_ZH_CANARY_INSTALL_DIR = "D:\Apps\cursor-canary"
node scripts/cursor-zh-tool.js uninstall --install-dir $env:CURSOR_ZH_CANARY_INSTALL_DIR
node scripts/cursor-zh-tool.js verify --expect-clean --install-dir $env:CURSOR_ZH_CANARY_INSTALL_DIR
```

预期：恢复原始英文 runtime；`verify --expect-clean` 成功；用户配置、历史和工作区状态仍在；备份保留。

- [ ] **Step 6：接入发布门禁**

release / enforced 必须依赖：全量测试、PowerShell AST、合格性能基线、两个不同 Cursor 构建、一次真实上游升级、专项 UI 操作矩阵、卸载干净验证。缺一项不得提升 enforced。**不**将本步作为合入 `main` 的 PR 阻塞条件。

- [ ] **Step 7：提交**

```powershell
git add scripts/tests/tool/volatile-surface-two-build.test.js .github/workflows/release.yml docs/compatibility.md
git commit -m "test: require two-build volatile UI evidence"
```

**任务验收：** 两个构建的所有首批界面均通过；真实升级后不需要新增压缩源码长片段；卸载和 lastKnownGood 恢复均通过。

---

## 五、总体验收标准

### 5.1 功能正确性

- [ ] 第 1.2 节全部代表文案在 Cursor 3.12.30 和一个后续真实版本中显示为核准中文。
- [ ] 大小写变化由同一 translationId aliases 吸收，不产生重复译文 owner。
- [ ] 带 `${...}` 的描述保留全部表达式和动态后缀，只翻译核准前缀。
- [ ] `Default`、`System`、`Mode`、`Agent` 等短词没有全局 mapping。
- [ ] 产品名、模型名、协议名和外部服务名按政策保持原文。
- [ ] 表面外同名业务正文、用户输入、代码和终端内容不翻译。

### 5.2 归属与覆盖

- [ ] 每个 error 级 translation unit 有唯一 translationId、owner、primary、fallback、severity、placeholders。
- [ ] 所有 L3 **首批**条目都被证明为 static、semantic 或 runtime shard 之一；orphan 数为 `0`，duplicate **主路径** owner 数为 `0`。非首批 L3 可为 warning，不得伪绿。
- [ ] 当前 bundle occurrence 是覆盖率分母；新增文本不能因不在旧 target 列表而消失。
- [ ] changed alias、critical unknown、visible unknown 分开报告；未知不计覆盖。
- [ ] update admission 的 resolved/fallback/unknown/blocked 数与 coverage ledger 一致。

### 5.3 稳定性和可靠性

- [ ] semantic locator 在压缩变量重命名、引号/空白变化、无关字面量插入后仍唯一定位。
- [ ] locator 多匹配、零匹配或后置条件失败时进入 fallback/BLOCKED，绝不修改错误目标。
- [ ] BLOCKED 在备份和任何受管写入前结束；安装目录及外部受管文件 hash 不变。
- [ ] DEGRADED 仅在每个失败主路径拥有当前 bundle proof key、分片、生命周期和占位符证明时允许。
- [ ] 提交后验证失败按事务逆序完整回滚；诊断、备份和 recovery capsule 保留。
- [ ] uninstall 后 `verify --expect-clean` 成功，不删除用户资料、历史和工作区状态。

### 5.4 性能

- [ ] performance 模式无 interval、轮询或计划式全页面补扫。
- [ ] 全局发现观察器恰好一个，只监听 `childList + subtree`。
- [ ] 发现批次最多检查 30 个新增根节点；翻译批次最多处理 30 个文本节点。
- [ ] 未挂载分片不解析；每个挂载表面最多一个 observer；卸载即释放。
- [ ] core runtime `<= 80 KB`；每个分片 `<= 20 KB`。
- [ ] 合格基线最慢热 verify `<= 3 s`，最慢冷 verify `<= 8 s`。
- [ ] 普通环境明确显示 `UNQUALIFIED`；没有合格性能证据不能发布。

### 5.5 安全和隐私

- [ ] 没有联网翻译请求。
- [ ] 未知运行时内容只有 allowlisted chrome 可以保存原文；拒绝区域零泄漏。
- [ ] 临时 HMAC 密钥不持久化；报告不含用户输入、聊天、代码、路径或 Cursor bundle。
- [ ] `main.js` 与原始文件字节级一致。
- [ ] 不分发 `cursor/`、`state/`、备份、日志、截图或用户数据。

### 5.6 工程门禁

- [ ] 每个生产切片都有先失败后通过的配对测试。
- [ ] `node scripts/run-tests.js` 退出码为 `0`，失败数为 `0`。
- [ ] 所有 PowerShell 文件通过 AST parser。
- [ ] JSON 文件通过 fatal UTF-8 decode 和 JSON parse。
- [ ] TDD gate 通过；提交不包含用户原有无关修改。
- [ ] release 标题和正文继续遵守中文发布说明政策。

---

## 六、回滚方案

### 单任务回滚

每个任务独立提交。发现回归时使用：

```powershell
git revert <task-commit>
```

不得使用 `git reset --hard` 或覆盖用户工作树。

### canary 安装回滚

1. 完全退出 Cursor。
2. 在共享安装锁内恢复 lastKnownGood/recovery capsule。
3. 运行 `verify` 确认恢复。
4. 如果专项机制未确认 readiness，保持 rollout 在 shadow，不提升 canary/enforced。
5. 如果恢复失败，保留 state/backups 和诊断，停止自动重试。

### 发布回滚

- 任何真实 UI、性能、卸载或双构建门禁失败，都撤销提升证据并保持上一已验证版本。
- 不通过放宽覆盖率、扩大观察范围、添加全局 fuzzy/partial 或跳过 BLOCKED 来换取发布。

---

## 七、立即停止条件

出现以下任一情况，立即停止当前任务并回到根因分析：

- 白屏、启动失败、配置目录漂移、历史或工作区状态异常。
- 语义 locator 出现多匹配却仍准备写入。
- 为翻译短枚举需要全局短词映射。
- 为兜底需要轮询、全页扫描或永久观察 document 文本。
- core 或任一分片超过硬预算。
- verify 只能通过隐藏 unknown、缩小分母或复用过期证据。
- BLOCKED 路径对安装目标产生任何写入。
- 运行时报告出现用户输入、聊天、代码、终端或路径原文。
- 需要新增生产依赖、联网翻译或扩大数据留存范围但尚未获得用户明确批准。
- 连续三次不同修复假设失败；此时必须重新审查架构，不能继续叠加补丁。

---

## 八、推荐执行顺序与交付检查点

| 检查点 | 包含任务 | 可独立交付结果 | 继续条件 |
|---|---|---|---|
| A：可复现 | 任务 1 | 3.12.30 live 核对夹具 + RED | 失败原因与 live/截图一致 |
| A2：表面登记 | 任务 1.5 | 三新表面 + 旧 scopes 收窄 | 标记选择器已冻结；宽 class 已移除 |
| B：身份与归属 | 任务 2–3 | translationId 权威源、首批 L3 零孤儿 | focused tests 全绿；旧 L3 静默丢弃测已改 |
| C：主路径与兜底 | 任务 4–5 | semantic locator、限定分片 | 歧义按 unit 分级；性能预算全绿 |
| D：发现与准入 | 任务 6–8 | 当前 bundle 分母、真实 verify/admission | unknown/orphan 可见且不可伪绿 |
| E：合入就绪 | 任务 9 | 全量测试、canary ensure/verify、文档 | **可合 `main`** |
| F：发布证明 | 任务 10 | 双构建、真实 UI、卸载 | **release/enforced 门禁**；不阻塞合入 |

禁止跨越检查点并行修改同一所有权链。任务 4 的 locator 和任务 5 的 fallback 可以并行开发，但必须在任务 3 归属接口冻结后开始，并在合并前运行同一 ownership 测试。任务 1.5 必须在任务 2 写 units 之前完成。

---

## 九、计划自检

- 规格覆盖：稳定身份由任务 2；归属闭环由任务 3；源码形态漂移由任务 4；有界运行时由任务 5；当前分母由任务 6；准入由任务 7；可观测性由任务 8；编码/全量由任务 9；发布证明由任务 10。
- Grill 决议已写入「〇」节；正文与示例选择器/路径/完成定义已对齐。
- 文件边界：translation unit、归属审计、locator、coverage 各自独立模块；verify 只编排和呈现，不复制分类逻辑。
- TDD：每个生产任务都有明确 RED 命令、预期失败、最小 GREEN 和聚焦回归；改变 L3 selector 不变量时同步改旧绿测。
- 无第二权威源：迁移文案的 changeText 只保存在 translation units；静态 mappings 由投影生成。
- 无性能逃逸：没有轮询、全页扫描、无作用域 fuzzy/partial、未挂载分片解析或联网翻译。
- 无验收逃逸：静态映射存在不等于 UI 已覆盖；必须同时具备 current occurrence、ownership、admission；发布另需真实操作证据。
- 无占位步骤：每个任务均列出准确文件、接口、命令、预期结果、提交和验收。
- 合入与发布分离：Task 1–9 可合 main；Task 10 只卡 enforced。
