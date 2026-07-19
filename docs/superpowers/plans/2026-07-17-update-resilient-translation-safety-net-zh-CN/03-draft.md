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
- 只有当每个阻断级主路径失败都拥有经过测试的运行时兜底时，才自动准入 `DEGRADED`。
- 硬性能门禁：核心运行时载荷 `<= 80 KB`、每个界面域分片 `<= 20 KB`、基线机器/配置上的热 `verify <= 3 s`、冷 `verify <= 8 s`。
- `performance` 继续作为默认运行时模式。
- 禁止定时轮询、计划式全页面补扫、无限期 `document.body` 观察器、全局短词映射和模糊源码修改。
- 被阻断的预构建对 Cursor 安装目录执行零写入。
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

## 检查点 A：稳定身份

- [ ] 运行任务 1—2 的全部聚焦测试。
- [ ] 每个阻断级合约都有稳定 `translationId`，不存在冲突别名。
- [ ] 更新配置只包含哈希和结果元数据，不包含 Cursor 源码文本。

## 第二阶段：确定性语义重定位

### 任务 3：增加语义定位器和后置条件引擎

**文件：**

- 新建：`scripts/lib/compatibility/semantic-locator.js`
- 新建：`scripts/lib/compatibility/locator-postconditions.js`
- 新建：`scripts/tests/lib/semantic-locator.test.js`
- 新建：`scripts/tests/lib/fixtures/update-drift/product-tips.js`

**接口：**

- `resolveSemanticLocator(sourceText, locator) -> { status, matches, target? }`
- `evaluateLocatorPostconditions(sourceText, postconditions) -> { ok, failures }`
- 定位证据由稳定字面量、属性名和预期基数组合而成，压缩变量名不得成为证据。

- [ ] **RED：写变形与歧义测试**

测试必须覆盖压缩变量重命名、无害重排、唯一目标、重复候选和缺失候选。

运行：`node --test scripts/tests/lib/semantic-locator.test.js`

预期：因缺少语义定位器模块而失败。

- [ ] **GREEN：实现 512 字符有界证据窗口**

```js
function resolveSemanticLocator(sourceText, locator) {
  const source = String(sourceText || '');
  const windows = [];
  for (const anchor of locator.requiredFragments || []) {
    let offset = source.indexOf(anchor);
    while (offset >= 0) {
      const start = Math.max(0, offset - 512);
      const end = Math.min(source.length, offset + anchor.length + 512);
      const text = source.slice(start, end);
      if ((locator.requiredLiterals || []).every((literal) => text.includes(literal))) {
        windows.push({ start, end, anchorOffset: offset });
      }
      offset = source.indexOf(anchor, offset + anchor.length);
    }
  }
  const unique = windows.filter((item, index, all) =>
    all.findIndex((candidate) => candidate.anchorOffset === item.anchorOffset) === index
  );
  if (unique.length === locator.cardinality) return { status: 'resolved', matches: unique, target: unique[0] };
  return { status: unique.length === 0 ? 'missing' : 'ambiguous', matches: unique };
}
```

首版保持无解析器依赖且窗口有界。如果真实夹具证明这种合取证据不足，立即停止并申请增加解析器依赖的批准。

- [ ] **GREEN 验证与提交**

运行：`node --test scripts/tests/lib/semantic-locator.test.js`

预期：唯一、歧义、缺失和变形用例全部通过。

```powershell
git add scripts/lib/compatibility/semantic-locator.js scripts/lib/compatibility/locator-postconditions.js scripts/tests/lib/semantic-locator.test.js scripts/tests/lib/fixtures/update-drift/product-tips.js
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
- 修改：`translations/meta/translation-units.json`

**接口：** `classifyUpdateAdmission({ drift, outcomes }) -> { status, blockers, fallbacks }`。

- [ ] **RED：覆盖四种状态和兜底测试条件**

运行：`node --test scripts/tests/lib/update-admission.test.js`

预期：因缺少 `admission.js` 而失败。

- [ ] **GREEN：实现纯分类器**

```js
function classifyUpdateAdmission({ drift, outcomes }) {
  if (!drift) return { status: 'UNCHANGED', blockers: [], fallbacks: [] };
  const blockers = outcomes.filter((item) =>
    item.severity === 'error' && item.primary !== 'resolved' && item.fallbackTested !== true
  ).map((item) => item.translationId);
  if (blockers.length > 0) return { status: 'BLOCKED', blockers, fallbacks: [] };
  const fallbacks = outcomes.filter((item) => item.primary !== 'resolved' && item.fallbackTested === true)
    .map((item) => item.translationId);
  return { status: fallbacks.length > 0 ? 'DEGRADED' : 'KNOWN_DRIFT', blockers: [], fallbacks };
}
```

- [ ] **GREEN 验证与提交**

运行：`node --test scripts/tests/lib/update-admission.test.js scripts/tests/lib/translation-units.test.js`

```powershell
git add scripts/lib/compatibility/admission.js scripts/tests/lib/update-admission.test.js translations/meta/translation-units.json
git commit -m "feat: classify safe degraded updates"
```

### 任务 6：将 apply 拆为 prepare/commit，阻断时零写入

**文件：**

- 新建：`scripts/tool/prepared-build.js`
- 新建：`scripts/tests/tool/commands-apply-prepared.test.js`
- 修改：`scripts/tool/commands.js`
- 修改：`scripts/tool/create-app.js`
- 修改：`scripts/tool/paths.js`

**接口：**

- `createPreparedBuild({ buildId, rootDir, artifacts, admission, manifest })`
- `commitPreparedBuild(prepared, writers) -> { committedPaths }`
- `runApply()` 在准入状态不是 `BLOCKED` 之前不得调用任何安装写入器。

- [ ] **RED：记录所有安装写入调用，证明 BLOCKED 为零次**

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

`runApply()` 顺序固定为：预构建 -> 输出准入报告 -> BLOCKED 立即退出 -> 创建/验证备份 -> 提交 -> 安装后验证 -> 失败回滚。`createToolPaths()` 增加 `preparedBuildRoot`，所有依赖通过 `createToolApp()` 注入。

- [ ] **GREEN 验证与提交**

运行：`node --test scripts/tests/tool/commands-apply-prepared.test.js scripts/tests/tool/commands-apply-rollback.test.js scripts/tests/tool/commands-apply-rollback-locale.test.js scripts/tests/tool/commands-apply.test.js`

预期：全部通过；BLOCKED 零写入；安装后验证失败恢复备份。

```powershell
git add scripts/tool/prepared-build.js scripts/tests/tool/commands-apply-prepared.test.js scripts/tool/commands.js scripts/tool/create-app.js scripts/tool/paths.js
git commit -m "refactor: make apply a prepared transaction"
```

## 检查点 C：安全更新准入

- [ ] `BLOCKED` 对安装目录零写入。
- [ ] `DEGRADED` 仅在兜底全部经过测试时自动提交。
- [ ] 安装后验证失败恢复快照并保留诊断。

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

- [ ] **RED：覆盖挂载、作用域隔离、30 节点让出和卸载释放**

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

发现观察器只负责寻找界面域根节点；激活后，每个翻译器只能观察自己的注册根。禁止计划式全页面补扫。测试夹具增加观察器计数和单次 idle 批次控制。

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
- manifest 保存 `updateProfile`、`admission`、`runtimeShards` 和报告路径。
- `verify` 分别输出 `resolved`、`fallback`、`unknown`、`blocked`。

- [ ] **RED：证明阻断项优先，未知文本没有自动译文**

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

不得弱化现有 issue：`BLOCKED` 仍是错误；`DEGRADED` 中经过测试的 `fallback` 是明确警告；未知文本不计覆盖率，也没有合成的 `changeText`。

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
- 修改：`scripts/tests/cursor-zh-tool.integration.test.js`
- 修改：`docs/compatibility.md`

**接口：**

- `verify` 输出机器可读的阶段耗时，并在基线机器/配置上强制硬预算。
- 热验证复用由源哈希约束的覆盖率和定位结果；冷验证重新计算。

- [ ] **RED：覆盖 core、分片、热/冷 verify 预算以及 BLOCKED/DEGRADED 生命周期**

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
git add scripts/tests/tool/update-safety-net-performance.test.js scripts/tool/verify.js scripts/tool/session-cache.js scripts/tests/cursor-zh-tool.integration.test.js docs/compatibility.md
git commit -m "test: gate update resilient translation safety net"
```

## 最终验收清单

- [ ] 每个阻断级翻译单元都有稳定 ID、归属、主路径和兜底策略。
- [ ] 合成漂移保留 `100%` 阻断级翻译，不增加压缩源码版本片段。
- [ ] 歧义定位器返回 `fallback` 或 `blocked`，绝不修改源码。
- [ ] 未知文案保留英文、写入本地隔离报告并排除在已覆盖计数之外。
- [ ] `BLOCKED` 预构建对安装目录零写入。
- [ ] 只有所有阻断失败都有经过测试的兜底时，安全 `DEGRADED` 才自动提交。
- [ ] 核心运行时载荷 `<= 80 KB`，每个延迟界面域分片 `<= 20 KB`。
- [ ] 基线机器/配置上的热 `verify <= 3 s`、冷 `verify <= 8 s`。
- [ ] 运行时按界面域、事件驱动、每个 idle 批次最多 30 个节点，卸载时释放。
- [ ] 无轮询、全局补扫、未挂载分片预解析、联网翻译或模糊源码修改。
- [ ] 完整 Node 测试套件和 PowerShell AST 门禁通过。
- [ ] 真实启动、关键 UI 操作、Marketplace、卸载和干净验证通过。

## 回滚与停止条件

- 出现白屏、启动失败、配置目录漂移、干净状态退化或修改错误源码目标时立即停止。
- 如果必须增加解析器依赖才能继续，停止并申请明确批准。
- 如果只能通过弱化覆盖率或验证来满足硬预算，停止。
- 每个任务通过独立提交回滚；不得在包含用户改动的工作树中使用破坏性 reset。
- 任何提交后验证失败都必须保留预构建诊断和备份快照。

## 计划自检

- 规格覆盖：任务 1—2 稳定身份；任务 3—4 语义重定位；任务 5—6 更新准入和事务；任务 7—8 运行时安全网；任务 9—10 隔离、验证、性能和生命周期。
- 任务大小：每个任务修改 3—5 个文件，交付一种可独立评审的行为。
- 依赖顺序：元数据先于解析，解析先于准入，准入先于提交，分片先于运行时生命周期，报告和性能门禁最后收口。
- TDD：每个生产切片都从聚焦失败测试开始，记录预期失败，再增加最小实现并重跑聚焦回归。
- 完整性：每个实现步骤都包含具体 API、命令、预期结果和有界失败行为。

