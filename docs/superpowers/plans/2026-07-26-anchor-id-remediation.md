# Cursor 中文增强包 ID 锚点根治方案实施计划

> **日期**：2026-07-26
> **状态**：已通过 grill-me 审查（阻塞项全部处置，见文末「审查记录」）
> **执行方式**：全程 TDD（RED→GREEN→REFACTOR），遵守 `.cursor/rules/superpowers-tdd-required.mdc`
> **测试命令**：`node scripts/run-tests.js`（npm test 可能被 PowerShell 执行策略挡）；单文件 `node --test scripts/tests/lib/xxx.test.js`
> **本计划仅为设计文档，写入时不修改任何生产代码**

---

## 一、目标

根治「Cursor 升级后汉化大面积失效」：修复 3 处已定位管线缺陷，将 exact 原文匹配逐步迁移到「稳定 ID 锚点定位」，并让失效在 apply/verify 时可见、可逐条验证，不再静默。

**成功判据（可量化）**：
1. 3 处 P0 缺陷修复后，findings.md 定性的 3 条「映射在 + 原文在 bundle + 静态未替换 + 未入运行时」词条全部落地（changeText 出现在 `*_translated.js`）。
2. 试点 4 条 + 批量迁移词条，verify 按 anchorId 报告命中率 100%（当前版本 bundle）。
3. coverage 解除 deferred 后，apply/verify 输出真实覆盖率，失效词条清单非空时显式报警。
4. 性能红线不破：performance 模式 `rescanDelaysMs=[]` 不变、runtimeHeaderKB 不高于基线 110.8KB + 5%、apply 总耗时增幅 ≤ 10%（console.time 实测 before/after 对比）。

---

## 二、现状分析（行级证据）

### 2.1 实证根因（44 条失效词条逐条定性，Buffer 字节扫描）
- 21 条无映射新增（47.7%）
- 20 条 exact 映射绑死旧原文（45.5%）：纯 Title Case 化、整句改写、模板拼接句
- 3 条管线路由缺陷（6.8%）：映射在 + 原文在 bundle + 静态未替换 + 未入运行时

### 2.2 三处 P0 管线缺陷

**缺陷 A — `scripts/lib/mapping/surfaces.js:37`（applySurfaceRuntimeDefaults）**
```js
if (isL3SurfaceMapping(mapping, surfaces) && mapping.forceRuntime !== false) {
  return { ...mapping, forceRuntime: true };
}
```
L3 surface 词条若显式 `forceRuntime: false`，不会被强制入运行时；叠加 `runtime-selector.js:91-93`（L3 surface 的 exact 无 scope 词条被剪枝 `return false`），该词条既不进运行时，静态替换若又失败，则两头落空、完全静默。

**缺陷 B — `scripts/lib/patcher/runtime-selector.js:73-81`（selectRuntimeMappings）**
```js
if (entry.searchType === 'exact') {
  const staticPresent = isAuthoritativeWorkbenchIndex(index)
    ? index.hasQuotedLiteral(entry.originalText)
    : sourceHasQuotedLiteral(workbenchSource, entry.originalText, index);
  if (staticPresent) {
    return false;   // ← 78-79 行：只要 bundle 有引号字面量就剪枝
  }
}
```
剪枝依据是「字面量存在」而非「静态替换成功」。静态补丁因上下文/合约等原因未落地时，词条已被剪出运行时池，失效静默。

**缺陷 C — `scripts/tool/commands.js:1180-1182`（apply 覆盖率 deferred）**
```js
cursorWinCoverage = DEFERRED_CURSOR_WIN_COVERAGE;   // 1180
dynamicCoverage = DEFERRED_DYNAMIC_COVERAGE;        // 1181
console.log('覆盖率分析已 defer 至 verify');
```
`DEFERRED_*` 常量定义于 `commands.js:10-26`（全零计数 + `deferred: true`）；manifest 仅记 `coverageDeferred: true`（`commands.js:1210-1212`、`manifest.js:91`）。build-manifest 实测（3.13.10）：`cursorWinCoverage/dynamicCoverage 均 deferred=true`，失效完全静默。

### 2.3 管线结构约束（联动设计的硬边界）

1. **运行时选择调用链**：`scripts/tool/runtime-strategy.js:146`（selectRuntimeMappingsForMode）在 `buildRuntimeMappingsInfo`（第 170 行）内调用。它与静态替换（applyStaticSourceTranslations）**相互独立**：静态替换接收完整 mergedMappings 自行筛选 exact 条目；运行时选择结果仅用于生成运行时头部。二者只能共享 workbenchIndex（含 quotedLiterals），**选择结果无法互传**。任何「静态/运行时联动」设计必须以此为约束——本计划的缺陷 B 修复选择在 builder 汇合层做对账（见 4.2 节），不打破该独立性。
2. **静态替换与写盘流水**：`scripts/tool/builder/workbench.js:75` applyStaticSourceTranslationsDetailed → 第 88-97 行 buildTranslatedWorkbenchBundleParts 生成 runtimeHeader + translatedSource → 第 104-105 行 writeBundleParts 双写（generatedWorkbenchPath 与 workbenchTranslatedPath）。**builder 层是静态结果与 runtimeMappings 唯一同时在手的汇合点**——对账逻辑只能放这里。
3. **运行时池分类**：`scripts/lib/mapping/runtime-pools.js`，summarizeRuntimePools（51-68 行）、classifyRuntimeMappingPool（14-49 行）。准入优先级：static-only（exact 且 staticLiteralPresent，或 L2/contract surface）→ runtime-force → runtime-regex（regex/partial/normalizedExact/**anchor**，第 24-31 行）→ runtime-scoped → runtime-by-surface → legacy-global-exact。**anchor 类型目前混入 runtime-regex 池**，可观测性差；本计划决定新增独立 `runtime-anchor` 池（见 5.3 任务 2.4 与审查记录 B3）。
4. **verify 缺口**：`scripts/tool/verify.js:309`（verifyState），6 阶段检查（安装/locale → bootstrap/main → NLS/workbench 哈希 → 翻译源 → 覆盖率 → 运行时策略与静态合约）。当前只校验文件哈希一致性与合约符号存在性，**没有逐条 changeText 是否真实落地到 `*_translated.js` 的直接验证**。verify 增强设计见第 6 节。

### 2.4 稳定 ID 锚点实证（两轮脚本实测）

- 设置项：搜索注册 slug `nu("general","open-agents-on-startup",{label:...})` + setting key `n("lsp_enabled","agents",...)`
- Glass/Agent 面板：i18n 形式 `C("glass.agentPanel.continueWorking","Continue Working")`（key 稳定、默认文案可变）
- 右键菜单：稳定 command id `{id:"copy-messages",label:"Copy Transcript"}`
- 跨版本存活率（3.12.10/3.12.29/3.12.30/3.13.10 实测）：**语义 ID 16/16=100%，英文文案 14/16=87.5%**
- 同一词条多出现点文案版本不一致（注册表处旧文案、渲染处新文案）→ exact 匹配注定漏

### 2.5 现有锚点机制基础

- 条目格式（`translations/overlay/cursor-win.anchors.json`）：`{anchorType, anchorId, field, changeText, searchType:"anchor", surface, forceRuntime}`
- 静态消费：`scripts/lib/patcher/anchor-static.js` — buildGlassCommandFieldPattern（3-10 行，`id: <anchorId>` 后 0-500 字符内定位 field）、applyAnchorStaticTranslations（12-34 行）、sourceHasGlassCommandAnchor（36-42 行）。**当前仅支持 anchorType: glassCommand**。
- 运行时准入：`runtime-selector.js:49-57` 对 `searchType === 'anchor'` 走 sourceHasGlassCommandAnchor 存在性判定。
- 既有测试：`scripts/tests/lib/anchor-mapping.test.js` 可作为扩展基准。
- **隐患**：现存 anchors.json 含 minified 短标识 anchorId（如 `"D5h"`），此类 ID 跨版本不稳定，与语义 ID 需区分治理（审查记录 B1）。

### 2.6 build-manifest 基线（3.13.10）
merged 1663 / runtime 451 / pruned 1212；performance 模式 rescanDelaysMs=[]；runtimeHeaderKB=110.8；translation-units 仅 20 条全 resolved。

---

## 三、总体设计决策

| # | 决策 | 理由 |
|---|------|------|
| D1 | 缺陷 B 的「静态失败回补运行时」放在 builder 汇合层（workbench.js:88-97 之前），不改静态/运行时相互独立的结构 | 2.3-1/2 约束：选择结果无法互传，builder 是唯一双方在手的位置 |
| D2 | 锚点默认走**静态替换**（apply 构建期，applyAnchorStaticTranslations），仅动态渲染面（i18nKey 类）允许 forceRuntime | 性能红线：runtimeHeaderKB 基线 110.8，批量迁移若全走 runtime 必超标 |
| D3 | 新增独立 `runtime-anchor` 池（classifyRuntimeMappingPool 在 runtime-force 之后、runtime-regex 之前判定） | anchor 混在 runtime-regex 池无法按池观测锚点命中率与预算 |
| D4 | anchorId 准入标准：仅接受语义 ID（command id / setting slug / i18n key），**拒绝 minified 短标识**（≤4 字符且非语义词） | 2.4 实证：语义 ID 100% 存活；minified 标识本质与 exact 文案同样脆弱 |
| D5 | verify 新增「锚点命中报告 + changeText 落地逐条抽验」，失效即 issue（fail-closed） | 2.3-4 verify 缺口；用户承诺的可验证效果落地项 |
| D6 | explicit `forceRuntime: false` 语义重定义为「静态优先」而非「禁止运行时」：静态落地失败时仍可被 D1 对账回补 | 缺陷 A 修复不能造成词条两头落空，也不能无脑强制入运行时撑爆 header |

**词条流转语义表（修复后）**：

| 词条状态 | 静态替换 | 运行时 | 失效可见性 |
|---|---|---|---|
| exact + 字面量在 + 静态成功 | ✅ | 剪枝（不变） | verify 逐条抽验确认 |
| exact + 字面量在 + 静态失败 | ❌ | **对账回补入运行时**（D1，新） | manifest reconcile 计数 + verify |
| L3 surface + forceRuntime:false + 静态失败 | ❌ | **对账回补**（D6，新） | apply 警告 + verify |
| anchor + 语义 ID 命中 | ✅（D2 默认静态） | 仅 i18nKey 面 | verify 按 anchorId 报告（D5，新） |
| anchor + ID 失踪（版本变更） | ❌ | ❌ | **verify issue 报警**（D5，新） |

---

## 四、阶段一：P0 管线缺陷修复

### - [x] 任务 1.1：修复 surfaces.js:37 — L3 词条 forceRuntime:false 语义
**文件**：`scripts/lib/mapping/surfaces.js`、`scripts/tests/lib/surfaces-runtime-defaults.test.js`（新建）
**TDD**：
1. RED：新建测试，断言 (a) L3 surface 词条无显式 forceRuntime → 补 `forceRuntime: true`（现有行为回归）；(b) 显式 `forceRuntime: false` 的 L3 词条 → 输出补充 `staticPreferred: true` 标记（新语义 D6），且不设置 forceRuntime:true；(c) 非 L3 词条原样返回。先运行确认 (b) 失败。
2. GREEN：applySurfaceRuntimeDefaults 增加 staticPreferred 标记逻辑，最小实现让测试通过。
3. REFACTOR：确认 `runtime-selector.js:91-93` 对带 staticPreferred 词条的剪枝行为有测试覆盖（若无，在本任务补断言：staticPreferred 词条仍被选择器剪枝——回补由任务 1.2 对账层负责）。
**验收标准**：新测试文件全绿；`node scripts/run-tests.js` 全量无回归；语义表（第三节）中 L3/forceRuntime:false 行为与实现一致。

### - [x] 任务 1.2：修复 runtime-selector.js:78-79 静默剪枝 — builder 层静态落地对账
**文件**：`scripts/tool/builder/workbench.js`、`scripts/lib/patcher/static-reconcile.js`（新建）、`scripts/tests/lib/static-reconcile.test.js`（新建）
**设计**：不改 selectRuntimeMappings 的剪枝判据（避免破坏 2.3-1 独立性），在 workbench.js:88（buildTranslatedWorkbenchBundleParts 之前）插入对账：`reconcilePrunedMappings(staticTranslationResult, mergedMappings, runtimeMappings, workbenchIndex)` → 找出「exact 且字面量在 bundle 且 changeText 未出现在 translatedSource」的被剪枝词条，回补进 runtimeMappings，返回 `{runtimeMappings, reconciled: [...]}`。
**TDD**：
1. RED：构造 fixture——一条 exact 词条字面量在源码中但静态替换器未落地（如被合约上下文挡住），断言对账后该词条出现在回补清单且最终 runtimeMappings 包含它；再断言静态成功词条**不**被回补。先运行确认失败。
2. GREEN：实现 static-reconcile.js（用 translatedSource.includes(changeText) 前先用 workbenchIndex 确认 originalText 字面量在场，避免误报；多词条同 changeText 时按 originalText 消歧——见审查记录 B2）。
3. REFACTOR：workbench.js 将对账结果并入返回值（reconciled 计数进 runtimeFootprint 路径，保证 commands.js:1171 的 runtimeStrategy 报告与实际注入一致——见审查记录 B4）；manifest 增加 `staticReconcile: { count, entries }` 字段。
**验收标准**：findings.md 定性的 3 条管线缺陷词条在真实 apply 后 changeText 出现在 `*_translated.js`（运行时头部或静态替换文），`state/build-manifest.json` 出现 staticReconcile 计数；全量测试通过。

### - [x] 任务 1.3：coverage deferred 失效非静默 — verify 侧兜底报警
**文件**：`scripts/tool/verify.js`、`scripts/tests/tool/contract-defer-verify.test.js`（扩展）
**TDD**：
1. RED：扩展测试断言：manifest `coverageDeferred=true` 且 verify 执行覆盖率阶段后 missingTargets 非空时，**必须**产出 issue（而非 info/warning）。先运行确认失败（当前静默或降级为 info）。
2. GREEN：verify 覆盖率阶段（verifyState 第 05 阶段）对 deferred 清单执行真实覆盖率计算，missing 非空 → issues.push（fail-closed，符合仓库「提交预检 fail-closed」既有约定）。
3. REFACTOR：报警文案含缺失词条数与前 10 条样例，方便定位。
**验收标准**：人为制造一条 bundle 中不存在的 exact 映射，跑 verify 得到 issue 输出；移除后 verify 通过；全量测试无回归。

### - [x] 任务 1.4：阶段一回归与性能实测
**TDD**：本任务为验证任务，无新实现。
**验收标准**：
- `node scripts/run-tests.js` 全绿。
- 真实 apply 一次，console.time 分阶段计时与基线（state/bench-apply-*.log）对比，总耗时增幅 ≤ 10%。
- build-manifest：runtime 条目数变化 = staticReconcile 回补数（可解释）；runtimeHeaderKB ≤ 110.8 × 1.05。
- git commit（阶段一批次提交）。

---

## 五、阶段二：ID 锚点试点 4 条

### - [x] 任务 2.1：选定 4 条试点词条并固化锚点证据
**文件**：`docs/superpowers/plans/2026-07-26-anchor-id-remediation.md`（本文件附录 A）、`state/reports/anchor-pilot-evidence.json`（新建，脚本产出）
**内容**：从 44 条失效清单选 4 条，覆盖三类锚点各至少 1 条：
1. glassCommand 类（command id，如右键菜单 `copy-messages`）——走现有 anchorType；
2. settingsSlug 类（如 `nu("general","open-agents-on-startup",...)`）——需新 anchorType；
3. i18nKey 类（如 `C("glass.agentPanel.continueWorking",...)`）——需新 anchorType，且为唯一允许 forceRuntime 的类别（D2）；
4. 管线缺陷词条 1 条（验证锚点方案对缺陷词条的替代能力）。
**验收标准**：4 条词条的 anchorId 全部为语义 ID（D4 准入）；用 Node Buffer 扫描脚本在当前版本 bundle 实测每个 anchorId 恰好命中且邻近 field 可定位；证据 JSON 落盘（anchorId、出现偏移、上下文 80 字节）。**不写生产代码。**

### - [x] 任务 2.2：anchor-static 支持 settingsSlug / i18nKey 两类锚点
**文件**：`scripts/lib/patcher/anchor-static.js`、`scripts/tests/lib/anchor-mapping.test.js`（扩展）
**TDD**：
1. RED：按任务 2.1 的真实上下文构造 fixture，断言 (a) `anchorType:"settingsSlug"` 能以 `nu("<group>","<slug>",{...label:` 模式替换 label；(b) `anchorType:"i18nKey"` 能以 `C("<key>","<默认文案>")` 模式替换默认文案（调用名允许 minify 漂移，模式只锚定 key 字符串本身——见审查记录 B5）；(c) 不认识的 anchorType 原样跳过不抛错。先运行确认失败。
2. GREEN：扩展 applyAnchorStaticTranslations 与新增 `sourceHasAnchor(source, entry)` 泛化存在性判定（按 anchorType 分派，glassCommand 沿用 sourceHasGlassCommandAnchor）。
3. REFACTOR：模式正则预编译缓存（同一 anchorId 多次调用不重复 new RegExp）。
**验收标准**：扩展测试全绿；对超大单行 bundle 的替换耗时用 console.time 实测（4 条 < 200ms）。

### - [x] 任务 2.3：runtime-selector 锚点存在性判定按 anchorType 泛化
**文件**：`scripts/lib/patcher/runtime-selector.js`、`scripts/tests/lib/runtime-selector-anchor.test.js`（新建）
**TDD**：
1. RED：断言 selectRuntimeMappings 对 settingsSlug/i18nKey 锚点条目：源码含锚点 → 入选；不含 → 剪枝。当前实现只走 sourceHasGlassCommandAnchor，确认失败。
2. GREEN：`runtime-selector.js:49-57` 两处改调 sourceHasAnchor（任务 2.2 产物）。
3. REFACTOR：确认 originalText 为空的锚点条目路径（49-52 行）与非空路径（55-57 行）测试都覆盖。
**验收标准**：新测试全绿；现有 anchor-mapping、runtime-selector 相关测试无回归。

### - [x] 任务 2.4：runtime-pools 新增 runtime-anchor 独立池
**文件**：`scripts/lib/mapping/runtime-pools.js`、`scripts/tests/lib/runtime-pools-anchor.test.js`（新建）
**TDD**：
1. RED：断言 `classifyRuntimeMappingPool({searchType:'anchor', anchorId:'x', forceRuntime:true})` 返回 `'runtime-anchor'`（而非现在的 runtime-force/runtime-regex），summarizeRuntimePools 计数对象含 `'runtime-anchor'` 键。先运行确认失败。
2. GREEN：分类顺序调整——anchor 判定置于 forceRuntime 之前（锚点条目即使 forceRuntime:true 也归 runtime-anchor 池，池语义优先；见审查记录 B3），counts 增加键。
3. REFACTOR：全仓 Grep 断言 pool 计数的测试与 manifest 消费方（runtime-strategy 报告、governance 策略），逐一更新期望值，不允许静默兼容。
**验收标准**：新测试全绿；全量测试通过（所有断言池计数的既有测试已显式更新）；build-manifest runtimeStrategy 报告出现 runtime-anchor 计数。

### - [x] 任务 2.5：4 条试点条目落盘 + 真实 apply 实测
**文件**：`translations/overlay/cursor-win.anchors.json`（追加 4 条）
**TDD**：数据任务，测试即 verify + 实测。
**验收标准**：
- 4 条条目 schema 合法（含 anchorType/anchorId/field/changeText/searchType:"anchor"/surface；仅 i18nKey 条目允许 forceRuntime:true）。
- 真实 apply 后：3 条静态类的 changeText 出现在 `*_translated.js` 静态正文；i18nKey 条目进运行时头部 runtime-anchor 池。
- verify 通过；UI 截图确认 4 处中文渲染（对照 assets/screenshots 既有截图流程）。
- 性能：apply 耗时对比阶段一基线增幅 ≤ 2%；runtimeHeaderKB 增幅 ≤ 1KB。
- git commit。

---

## 六、verify 增强设计（阶段四实施，设计前置）

**新增 verify 第 07 阶段「锚点与落地逐条验证」**（verifyState，`scripts/tool/verify.js:309` 流程尾部追加 timer 阶段）：

1. **锚点命中报告（按 anchorId 逐条）**：读取 cursor-win.anchors.json 全部条目，对已安装 workbench 原始 bundle 逐条执行 sourceHasAnchor：
   - `found`：anchorId 在场 → 继续检查 applied；
   - `missing`：anchorId 失踪（版本变更）→ **issue**（fail-closed），报告文案含 anchorId 与 surface。
2. **changeText 落地逐条抽验**：
   - anchor 条目（全量逐条）：静态类在 `*_translated.js` 正文按锚点模式验证 field 已是 changeText；runtime 类验证条目存在于运行时头部序列化数据中；
   - static-only exact 条目（全量逐条，非抽样）：用 translated bundle 的 workbenchIndex（quotedLiterals 集合，一次构建多次查询）验证 changeText 字面量在场且 originalText 字面量不再以引号字面量形式出现（多出现点词条按 staticReconcile 清单豁免）；
   - 落地失败 → issue，输出逐条清单到 `state/reports/verify-landing-report.json`。
3. **性能预算**：整个 07 阶段复用 verify 会话缓存（session-cache.js）的 readTextCached，translated bundle 只读一次、index 只建一次；timer 实测该阶段耗时 ≤ 2s（超出即视为验收失败，需优化后重测）。
4. **manifest 联动**：apply 时把 anchors 条目快照哈希写入 manifest，verify 校验快照一致，防止 anchors.json 改动后未重新 apply 的假阳性通过。

---

## 七、阶段三：批量迁移重灾区词条到锚点方案

### - [x] 任务 3.1：锚点候选提取脚本
**文件**：`scripts/tool/anchor-harvest.js`（新建）、`scripts/tests/tool/anchor-harvest.test.js`（新建）
**TDD**：
1. RED：fixture 含三类锚点上下文样本，断言脚本从 bundle 文本提取 `{anchorType, anchorId, field, currentText, offset}` 候选清单，且 minified 短标识（D4 规则：长度 ≤4 且不含语义分隔符 `.`/`-`/驼峰词）被标记 `rejected: true`。先运行确认失败。
2. GREEN：实现提取（Node Buffer 扫描，禁止整文件正则全局多次重扫；单遍扫描 + 局部窗口匹配）。
3. REFACTOR：输出与 44 条失效清单、cursor-win.common.json 现有 exact 映射的 join（哪些失效词条有可用锚点）。
**验收标准**：对当前版本真实 bundle 运行，产出 `state/reports/anchor-candidates.json`；44 条失效词条中「exact 绑死旧原文」的 20 条至少 15 条找到语义锚点候选；脚本单次运行 < 10s（实测）。

### - [x] 任务 3.2：批次一 — Glass/Agent 面板重灾区迁移
**文件**：`translations/overlay/cursor-win.anchors.json`
**TDD**：数据批次。每条迁移前先在 anchor-harvest 报告确认锚点在场（等效 RED：verify 07 阶段在条目落盘、apply 前对新条目报 missing/未落地）。
**验收标准**：批次条目全部通过 verify 07 阶段（found + applied）；对应旧 exact 映射从 cursor-win.common.json 移除或标记 `supersededBy: <anchorId>`（二选一在批次一执行时定案并全批次统一）；UI 抽查截图；apply 耗时与 runtimeHeaderKB 在预算内；git commit。

### - [x] 任务 3.3：批次二 — 设置项（settingsSlug）迁移
**验收标准**：同 3.2（对象为设置页词条；重点回归设置搜索功能不受 label 替换影响）；git commit。

### - [x] 任务 3.4：批次三 — 右键菜单/命令面板（glassCommand）迁移
**验收标准**：同 3.2（对象为 command id 类词条）；git commit。

### - [x] 任务 3.5：清理存量 minified anchorId
**文件**：`translations/overlay/cursor-win.anchors.json`、`translations/overlay/defaults/cursor-win.anchors.json`
**内容**：现存 `"D5h"`/`"N5h"`/`"x9h"` 类 minified 锚点逐条核对：有语义 ID 等价物 → 替换；无 → 保留但标记 `unstable: true`，verify 07 阶段对 unstable 条目 missing 时降级为 warning 而非 issue（避免每次小版本升级 verify 必红）。
**TDD**：RED——verify 测试断言 unstable 条目 missing 产 warning、稳定条目 missing 产 issue；GREEN——实现降级逻辑。
**验收标准**：anchors.json 中不再有未标记的 minified anchorId；全量测试通过；git commit。

---

## 八、阶段四：coverage 解除 deferred + verify 增强落地

### - [x] 任务 4.1：verify 07 阶段 — 锚点命中报告（按 anchorId）
**文件**：`scripts/tool/verify.js`、`scripts/tests/tool/verify-anchor-report.test.js`（新建）
**TDD**：
1. RED：fixture manifest + 假 bundle，断言：稳定锚点 missing → issue；unstable missing → warning；全部 found → info 含命中率统计。先运行确认失败。
2. GREEN：按第六节设计实现，含 timer 阶段计时。
3. REFACTOR：报告 JSON 落盘 state/reports/verify-landing-report.json。
**验收标准**：新测试全绿；真实 verify 实测 07 阶段耗时 ≤ 2s（timer 输出为证）。
**分工注明（阶段三偏差记录第 6 条修复后）**：verify 07 阶段负责报告**锚点缺席**（anchorId 不在 bundle——稳定锚点 issue / unstable warning）；**锚点在场但静态替换失效**（结构漂移）已由 static-reconcile 对账层自动回补进运行时兜底并计入 manifest staticReconcile，verify 只需将 staticReconcile.count>0 的锚点条目列入报告提示（提示静态模式需随版本修订），不再视为翻译失效。

### - [x] 任务 4.2：verify 07 阶段 — changeText 落地逐条抽验
**文件**：同 4.1 延续
**TDD**：
1. RED：fixture 中构造「anchor 条目 found 但 translated 正文未替换」与「static-only exact 条目 changeText 缺失」两种失败，断言均产 issue 且清单落盘。先运行确认失败。
2. GREEN：实现落地校验（translated bundle 单次读取 + workbenchIndex 复用）。
3. REFACTOR：manifest anchors 快照哈希联动（第六节第 4 点）。
**验收标准**：新测试全绿；人为篡改 translated 文件一处 changeText 后 verify 报 issue，恢复后通过。

### - [x] 任务 4.3：apply 解除 coverage deferred
**文件**：`scripts/tool/commands.js`（1180-1182）、`scripts/tests/tool/commands-apply.test.js`（扩展）
**TDD**：
1. RED：断言 apply 后 manifest 的 cursorWinCoverage.deferred 为 false 且 bundleTargetCount > 0，missingTargets 非空时 stdout 含报警行。先运行确认失败。
2. GREEN：apply 覆盖率计算复用构建期已在手的 workbenchIndex（不重读 bundle、不新增全局重扫），替换 DEFERRED_* 赋值路径；DEFERRED_* 常量与 coverageDeferred 分支保留一个 release 周期作为降级开关（`--defer-coverage` CLI 旗标），默认不 defer。
3. REFACTOR：manifest.js:91 coverageDeferred 语义随之更新；`contract-defer-verify.test.js` 同步调整。
**验收标准**：真实 apply 输出真实覆盖率数字；apply 总耗时对比阶段一基线增幅 ≤ 5%（console.time 实测，覆盖率计算复用 index 应为亚秒级）；全量测试通过。
**偏差记录（已按裁决闭环）**：「覆盖率复用 index 应为亚秒级」假设不成立——quotedLiterals 未命中 target 时分析器回退 48MB normalizedHaystack 扫描属固有成本（~10.3s），串行放 stage 09 时默认路径 +34% 超线。经 leader 裁决改为 B 方案：覆盖率计算并入 apply 04-05 preflight 并行槽（依赖 workbenchSources/mappingInfo/applyCache 在 03 段后已就绪，无竞态；主线程在等待 static Worker 期间执行），实测默认路径 31.99s/31.29s vs 阶段一基线 31.56s，增幅 +1.4%/-0.9% ≤ 5% 达标，验收线未放宽。提交 `9794327`，实测数据见 state/reports/stage4-performance-report.md。

### - [x] 任务 4.4：端到端回归 + 性能基线收官
**验收标准**：
- `node scripts/run-tests.js` 全绿。
- 完整 apply → verify → start 流程实测：verify 0 issue；44 条失效清单复测，管线缺陷 3 条 + 已迁移锚点词条全部落地。
- 性能收官对比表（阶段一基线 vs 最终）：apply 总耗时、verify 总耗时、runtimeHeaderKB、rescanDelaysMs（必须仍为 []）——全部在第一节预算内，实测数据写入 state/reports/。
- main.js 与原始 byte-for-byte 一致（既有安全不变量测试通过）。
- git commit + 文档更新（docs/compatibility.md 增补锚点机制说明）。
**收官实录**：全量 1037 tests / 0 fail / 2 skipped；真实 apply EXIT 0（覆盖率 apply 期计算生效，缺失仅存量 2 条）、verify 971ms（07 阶段 376ms ≤2s，stable 16/16 落地、exact 抽验 1190/0，EXIT 1 仅 2 条存量 Marketplace issue）；运行时指标持平 110.9KB/454/anchor 池 4/rescan []；main.js sha256 与 manifest.hashes.mainOriginal 一致（byte-for-byte）；对比表落盘 state/reports/stage4-performance-report.md；UI 截图代证以真实 bundle 静态正文/运行时头部命中核验替代，最终 UI 效果需用户真机确认。

### 偏差记录（阶段四收官后 QA 独立验证 FAIL 项修复）
QA 发现每次 apply 后 overlay 源文件出现未提交回写：staticPreferred 注记膨胀（0→702）+ 阶段三已删除的 11 条死 exact 被「复活」（阶段三、四各出现一次，均靠手工 checkout 兜底）。根因链：backup.js `ensureBackup` 每次 apply 备份阶段**无条件**调用 `seedOverlayFiles()`（与 `--seed-overlays` 旗标无关，legacy 与新引擎 ensure 共用此路径）→ overlay-seed.js `syncJsonArrayFileWithDefaults` 将 defaults 快照 `mergeMappings(defaults, existing)` 合并回写源文件——defaults 孪生快照（translations/overlay/defaults/）在阶段三三个迁移批次中未同步删除 11 条死 exact（亦未同步新增 13 条锚点），导致 defaults 独有 key 复活；同时 `applySurfaceRuntimeDefaults` 的内存态注记被持久化。根治（TDD RED 先行）：① `syncJsonArrayFileWithDefaults` 改为 bootstrap-only——文件已存在且非空时源文件即权威，不合并、不回写（`staticPreferred` 在生产链路零消费、L3 词条 forceRuntime 已显式持久化于 HEAD overlay，行为安全）；仅文件缺失/空时用 defaults 归一化引导；② defaults 快照与 HEAD overlay 全面对齐（common −11 死 exact 1244→1233、anchors +13 阶段三锚点 64→77，dynamic/workbench 已一致）；③ 集成测试 fixture 补齐阶段三 11 个锚点源结构（此前靠 defaults 死 exact 被 seed 进临时 workspace 掩盖），mapping.test.js 过时断言 `'New project'` 反转为防复活守护。全量 1038 tests / 0 fail / 2 skipped（均为既有环境跳过项）。

---

## 九、风险与回滚

| 风险 | 概率 | 缓解 | 回滚 |
|------|------|------|------|
| 对账回补（任务 1.2）误回补大量词条撑爆 runtime header | 中 | 回补清单进 manifest 可观测；验收含 headerKB 预算硬线 | revert static-reconcile 接线（builder 单点插入，一处还原） |
| i18nKey 锚点模式误匹配非目标调用点 | 低 | 模式锚定完整 key 字符串 + 引号边界；试点先行仅 1 条 | 从 anchors.json 删除条目 + 重新 apply |
| runtime-anchor 池改动破坏既有池计数断言/治理策略 | 高（已知） | 任务 2.4 REFACTOR 步骤强制全仓排查并显式更新 | git revert 单提交 |
| coverage 解除 deferred 后 apply 变慢 | 低 | 复用 workbenchIndex 不重扫；保留 --defer-coverage 降级旗标 | 旗标一键回退 defer 行为 |
| Cursor 小版本升级致部分锚点 missing，verify 全红阻塞 | 中 | unstable 标记降级 warning；稳定语义 ID 实证 100% 存活 | verify 报告即诊断清单，按报告补锚点 |
| 批量迁移期间新旧映射（exact + anchor）双份共存导致双重替换 | 中 | 批次任务强制「移除或 supersededBy 标记」二选一统一策略 | 每批次独立 git commit，可按批回滚 |

**全局回滚**：每阶段/批次独立 git commit；生产端回滚走既有 uninstall/backup 机制（state/backups），不需要额外建设。

---

## 十、任务总览

| 阶段 | 任务数 | 摘要 |
|------|--------|------|
| 一 | 4 | P0 缺陷修复：surfaces 语义、builder 对账回补、deferred 报警、回归实测 |
| 二 | 5 | 锚点试点：证据固化、anchor-static 扩展、selector 泛化、runtime-anchor 池、4 条落盘实测 |
| 三 | 5 | 批量迁移：候选提取脚本、三批次迁移、minified 存量清理 |
| 四 | 4 | verify 增强：anchorId 报告、落地逐条抽验、coverage 解除 deferred、端到端收官 |
| 合计 | **18** | |

---

## 附录 A：试点词条占位

任务 2.1 执行时填入 4 条词条的 anchorId、原文、译文、bundle 偏移证据（引用 state/reports/anchor-pilot-evidence.json）。

任务 2.1 已填入（证据含双 bundle 偏移与上下文，见 `state/reports/anchor-pilot-evidence.json`）：

| # | anchorType | anchorId | field | bundle 现原文 | 译文 | forceRuntime |
|---|-----------|----------|-------|--------------|------|--------------|
| 1 | glassCommand | `copy-messages` | label | Copy Transcript | 复制会话记录 | 否（静态） |
| 2 | settingsSlug | `open-agents-on-startup` | label | Window Restoration | 窗口恢复 | 否（静态） |
| 3 | i18nKey | `glass.agentPanel.continueWorking` | — | Continue Working | 继续工作 | 是（D2 唯一允许类） |
| 4 | settingsSlug | `auto-hide-editor` | label | Auto-Hide Editor When Empty | 编辑器为空时自动隐藏 | 否（静态） |

每条 anchorId 在 desktop 与 glass 双 bundle 各恰好命中 1 次；第 3 条实证 B5（同一代码点 desktop/glass 调用名分别为 `C(`/`x(`，函数名不入模式）；第 2/4 条实证注册函数名 `nu(`/`ku(` 漂移。

### 偏差记录（阶段二实施，leader 批准 2026-07-26）

任务 2.1 第 4 条原要求「管线缺陷词条 1 条」，实施时缺陷态词条经阶段一回补修复后为 0（manifest staticReconcile.count=0），且 3 条历史缺陷词条身份无固化记录（findings.md 当时标注「待补充」）。经 leader 批准改用 exact 绑死旧原文类实证词条 "Auto-hide editor when empty"（settingsSlug `auto-hide-editor`，bundle 原文已 Title Case 漂移致 exact 死亡），验证目标等价：锚点方案对「原文漂移致失效词条」的替代能力。锚点准入仍过 B1 语义 ID 校验，模式仅锚定 slug 字符串本身（B5）。

### 偏差记录（任务 2.5 实施）

1. 真实 apply 默认路径被 admission blockers 阻断（extension_cache_dialog/agent_shutdown_dialog 7 项合约面预存缺口，与锚点无关），按预案记录后改用 `--legacy-apply --force` 完成，EXIT=0。
2. 实施中发现并修复存量管线缺陷：`selectRuntimeMappingsUnion` 以 originalText 为去重键，anchor 条目（无 originalText）互相折叠只剩 1 条；修复后 runtime-anchor 池 7 条（4 条试点 + 3 条存量语义 ID glassCommand）。TDD 覆盖于 runtime-selector-anchor.test.js。
3. verify EXIT=1 系 3 项存量 issue（Marketplace map hook 非容错形态 ×2、Agent ID/Agent URL 覆盖缺失），已实证阶段一备份产物中同样存在，与本阶段改动无关。verify 非零退出源于与本阶段无关的既有管线缺陷，且 UI 截图延期（见第 4 点）均为经 leader 批准的验收偏差，非阶段二未完成项。
4. 「UI 截图确认 4 处中文渲染」需真机交互流程，未在本批次自动化完成；以静态产物核验（4 条 changeText 双 bundle PRESENT、原文替换消失）作为落地证据，截图留待阶段四端到端收官统一补做。

### 偏差记录（阶段三实施，leader 批准 2026-07-26）

1. **任务 3.1 验收基数替代（leader 批准发现 2）**：原验收口径「44 条失效词条中 exact 绑死旧原文的 20 条至少 15 条找到语义锚点候选」不可按字面执行——44 条清单从未固化为可枚举文件（findings.md 当时未落盘明细）。经批准改以 302 条 dead-exact 普查（state/reports/anchor-pilot-dead-exact.json）为 join 对象，验收改为「高置信语义锚点候选全部迁移 + 不可迁移逐条记因」。实际迁移 9 条新增静态锚点 + 2 条清理项（auto-hide-editor、copy-messages 为阶段二既有锚点，仅移除死亡旧 exact），每条双 bundle 生产模式命中=1 且旧 exact 引号字面量 0 命中，证据见 state/reports/anchor-stage3-migration-evidence.json。**其余 dead-exact 词条（约 291 条）无高置信语义锚点候选（anchor-harvest join + 宽松相似复核均为子串噪音，按「严禁低置信人工配对」原则不凑数），仍走既有 exact 维护路径（重新采收原文），不属本方案根治范围**。不可迁移代表项："&&Reload Window"（critical-ui-targets.js:1271 已有 embedded patch 且 surface-contracts 引用，锚点迁移有双重处理风险，归类「已有专用通道」）；其余按类别归因：整句改写/功能下线/无语义锚点，明细见 state/reports/anchor-candidates.json 的 unmatched 集合。
2. **旧 exact 处置二选一定案**：批次一定案为**移除**（非 supersededBy），全三批次统一。理由：死亡证据已固化落盘、保留会占用运行时头部预算（legacy-global-exact 池）、git 历史可追溯。共移除 11 条旧 exact；另将 critical-ui-targets.js 中 2 条死目标（Copy Messages、Default browser，双 bundle 0 命中）同步移除并以锚点承接守护测试替代（critical-ui-coverage.test.js「dead critical exact targets are superseded by ID anchors」）。
3. **存量锚点大面积缺失定性（leader 批准发现 1）**：68 条存量锚点中 61 条在当前版本双 bundle 生产模式（sourceHasAnchor）0 命中——3 条 minified（D5h/N5h/x9h，计划内预期）+ **58 条 workbench.action.\* 疑似历史杜撰锚点**（从无命中证据，其中 setLogLevel/startFileWatchRecording 两条裸 id 字符串虽在 bundle 出现但不在 glassCommand 结构中，生产口径同样不可命中）。全部统一标记 `unstable: true`，不删除、不改语义；defaults/cursor-win.anchors.json 同步标记 61/64。逐条 0 命中证据：state/reports/anchor-stage3-unstable-evidence.json。**阶段四衔接说明**：任务 3.5 的「verify 对 unstable 条目 missing 降级 warning」降级逻辑本身按计划属 verify 07 阶段（任务 4.1）实现范围，本阶段只完成标记与证据固化；阶段四实施者请勿将这 58 条 unstable 条目误判为待修复项——它们是历史杜撰锚点，missing 是常态，降级 warning 即最终处置。
4. **运行时准入收紧（leader 批准发现 3）**：selectRuntimeMappings/Union 原对 anchor 条目「在场即准入」，与 D2（锚点默认静态、仅 i18nKey 动态渲染类 forceRuntime）及运行时性能零增量约束冲突。TDD 收紧为 `forceRuntime===true 且锚点在场` 才进运行时头部（RED 4 failures 存证 state/red-3-selector.log）。runtime-anchor 池计数 7→4 属计划内行为变更（设计依据 D2 + 性能零增量），非绕过断言。收紧后 apply 实测：3 条静态试点译文（复制会话记录/窗口恢复/编辑器为空时自动隐藏）双 bundle PRESENT，i18nKey 试点「继续工作」仍在运行时头部命中。runtimeHeaderKB 前后对比：110.9 → 110.9（KB 粒度持平，runtime mapping 457→454，净移除 3 条运行时条目），rescanDelaysMs 保持 []。
5. **真实 apply 路径**：默认引擎再次被 admission blockers 阻断（extension_cache_dialog/agent_shutdown_dialog 7 项，与任务 2.5 偏差记录第 1 条同源，与本阶段改动无关），按预案记录后改用 `--legacy-apply --force` 完成，EXIT=0。「UI 抽查截图」同任务 2.5 偏差第 4 条，以静态产物核验替代，留待阶段四统一补做。「设置搜索功能回归」以 settings_search surface 词条静态替换只改 label 字面量（不触 slug/key）+ 全量测试 0 fail 作为回归证据，真机交互回归并入阶段四端到端收官。
6. **影响面评审兜底缺口修复（评审 Warning，方案 1）**：selector 收紧（第 4 条）后，非 forceRuntime 的 anchor 条目不入运行时头部，且旧 exact 兜底已随迁移移除，而 static-reconcile 对账层只回补 exact——静态锚点替换未来若失效（锚点在场但替换结构漂移）将无自动兜底。修复：`static-reconcile.js` 新增 `reconcileAnchorMappings`，对 anchor 且非 forceRuntime 条目以「生产替换重放幂等 + 锚点邻域模式命中」为落地判据（重放有差异→未落地回补；幂等且模式可命中→已落地不回补；幂等但模式不可命中→结构漂移回补；锚点缺席不回补，属 verify 报告范畴），manifest staticReconcile 身份键 anchorType+anchorId+field 与 exact 记录格式兼容。TDD 三情形 RED 存证 state/red-5-anchor-reconcile.log。本版本 12 条静态锚点均已落地，apply 复测 staticReconcile.count=0、性能全部持平（110.9KB / 454 / runtime-anchor 4 / rescanDelaysMs []）。

### 偏差记录（任务 11 实施 + 3.13.21 升级事件，2026-07-28）

1. **3.13.21 升级事件与锚点存活实战结论**：Cursor 自动升级 3.13.10→3.13.21，旧补丁产物整体被官方文件覆盖清零。勘查实测（state/reports/anchor-scan-3.13.21.json）：13 条稳定锚点 ID 在双 bundle 100% 存活——锚点机制首次跨版本实战验证通过；渲染层英文字面量 exact 保留、大小写未变；7 条 admission nls 词条在新版 nls 中整体消失（nls-check-3.13.21.json survival 0/7），但 3.13.21 首次真实 apply（默认引擎 --force）admission=KNOWN_DRIFT 未 BLOCKED，EXIT=0——旧 blockers 随文本系统重构自然消解，无需放宽准入。
2. **行为合同变化：anchor 假回补删除（推翻阶段三偏差第 6 条兜底设计）**：任务 11 排查实证 runtime 引擎对无 originalText 条目一律 continue 跳过，历史准入的 anchor 条目序列化为 [null, changeText] 死数据；reconcileAnchorMappings 的「回补进运行时」路径同样落入死数据，属假回补。处置：static-reconcile 的 anchor 回补路径整体删除，锚点失效改由 verify 严苛邻域核验显性报错（found-not-applied）的真实失效检测承接——从「假修复」转向「诚实报错」。未来可选方向（仅记录不实施）：回补时物化为带真实 originalText 的 exact 条目。
3. **运行时死代码清理（commit ba22752）**：selector 对 anchor 条目一律排除（forceRuntime 对 anchor 失效，静态锚点补丁是唯一落地路径）；compact 序列化过滤无 originalText 条目双保险；glass.agentPanel.continueWorking 去 forceRuntime 改走静态 i18nKey 锚点（3.13.21 双 bundle 实测静态落地各 1 处）；3 条无路径锚点（workbench.action.openCanvas/toggleFullScreen/developer，历代 bundle 无 id 结构点）从 anchors.json 及 defaults 删除（77→74 条，stable 13），翻译意图固化至 state/reports/task11-anchor-debt-for-task12.md 供 #12 消费。runtime-anchor 池 4→0，runtimeHeaderKB 110.9→110.8、runtimeMappingCount 453→449 净降，rescanDelaysMs=[] 不变。
4. **verify 锚点落地判定加固（commit 58b41b7）**：修复 P0 正则误匹配——窗口内锚定当前出现点（match 的 id 偏移必须等于当前出现点），新增 MAX_LANDING_TEXT_DISTANCE=600 字符邻域护栏防跨对象误判；删除 runtime-applied 死数据误判分支与 reconciledAnchorIds 假回补豁免，foundNotApplied 一律产 issue。3.13.21 verify 实测：stable 13/13 在场且 13 条全部 applied（严格模式）。
5. **渲染层双轨补课（commit 568f501）**：注册-渲染双轨架构下锚点只触达注册层，阶段三迁移词条渲染层仍英文。按微试点先例为 9 条词条补渲染层 exact 映射（forceRuntime:false 走静态），每条经 3.13.21 双 bundle Buffer 探针实测原文在场、形态一致、无第三方同名误伤；new-project 已有 exact 映射跳过。apply 后字节级核验：11 词条（9+微试点 2）中文落地、英文 0 残留，证据 state/reports/task11-evidence-3.13.21.txt（0 FAIL）。
6. **verify 残留 issue（3 条，非本任务范围）**：扩展弹窗抑制逻辑与容错 Marketplace map hook×2 在 3.13.21 结构漂移致 verify EXIT=1，与锚点体系无关，留待后续任务处置。全量测试 1051/1049/0 fail/2 skipped（基线 1046/1044 + 5 个任务 11 新增测试）。

---

## 审查记录（grill-me，推荐模式：只抛阻塞项）

### B1（阻塞）：anchorId 稳定性前提不成立——现存 anchors.json 大量使用 minified 短标识（如 "D5h"）
计划初稿默认「anchorId 稳定」，但 2.4 实证的 100% 存活率只属于**语义 ID**（command id/slug/i18n key）；minified 标识跨版本必变，批量迁移若沿用等于把 exact 文案脆弱性换个位置复制。
**处置**：新增决策 D4（语义 ID 准入标准 + minified 拒绝规则）、任务 3.1 候选提取内置 rejected 标记、新增任务 3.5 清理存量 minified anchorId 并引入 unstable 降级语义。已修订。

### B2（阻塞）：任务 1.2 对账判据「translatedSource 含 changeText」存在误报——多条词条可能共享同一 changeText
仅凭 `includes(changeText)` 判定静态成功，词条 A 的 changeText 恰好等于词条 B 的（如都译为「设置」）时会漏回补。
**处置**：任务 1.2 GREEN 步骤明确消歧要求：先经 workbenchIndex 确认 originalText 字面量仍以引号字面量形式在场（替换成功则该字面量应消失），以 originalText 消失与否为主判据、changeText 在场为辅证。测试 fixture 必须含同 changeText 双词条用例。已修订。

### B3（阻塞）：runtime-anchor 池与 forceRuntime 优先级冲突未定义
现存 anchors.json 条目全部 `forceRuntime: true`，按 classifyRuntimeMappingPool 现有顺序（14-49 行）会先命中 runtime-force，新增池形同虚设。
**处置**：任务 2.4 明确分类顺序调整——anchor 判定置于 forceRuntime **之前**，池语义优先；REFACTOR 步骤强制全仓排查池计数断言并显式更新，禁止静默兼容。已修订。

### B4（阻塞）：对账回补的词条不进 runtimeStrategy 报告与 manifest，造成「实际注入 ≠ 报告数」的新静默
builder 层回补发生在 buildRuntimeMappingsInfo（runtime-strategy.js:170）之后，commands.js:1169-1179 用的是回补前的 runtimeMappingsInfo.runtimeMappings，报告会低报。
**处置**：任务 1.2 REFACTOR 明确：workbench.js 返回值携带回补后的 runtimeMappings 与 reconciled 清单，commands.js:1171 改用 translatedWorkbench 返回的实际注入集合（runtimeFootprint 本就来自 parts，路径已存在）；manifest 增加 staticReconcile 字段。验收标准含「runtime 条目数变化 = 回补数可解释」。已修订。

### B5（阻塞）：i18nKey 锚点模式若锚定调用函数名（如 `C(`），minify 换名即全灭
`C("glass.agentPanel.continueWorking",...)` 中 `C` 是 minified 函数名，跨版本必漂移；模式若含函数名则锚点形同 exact。
**处置**：任务 2.2 RED 用例 (b) 明确：模式只锚定 key 字符串本身（`["']glass\.agentPanel\.continueWorking["']\s*,\s*["']...`），函数名不入模式；fixture 需含「函数名改变但 key 不变」的存活用例。已修订。

### B6（阻塞）：verify 07 阶段逐条抽验 1663 条 exact 的性能预算无实测依据，可能破坏 verify 秒级体验
初稿只写「逐条」，未定预算与实现约束。
**处置**：第六节明确：translated bundle 单次读取 + workbenchIndex 一次构建（quotedLiterals 集合查询 O(1)）、复用 session-cache；预算硬线 ≤ 2s，timer 实测超出即验收失败。任务 4.1/4.2 验收标准均含实测耗时证据。已修订。

### 结论
6 项阻塞项全部处置并回写正文（D4/D6 决策、任务 1.2/2.2/2.4/3.1/3.5/4.1/4.2 与第六节修订）。无遗留阻塞项。非阻塞建议（如 anchors schema 加 JSON Schema 校验）未纳入本计划范围，留待实施期按需提出。
