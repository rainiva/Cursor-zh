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
