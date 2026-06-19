# Cursor-zh 模块化重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `scripts/cursor-zh-lib.js`（3347 行，146 KB）与 `scripts/cursor-zh-tool.js`（1978 行，63 KB）从当前的“上帝模块 + 全能 CLI”结构，重构为领域边界清晰、职责单一、测试可独立运行的模块化架构。重构过程保持所有现有测试通过，并修复当前 2 个预先存在的集成测试失败。

**Architecture:** 采用“核心库（lib）+ CLI 适配层（tool）+ 翻译数据（json）”三层结构：
- `lib/`：纯函数翻译引擎、字符串/映射工具、覆盖率分析、运行时代码生成；
- `tool/`：CLI 命令解析、安装探测、文件系统 IO、构建编排、验证报告；
- `translations/`：所有翻译数据外置为 JSON，代码中不再硬编码映射表。

**Tech Stack:** Node.js 18+，CommonJS，内置 `node:test`，无外部依赖。

---

**Repository note:** `D:/Project/Cursor-zh` 当前没有 `.git` 目录，所以每个 task 以 checkpoint 记录代替 commit。如果在真实 git clone 中执行，请将每个 checkpoint 转换为正常 commit。

---

## 0. 当前问题诊断（执行前基线）

### 0.1 大文件与上帝模块

| 文件 | 行数 | 大小 | 职责数量 | 风险等级 |
|------|------|------|----------|----------|
| `scripts/cursor-zh-lib.js` | 3347 | 146 KB | 6+ 个领域 | 高 |
| `scripts/cursor-zh-tool.js` | 1978 | 63 KB | 5+ 个层级 | 高 |

`cursor-zh-lib.js` 同时承担：
1. 翻译数据仓库（`defaultCursorWinCommonMappings`、`defaultOverlayMappings`、`defaultCursorWinDynamicMappings`）；
2. 翻译引擎（`createTextTranslator`、`translateTextWithMappings`、`normalizeTextForComparison`）；
3. 静态补丁（`applyStaticSourceTranslations`、`applyStaticSourceTranslationsDetailed`）；
4. 运行时代码生成（`buildTranslatedWorkbenchBundle`，字符串拼接约 1000 行浏览器端代码）；
5. 覆盖率分析（`analyzeCursorWinCoverage`、`analyzeDynamicRuleCoverage`、`analyzeProductTipsCoverage`）；
6. 补丁契约评估（`evaluatePatchContracts`、`summarizeStaticPatchContractsFromTranslatedSource`）。

`cursor-zh-tool.js` 同时承担：
1. CLI 入口与命令分发；
2. Cursor 安装目录探测；
3. 文件系统 IO 与缓存；
4. 补丁编排（生成 main / workbench / nls / bootstrap / extension 翻译文件）；
5. 验证报告与覆盖率输出；
6. 实验性 runtime toggle 管理。

### 0.2 模块边界模糊

- `cursor-zh-tool.js` 从 `cursor-zh-lib.js` 导入 23 个函数，涵盖数据、引擎、分析、生成器，没有分层抽象；
- 运行时代码生成器 `buildTranslatedWorkbenchBundle` 与浏览器端 `TextTranslator` 类通过字符串拼接耦合，无法独立测试浏览器端逻辑；
- 翻译数据与代码混在一起，新增一条翻译需要修改 JS 源代码并重新运行全部测试。

### 0.3 预先存在的测试失败

当前测试基线：`61/63` 通过，`2` 个失败。

失败位置：
- `scripts/tests/cursor-zh-tool.integration.test.js` 行 1598
- `scripts/tests/cursor-zh-tool.integration.test.js` 行 1780

失败原因：`runtimeMappingCount` 期望值 `355`，实际值 `346`。原因是 `defaultCursorWinCommonMappings()` 或 `defaultCursorWinDynamicMappings()` 中的翻译条目数量已变化（增加了 9 条），但测试中的硬编码期望值未同步更新。

**修复策略：** 在 Task 1 中将默认映射数据外置为 JSON 文件后，测试改为从数据源读取实际条目数，不再硬编码 `355`。

---

## 1. 目标目录结构

重构后的 `scripts/` 目录：

```
scripts/
├── cursor-zh-tool.js                 # CLI 入口（变薄，仅负责命令解析与调度）
├── cursor-zh-config.js               # 现有配置模块，保持不变
├── lib/
│   ├── index.js                      # 向后兼容的聚合导出（替代原 cursor-zh-lib.js 的 module.exports）
│   ├── mapping/
│   │   ├── data.js                   # 默认映射数据加载器（从 JSON 读取）
│   │   ├── merge.js                  # mergeMappings, mappingKey
│   │   ├── parser.js                 # parseLegacyWorktreeMappings, parseJsonc
│   │   └── factory.js                # createMapping / createExactMapping / createRegexMapping
│   ├── engine/
│   │   ├── translator.js             # createTextTranslator, translateTextWithMappings
│   │   ├── normalize.js              # normalizeTextForComparison
│   │   └── substring.js              # collectPresentSubstrings, createSubstringMatcher
│   ├── patcher/
│   │   ├── static.js                 # applyStaticSourceTranslations, applyStaticSourceTranslationsDetailed
│   │   ├── contracts.js              # KEY_SURFACE_PATCH_CONTRACTS, evaluatePatchContracts
│   │   └── runtime-selector.js       # selectRuntimeMappings, productTipScopedMappings
│   ├── runtime/
│   │   ├── bundle-builder.js         # buildTranslatedWorkbenchBundle
│   │   ├── text-translator-template.js # 浏览器端 TextTranslator 代码模板（可独立阅读/测试）
│   │   └── footprint.js              # summarizeRuntimeFootprint
│   └── analyzer/
│       ├── cursor-win-coverage.js    # analyzeCursorWinCoverage, cursorWinCoverageTargets
│       ├── dynamic-coverage.js       # analyzeDynamicRuleCoverage
│       └── product-tips-coverage.js  # analyzeProductTipsCoverage, productTipsCoverageTargets
├── tool/
│   ├── index.js                      # CLI 命令分发（runApply / runVerify / runEnsure / runStart / runToggle...）
│   ├── context.js                    # createContext, 路径解析
│   ├── detector.js                   # detectCursorInstallDir, findLanguagePack
│   ├── io.js                         # readText / writeText / readJson / fileCache 等
│   ├── builder/
│   │   ├── main.js                   # buildTranslatedMainText, generateTranslatedMain
│   │   ├── nls.js                    # buildTranslatedNlsMessagesPayload, generateTranslatedNlsMessages
│   │   ├── workbench.js              # generateTranslatedWorkbench
│   │   ├── bootstrap.js              # createBootstrapSource, writeTranslatorBootstrap
│   │   └── extension.js              # writeExtensionTranslationFiles
│   ├── coverage.js                   # buildCursorWinCoverage, buildDynamicCoverage, buildProductTipsCoverage
│   ├── manifest.js                   # buildManifest, writeManifest
│   ├── verify.js                     # verifyState
│   ├── backup.js                     # ensureBackup
│   ├── locale.js                     # writeLocaleFiles, readArgvConfig
│   ├── runtime-mode.js               # buildRuntimeConfig, normalizeRuntimeMode, detectAppliedRuntimeMode
│   ├── runtime-strategy.js           # buildRuntimeMappingsInfo, buildRuntimeStrategyReport
│   ├── runtime-artifact.js           # parseInstalledRuntimeArtifact
│   ├── runtime-budget.js             # buildRuntimeBudgets, evaluateRuntimeBudgets
│   ├── toggle.js                     # readToggleSignal, writeToggleSignal, isCursorRunning
│   └── report.js                     # printReport, printCursorWinCoverage, printDynamicCoverage...
└── tests/
    ├── cursor-zh-config.test.js      # 不变
    ├── cursor-zh-lib.test.js         # 改为从 lib/index.js 导入，保持测试用例不变
    └── cursor-zh-tool.integration.test.js # 改为从 tool/index.js + lib/index.js 导入
```

翻译数据目录（已有，需要补充默认数据文件）：

```
translations/
├── base/
│   └── workbench.mappings.json       # 已有
├── overlay/
│   ├── workbench.overlay.json        # 已有
│   ├── cursor-win.common.json        # 已有（当前由 seedOverlayFiles 生成）
│   ├── cursor-win.dynamic.json       # 已有（当前由 seedOverlayFiles 生成）
│   ├── extensions.package.nls.zh-cn.json # 已有
│   └── defaults/                     # 新增：代码中硬编码的默认数据
│       ├── cursor-win.common.json    # 原 defaultCursorWinCommonMappings()
│       ├── cursor-win.dynamic.json   # 原 defaultCursorWinDynamicMappings()
│       └── workbench.overlay.json    # 原 defaultOverlayMappings()
└── cache/
    └── marketplace.descriptions.json # 已有
```

---

## 2. 详细任务清单

### Task 1: 翻译数据外置（解除数据与代码耦合）

**目标：** 将 `defaultCursorWinCommonMappings`、`defaultCursorWinDynamicMappings`、`defaultOverlayMappings` 中的硬编码数据迁移到 `translations/overlay/defaults/*.json`，并修改加载器从 JSON 读取。

**Files:**
- 新增: `translations/overlay/defaults/cursor-win.common.json`
- 新增: `translations/overlay/defaults/cursor-win.dynamic.json`
- 新增: `translations/overlay/defaults/workbench.overlay.json`
- 修改: `scripts/cursor-zh-lib.js` → 提取出数据加载函数
- 修改: `scripts/cursor-zh-tool.js` → `seedOverlayFiles` 改为读取 defaults 目录
- 修改: `scripts/tests/cursor-zh-tool.integration.test.js` → 修复 `runtimeMappingCount` 硬编码

**Steps:**

- [ ] **Step 1.1: 导出默认 common 映射数据**

将 `defaultCursorWinCommonMappings()` 返回的数组写入 `translations/overlay/defaults/cursor-win.common.json`。

格式要求：
- 保持 `createExactMapping(...)` 生成的对象结构：`{ originalText, changeText, searchType: 'exact' }`；
- JSON 带缩进（2 空格），文件末尾保留换行；
- 所有 Unicode 转义保持原样（例如 `\u5e38\u89c4`），不要自动解码为中文，避免 diff 爆炸。

- [ ] **Step 1.2: 导出默认 dynamic 映射数据**

将 `defaultCursorWinDynamicMappings()` 返回的数组写入 `translations/overlay/defaults/cursor-win.dynamic.json`。

- [ ] **Step 1.3: 导出默认 overlay 映射数据**

将 `defaultOverlayMappings()` 返回的数组写入 `translations/overlay/defaults/workbench.overlay.json`。

- [ ] **Step 1.4: 在 lib 中实现数据加载器**

在 `scripts/lib/mapping/data.js` 中实现：

```js
const fs = require('fs');
const path = require('path');

function resolveDefaultsDir() {
  return path.join(__dirname, '..', '..', '..', 'translations', 'overlay', 'defaults');
}

function readDefaultMappings(fileName) {
  const filePath = path.join(resolveDefaultsDir(), fileName);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function defaultCursorWinCommonMappings() {
  return readDefaultMappings('cursor-win.common.json');
}

function defaultCursorWinDynamicMappings() {
  return readDefaultMappings('cursor-win.dynamic.json');
}

function defaultOverlayMappings() {
  return readDefaultMappings('workbench.overlay.json');
}

module.exports = {
  defaultCursorWinCommonMappings,
  defaultCursorWinDynamicMappings,
  defaultOverlayMappings,
};
```

- [ ] **Step 1.5: 更新 `cursor-zh-lib.js` 中的函数实现**

将原 `defaultCursorWinCommonMappings`、`defaultCursorWinDynamicMappings`、`defaultOverlayMappings` 的实现替换为对 `scripts/lib/mapping/data.js` 的委托调用。此时不要删除原文件中的函数签名，以保持 `module.exports` 不变。

```js
const {
  defaultCursorWinCommonMappings: loadDefaultCursorWinCommonMappings,
  defaultCursorWinDynamicMappings: loadDefaultCursorWinDynamicMappings,
  defaultOverlayMappings: loadDefaultOverlayMappings,
} = require('./lib/mapping/data.js');

function defaultCursorWinCommonMappings() {
  return loadDefaultCursorWinCommonMappings();
}

function defaultCursorWinDynamicMappings() {
  return loadDefaultCursorWinDynamicMappings();
}

function defaultOverlayMappings() {
  return loadDefaultOverlayMappings();
}
```

- [ ] **Step 1.6: 更新 `seedOverlayFiles` 使用 defaults 目录**

`cursor-zh-tool.js` 中的 `syncJsonArrayFileWithDefaults` 逻辑改为直接复制 defaults 文件内容，而不是调用 JS 函数生成默认值。

- [ ] **Step 1.7: 修复集成测试中的硬编码 `runtimeMappingCount`**

打开 `scripts/tests/cursor-zh-tool.integration.test.js`，定位到行 1598 与 1780。将：

```js
assert.equal(buildManifest.runtimeStrategy.runtimeMappingCount, installedRuntimeArtifact.runtimeStrategy.runtimeMappingCount);
```

改为只断言实际值大于 0 且与生成时一致，不再与硬编码数字比较：

```js
assert.ok(installedRuntimeArtifact.runtimeStrategy.runtimeMappingCount > 0);
assert.equal(
  buildManifest.runtimeStrategy.runtimeMappingCount,
  installedRuntimeArtifact.runtimeStrategy.runtimeMappingCount
);
```

如果测试文件中还有其他硬编码的 `355`，一并移除。

- [ ] **Step 1.8: 运行测试确认基线恢复为 63/63**

```powershell
node --test "scripts/tests/cursor-zh-config.test.js" "scripts/tests/cursor-zh-lib.test.js" "scripts/tests/cursor-zh-tool.integration.test.js"
```

Expected: 全部通过。

- [ ] **Step 1.9: Checkpoint**

Checkpoint: 翻译数据已完全外置，代码与数据解耦，2 个预先存在的测试失败已修复，测试全部通过。

---

### Task 2: 拆分 `cursor-zh-lib.js` 为领域模块

**目标：** 将 `cursor-zh-lib.js` 按领域拆分为 `scripts/lib/` 下的多个小模块，原文件变为薄聚合层（facade），保持 `module.exports` 不变以兼容现有测试和 CLI。

**Files:**
- 新增: `scripts/lib/index.js`
- 新增: `scripts/lib/ming/factory.js`
- 新增: `scripts/lib/mapping/parser.js`
- 新增: `scripts/lib/mapping/merge.js`
- 新增: `scripts/lib/mapping/data.js`（已在 Task 1 创建）
- 新增: `scripts/lib/engine/normalize.js`
- 新增: `scripts/lib/engine/translator.js`
- 新增: `scripts/lib/engine/substring.js`
- 新增: `scripts/lib/patcher/static.js`
- 新增: `scripts/lib/patcher/contracts.js`
- 新增: `scripts/lib/patcher/runtime-selector.js`
- 新增: `scripts/lib/runtime/bundle-builder.js`
- 新增: `scripts/lib/runtime/text-translator-template.js`
- 新增: `scripts/lib/runtime/footprint.js`
- 新增: `scripts/lib/analyzer/cursor-win-coverage.js`
- 新增: `scripts/lib/analyzer/dynamic-coverage.js`
- 新增: `scripts/lib/analyzer/product-tips-coverage.js`
- 修改: `scripts/cursor-zh-lib.js` → 改为 re-export `scripts/lib/index.js`

**Steps:**

- [ ] **Step 2.1: 创建 `scripts/lib/mapping/factory.js`**

迁移内容：
- `createMapping`
- `createExactMapping`
- `createNormalizedExactMapping`
- `createRegexMapping`

- [ ] **Step 2.2: 创建 `scripts/lib/mapping/parser.js`**

迁移内容：
- `LEGACY_MAPPING_PATTERN`
- `stripJsonComments`
- `parseJsonc`
- `parseLegacyWorktreeMappings`

- [ ] **Step 2.3: 创建 `scripts/lib/mapping/merge.js`**

迁移内容：
- `mappingKey`
- `mergeMappings`

- [ ] **Step 2.4: 创建 `scripts/lib/engine/normalize.js`**

迁移内容：
- `normalizeTextForComparison`

- [ ] **Step 2.5: 创建 `scripts/lib/engine/substring.js`**

迁移内容：
- `collectPresentSubstrings`
- `collectPresentSubstringsWithRegex`
- `createSubstringMatcher`（如果在原文件中有定义）
- `escapeRegExp`（如果在原文件中有定义）

- [ ] **Step 2.6: 创建 `scripts/lib/engine/translator.js`**

迁移内容：
- `createTextTranslator`
- `translateTextWithMappings`

注意：该函数依赖 `normalizeTextForComparison`，通过 `require('../engine/normalize.js')` 引入。

- [ ] **Step 2.7: 创建 `scripts/lib/patcher/static.js`**

迁移内容：
- `applyExactLiteralTranslations`
- `applyStaticSourceTranslations`
- `applyStaticSourceTranslationsDetailed`
- `sourceHasQuotedLiteral`
- `STATIC_SOURCE_PATCHES`（常量）

注意：依赖 `escapeRegExp` 和 translator 相关函数。

- [ ] **Step 2.8: 创建 `scripts/lib/patcher/contracts.js`**

迁移内容：
- `KEY_SURFACE_PATCH_CONTRACTS`
- `KEY_SURFACE_CONTRACTS_BY_ORIGINAL_TEXT`
- `PRODUCT_TIP_RENDER_HOOK_PATCHES`
- `evaluatePatchContracts`
- `summarizeStaticPatchContractsFromTranslatedSource`

- [ ] **Step 2.9: 创建 `scripts/lib/patcher/runtime-selector.js`**

迁移内容：
- `selectRuntimeMappings`
- `productTipScopedMappings`
- `isProductTipScopedMapping`
- `productTipScopeSelectors`

- [ ] **Step 2.10: 创建 `scripts/lib/runtime/text-translator-template.js`**

将 `buildTranslatedWorkbenchBundle` 中通过字符串数组拼接的浏览器端 `TextTranslator` 类代码，提取为一个返回字符串模板的函数。目标：
- 让浏览器端代码可以单独阅读；
- 未来可以单独做语法检查或单元测试（通过 `new Function(template)` 或 JSDOM）。

```js
function buildTextTranslatorTemplate({ runtimeDiagnosticsEnabled, experimentalRuntimeToggleEnabled }) {
  return [
    // ... 原 buildTranslatedWorkbenchBundle 中从 class TextTranslator 到 install() 的字符串 ...
  ].join('\n');
}

module.exports = { buildTextTranslatorTemplate };
```

- [ ] **Step 2.11: 创建 `scripts/lib/runtime/bundle-builder.js`**

迁移内容：
- `buildTranslatedWorkbenchBundle`
- `serializeMappings`

该函数依赖 `selectRuntimeMappings`、`productTipScopedMappings`、`mergeMappings`、`applyStaticSourceTranslations`、`buildTextTranslatorTemplate`。

- [ ] **Step 2.12: 创建 `scripts/lib/runtime/footprint.js`**

迁移内容：
- `summarizeRuntimeFootprint`

- [ ] **Step 2.13: 创建 `scripts/lib/analyzer/cursor-win-coverage.js`**

迁移内容：
- `cursorWinCoverageTargets`
- `analyzeCursorWinCoverage`

- [ ] **Step 2.14: 创建 `scripts/lib/analyzer/dynamic-coverage.js`**

迁移内容：
- `analyzeDynamicRuleCoverage`

- [ ] **Step 2.15: 创建 `scripts/lib/analyzer/product-tips-coverage.js`**

迁移内容：
- `productTipsCoverageTargets`
- `productTipScopedMappings`（如果已在 patcher 中实现，则此处 import 再 re-export 或合并）
- `analyzeProductTipsCoverage`

**注意：** `productTipScopedMappings` 与 patcher/runtime-selector 有重叠，最终归属 `patcher/runtime-selector.js`，analyzer 中通过 require 引入。

- [ ] **Step 2.16: 创建 `scripts/lib/index.js` 聚合导出**

```js
const { applyExactLiteralTranslations, applyStaticSourceTranslations, applyStaticSourceTranslationsDetailed } = require('./patcher/static');
const { analyzeCursorWinCoverage } = require('./analyzer/cursor-win-coverage');
const { analyzeDynamicRuleCoverage } = require('./analyzer/dynamic-coverage');
const { analyzeProductTipsCoverage } = require('./analyzer/product-tips-coverage');
const { buildTranslatedWorkbenchBundle } = require('./runtime/bundle-builder');
const { compareLanguagePackVersion } = require('./mapping/parser'); // 或单独 version 模块
const { collectPresentSubstrings } = require('./engine/substring');
const { createTextTranslator, translateTextWithMappings } = require('./engine/translator');
const { cursorWinCoverageTargets } = require('./analyzer/cursor-win-coverage');
const { defaultCursorWinCommonMappings, defaultCursorWinDynamicMappings, defaultOverlayMappings } = require('./mapping/data');
const { evaluatePatchContracts, summarizeStaticPatchContractsFromTranslatedSource } = require('./patcher/contracts');
const { mergeMappings } = require('./mapping/merge');
const { normalizeTextForComparison } = require('./engine/normalize');
const { parseJsonc, parseLegacyWorktreeMappings } = require('./mapping/parser');
const { productTipScopedMappings, productTipsCoverageTargets } = require('./analyzer/product-tips-coverage');
const { selectRuntimeMappings } = require('./patcher/runtime-selector');
const { summarizeRuntimeFootprint } = require('./runtime/footprint');
const { withLocaleSetting } = require('./mapping/parser'); // 或单独 config 模块

module.exports = {
  applyExactLiteralTranslations,
  applyStaticSourceTranslations,
  applyStaticSourceTranslationsDetailed,
  analyzeCursorWinCoverage,
  analyzeProductTipsCoverage,
  analyzeDynamicRuleCoverage,
  buildTranslatedWorkbenchBundle,
  compareLanguagePackVersion,
  collectPresentSubstrings,
  createTextTranslator,
  cursorWinCoverageTargets,
  defaultCursorWinCommonMappings,
  defaultCursorWinDynamicMappings,
  defaultOverlayMappings,
  evaluatePatchContracts,
  mergeMappings,
  normalizeTextForComparison,
  productTipScopedMappings,
  productTipsCoverageTargets,
  parseJsonc,
  parseLegacyWorktreeMappings,
  selectRuntimeMappings,
  summarizeStaticPatchContractsFromTranslatedSource,
  summarizeRuntimeFootprint,
  translateTextWithMappings,
  withLocaleSetting,
};
```

**注意：** `compareLanguagePackVersion`、`parseVersionParts`、`withLocaleSetting` 当前与 parser 放在一起，可以新建 `scripts/lib/mapping/version.js` 存放：
- `parseVersionParts`
- `compareLanguagePackVersion`
- `withLocaleSetting`

- [ ] **Step 2.17: 将 `cursor-zh-lib.js` 改为 facade**

```js
module.exports = require('./lib/index.js');
```

- [ ] **Step 2.18: 运行全部测试**

```powershell
node --test "scripts/tests/cursor-zh-config.test.js" "scripts/tests/cursor-zh-lib.test.js" "scripts/tests/cursor-zh-tool.integration.test.js"
```

Expected: 全部通过。

- [ ] **Step 2.19: Checkpoint**

Checkpoint: `cursor-zh-lib.js` 已拆分为 10+ 个领域模块，原文件变为 facade，所有现有测试通过。

---

### Task 3: 拆分 `cursor-zh-tool.js` 为 CLI 分层模块

**目标：** 将 CLI 入口按“命令分发 → 构建器 → IO/探测/报告”三层拆分，原文件仅保留 `main()` 与命令路由。

**Files:**
- 新增: `scripts/tool/index.js`
- 新增: `scripts/tool/context.js`
- 新增: `scripts/tool/detector.js`
- 新增: `scripts/tool/io.js`
- 新增: `scripts/tool/builder/main.js`
- 新增: `scripts/tool/builder/nls.js`
- 新增: `scripts/tool/builder/workbench.js`
- 新增: `scripts/tool/builder/bootstrap.js`
- 新增: `scripts/tool/builder/extension.js`
- 新增: `scripts/tool/coverage.js`
- 新增: `scripts/tool/manifest.js`
- 新增: `scripts/tool/verify.js`
- 新增: `scripts/tool/backup.js`
- 新增: `scripts/tool/locale.js`
- 新增: `scripts/tool/runtime-mode.js`
- 新增: `scripts/tool/runtime-strategy.js`
- 新增: `scripts/tool/runtime-artifact.js`
- 新增: `scripts/tool/runtime-budget.js`
- 新增: `scripts/tool/toggle.js`
- 新增: `scripts/tool/report.js`
- 修改: `scripts/cursor-zh-tool.js` → 改为引入 `scripts/tool/index.js`

**Steps:**

- [ ] **Step 3.1: 创建 `scripts/tool/io.js`**

迁移内容：
- `fileCache` / `fileCacheKey` / `getCachedFileEntry` / `setCachedFileEntry`
- `sha256OfBuffer`
- `readBuffer`
- `readText`
- `writeText`
- `readJson`
- `readJsonIfExists`
- `writeJson`
- `sha256OfFile`
- `ensureDir`
- `timestampLabel`

导出时接受 `STATE_DIR` / `WORKSPACE_ROOT` 等路径作为参数，避免全局常量循环依赖。

- [ ] **Step 3.2: 创建 `scripts/tool/context.js`**

迁移内容：
- `createContext`
- `assertPathExists`
- `OFFICIAL_COMMANDS` / `EXPERIMENTAL_COMMANDS` / `assertCommandAllowed`
- `normalizeRuntimeMode`

依赖 `scripts/tool/io.js` 中的 `ensureDir`（仅用于创建目录，context 本身不直接读写）。

- [ ] **Step 3.3: 创建 `scripts/tool/detector.js`**

迁移内容：
- `detectCursorInstallDir`
- `findLanguagePack`

- [ ] **Step 3.4: 创建 `scripts/tool/locale.js`**

迁移内容：
- `readArgvConfig`
- `writeLocaleFiles`

- [ ] **Step 3.5: 创建 `scripts/tool/backup.js`**

迁移内容：
- `ensureBackup`
- `getManagedExternalFiles`
- `getManagedExtensionTranslationFiles`

- [ ] **Step 3.6: 创建 `scripts/tool/builder/bootstrap.js`**

迁移内容：
- `isTranslatorBootstrapSource`
- `createBootstrapSource`
- `writeTranslatorBootstrap`

- [ ] **Step 3.7: 创建 `scripts/tool/builder/main.js`**

迁移内容：
- `SAFE_MAIN_TRANSLATION_TEXTS`
- `buildTranslatedMainText`
- `generateTranslatedMain`

- [ ] **Step 3.8: 创建 `scripts/tool/builder/nls.js`**

迁移内容：
- `buildTranslatedNlsMessagesPayload`
- `generateTranslatedNlsMessages`

- [ ] **Step 3.9: 创建 `scripts/tool/builder/workbench.js`**

迁移内容：
- `generateTranslatedWorkbench`
- `parseInstalledRuntimeArtifact`（也可单独放入 runtime-artifact.js）

- [ ] **Step 3.10: 创建 `scripts/tool/builder/extension.js`**

迁移内容：
- `writeExtensionTranslationFiles`

- [ ] **Step 3.11: 创建 `scripts/tool/coverage.js`**

迁移内容：
- `buildCursorWinCoverage`
- `buildDynamicCoverage`
- `buildProductTipsCoverage`
- `buildCoverageInputs`
- `coverageInputsMatch`
- `readCachedCoverage`

- [ ] **Step 3.12: 创建 `scripts/tool/runtime-mode.js`**

迁移内容：
- `buildRuntimeConfig`
- `detectAppliedRuntimeMode`

- [ ] **Step 3.13: 创建 `scripts/tool/runtime-strategy.js`**

迁移内容：
- `selectRuntimeMappingsForMode`
- `buildRuntimeMappingsInfo`
- `summarizeInstalledRuntimeFootprint`
- `buildRuntimeStrategyReport`

- [ ] **Step 3.14: 创建 `scripts/tool/runtime-artifact.js`**

迁移内容：
- `parseInstalledRuntimeArtifact`

- [ ] **Step 3.15: 创建 `scripts/tool/runtime-budget.js`**

迁移内容：
- `buildRuntimeBudgets`
- `evaluateRuntimeBudgets`

- [ ] **Step 3.16: 创建 `scripts/tool/toggle.js`**

迁移内容：
- `isCursorRunning`
- `readToggleSignal`
- `writeToggleSignal`
- `runToggle` / `runDisable` / `runEnable` / `runStatus`

- [ ] **Step 3.17: 创建 `scripts/tool/report.js`**

迁移内容：
- `printReport`
- `printCursorWinCoverage`
- `printDynamicCoverage`
- `printProductTipsCoverage`
- `printStaticPatchContracts`
- `printRuntimeStrategy`

- [ ] **Step 3.18: 创建 `scripts/tool/manifest.js`**

迁移内容：
- `buildManifest`
- `writeManifest`

- [ ] **Step 3.19: 创建 `scripts/tool/verify.js`**

迁移内容：
- `verifyState`

- [ ] **Step 3.20: 创建 `scripts/tool/index.js` 命令调度层**

迁移内容：
- `runApply`
- `runEnsure`
- `runVerify`
- `runStart`
- `main()` 中的 switch 逻辑

`scripts/tool/index.js` 导出 `main()` 供 `cursor-zh-tool.js` 调用。

- [ ] **Step 3.21: 将 `cursor-zh-tool.js` 变薄**

```js
#!/usr/bin/env node

if (process.stdout && typeof process.stdout.setBlocking === 'function') {
  process.stdout.setBlocking(true);
}

const { main } = require('./tool/index.js');

try {
  main();
} catch (error) {
  console.error(`Cursor ZH tool failed: ${error.message}`);
  process.exitCode = 1;
}
```

- [ ] **Step 3.22: 运行全部测试**

```powershell
node --test "scripts/tests/cursor-zh-config.test.js" "scripts/tests/cursor-zh-lib.test.js" "scripts/tests/cursor-zh-tool.integration.test.js"
```

Expected: 全部通过。

- [ ] **Step 3.23: Checkpoint**

Checkpoint: `cursor-zh-tool.js` 已拆分为 15+ 个模块，原文件变为 CLI 入口壳，所有现有测试通过。

---

### Task 4: 迁移并增强测试结构

**目标：** 让单元测试直接针对领域模块，集成测试针对 `tool/index.js`，同时保留对 `cursor-zh-lib.js` facade 的回归测试。

**Files:**
- 新增: `scripts/tests/lib/mapping/data.test.js`
- 新增: `scripts/tests/lib/engine/translator.test.js`
- 新增: `scripts/tests/lib/patcher/static.test.js`
- 新增: `scripts/tests/lib/runtime/bundle-builder.test.js`
- 修改: `scripts/tests/cursor-zh-lib.test.js` → 保留 facade 回归测试，但减少重复
- 修改: `scripts/tests/cursor-zh-tool.integration.test.js` → 改为从 `tool/index.js` 导入辅助函数

**Steps:**

- [ ] **Step 4.1: 为 `lib/mapping/data.js` 添加单元测试**

验证：
- 三个 `default*Mappings()` 函数返回非空数组；
- 每个条目都包含 `originalText`、`changeText`、`searchType`；
- JSON 文件缺失时返回空数组（容错）。

- [ ] **Step 4.2: 为 `lib/engine/translator.js` 添加单元测试**

从 `cursor-zh-lib.test.js` 中抽取与 `createTextTranslator` / `translateTextWithMappings` 相关的测试，迁移到新文件。

- [ ] **Step 4.3: 为 `lib/patcher/static.js` 添加单元测试**

从 `cursor-zh-lib.test.js` 中抽取与 `applyStaticSourceTranslations` / `applyStaticSourceTranslationsDetailed` 相关的测试。

- [ ] **Step 4.4: 为 `lib/runtime/bundle-builder.js` 添加单元测试**

从 `cursor-zh-lib.test.js` 中抽取与 `buildTranslatedWorkbenchBundle` 相关的测试。

- [ ] **Step 4.5: 精简 `cursor-zh-lib.test.js`**

保留以下测试：
- 所有导出函数均可从 `cursor-zh-lib.js` 导入（facade 完整性）；
- 跨模块集成的端到端行为（例如 `buildTranslatedWorkbenchBundle` 生成完整 bundle）。

删除已迁移到子模块的重复测试。

- [ ] **Step 4.6: 更新 `cursor-zh-tool.integration.test.js` 的导入**

将测试中直接从 `cursor-zh-tool.js` 内部函数导入的部分（如果有）改为从 `tool/index.js` 或 `tool/context.js` 导入公共辅助函数。

- [ ] **Step 4.7: 在 `package.json` 中注册新的测试文件**

```json
{
  "scripts": {
    "test": "node --test \"scripts/tests/**/*.test.js\""
  }
}
```

Node.js 内置 test runner 支持 glob（Node 20+），如果用户是 Node 18，需要显式列出文件：

```json
{
  "scripts": {
    "test": "node --test \"scripts/tests/cursor-zh-config.test.js\" \"scripts/tests/cursor-zh-lib.test.js\" \"scripts/tests/cursor-zh-tool.integration.test.js\" \"scripts/tests/lib/mapping/data.test.js\" \"scripts/tests/lib/engine/translator.test.js\" \"scripts/tests/lib/patcher/static.test.js\" \"scripts/tests/lib/runtime/bundle-builder.test.js\""
  }
}
```

- [ ] **Step 4.8: 运行全部测试**

```powershell
npm test
```

Expected: 全部通过，新增测试也全部通过。

- [ ] **Step 4.9: Checkpoint**

Checkpoint: 测试结构已按领域模块重新组织，新增 4 个单元测试文件，所有测试通过。

---

### Task 5: 清理与最终验证

**目标：** 删除已废弃的代码、确认文件大小达标、验证 CLI 行为未变。

**Steps:**

- [ ] **Step 5.1: 删除原 `cursor-zh-lib.js` 中的实现代码**

在 Task 2 完成后，`cursor-zh-lib.js` 应只剩 `module.exports = require('./lib/index.js');`。确认文件行数小于 10 行。

- [ ] **Step 5.2: 删除原 `cursor-zh-tool.js` 中的实现代码**

在 Task 3 完成后，`cursor-zh-tool.js` 应只剩 CLI 入口壳。确认文件行数小于 20 行。

- [ ] **Step 5.3: 检查循环依赖**

运行：

```powershell
node -e "require('./scripts/cursor-zh-lib.js'); console.log('lib OK')"
node -e "require('./scripts/tool/index.js'); console.log('tool OK')"
node scripts/cursor-zh-tool.js verify
```

Expected: 无循环依赖报错，`verify` 命令正常输出。

- [ ] **Step 5.4: 文件大小验收**

| 文件 | 重构前行数 | 重构后目标行数 |
|------|------------|----------------|
| `scripts/cursor-zh-lib.js` | 3347 | < 10 |
| `scripts/cursor-zh-tool.js` | 1978 | < 20 |
| `scripts/lib/index.js` | — | < 100 |
| `scripts/tool/index.js` | — | < 300 |
| 任意子模块 | — | < 500 |

- [ ] **Step 5.5: 运行完整回归测试**

```powershell
npm test
```

Expected: 全部通过。

- [ ] **Step 5.6: 运行 CLI 命令冒烟测试**

```powershell
node scripts/cursor-zh-tool.js verify
```

Expected: 正常输出汉化状态报告，无异常堆栈。

- [ ] **Step 5.7: 最终 Checkpoint**

Checkpoint: 模块化重构完成，上帝模块消除，CLI 与核心库分层清晰，测试全部通过，CLI 行为保持不变。

---

## 3. 依赖关系图

```
cursor-zh-tool.js (CLI shell)
    └─> tool/index.js
        ├─> tool/context.js
        ├─> tool/detector.js
        ├─> tool/io.js
        ├─> tool/locale.js
        ├─> tool/backup.js
        ├─> tool/builder/*
        │       └─> lib/index.js (facade)
        ├─> tool/coverage.js
        │       └─> lib/index.js
        ├─> tool/manifest.js
        ├─> tool/verify.js
        ├─> tool/runtime-mode.js
        ├─> tool/runtime-strategy.js
        ├─> tool/runtime-artifact.js
        ├─> tool/runtime-budget.js
        ├─> tool/toggle.js
        └─> tool/report.js

lib/index.js (facade)
    ├─> lib/mapping/*
    ├─> lib/engine/*
    ├─> lib/patcher/*
    ├─> lib/runtime/*
    └─> lib/analyzer/*
```

---

## 4. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 拆分过程中引入循环依赖 | 高 | 每个子模块只向下层/同层依赖，禁止向上依赖 CLI 层；每次新增模块后用 `node -e "require(...)"` 检查 |
| 测试导入路径失效 | 中 | 保持 `cursor-zh-lib.js` 和 `cursor-zh-tool.js` 的 facade 行为，测试文件路径不变 |
| 翻译数据 JSON 格式与原 JS 不一致 | 高 | Task 1 中通过运行测试验证数据等价性；使用脚本自动提取并对比条目数 |
| 运行时 bundle 输出字节级变化 | 中 | 集成测试中比较 `runtimeMappingCount` 和 `runtimeHeaderKB`，不比较完整 hash；必要时在真实 Cursor 上 smoke test |
| 新增文件导致 PowerShell CI 检查失败 | 低 | 不新增 `.ps1` 文件；CI 只检查 `scripts/*.ps1`，新增 JS 文件不影响 |

---

## 5. 成功标准

- [ ] `scripts/cursor-zh-lib.js` 行数 < 10，仅作为 facade；
- [ ] `scripts/cursor-zh-tool.js` 行数 < 20，仅作为 CLI 入口；
- [ ] 所有翻译数据硬编码从 JS 中移除，迁移到 `translations/overlay/defaults/*.json`；
- [ ] 新增 `scripts/lib/` 和 `scripts/tool/` 模块，每个子模块职责单一；
- [ ] `npm test` 全部通过（包括修复原 2 个失败）；
- [ ] `node scripts/cursor-zh-tool.js verify` 正常输出；
- [ ] 无循环依赖，无未使用变量/函数。
