const test = require('node:test');
const assert = require('node:assert/strict');

const {
  PRODUCT_TIPS_RENDER_HOOK_PATCHES,
  applyProductTipsRenderHook,
  applyProductTipsRenderHookPatches,
  countProductTipsRenderHookApplied,
  countProductTipsRenderHookMatches,
  isProductTipsRenderHookApplicable,
} = require('../../lib/patcher/product-tips-hook');
const {
  fixtureV1,
  fixtureRenamed,
  fixtureSingleQuoted,
  fixtureWithoutOptionalChain,
  fixtureReordered,
} = require('./fixtures/update-drift/product-tips.js');

test('uses semantic relocation before version variants and proves one hook', () => {
  const result = applyProductTipsRenderHook(fixtureRenamed);
  assert.equal(result.outcome, 'resolved');
  assert.equal(result.locatorId, 'product_tips.render_text');
  assert.equal(result.postconditions.ok, true);
  assert.equal(countProductTipsRenderHookApplied(result.sourceText), 1);
});

test('falls back without source mutation when the semantic target is ambiguous', () => {
  const source = `${fixtureV1};${fixtureRenamed}`;
  const result = applyProductTipsRenderHook(source);
  assert.equal(result.outcome, 'fallback');
  assert.equal(result.sourceText, source);
});

test('returns blocked without keeping mutated source when postconditions fail', () => {
  const source = fixtureRenamed;
  const result = applyProductTipsRenderHook(source, {
    evaluatePostconditions: () => ({ ok: false, failures: ['single-product-tip-hook'] }),
  });
  assert.equal(result.outcome, 'blocked');
  assert.equal(result.postconditions.ok, false);
  assert.ok(result.postconditions.failures.includes('single-product-tip-hook'));
  assert.equal(result.sourceText, source);
  assert.equal(
    countProductTipsRenderHookApplied(result.sourceText),
    0,
    'blocked must not retain inserted hook text'
  );
});

test('applyProductTipsRenderHookPatches leaves source unchanged on non-resolved outcomes', () => {
  const ambiguous = `${fixtureV1};${fixtureRenamed}`;
  assert.equal(applyProductTipsRenderHook(ambiguous).outcome, 'fallback');
  assert.equal(applyProductTipsRenderHookPatches(ambiguous), ambiguous);

  // Locator matches, wrap fails (spaced member) → blocked → static pipeline must not mutate.
  const blockedSource = 'const Pe="tip-dismissed";const Re=ne. text??""';
  assert.equal(applyProductTipsRenderHook(blockedSource).outcome, 'blocked');
  assert.equal(applyProductTipsRenderHookPatches(blockedSource), blockedSource);
});

test('relocates unique drift fixtures via semantic locator', () => {
  for (const source of [
    fixtureV1,
    fixtureRenamed,
    fixtureSingleQuoted,
    fixtureWithoutOptionalChain,
    fixtureReordered,
  ]) {
    const result = applyProductTipsRenderHook(source);
    assert.equal(result.outcome, 'resolved', source);
    assert.equal(result.postconditions.ok, true, source);
    assert.equal(countProductTipsRenderHookApplied(result.sourceText), 1, source);
  }
});

test('does not add new glass-v* product tips variants', () => {
  const glassVVariants = PRODUCT_TIPS_RENDER_HOOK_PATCHES.filter((patch) =>
    /^glass-v\d+$/.test(patch.id)
  );
  assert.equal(
    glassVVariants.length,
    5,
    'legacy glass-v* variants are diagnostic-only; do not add glass-v7+'
  );
});

test('applyProductTipsRenderHookPatches returns patched source string for static pipeline', () => {
  const legacyWithDismissed =
    'const Re=z?U?"":mkE:U?"":ne?.text??"",Be=z?U?"tip-dismissed-exiting":"tip-dismissed"';
  const legacy = applyProductTipsRenderHookPatches(legacyWithDismissed);
  assert.match(legacy, /__cursorZhTranslateProductTipText\(ne\?\.text/);

  const glass = applyProductTipsRenderHookPatches(fixtureV1);
  assert.match(glass, /__cursorZhTranslateProductTipText\(le\?\.text/);
});

test('countProductTipsRenderHookMatches reports applied glass v2 hook', () => {
  const source = fixtureV1;
  const translated = applyProductTipsRenderHookPatches(source);

  assert.equal(countProductTipsRenderHookMatches(source, translated), 1);
  assert.equal(countProductTipsRenderHookApplied(translated), 1);
});

test('applyProductTipsRenderHookPatches supports glass ee?.text render anchor', () => {
  const source = fixtureRenamed;
  const translated = applyProductTipsRenderHookPatches(source);

  assert.match(translated, /__cursorZhTranslateProductTipText\(ee\?\.text/);
  assert.equal(countProductTipsRenderHookMatches(source, translated), 1);
});

test('isProductTipsRenderHookApplicable is false for desktop bundles without hook anchors', () => {
  assert.equal(
    isProductTipsRenderHookApplicable('const search = "Search models";'),
    false
  );
});

test('isProductTipsRenderHookApplicable is true when a glass hook anchor is present', () => {
  assert.equal(isProductTipsRenderHookApplicable(fixtureRenamed), true);
});

test('applyProductTipsRenderHookPatches supports glass v3 X?.text render anchor', () => {
  const source =
    'const _e=$?B?"":XAE:B?"":X?.text??"";let Te;n[79]!==_e||n[80]!==o?(Te=lIE(aIE(_e,o),kr),n[79]=_e,n[80]=o,n[81]=Te):Te=n[81];const Ne=Te,De=$?B?"tip-dismissed-exiting":"tip-dismissed":B?`${X?.id??"tip"}-exiting`:X?.id??"tip"';
  const translated = applyProductTipsRenderHookPatches(source);

  assert.match(translated, /__cursorZhTranslateProductTipText\(X\?\.text/);
  assert.equal(countProductTipsRenderHookMatches(source, translated), 1);
});

test('applyProductTipsRenderHookPatches supports glass v4 yRE(bRE) render anchor (Cursor 3.9.16)', () => {
  const source =
    'const _e=$?B?"":cRE:B?"":X?.text??"";let Te;n[79]!==_e||n[80]!==o?(Te=yRE(bRE(_e,o),Cr),n[79]=_e,n[80]=o,n[81]=Te):Te=n[81];const Ne=Te,Pe=$?B?"tip-dismissed-exiting":"tip-dismissed":B?`${X?.id??"tip"}-exiting`:X?.id??"tip"';
  const translated = applyProductTipsRenderHookPatches(source);

  assert.match(translated, /__cursorZhTranslateProductTipText\(X\?\.text/);
  assert.equal(countProductTipsRenderHookMatches(source, translated), 1);
  assert.equal(countProductTipsRenderHookApplied(translated), 1);
});

test('applyProductTipsRenderHookPatches supports glass v5 pGS(hGS) render anchor (Cursor 3.10.11)', () => {
  const source =
    'const fe=F?P?"":iGS:P?"":z?.text??"";let Se;t[79]!==fe||t[80]!==o?(Se=pGS(hGS(fe,o),_r),t[79]=fe,t[80]=o,t[81]=Se):Se=t[81];const we=Se,Ce=F?P?"tip-dismissed-exiting":"tip-dismissed":P?`${z?.id??"tip"}-exiting`:z?.id??"tip"';
  const translated = applyProductTipsRenderHookPatches(source);

  assert.match(translated, /__cursorZhTranslateProductTipText\(z\?\.text/);
  assert.equal(countProductTipsRenderHookMatches(source, translated), 1);
  assert.equal(countProductTipsRenderHookApplied(translated), 1);
});

test('applyProductTipsRenderHookPatches supports glass v6 AzS(TzS) render anchor (Cursor 3.10.17)', () => {
  const source =
    'const fe=F?P?"":bzS:P?"":q?.text??"";let Se;t[79]!==fe||t[80]!==o?(Se=AzS(TzS(fe,o),_r),t[79]=fe,t[80]=o,t[81]=Se):Se=t[81];const ke=Se,Ce=F?P?"tip-dismissed-exiting":"tip-dismissed":P?`${q?.id??"tip"}-exiting`:q?.id??"tip"';
  const translated = applyProductTipsRenderHookPatches(source);

  assert.match(translated, /__cursorZhTranslateProductTipText\(q\?\.text/);
  assert.equal(countProductTipsRenderHookMatches(source, translated), 1);
  assert.equal(countProductTipsRenderHookApplied(translated), 1);
});
