const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  reconcileIndexedSinglePass,
  applyBatchQuotedLiteralRegexReplacement,
} = require('../../lib/patcher/static.js');

/**
 * Build test fixtures: N unique quoted-literal mappings.
 */
function buildMappings(count) {
  const replacementByContent = new Map();
  const keys = [];
  for (let i = 0; i < count; i++) {
    const original = `Settings Label Item ${i} Alpha Beta`;
    const changed = `设置标签项 ${i} 阿尔法 贝塔`;
    replacementByContent.set(original, changed);
    keys.push(original);
  }
  return { replacementByContent, keys };
}

/**
 * Build a source string containing all keys as double-quoted literals.
 */
function buildSource(keys) {
  return keys.map((k, idx) => `var _v${idx} = "${k}";`).join('\n');
}

// ---------------------------------------------------------------------------
// Test 1: batch-80 output must be byte-identical to batch-40 output
// ---------------------------------------------------------------------------
test('reconcileIndexedSinglePass: batch 80 produces identical output to batch 40', () => {
  const MAPPING_COUNT = 55; // > 40 → triggers multiple batches at size 40
  const { replacementByContent, keys } = buildMappings(MAPPING_COUNT);
  const source = buildSource(keys);
  const workbenchIndex = { quotedLiterals: new Set(keys) };

  // --- reference: manual batch-40 reconciliation ----------------------------
  let batch40Result = String(source);
  // Step 1: full pending set (mirrors findRemainingReplacementLiteralsViaScan)
  batch40Result = applyBatchQuotedLiteralRegexReplacement(
    batch40Result, new Set(keys), replacementByContent
  );
  // Step 2: batch loop @ 40 (re-seed with all keys for worst-case coverage)
  for (let i = 0; i < keys.length; i += 40) {
    batch40Result = applyBatchQuotedLiteralRegexReplacement(
      batch40Result, new Set(keys.slice(i, i + 40)), replacementByContent
    );
  }

  // --- actual: call the function under test ---------------------------------
  const actualResult = reconcileIndexedSinglePass(source, replacementByContent, workbenchIndex);

  // Output must match the manual batch-40 reference (idempotent replacements)
  assert.equal(actualResult, batch40Result,
    'reconcileIndexedSinglePass output must match manual batch-40 reference');

  // Every key must be translated
  for (const key of keys) {
    const changed = replacementByContent.get(key);
    assert.ok(actualResult.includes(changed),
      `expected translated text for key "${key}" to appear in output`);
    assert.ok(!actualResult.includes(`"${key}"`),
      `original quoted literal "${key}" should have been replaced`);
  }
});

// ---------------------------------------------------------------------------
// Test 2: pending.size === 0 → fast-exit, source returned unchanged
// ---------------------------------------------------------------------------
test('reconcileIndexedSinglePass: skips reconcile when no pending replacements', () => {
  const source = 'var x = 42; var y = "hello world"; function z() { return 1; }';

  const replacementByContent = new Map([
    ['Nonexistent Label A', '翻译 A'],
    ['Nonexistent Label B', '翻译 B'],
    ['Nonexistent Label C', '翻译 C'],
  ]);

  const workbenchIndex = {
    quotedLiterals: new Set(replacementByContent.keys()),
  };

  const result = reconcileIndexedSinglePass(source, replacementByContent, workbenchIndex);

  assert.equal(result, source,
    'source must be returned unchanged when no pending replacements exist');
});

// ---------------------------------------------------------------------------
// Test 3: source-code assertion — reconcile batch loop uses size 80
// This is the RED-phase test that fails before the code change.
// ---------------------------------------------------------------------------
test('reconcileIndexedSinglePass: reconcile batch loop uses batch size 80', () => {
  const staticJsPath = path.resolve(__dirname, '../../lib/patcher/static.js');
  const sourceCode = fs.readFileSync(staticJsPath, 'utf8');

  // Find the reconcileIndexedSinglePass function body
  const fnStart = sourceCode.indexOf('function reconcileIndexedSinglePass');
  assert.ok(fnStart !== -1, 'reconcileIndexedSinglePass function must exist');

  // Find the next function declaration to bound the body
  const fnEnd = sourceCode.indexOf('\nfunction ', fnStart + 10);
  const fnBody = sourceCode.slice(fnStart, fnEnd === -1 ? undefined : fnEnd);

  // The batch loop inside reconcileIndexedSinglePass must use size 80
  assert.ok(fnBody.includes('index += 80'),
    'reconcileIndexedSinglePass batch loop must use batch size 80 (currently uses 40)');
  assert.ok(fnBody.includes('index + 80'),
    'keys.slice must use index + 80 to match the batch size');
});
