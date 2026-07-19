# 抗更新翻译安全网实施计划

> **供智能体执行者使用：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans`，逐任务执行本计划。所有执行步骤均使用复选框（`- [ ]`）跟踪。

**目标：** 通过稳定翻译身份、确定性语义重定位、事务式更新准入和有界的按界面域运行时兜底，在 Cursor 更新后保住已有中文翻译。

**架构：** 保留现有官方 NLS、静态替换、运行时翻译器、备份和卸载层。在这些层之前增加稳定翻译单元合约与更新能力配置；使用语义定位器解析脆弱 hook；所有产物先生成到预构建目录；只允许 `UNCHANGED`、`KNOWN_DRIFT` 和兜底完整的 `DEGRADED` 构建进入提交阶段。运行时兜底数据拆成延迟加载的界面域分片，只有已挂载界面承担翻译成本。

**技术栈：** Node.js >= 18、CommonJS、内置 `node:test`、JSON 元数据、现有 workbench 字面量索引、生成式 JavaScript 运行时头、PowerShell AST 门禁。

**来源规格：**

- `docs/superpowers/specs/2026-07-17-update-resilient-translation-safety-net-design.md`
- `docs/superpowers/specs/2026-07-17-update-resilient-translation-safety-net-design-zh-CN/translation.md`

**双语一致性规则：** 英文计划是代码片段和接口拼写的规范源；本中文计划必须逐任务对应。执行中如果发现文字差异，以英文代码块、中文安全边界和已批准的三个默认值三者的交集为准，并先修正文档再编码。

## 全局约束

- 未知 Cursor 专属文案保留英文并写入本地隔离报告，不增加自动联网机翻。
- 静态 harvest 可以保留 Cursor 源码字面量。运行时原文隔离仅限界面域显式 `quarantineSelectors`；用户输入、可编辑区、编辑器、终端、聊天、代码和动态值区域永久拒绝采集，其他运行时未知内容只保留临时会话 HMAC 指纹、界面域和计数。
- 只有当每个阻断级主路径失败都拥有绑定当前源码/NLS/治理/工具证据的完整当前版本兜底证明时，才自动准入 `DEGRADED`。
- 硬性能门禁：核心运行时载荷 `<= 80 KB`、每个界面域分片 `<= 20 KB`、基线机器/配置上的热 `verify <= 3 s`、冷 `verify <= 8 s`。
- 载荷限制在所有环境硬失败。墙钟证明必须来自登记的专用基线指纹：预热 1 次、热测量 5 次、仅清 cursor-zh 会话缓存的冷测量 3 次，并以最慢样本执行门禁；`UNQUALIFIED` 环境不能批准发布。
- `performance` 继续作为默认运行时模式。
- 禁止定时轮询、计划式全页面补扫、全局翻译观察器、全局短词映射和模糊源码修改。性能模式只允许一个有界全局发现观察器：仅 `childList + subtree`，不观察属性/文本，不执行翻译或解析映射，每个 idle 批次最多检查 30 个新增根节点。
- 被阻断的预构建对工作区状态之外的所有受管目标执行零写入：安装产物、`argv.json`、locale mirror、扩展 NLS、语言包缓存、启动器和快捷方式。准入之前只允许写入 `state/generated/<build-id>` 下的预构建产物和诊断报告。
- commit 必须先确认 Cursor/更新进程静止，获取 `apply`/`ensure`/`uninstall` 共享的原子安装实例锁，并在备份或写入前精确复核预构建受管目标快照。
- 状态迁移只读且仅在内存进行；旧 manifest/备份不可变，未来 schema 安全失败，跨版本卸载必须依赖独立有效恢复胶囊。
- 发布顺序固定为 `shadow -> canary -> enforced`；`BLOCKED` 绝不自动选择旧写入器，未确认激活在下次已停止的 start/ensure 恢复 `lastKnownGood`，旧写入路径在一个过渡版本后到期。
- `main.js` 保持与原文件字节级一致，用户配置目录行为不得变化。
- 继续支持 `apply`、`ensure`、`verify`、`start`、`uninstall` 和 `verify --expect-clean`。
- 卸载必须先验证，再清理状态。
- 未经单独批准不得增加生产依赖。
- 每项生产行为变更都必须经历并观察到 RED -> GREEN -> REFACTOR。
- 开始实施前必须创建隔离 worktree 或取得干净工作区；当前检出包含用户的无关改动，不得覆盖。

---

## 依赖图

```text
翻译单元结构
    -> 更新能力配置
        -> 语义定位器与后置条件
            -> Product Tips 纵向切片
                -> 准入分类器
                    -> 预构建事务
                        -> 界面域分片编译器
                            -> 界面域运行时生命周期
                                -> verify/报告/性能门禁
```

每个任务都是可独立评审的纵向切片。聚焦测试和阶段检查点未变绿前，不得开始下游任务。

## 第一阶段：稳定身份与更新证据

### 任务 1：增加稳定翻译单元合约

**文件：**

- 新建：`translations/meta/translation-units.json`
- 新建：`scripts/lib/mapping/translation-units.js`
- 新建：`scripts/tests/lib/translation-units.test.js`
- 修改：`scripts/tool/paths.js`

**接口：**

- `loadTranslationUnits(filePath) -> { version, units }`
- `validateTranslationUnits(payload, surfaces) -> { units, byId, aliasesByScope }`
- 每个单元必须包含 `translationId`、`changeText`、`aliases`、`owner`、`primary`、`fallback`、`severity`、`placeholders`。

- [ ] **RED：先写失败测试**

覆盖以下行为：有效单元按作用域建立别名索引；重复 `translationId` 被拒绝；同一作用域冲突别名被拒绝；指向未注册界面域的运行时兜底被拒绝。

运行：`node --test scripts/tests/lib/translation-units.test.js`

预期：失败，错误为 `Cannot find module '../../lib/mapping/translation-units.js'`。

- [ ] **GREEN：实现最小验证器和加载器**

```js
function validateTranslationUnits(payload, surfaces = {}) {
  if (payload?.version !== 1 || !Array.isArray(payload.units)) {
    throw new Error('translation units must use version 1 and an units array');
  }
  const byId = new Map();
  const aliasesByScope = new Map();
  for (const unit of payload.units) {
    if (!unit?.translationId || byId.has(unit.translationId)) {
      throw new Error(`duplicate translationId: ${unit?.translationId || '<empty>'}`);
    }
    if (unit.fallback?.kind === 'runtime-surface' && !surfaces[unit.fallback.surface]) {
      throw new Error(`unregistered runtime surface: ${unit.fallback.surface}`);
    }
    byId.set(unit.translationId, unit);
    for (const alias of unit.aliases) {
      const key = `${unit.owner}\0${alias}`;
      const previous = aliasesByScope.get(key);
      if (previous && previous !== unit.translationId) throw new Error(`conflicting alias: ${unit.owner}/${alias}`);
      aliasesByScope.set(key, unit.translationId);
    }
  }
  return { units: payload.units, byId, aliasesByScope };
}
```

在 `createToolPaths()` 增加 `translationUnitsPath`。用 `surface-contracts.js` 中的阻断级合约初始化 JSON；稳定 ID 使用 `<surface>.<contract-id>`，保留现有英文别名和中文译文，只有 `surfaces.json` 已注册的界面域才能声明 `runtime-surface` 兜底。

- [ ] **GREEN 验证与提交**

运行：`node --test scripts/tests/lib/translation-units.test.js scripts/tests/lib/surface-contracts.test.js scripts/tests/lib/surfaces.test.js`

预期：全部通过。

```powershell
git add translations/meta/translation-units.json scripts/lib/mapping/translation-units.js scripts/tests/lib/translation-units.test.js scripts/tool/paths.js
git commit -m "feat: add stable translation unit contracts"
```

### 任务 2：构建可再分发的更新能力配置

**文件：**

- 新建：`scripts/lib/compatibility/update-profile.js`
- 新建：`scripts/tests/lib/update-profile.test.js`
- 修改：`scripts/tool/session-cache.js`
- 修改：`scripts/tool/manifest.js`

**接口：**

- `buildUpdateProfile(input) -> { version: 1, cursorVersion, vscodeVersion, bundles, nls, units }`
- `compareUpdateProfiles(previous, current) -> { status: 'UNCHANGED'|'KNOWN_DRIFT', changed }`

- [ ] **RED：先证明 bundle 哈希漂移能够被分类，同时配置中不保存源码文本**

运行：`node --test scripts/tests/lib/update-profile.test.js`

预期：因缺少 `update-profile.js` 而失败。

- [ ] **GREEN：实现排序稳定、仅包含元数据的配置**

```js
function buildUpdateProfile(input) {
  return {
    version: 1,
    cursorVersion: String(input.cursorVersion),
    vscodeVersion: String(input.vscodeVersion),
    bundles: [...input.bundles].map(({ capabilityId, hash }) => ({ capabilityId, hash }))
      .sort((a, b) => a.capabilityId.localeCompare(b.capabilityId)),
    nls: { inventoryHash: input.nls.inventoryHash },
    units: [...input.units].map(({ translationId, outcome }) => ({ translationId, outcome }))
      .sort((a, b) => a.translationId.localeCompare(b.translationId)),
  };
}
```

将翻译单元元数据加入 `collectMappingSourceSnapshots()`，并以可选末尾参数将 `updateProfile` 写入 `buildManifest()`，保持旧调用方兼容。

- [ ] **GREEN 验证与提交**

运行：`node --test scripts/tests/lib/update-profile.test.js scripts/tests/tool/manifest.test.js scripts/tests/tool/session-cache.test.js`

预期：全部通过。

```powershell
git add scripts/lib/compatibility/update-profile.js scripts/tests/lib/update-profile.test.js scripts/tool/session-cache.js scripts/tool/manifest.js
git commit -m "feat: record update capability profiles"
```

### 任务 2B：版本化状态 schema 并建立稳定恢复胶囊

**文件：**

- 新建：`scripts/lib/compatibility/state-schema.js`
- 新建：`scripts/lib/install/recovery-capsule.js`
- 新建：`scripts/tests/lib/state-migration-recovery.test.js`
- 修改：`scripts/tool/manifest.js`
- 修改：`scripts/lib/install/validate-backup.js`

**接口：**

- `readStateManifest(raw, { readerVersion }) -> { status, sourceSchema, manifest }`
- `buildRecoveryCapsule({ operation, buildId, installIdentity, backup, managedTargets })`
- `validateRecoveryCapsule(capsule, context) -> { valid, issues, recovery }`
- 通过只读内存适配器支持无版本 `v0` 和最近两个正式 schema。

- [ ] **RED：覆盖迁移、不可变性和安全失败**

夹具必须覆盖 `v0`、最近两个 schema、未知未来 schema、损坏 manifest、损坏胶囊、错误安装标识和无效备份指针。测试必须先记录旧 manifest/备份字节哈希，读取和迁移后逐字节一致。未来 schema 必须阻断 `apply/ensure`；`uninstall` 只有在独立验证的兼容胶囊存在时才允许执行。

运行：`node --test scripts/tests/lib/state-migration-recovery.test.js`

预期：当前 manifest 无版本，且不存在稳定恢复胶囊验证器，测试失败。

- [ ] **GREEN：实现只读适配器和胶囊验证**

新 manifest 声明 `schemaVersion` 和 `minReaderVersion`；缺失版本按 `v0` 处理，只在内存适配，原对象/字节不变。支持 `v0` 和最近两个正式版本；未知未来 schema、无效 JSON 或最低读取版本过新时安全失败并提示匹配/更高工具版本。

胶囊只包含 `{ capsuleVersion, minRecoveryReaderVersion, toolVersion, operation, buildId, installIdentity, backup, managedTargets }`。每个目标保存规范化标识、提交前存在性/哈希和恢复来源。独立验证胶囊 schema、安装标识、备份指针/内容及目标证据。旧备份目录永不改写、重命名、裁剪或升级。

- [ ] **GREEN 验证与提交**

运行：`node --test scripts/tests/lib/state-migration-recovery.test.js scripts/tests/tool/manifest.test.js scripts/tests/lib/validate-backup.test.js scripts/tests/tool/uninstall-orchestrator.test.js`

```powershell
git add scripts/lib/compatibility/state-schema.js scripts/lib/install/recovery-capsule.js scripts/tests/lib/state-migration-recovery.test.js scripts/tool/manifest.js scripts/lib/install/validate-backup.js
git commit -m "feat: version state and preserve recovery compatibility"
```

## 检查点 A：稳定身份与状态兼容

- [ ] 运行任务 1—2B 的全部聚焦测试。
- [ ] 每个阻断级合约都有稳定 `translationId`，不存在冲突别名。
- [ ] 更新配置只包含哈希和结果元数据，不包含 Cursor 源码文本。
- [ ] `v0` 和最近两个 schema 适配后字节不变；未来/损坏状态安全失败，只有独立有效胶囊能授权跨版本卸载。

## 第二阶段：确定性语义重定位

### 任务 3：增加语义定位器和后置条件引擎

**文件：**

- 新建：`scripts/lib/compatibility/structural-tokenizer.js`
- 新建：`scripts/lib/compatibility/semantic-locator.js`
- 新建：`scripts/lib/compatibility/locator-postconditions.js`
- 新建：`scripts/tests/lib/semantic-locator.test.js`
- 新建：`scripts/tests/lib/fixtures/update-drift/product-tips.js`

**接口：**

- `tokenizeStructuralSource(sourceText) -> Array<{ type, value, offset }>`
- `resolveSemanticLocator(sourceText, locator) -> { status, matches, target? }`
- `evaluateLocatorPostconditions(sourceText, postconditions) -> { ok, failures }`
- 定位证据由规范化结构 token、稳定字面量、属性名、相对 token 距离和预期基数组合而成。压缩变量名、空白、引号风格和可选链写法不得成为证据。

- [ ] **RED：写变形与歧义测试**

测试必须覆盖压缩变量重命名、单双引号变化、可选链改写、无害重排、唯一目标、重复候选和缺失候选。

运行：`node --test scripts/tests/lib/semantic-locator.test.js`

预期：因缺少语义定位器模块而失败。

- [ ] **GREEN：实现无第三方依赖的轻量 tokenizer 和有界 token 距离定位**

```js
const { iterateQuotedLiterals } = require('../patcher/workbench-index.js');

function tokenizeStructuralSource(sourceText) {
  const source = String(sourceText || '');
  const tokens = [];
  const literalSpans = [];
  iterateQuotedLiterals(source, (_quote, value, start, end) => {
    literalSpans.push({ start, end });
    tokens.push({ type: 'literal', value, offset: start });
  });
  const insideLiteral = (offset) => literalSpans.some((span) => offset >= span.start && offset < span.end);
  const pattern = /(\?\.|\.)\s*([A-Za-z_$][\w$]*)|(\?\?|[?:(),])/g;
  for (const match of source.matchAll(pattern)) {
    if (insideLiteral(match.index)) continue;
    if (match[2]) tokens.push({ type: 'property', value: match[2], offset: match.index });
    else tokens.push({ type: 'operator', value: match[3], offset: match.index });
  }
  return tokens.sort((left, right) => left.offset - right.offset);
}

function resolveSemanticLocator(sourceText, locator) {
  const tokens = tokenizeStructuralSource(sourceText);
  const matches = [];
  tokens.forEach((token, tokenIndex) => {
    if (token.type !== locator.anchor.type || token.value !== locator.anchor.value) return;
    const radius = locator.maxTokenDistance;
    const neighborhood = tokens.slice(Math.max(0, tokenIndex - radius), tokenIndex + radius + 1);
    const complete = locator.required.every((expected) =>
      neighborhood.some((item) => item.type === expected.type && item.value === expected.value)
    );
    if (complete) matches.push({ tokenIndex, offset: token.offset });
  });
  if (matches.length === locator.cardinality) return { status: 'resolved', matches, target: matches[0] };
  return { status: matches.length === 0 ? 'missing' : 'ambiguous', matches };
}
```

tokenizer 必须忽略普通变量标识符，并将 `.text` 与 `?.text` 规范化为同一个 `property:text` token。如果真实夹具证明结构 token 合取仍不足，立即停止并申请增加解析器依赖的批准。

- [ ] **GREEN 验证与提交**

运行：`node --test scripts/tests/lib/semantic-locator.test.js`

预期：唯一、歧义、缺失和变形用例全部通过。

```powershell
git add scripts/lib/compatibility/structural-tokenizer.js scripts/lib/compatibility/semantic-locator.js scripts/lib/compatibility/locator-postconditions.js scripts/tests/lib/semantic-locator.test.js scripts/tests/lib/fixtures/update-drift/product-tips.js
git commit -m "feat: add deterministic semantic locators"
```

### 任务 4：以 Product Tips 作为第一个语义纵向切片

**文件：**

- 修改：`scripts/lib/patcher/product-tips-hook.js`
- 修改：`scripts/lib/patcher/contracts.js`
- 修改：`scripts/tests/lib/product-tips-hook.test.js`
- 修改：`scripts/tests/lib/product-tip-runtime-fallback.test.js`

**接口：**

- `applyProductTipsRenderHook(sourceText) -> { sourceText, outcome, locatorId, postconditions }`
- 合约结果只能是 `resolved`、`fallback` 或 `blocked`；版本标签只用于诊断。

- [ ] **RED：证明语义定位优先，并且歧义时不修改源码**

运行：`node --test scripts/tests/lib/product-tips-hook.test.js scripts/tests/lib/product-tip-runtime-fallback.test.js`

预期：当前基于版本变体的 API 不暴露语义结果，因此测试失败。

- [ ] **GREEN：接入语义优先、现有运行时兜底**

```js
function applyProductTipsRenderHook(sourceText) {
  const located = resolveSemanticLocator(sourceText, PRODUCT_TIPS_LOCATOR);
  if (located.status !== 'resolved') {
    return { sourceText, outcome: 'fallback', locatorId: PRODUCT_TIPS_LOCATOR.locatorId,
      postconditions: { ok: false, failures: [located.status] } };
  }
  const patched = insertProductTipTranslatorAtTarget(sourceText, located.target);
  const postconditions = evaluateLocatorPostconditions(patched, [{
    id: 'single-product-tip-hook', fragment: '__cursorZhTranslateProductTipText', count: 1,
  }]);
  return { sourceText: patched, outcome: postconditions.ok ? 'resolved' : 'blocked',
    locatorId: PRODUCT_TIPS_LOCATOR.locatorId, postconditions };
}
```

现有 Product Tips 运行时翻译继续作为声明式兜底。旧变体保留一个发布周期，仅供诊断；增加测试，禁止新增 `glass-v*` 变体。

- [ ] **GREEN 验证与提交**

运行：`node --test scripts/tests/lib/product-tips-hook.test.js scripts/tests/lib/product-tip-runtime-fallback.test.js scripts/tests/lib/surface-contracts.test.js scripts/tests/lib/versioned-patches.test.js`

预期：全部通过。

```powershell
git add scripts/lib/patcher/product-tips-hook.js scripts/lib/patcher/contracts.js scripts/tests/lib/product-tips-hook.test.js scripts/tests/lib/product-tip-runtime-fallback.test.js
git commit -m "refactor: relocate product tips hook semantically"
```

## 检查点 B：语义重定位

- [ ] 变量名、引号、无害顺序和 bundle 标签变化时，唯一目标保持 `resolved`。
- [ ] 复制候选后必须得到 `fallback`，且源码完全不变。
- [ ] 没有新增 Product Tips 版本专用变体。

## 第三阶段：事务式更新准入

### 任务 5：增加自动安全 DEGRADED 准入分类器

**文件：**

- 新建：`scripts/lib/compatibility/admission.js`
- 新建：`scripts/tests/lib/update-admission.test.js`
- 修改：`scripts/lib/compatibility/update-profile.js`
- 修改：`translations/meta/translation-units.json`

**接口：** `classifyUpdateAdmission({ drift, outcomes, currentProofKey }) -> { status, blockers, fallbacks }`；`createFallbackProofKey({ bundleHashes, nlsInventoryHash, runtimeGovernanceHash, toolVersion })`。

- [ ] **RED：覆盖四种状态，以及完整、缺失、歧义和过期的当前版本兜底证明**

运行：`node --test scripts/tests/lib/update-admission.test.js`

预期：因缺少 `admission.js` 而失败。

- [ ] **GREEN：实现纯分类器**

```js
function isCurrentFallbackProof(proof, currentProofKey) {
  const contracts = proof?.contracts || {};
  return proof?.testPassed === true && proof?.shardCompiled === true
    && ['scope', 'lifecycle', 'placeholders', 'privacy'].every((name) => contracts[name] === true)
    && proof?.capabilityEvidence?.status === 'matched'
    && proof?.capabilityEvidence?.matchCount === 1
    && proof?.proofKey === currentProofKey;
}

function classifyUpdateAdmission({ drift, outcomes, currentProofKey }) {
  if (!drift) return { status: 'UNCHANGED', blockers: [], fallbacks: [] };
  const blockers = outcomes.filter((item) =>
    item.severity === 'error' && item.primary !== 'resolved'
      && !isCurrentFallbackProof(item.fallbackProof, currentProofKey)
  ).map((item) => item.translationId);
  if (blockers.length > 0) return { status: 'BLOCKED', blockers, fallbacks: [] };
  const fallbacks = outcomes.filter((item) => item.primary !== 'resolved'
    && isCurrentFallbackProof(item.fallbackProof, currentProofKey))
    .map((item) => item.translationId);
  return { status: fallbacks.length > 0 ? 'DEGRADED' : 'KNOWN_DRIFT', blockers: [], fallbacks };
}
```

- [ ] **GREEN 验证与提交**

运行：`node --test scripts/tests/lib/update-admission.test.js scripts/tests/lib/translation-units.test.js`

```powershell
git add scripts/lib/compatibility/admission.js scripts/tests/lib/update-admission.test.js scripts/lib/compatibility/update-profile.js translations/meta/translation-units.json
git commit -m "feat: classify safe degraded updates"
```

### 任务 6A：增加排他 commit 静止点

**文件：**

- 新建：`scripts/tool/transaction-lock.js`
- 新建：`scripts/tool/commit-preflight.js`
- 新建：`scripts/tests/tool/transaction-preflight.test.js`
- 修改：`scripts/tool/create-app.js`
- 修改：`scripts/tool/uninstall-orchestrator.js`

**接口：**

- `acquireTransactionLock({ installDir, operationId, operation, inspectProcess, now }) -> lease`
- `validateCommitStillness({ installDir, processes, preparedSnapshot, currentSnapshot }) -> { status, reason, evidence }`
- 锁标识为 `sha256(normalizedInstallDir)`，保存在 `state/locks/`；`apply`、`ensure`、`uninstall` 共享同一安装实例锁。

- [ ] **RED：覆盖进程占用、并发锁、快照漂移和陈旧锁回收**

测试必须证明：Cursor 或目标安装范围内更新进程存在时得到 `busy`；第二个并发操作得到 `transaction-active`；prepare 后任一受管目标存在性/哈希变化得到 `concurrent-drift`；以上情况备份和受管写入均为零。陈旧锁只有在超过最小陈旧时间且 PID 不存在或进程启动时间不匹配时才可回收；仅年龄过期、PID 仍为同一启动实例时均不得回收。大小写/斜杠不同但规范化后相同的安装路径必须竞争同一把锁。

运行：`node --test scripts/tests/tool/transaction-preflight.test.js`

预期：当前不存在原子安装实例锁和 commit 静止复核，测试失败。

- [ ] **GREEN：实现原子锁、进程静止和精确快照复核**

锁文件使用排他 `wx` 语义创建，保存 `{ pid, processStartedAt, ownerToken, installIdentity, operation, operationId, acquiredAt }`。检测 `Cursor.exe`；更新进程只有可执行路径或命令行属于目标安装时才阻断；如果 `Cursor.exe` 路径不可读取则安全失败。获取锁后重新计算完整受管目标登记表的存在性和内容哈希，与预构建快照逐项精确比较。任何失败都在备份和受管写入前返回带证据的 `BLOCKED`，预构建产物与诊断保留重试。锁持续到提交后验证成功或完整回滚结束；uninstall 通过同一 lease 和任务 2B 状态读取器：未来 manifest 必须拥有独立有效恢复胶囊，否则禁止猜测卸载。ensure 复用 apply 路径。

- [ ] **GREEN 验证与提交**

运行：`node --test scripts/tests/tool/transaction-preflight.test.js scripts/tests/tool/uninstall-orchestrator.test.js scripts/tests/tool/commands-apply.test.js scripts/tests/tool/commands-ensure.test.js`

```powershell
git add scripts/tool/transaction-lock.js scripts/tool/commit-preflight.js scripts/tests/tool/transaction-preflight.test.js scripts/tool/create-app.js scripts/tool/uninstall-orchestrator.js
git commit -m "feat: lock and revalidate managed commits"
```

### 任务 6B：将 apply 拆为 prepare/commit，阻断时零写入

**文件：**

- 新建：`scripts/tool/prepared-build.js`
- 新建：`scripts/tests/tool/commands-apply-prepared.test.js`
- 修改：`scripts/tool/commands.js`
- 修改：`scripts/tool/create-app.js`
- 修改：`scripts/lib/install/managed-external-files.js`

**接口：**

- `createPreparedBuild({ buildId, rootDir, artifacts, admission, manifest, recoveryCapsule, managedTargetSnapshot })`
- `commitPreparedBuild(prepared, writers) -> { committedPaths }`
- 每个预构建产物声明 `{ kind, targetPath, preparedPath, rollbackEntry }`。
- `runApply()` 在准入状态不是 `BLOCKED` 之前不得调用任何受管目标写入器。

- [ ] **RED：记录所有受管目标写入调用，证明 BLOCKED 为零次**

运行：`node --test scripts/tests/tool/commands-apply-prepared.test.js`

预期：当前 `runApply()` 在完整准入前写 bootstrap，测试失败。

- [ ] **GREEN：建立不可变预构建对象和提交边界**

```js
function createPreparedBuild(input) {
  return Object.freeze({
    buildId: input.buildId,
    rootDir: input.rootDir,
    artifacts: Object.freeze([...input.artifacts]),
    admission: Object.freeze({ ...input.admission }),
    manifest: Object.freeze({ ...input.manifest }),
  });
}

async function commitPreparedBuild(prepared, writers) {
  if (prepared.admission.status === 'BLOCKED') {
    throw new Error(`blocked: ${prepared.admission.blockers.join(', ')}`);
  }
  const committedPaths = [];
  for (const artifact of prepared.artifacts) {
    await writers.writeArtifact(artifact);
    committedPaths.push(artifact.installPath);
  }
  return { committedPaths };
}
```

`runApply()` 顺序固定为：预构建 -> 输出准入报告 -> BLOCKED 立即退出 -> 获取排他 lease 并精确复核快照 -> 创建/验证备份 -> 提交 -> 安装后验证 -> 失败回滚 -> 释放 lease。直接使用 `toolPaths.generatedDir/<build-id>` 作为仅限工作区的预构建根目录，不新增路径配置字段。扩展 `managed-external-files.js`，让事务统一枚举安装产物、已登记外部目标、语言包缓存、启动器和快捷方式；每项都记录提交前是否存在以及恢复来源，回滚按提交逆序恢复旧内容/元数据或移除新建目标。保持当前 `writeLocaleFiles()` 的 no-op：登记 locale mirror 只用于兼容与恢复，不得重新启用 locale 强制写入。所有新依赖通过 `createToolApp()` 注入。

受管写入前，在生成目录旁准备候选恢复胶囊。提交后验证成功后才以原子文件替换发布引用该胶囊的新 manifest。manifest/胶囊发布失败仍位于事务 try/catch 内，必须触发受管目标回滚，旧 manifest 继续为权威。孤立候选胶囊属于诊断工作区状态，只能由后续显式保留策略清理，迁移过程不得删除。

单个过渡版本内，把现有写入器提取为显式 `runLegacyApply()` 依赖，供任务 11B 的 shadow 对比使用，不得与新写入器混合归属。新引擎 `BLOCKED` 时绝不选择它，并必须声明到期版本。

- [ ] **GREEN 验证与提交**

运行：`node --test scripts/tests/tool/commands-apply-prepared.test.js scripts/tests/tool/commands-apply-rollback.test.js scripts/tests/tool/commands-apply-rollback-locale.test.js scripts/tests/tool/commands-apply.test.js`

预期：全部通过；BLOCKED 对每类受管目标都零写入；安装后验证失败同时恢复安装文件和所有已提交外部目标。

```powershell
git add scripts/tool/prepared-build.js scripts/tests/tool/commands-apply-prepared.test.js scripts/tool/commands.js scripts/tool/create-app.js scripts/lib/install/managed-external-files.js
git commit -m "refactor: make apply a prepared transaction"
```

## 检查点 C：安全更新准入

- [ ] `BLOCKED` 对安装产物、`argv.json`、locale mirror、扩展 NLS、语言包缓存、启动器和快捷方式零写入；允许保留工作区预构建产物和诊断。
- [ ] Cursor/更新进程占用、有效锁竞争和精确快照漂移都必须在备份或受管写入前阻断。
- [ ] 陈旧锁回收要求最小年龄加 PID 缺失/启动时间不匹配，lease 覆盖验证或完整回滚。
- [ ] `DEGRADED` 仅在当前版本兜底证明完整且唯一时自动提交；缺失、歧义或过期证据必须阻断。
- [ ] 安装后验证失败把每个已提交受管目标恢复到原先的存在性和内容状态，并保留诊断。

## 第四阶段：延迟加载的界面域运行时安全网

### 任务 7：将运行时映射编译为受治理的界面域分片

**文件：**

- 新建：`scripts/lib/mapping/runtime-shards.js`
- 新建：`scripts/tests/lib/runtime-shards.test.js`
- 修改：`scripts/lib/runtime/bundle-builder.js`
- 修改：`translations/meta/runtime-governance.json`

**接口：**

- `buildRuntimeShards(units, mappings, surfaces) -> { core, surfaces }`
- `measureRuntimeShards(shards) -> { coreKB, surfaceKB }`
- 每个分片携带界面域显式 UI chrome `quarantineSelectors`，且这些选择器不得扩大翻译作用域。

- [ ] **RED：证明有归属映射不进入 core，并验证各分片预算**

运行：`node --test scripts/tests/lib/runtime-shards.test.js`

预期：因缺少 `runtime-shards.js` 而失败。

- [ ] **GREEN：实现确定性分片和 UTF-8 字节测量**

```js
function measureRuntimeShards(shards) {
  const kb = (value) => Number((Buffer.byteLength(JSON.stringify(value), 'utf8') / 1024).toFixed(1));
  return { coreKB: kb(shards.core), surfaceKB: Object.fromEntries(
    Object.entries(shards.surfaces).map(([id, shard]) => [id, kb(shard)])
  ) };
}
```

运行时治理元数据增加 `maxCoreRuntimeKB: 80`、`maxSurfaceShardKB: 20`。`buildRuntimeHeader()` 接收分片，不再接收一个无法区分归属的总映射数组。

运行时治理同时登记测量协议：预热次数 `1`、热样本 `5`、冷样本 `3`、以最慢样本聚合，以及冷范围 `cursor-zh-session-cache-only`。预期基线机器/配置指纹由受保护发布环境提供，不提交到仓库。

- [ ] **GREEN 验证与提交**

运行：`node --test scripts/tests/lib/runtime-shards.test.js scripts/tests/lib/runtime-footprint-parts.test.js scripts/tests/lib/runtime-pools.test.js scripts/tests/tool/runtime-strategy.test.js`

```powershell
git add scripts/lib/mapping/runtime-shards.js scripts/tests/lib/runtime-shards.test.js scripts/lib/runtime/bundle-builder.js translations/meta/runtime-governance.json
git commit -m "feat: split runtime fallback by surface"
```

### 任务 8：按需激活并释放界面域翻译器

**文件：**

- 新建：`scripts/lib/runtime/surface-registry.js`
- 新建：`scripts/lib/runtime/surface-translator.js`
- 新建：`scripts/tests/lib/runtime-surface-lifecycle.test.js`
- 修改：`scripts/lib/runtime/text-translator-template.js`
- 修改：`scripts/tests/lib/helpers/runtime-dom-harness.js`

**接口：**

- `createSurfaceRegistry({ document, shards, createTranslator })`
- registry 提供 `discover(root)`、`activate(surfaceId, root)`、`deactivate(surfaceId)`、`dispose()`。
- 每个活动界面域只有一个观察器，每个空闲批次最多处理 30 个文本节点。
- 性能模式始终只有一个全局发现观察器；每个 idle 批次最多检查 30 个新增根节点，且自身绝不执行翻译。
- 运行时未知采集只有命中 UI chrome 白名单时才输出原文；拒绝区域绝不采集，其他未知内容只输出隐私安全的指纹和计数。

- [ ] **RED：覆盖挂载、作用域隔离、发现/翻译双重 30 节点预算和卸载释放**

运行：`node --test scripts/tests/lib/runtime-surface-lifecycle.test.js`

预期：当前运行时和测试夹具不提供界面域生命周期接口，测试失败。

- [ ] **GREEN：实现单界面域单观察器生命周期**

```js
function createSurfaceRegistry({ document, shards, createTranslator }) {
  const active = new Map();
  function activate(surfaceId, root) {
    if (active.has(surfaceId)) return active.get(surfaceId);
    const translator = createTranslator({ root, shard: shards[surfaceId], batchSize: 30 });
    translator.start();
    active.set(surfaceId, translator);
    return translator;
  }
  function deactivate(surfaceId) {
    const translator = active.get(surfaceId);
    if (translator) translator.dispose();
    active.delete(surfaceId);
  }
  function dispose() { for (const id of [...active.keys()]) deactivate(id); }
  return { activate, deactivate, dispose, activeCount: () => active.size };
}
```

在 `document.body || document.documentElement` 上只安装一个 `{ childList: true, subtree: true }` 的发现 `MutationObserver`。回调只把 `addedNodes` 入队；idle worker 每批最多检查 30 个新增根节点，只用已登记界面域选择器匹配该节点及其后代，不执行翻译、文本遍历、属性处理或分片解析。收到 child-list 通知时可以释放根节点已断开的界面域翻译器。激活后，每个翻译器只能观察自己的注册根；发现回调不得查询整个 document，也不得计划全页面补扫。测试夹具分别统计发现观察器和界面域观察器，并提供确定性的单批次控制。

在 `surface-translator.js` 中，只有节点命中分片 `quarantineSelectors` 且不属于或嵌套于不可变拒绝选择器（`input`、`textarea`、`[contenteditable]`、编辑器、终端、聊天/消息正文、代码和动态值区域）时，才允许输出运行时原文。其他运行时未知内容使用随机临时会话密钥生成 HMAC-SHA-256，仅保留 `{ fingerprint, surface, count, algorithm, keyScope }`；密钥永不持久化或进入报告。如果 Web Crypto 不可用，只增加界面域聚合计数，绝不能退回保存原文。RED 必须覆盖白名单原文、拒绝区域零泄漏、非白名单仅指纹，以及安全指纹不可用时仅计数。

- [ ] **GREEN 验证与提交**

运行：`node --test scripts/tests/lib/runtime-surface-lifecycle.test.js scripts/tests/lib/runtime-translate-perf.test.js scripts/tests/lib/l3-surface-runtime.test.js scripts/tests/lib/runtime-menu-flash.test.js`

预期：全部通过；`performance` 模式未安装 interval 定时器。

```powershell
git add scripts/lib/runtime/surface-registry.js scripts/lib/runtime/surface-translator.js scripts/tests/lib/runtime-surface-lifecycle.test.js scripts/lib/runtime/text-translator-template.js scripts/tests/lib/helpers/runtime-dom-harness.js
git commit -m "feat: activate runtime fallback per surface"
```

## 检查点 D：运行时安全网

- [ ] core `<= 80 KB`，每个分片 `<= 20 KB`。
- [ ] 未挂载界面域不创建翻译器、不解析分片。
- [ ] 每个已挂载界面域一个观察器、30 节点后让出、卸载即释放。
- [ ] 全局发现观察器恰好一个，仅使用 `childList + subtree`，每个 idle 批次最多检查 30 个新增根节点，翻译尝试为零且不查询整个 document。
- [ ] 运行时报告只有显式 UI chrome 白名单可以保留原文；所有拒绝区域零泄漏，其他内容只有会话级 HMAC 指纹/计数。
- [ ] `performance` 模式无轮询和计划式全页面补扫。

## 第五阶段：隔离、验证与发布门禁

### 任务 9：报告未知文本并持久化准入证据

**文件：**

- 新建：`scripts/lib/compatibility/quarantine-report.js`
- 新建：`scripts/tests/lib/quarantine-report.test.js`
- 修改：`scripts/tool/manifest.js`
- 修改：`scripts/tool/verify.js`
- 修改：`scripts/tool/report.js`

**接口：**

- `buildQuarantineReport(records) -> { blockers, changedAliases, criticalUnknown, visibleUnknown, noise }`
- `buildQuarantineReport(records)` 额外输出 `privacyDrops`；manifest 保存 `updateProfile`、`admission`、`runtimeShards` 和报告路径。
- `verify` 分别输出 `resolved`、`fallback`、`unknown`、`blocked`。

- [ ] **RED：证明阻断项优先、未知文本没有自动译文，并剔除未授权运行时原文**

运行：`node --test scripts/tests/lib/quarantine-report.test.js`

预期：因缺少隔离报告模块而失败。

- [ ] **GREEN：实现确定性分桶**

```js
function buildQuarantineReport(records) {
  const report = { blockers: [], changedAliases: [], criticalUnknown: [], visibleUnknown: [], noise: [] };
  for (const record of records) {
    if (record.kind === 'blocked') report.blockers.push(record);
    else if (record.kind === 'changed-alias') report.changedAliases.push(record);
    else if (record.kind === 'unknown' && record.critical) report.criticalUnknown.push(record);
    else if (record.kind === 'unknown') report.visibleUnknown.push(record);
    else report.noise.push(record);
  }
  return report;
}
```

静态来源可以保留源码原文；运行时原文只有 `capturePolicy: 'allowlisted-chrome'` 才能进入报告。其他带原文的运行时记录必须被剔除并增加 `privacyDrops`；合法指纹记录只保留指纹、界面域和计数。不得弱化现有 issue：`BLOCKED` 仍是错误；`DEGRADED` 中具有当前版本证明的 `fallback` 是带证明键/证据签名的明确警告；未知文本不计覆盖率，也没有合成的 `changeText`。报告写入器在序列化前再次执行同一隐私过滤，并禁止写入临时 HMAC 密钥。

- [ ] **GREEN 验证与提交**

运行：`node --test scripts/tests/lib/quarantine-report.test.js scripts/tests/tool/manifest.test.js scripts/tests/tool/verify.test.js scripts/tests/tool/commands-ensure.test.js`

```powershell
git add scripts/lib/compatibility/quarantine-report.js scripts/tests/lib/quarantine-report.test.js scripts/tool/manifest.js scripts/tool/verify.js scripts/tool/report.js
git commit -m "feat: report update admission and unknown copy"
```

### 任务 10：强制性能预算并完成生命周期验收

**文件：**

- 新建：`scripts/tests/tool/update-safety-net-performance.test.js`
- 修改：`scripts/tool/verify.js`
- 修改：`scripts/tool/session-cache.js`
- 修改：`.github/workflows/release.yml`
- 修改：`docs/compatibility.md`

**接口：**

- `verify` 输出机器可读的阶段耗时、样本、计算出的机器/配置指纹和资格状态。
- 热验证复用由源哈希约束的覆盖率和定位结果；冷验证重新计算。
- 大小预算在所有环境失败；墙钟预算只在指纹匹配的 `QUALIFIED` 基线上失败。普通机器报告 `UNQUALIFIED`，要求发布证明时该状态必须失败。
- 发布工作流必须先通过自托管 `cursor-zh-baseline` 任务，现有发布任务才能执行。
- 生命周期夹具在 `BLOCKED` 前后比较完整受管目标清单及其存在性/内容哈希，而不是只比较安装目录。
- `DEGRADED` 生命周期夹具使用完整的当前版本 `fallbackProof`；过期证明键夹具必须得到 `BLOCKED`。

- [ ] **RED：覆盖 core、分片、热/冷 verify 预算以及 BLOCKED/DEGRADED 生命周期**

RED 还必须覆盖：指纹不匹配得到 `UNQUALIFIED` 且不能发布；热样本必须为预热后 5 次、冷样本必须为 3 次；取最慢样本；冷清理只删除 cursor-zh verify 会话缓存，不得触碰备份或操作系统缓存。

运行：`node --test scripts/tests/tool/update-safety-net-performance.test.js scripts/tests/cursor-zh-tool.integration.test.js`

预期：预算求值器和夹具准入流程尚未接线，测试失败。

- [ ] **GREEN：实现预算求值器和复合哈希缓存键**

```js
function evaluateSafetyNetBudgets(actual, limits) {
  const issues = [];
  if (actual.coreRuntimeKB > limits.maxCoreKB) {
    issues.push(`core runtime payload (${actual.coreRuntimeKB} KB > ${limits.maxCoreKB} KB)`);
  }
  for (const [surface, size] of Object.entries(actual.surfaceShardKB)) {
    if (size > limits.maxSurfaceKB) issues.push(`surface shard ${surface} (${size} KB > ${limits.maxSurfaceKB} KB)`);
  }
  if (actual.warmVerifyMs > limits.maxWarmVerifyMs) issues.push('warm verify budget exceeded');
  if (actual.coldVerifyMs > limits.maxColdVerifyMs) issues.push('cold verify budget exceeded');
  return { issues, withinBudget: issues.length === 0 };
}
```

缓存键必须同时包含：原始 bundle 哈希、NLS 清单哈希、翻译单元元数据快照、运行时治理快照和工具版本。任一部分变化都不得复用旧准入结果。

基线指纹由规范化 Windows build、CPU 型号/逻辑核心数、内存档位、Node 主版本、Cursor 测试夹具版本/安装标识、运行时模式和测量配置 ID 生成，并与受保护的 `CURSOR_ZH_BASELINE_FINGERPRINT` 比较。执行 1 次不计时预热、5 次热测量和 3 次冷测量；每次冷测量前只调用窄范围会话缓存清理器，不清除操作系统缓存。普通环境输出 `UNQUALIFIED`，但不因墙钟阈值失败；当 `CURSOR_ZH_REQUIRE_PERFORMANCE_PROOF=1` 时，登记缺失/不匹配、样本不完整或最慢样本超限都必须非零退出。

在 `.github/workflows/release.yml` 增加必需的 `performance-baseline` 任务，使用 `[self-hosted, Windows, cursor-zh-baseline]`、受保护指纹/安装目录值和 `CURSOR_ZH_REQUIRE_PERFORMANCE_PROOF=1`。上传机器可读性能证据产物，并让现有 `release` 任务通过 `needs: performance-baseline` 依赖它；GitHub 托管发布机不得用自身墙钟结果替代。

`docs/compatibility.md` 记录基线采样协议、`UNQUALIFIED` 含义、更新状态机、隐私隔离、安全 `DEGRADED` 和恢复命令。

- [ ] **GREEN：运行聚焦、全量与 PowerShell AST 门禁**

```powershell
node --test scripts/tests/tool/update-safety-net-performance.test.js scripts/tests/cursor-zh-tool.integration.test.js
node scripts/run-tests.js
```

预期：聚焦测试通过；全套测试退出码为 `0`，失败数为 `0`。

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

- [ ] **真实预构建、用户操作与卸载验收**

只对专用可抛弃测试安装 `D:\Apps\cursor-test` 执行，不得指向日常安装：

```powershell
node scripts/cursor-zh-tool.js ensure --install-dir "D:\Apps\cursor-test"
node scripts/cursor-zh-tool.js verify --install-dir "D:\Apps\cursor-test"
```

手工验证：正常进入工作区、Composer 追问、模型选择器搜索、设置搜索、一个对话框兜底以及 Marketplace 打开。完全退出 Cursor 后运行：

```powershell
node scripts/cursor-zh-tool.js uninstall --install-dir "D:\Apps\cursor-test"
node scripts/cursor-zh-tool.js verify --expect-clean --install-dir "D:\Apps\cursor-test"
```

预期：无白屏和配置目录漂移；声明的界面操作显示中文；Marketplace 无需全局扫描即可打开；卸载和干净验证成功。

- [ ] **提交最终门禁与文档**

```powershell
git add scripts/tests/tool/update-safety-net-performance.test.js scripts/tool/verify.js scripts/tool/session-cache.js .github/workflows/release.yml docs/compatibility.md
git commit -m "test: gate update resilient translation safety net"
```

### 任务 11A：记录 lastKnownGood 激活状态并在下次已停止启动时恢复

**文件：**

- 新建：`scripts/tool/rollout-state.js`
- 新建：`scripts/tests/tool/rollout-state.test.js`
- 修改：`scripts/tool/commands.js`
- 修改：`scripts/tool/builder/bootstrap.js`
- 修改：`scripts/tests/tool/commands-start.test.js`

**接口：** `recordPendingActivation(...)`、`acknowledgeReadiness(...)`、`planNextLaunchRecovery(...)`；readiness 只接受完全匹配的待激活 nonce/build ID。

- [ ] **RED：覆盖 lastKnownGood、一次性 readiness 和下次启动恢复**

测试必须证明：被接受的 canary/enforced 提交把前一已接受 manifest/快照/胶囊保存为 `lastKnownGood` 并生成随机一次性 nonce；错误 nonce、workbench 未完成加载或空 DOM 均不得确认；readiness 未确认且 Cursor 仍运行时只返回 `wait-for-stop`，绝不终止进程；Cursor 已停止时事件顺序必须为“获取安装锁 -> 恢复 lastKnownGood -> 验证恢复 -> 清除 pending -> 释放 -> 启动”。

运行：`node --test scripts/tests/tool/rollout-state.test.js scripts/tests/tool/commands-start.test.js`

预期：当前不存在激活状态、bootstrap readiness 和下次启动恢复，测试失败。

- [ ] **GREEN：实现一次性 readiness 和停止状态恢复**

接受提交后原子写入 pending activation。生成 bootstrap 只携带 marker 路径、nonce 和 build ID；监听一次 workbench `did-finish-load`，执行一次有界 DOM 探针（`document.body` 存在且至少一个子元素），由主进程原子确认匹配 nonce，禁止轮询和页面扫描。`runStart()` 和 ensure 的变更阶段在启动/写入前检查 pending：运行中只等待退出；已停止则在任务 6A 锁内通过有效胶囊恢复并验证 `lastKnownGood`，验证成功才清 pending 并启动，失败则阻断并保留证据。

- [ ] **GREEN 验证与提交**

运行：`node --test scripts/tests/tool/rollout-state.test.js scripts/tests/tool/commands-start.test.js scripts/tests/tool/bootstrap-redirect-cache.test.js scripts/tests/tool/bootstrap-glass.test.js scripts/tests/tool/transaction-preflight.test.js`

```powershell
git add scripts/tool/rollout-state.js scripts/tests/tool/rollout-state.test.js scripts/tool/commands.js scripts/tool/builder/bootstrap.js scripts/tests/tool/commands-start.test.js
git commit -m "feat: recover unconfirmed safety net activations"
```

### 任务 11B：门禁 shadow、canary、enforced 提升和旧路径退役

**文件：**

- 修改：`scripts/tool/index.js`
- 修改：`scripts/tests/cursor-zh-tool.integration.test.js`
- 修改：`translations/meta/runtime-governance.json`
- 修改：`.github/workflows/release.yml`
- 修改：`docs/compatibility.md`

**接口：** 发布模式为 `shadow`、`canary`、`enforced`；过渡参数为 `--safety-net-canary` 和带到期版本的仅维护 `--legacy-apply`；`validateRolloutPromotion(evidence)` 决定是否可提升。

- [ ] **RED：覆盖发布模式、证据提升和旧路径到期**

集成矩阵必须证明：shadow 完整执行新 prepare/准入/证明对比但新引擎受管写入为零，随后才调用过渡旧写入器；canary 在缺少参数、缺少 `CURSOR_ZH_CANARY_INSTALL_DIR`、路径不匹配或命中日常安装时拒绝；`BLOCKED` 绝不自动调用旧写入器；enforced 只有全部门禁通过且证据包含两个不同 Cursor 构建、其中一个 `upstreamUpdate: true` 时可用；`--legacy-apply` 只在一个过渡版本警告可用，到达 `legacyWriterExpiresAt` 后必须失败。

运行：`node --test scripts/tests/cursor-zh-tool.integration.test.js scripts/tests/tool/rollout-state.test.js`

- [ ] **GREEN：实现受保护发布模式和提升证据**

过渡版本默认 `shadow`。任务 6B 保留的旧写入器只以显式 `runLegacyApply()` 存在；shadow 只能在新引擎生成对比证据且未 `BLOCKED` 后调用，任何 `BLOCKED` 都直接停止。canary 要求显式参数，并与受保护 canary 安装路径规范化后完全相等，同时拒绝日常安装身份。enforced 的正常路由不提供旧路径选择。

`rollout-evidence.json` 保存发布模式、门禁结果、Cursor 构建标识、`upstreamUpdate` 来源、真实操作结果、合格性能证据 ID 和旧路径到期版本。提升要求全部为绿、至少两个不同构建且包含一次真实上游更新。旧路径仅保留一个声明的包版本；到期是失败合约，enforced 提升变更中删除旧写入器。

- [ ] **GREEN：发布工作流、全套测试与提交**

发布工作流在合格性能任务之后、打包之前运行提升验证；证据缺失/不完整、真实操作失败、构建不足、没有真实更新或旧路径过期依赖均阻断，并上传发布证据。`docs/compatibility.md` 记录命令、readiness 恢复和到期规则。

```powershell
node --test scripts/tests/cursor-zh-tool.integration.test.js scripts/tests/tool/rollout-state.test.js
node scripts/run-tests.js
git add scripts/tool/index.js scripts/tests/cursor-zh-tool.integration.test.js translations/meta/runtime-governance.json .github/workflows/release.yml docs/compatibility.md
git commit -m "feat: stage safety net rollout and retirement"
```

## 最终验收清单

- [ ] 每个阻断级翻译单元都有稳定 ID、归属、主路径和兜底策略。
- [ ] 合成漂移保留 `100%` 阻断级翻译，不增加压缩源码版本片段。
- [ ] 歧义定位器返回 `fallback` 或 `blocked`，绝不修改源码。
- [ ] 未知文案保留英文、写入本地隔离报告并排除在已覆盖计数之外；运行时报告只有显式 UI chrome 白名单可含原文，且绝不含用户输入、可编辑区、编辑器、终端、聊天、代码或动态值内容。
- [ ] `BLOCKED` 预构建对工作区状态之外的所有受管目标零写入；准入前只产生预构建产物和诊断。
- [ ] 旧 manifest/备份保持字节一致；已接受状态只在验证后发布，未来/损坏状态绝不授权猜测恢复。
- [ ] 进程占用、有效事务或 prepare 到 commit 漂移必须在备份/写入前阻断；锁持续覆盖提交后验证或完整回滚，且陈旧锁绝不只凭年龄回收。
- [ ] 只有所有阻断失败都有完整当前版本兜底证明时，安全 `DEGRADED` 才自动提交；证明缺失、歧义、失败或过期均得到 `BLOCKED`。
- [ ] 核心运行时载荷 `<= 80 KB`，每个延迟界面域分片 `<= 20 KB`。
- [ ] 登记基线证据包含 1 次预热、5 个热样本和 3 个仅清 cursor-zh 缓存的冷样本；最慢热 `verify <= 3 s`、最慢冷 `verify <= 8 s`。
- [ ] 普通环境报告 `UNQUALIFIED`；基线证据缺失、指纹不匹配或样本不完整必须阻断发布工作流。
- [ ] shadow 生成完整对比证据且新引擎零写入；canary 仅限登记的可抛弃安装；enforced 证据覆盖两个构建并包含一次真实上游更新。
- [ ] 接受激活记录 `lastKnownGood`；readiness 未确认时绝不终止 Cursor，并在下次已停止启动前持锁恢复。
- [ ] `BLOCKED` 绝不自动回退旧路径；仅维护旧写入器在一个过渡版本后失败，并在 enforced 提升时删除。
- [ ] 运行时翻译按界面域执行并在卸载时释放；唯一全局发现观察器只监听 child-list、不执行翻译且每个 idle 批次最多检查 30 个新增根节点。
- [ ] 无轮询、全局补扫、未挂载分片预解析、联网翻译或模糊源码修改。
- [ ] 完整 Node 测试套件和 PowerShell AST 门禁通过。
- [ ] 真实启动、关键 UI 操作、Marketplace、卸载和干净验证通过。

## 回滚与停止条件

- 出现白屏、启动失败、配置目录漂移、干净状态退化或修改错误源码目标时立即停止。
- 如果必须增加解析器依赖才能继续，停止并申请明确批准。
- 如果只能通过弱化覆盖率或验证来满足硬预算，停止。
- 每个任务通过独立提交回滚；不得在包含用户改动的工作树中使用破坏性 reset。
- 任何提交后验证失败都必须按提交逆序回滚完整受管目标集合，同时保留预构建诊断和备份快照。
- 激活未确认且 Cursor 仍运行时延迟恢复；下次已停止 start/ensure 在安装锁内恢复并验证 `lastKnownGood` 后才能启动。

## 计划自检

- 规格覆盖：任务 1—2B 稳定身份与状态兼容；任务 3—4 语义重定位；任务 5—6B 更新准入和事务；任务 7—8 运行时安全网；任务 9—10 隔离、验证、性能和生命周期；任务 11A—11B 分阶段发布、readiness、恢复和退役。
- 任务大小：每个任务修改 3—5 个文件，交付一种可独立评审的行为。
- 依赖顺序：元数据先于解析，解析先于准入，准入先于提交，分片先于运行时生命周期，报告和性能门禁最后收口。
- TDD：每个生产切片都从聚焦失败测试开始，记录预期失败，再增加最小实现并重跑聚焦回归。
- 完整性：每个实现步骤都包含具体 API、命令、预期结果和有界失败行为。
