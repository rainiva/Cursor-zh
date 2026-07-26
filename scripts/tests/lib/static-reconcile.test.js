const test = require('node:test');
const assert = require('node:assert/strict');

const {
  applyQuotedLiteralReplacements,
  reconcileSinglePassReplacements,
  buildReplacementOccurrenceCounts,
  findRemainingReplacementLiterals,
  findRemainingReplacementLiteralsViaScan,
  enrichWorkbenchQuotedLiterals,
} = require('../../lib/patcher/static.js');
const { createWorkbenchIndex } = require('../../lib/patcher/workbench-index.js');
const {
  reconcilePrunedMappings,
  summarizeStaticReconcile,
} = require('../../lib/patcher/static-reconcile.js');

test('reconcilePrunedMappings re-admits pruned exact mappings whose static replacement failed', () => {
  // 词条字面量在 bundle 中、被选择器剪枝、但静态替换未落地（原文仍以引号字面量在场）。
  const workbenchSource = 'label:"Open Agents On Startup",title:"General"';
  const translatedSource = 'label:"Open Agents On Startup",title:"常规"';
  const index = createWorkbenchIndex(workbenchSource);
  const failedEntry = {
    originalText: 'Open Agents On Startup',
    changeText: '启动时打开智能体',
    searchType: 'exact',
    surface: 'mode_menu',
  };
  const succeededEntry = { originalText: 'General', changeText: '常规', searchType: 'exact' };

  const result = reconcilePrunedMappings({
    translatedSource,
    mergedMappings: [failedEntry, succeededEntry],
    runtimeMappings: [],
    workbenchIndex: index,
  });

  assert.equal(result.reconciled.length, 1);
  assert.equal(result.reconciled[0].originalText, 'Open Agents On Startup');
  assert.ok(
    result.runtimeMappings.some((entry) => entry.originalText === 'Open Agents On Startup'),
    '静态失败词条必须回补进 runtimeMappings'
  );
  assert.equal(
    result.runtimeMappings.some((entry) => entry.originalText === 'General'),
    false,
    '静态成功词条不得被回补'
  );
});

test('reconcilePrunedMappings uses originalText disappearance as primary criterion for shared changeText', () => {
  // 审查记录 B2：两条词条共享同一 changeText，仅凭 includes(changeText) 会漏回补。
  const workbenchSource = 'a:"Open File",b:"Open Folder"';
  const translatedSource = 'a:"打开",b:"Open Folder"';
  const index = createWorkbenchIndex(workbenchSource);
  const mappings = [
    { originalText: 'Open File', changeText: '打开', searchType: 'exact' },
    { originalText: 'Open Folder', changeText: '打开', searchType: 'exact' },
  ];

  const result = reconcilePrunedMappings({
    translatedSource,
    mergedMappings: mappings,
    runtimeMappings: [],
    workbenchIndex: index,
  });

  assert.deepEqual(
    result.reconciled.map((entry) => entry.originalText),
    ['Open Folder'],
    'changeText 已在场也必须按 originalText 消失与否判定'
  );
});

test('reconcilePrunedMappings skips mappings already selected for runtime and literals absent from bundle', () => {
  const workbenchSource = 'a:"Alpha"';
  const translatedSource = 'a:"Alpha"';
  const index = createWorkbenchIndex(workbenchSource);
  const alreadyRuntime = { originalText: 'Alpha', changeText: '甲', searchType: 'exact' };
  const absentFromBundle = { originalText: 'Beta', changeText: '乙', searchType: 'exact' };

  const result = reconcilePrunedMappings({
    translatedSource,
    mergedMappings: [alreadyRuntime, absentFromBundle],
    runtimeMappings: [alreadyRuntime],
    workbenchIndex: index,
  });

  assert.deepEqual(result.reconciled, []);
  assert.equal(result.runtimeMappings.length, 1);
});

// ---- 阶段三影响面评审修复：静态锚点失效时的运行时兜底回补 ----

test('reconcilePrunedMappings re-admits static anchor entries not landed while anchor persists', () => {
  // 情形二：静态替换未落地（field 仍英文原文/结构漂移致 pattern 不可命中）但锚点在场 → 回补。
  const translatedSource =
    'nu("general","open-agents-on-startup",{label:"Window Restoration"}),cmd={id:"copy-messages",run:o0}';
  const slugNotLanded = {
    anchorType: 'settingsSlug',
    anchorId: 'open-agents-on-startup',
    field: 'label',
    changeText: '窗口恢复',
    searchType: 'anchor',
    surface: 'settings_search',
  };
  // glassCommand 锚点 id 在场但 label 结构漂移（500 字符窗口内无 field）→ pattern 不可命中也必须回补。
  const glassDrifted = {
    anchorType: 'glassCommand',
    anchorId: 'copy-messages',
    field: 'label',
    changeText: '复制会话记录',
    searchType: 'anchor',
    surface: 'glass_menu',
  };

  const result = reconcilePrunedMappings({
    translatedSource,
    mergedMappings: [slugNotLanded, glassDrifted],
    runtimeMappings: [],
  });

  assert.deepEqual(
    result.reconciled.map((entry) => entry.anchorId).sort(),
    ['copy-messages', 'open-agents-on-startup'],
    '静态未落地且锚点在场的 anchor 条目必须回补'
  );
  assert.equal(result.runtimeMappings.length, 2);
});

test('reconcilePrunedMappings does not re-admit anchor entries whose static replacement landed', () => {
  // 情形一：静态已落地（field 已是 changeText）→ 绝不能误回补。
  // 条目间隔 >500 字符贴近真实 bundle 布局（同窗相邻双 field 的模式回溯语义属既有行为，不在本修复范围）。
  const translatedSource = `nu("general","open-agents-on-startup",{label:"窗口恢复"});${'x'.repeat(600)};i.register({id:"copy-messages",label:"复制会话记录"})`;
  const slugLanded = {
    anchorType: 'settingsSlug',
    anchorId: 'open-agents-on-startup',
    field: 'label',
    changeText: '窗口恢复',
    searchType: 'anchor',
  };
  const glassLanded = {
    anchorType: 'glassCommand',
    anchorId: 'copy-messages',
    field: 'label',
    changeText: '复制会话记录',
    searchType: 'anchor',
  };

  const result = reconcilePrunedMappings({
    translatedSource,
    mergedMappings: [slugLanded, glassLanded],
    runtimeMappings: [],
  });

  assert.deepEqual(result.reconciled, [], '静态已落地的锚点条目不得回补');
  assert.deepEqual(result.runtimeMappings, []);
});

test('reconcilePrunedMappings skips absent anchors and forceRuntime anchor entries', () => {
  // 情形三：锚点本身缺席 → 不回补（缺席属 verify 报告范畴）；
  // forceRuntime 锚点走运行时准入路径，不属静态对账范围。
  const translatedSource = 'label:"Something Else"';
  const absentAnchor = {
    anchorType: 'settingsSlug',
    anchorId: 'open-agents-on-startup',
    field: 'label',
    changeText: '窗口恢复',
    searchType: 'anchor',
  };
  const forceRuntimeAnchor = {
    anchorType: 'i18nKey',
    anchorId: 'glass.agentPanel.continueWorking',
    changeText: '继续工作',
    searchType: 'anchor',
    forceRuntime: true,
  };

  const result = reconcilePrunedMappings({
    translatedSource: `${translatedSource},C("glass.agentPanel.continueWorking","Continue Working")`,
    mergedMappings: [absentAnchor, forceRuntimeAnchor],
    runtimeMappings: [],
  });

  assert.deepEqual(result.reconciled, []);
  assert.deepEqual(result.runtimeMappings, []);
});

test('summarizeStaticReconcile records anchor entries with anchorType+anchorId+field identity', () => {
  const summary = summarizeStaticReconcile([
    {
      anchorType: 'settingsSlug',
      anchorId: 'open-agents-on-startup',
      field: 'label',
      changeText: '窗口恢复',
      searchType: 'anchor',
      surface: 'settings_search',
    },
    { originalText: 'General', changeText: '常规', searchType: 'exact' },
  ]);

  assert.equal(summary.count, 2);
  assert.deepEqual(summary.entries[0], {
    anchorType: 'settingsSlug',
    anchorId: 'open-agents-on-startup',
    field: 'label',
    changeText: '窗口恢复',
    surface: 'settings_search',
  });
  assert.deepEqual(summary.entries[1], { originalText: 'General', changeText: '常规' });
});

test('buildReplacementOccurrenceCounts batches regex fallback for comment literals', () => {
  const source = `/* "Label A"; "Label B"; */${'a'.repeat(2_000_000)}`;
  const index = createWorkbenchIndex(source);
  const enrichedIndex = enrichWorkbenchQuotedLiterals(index, ['Label A', 'Label B']);
  const replacementByContent = new Map([
    ['Label A', '甲'],
    ['Label B', '乙'],
  ]);

  const startedAt = performance.now();
  const counts = buildReplacementOccurrenceCounts(source, replacementByContent, enrichedIndex);
  const elapsedMs = performance.now() - startedAt;

  assert.equal(counts.get('Label A'), 1);
  assert.equal(counts.get('Label B'), 1);
  assert.ok(elapsedMs < 500, `occurrence count batch fallback took ${elapsedMs.toFixed(1)}ms`);
});

test('reconcileSinglePassReplacements fixes literals missed by single-pass scan', () => {
  const source = 's.replace(/^["\']|["\']$/g,""),label:"File"';
  const replacementByContent = new Map([['File', '文件']]);
  const workbenchIndex = {
    hasQuotedLiteral(original) {
      return original === 'File';
    },
  };
  const occurrenceCounts = new Map([['File', 1]]);
  const reconciled = reconcileSinglePassReplacements(
    source,
    replacementByContent,
    workbenchIndex,
    occurrenceCounts
  );
  assert.equal(reconciled.includes('"File"'), false);
  assert.ok(reconciled.includes('"文件"'));
});

test('reconcileSinglePassReplacements uses occurrence counts without scanning absent keys', () => {
  const source = '"File"';
  const replacementByContent = new Map([['File', '文件']]);
  const workbenchIndex = {
    hasQuotedLiteral(original) {
      return original === 'File';
    },
  };
  const occurrenceCounts = new Map([['File', 1]]);
  const reconciled = reconcileSinglePassReplacements(
    source,
    replacementByContent,
    workbenchIndex,
    occurrenceCounts
  );
  assert.equal(reconciled.includes('"File"'), false);
  assert.ok(reconciled.includes('"文件"'));
  assert.equal(occurrenceCounts.get('File'), 0);
});

test('reconcileSinglePassReplacements ignores mapping keys absent from translated source', () => {
  const source = '"General"';
  const replacementByContent = new Map([['Missing Label', '缺失']]);
  const reconciled = reconcileSinglePassReplacements(source, replacementByContent);
  assert.ok(reconciled.includes('"General"'));
  assert.equal(reconciled.includes('Missing Label'), false);
});

test('findRemainingReplacementLiterals detects literals missed by quote scanner in one scan', () => {
  const source = 's.replace(/^["\']|["\']$/g,""),label:"File"';
  const replacementByContent = new Map([['File', '文件']]);
  const pending = findRemainingReplacementLiterals(source, replacementByContent);
  assert.ok(pending.has('File'));
});

test('findRemainingReplacementLiteralsViaScan matches regex pending detection for quoted literals', () => {
  const source = 's.replace(/^["\']|["\']$/g,""),label:"File","General"';
  const replacementByContent = new Map([
    ['File', '文件'],
    ['General', '常规'],
  ]);

  assert.deepEqual(
    findRemainingReplacementLiteralsViaScan(source, replacementByContent),
    findRemainingReplacementLiterals(source, replacementByContent)
  );
});

test('reconcileSinglePassReplacements stays fast with many mapping keys on large sources', () => {
  const padding = `"General";${'a'.repeat(5_000_000)};"File";`;
  const replacementByContent = new Map([
    ['File', '文件'],
    ['General', '常规'],
  ]);

  for (let index = 0; index < 600; index += 1) {
    replacementByContent.set(`Absent Label ${index}`, `缺失 ${index}`);
  }

  const workbenchIndex = {
    hasQuotedLiteral(original) {
      return original === 'File' || original === 'General';
    },
  };
  const afterSinglePass = applyQuotedLiteralReplacements(padding, replacementByContent);
  const startedAt = Date.now();
  const reconciled = reconcileSinglePassReplacements(
    afterSinglePass,
    replacementByContent,
    workbenchIndex
  );
  const elapsedMs = Date.now() - startedAt;

  assert.ok(elapsedMs < 500, `reconcile took ${elapsedMs}ms`);
  assert.equal(reconciled.includes('"File"'), false);
  assert.equal(reconciled.includes('"General"'), false);
});
