const test = require('node:test');
const assert = require('node:assert/strict');

const {
  applyProductTipsRenderHookPatches,
  countProductTipsRenderHookApplied,
  countProductTipsRenderHookMatches,
  isProductTipsRenderHookApplicable,
} = require('../../lib/patcher/product-tips-hook');

test('applyProductTipsRenderHookPatches supports legacy and glass v2 render anchors', () => {
  const legacy = applyProductTipsRenderHookPatches(
    'const Re=z?U?"":mkE:U?"":ne?.text??"",Be='
  );
  assert.match(legacy, /__cursorZhTranslateProductTipText\(ne\?\.text/);

  const glass = applyProductTipsRenderHookPatches(
    'const Ue=j?W?"":QoI:W?"":le?.text??"",Pe=j?W?"tip-dismissed-exiting":"tip-dismissed"'
  );
  assert.match(glass, /__cursorZhTranslateProductTipText\(le\?\.text/);
});

test('countProductTipsRenderHookMatches reports applied glass v2 hook', () => {
  const source =
    'const Ue=j?W?"":QoI:W?"":le?.text??"",Pe=j?W?"tip-dismissed-exiting":"tip-dismissed"';
  const translated = applyProductTipsRenderHookPatches(source);

  assert.equal(countProductTipsRenderHookMatches(source, translated), 1);
  assert.equal(countProductTipsRenderHookApplied(translated), 1);
});

test('applyProductTipsRenderHookPatches supports glass ee?.text render anchor', () => {
  const source =
    'const Re=K?W?"":WUP:W?"":ee?.text??"";let Fe;n[79]!==Re||n[80]!==o?(Fe=e$P(XUP(Re,o),Hs),n[79]=Re,n[80]=o,n[81]=Fe):Fe=n[81];const ze=Fe,Be=K?W?"tip-dismissed-exiting":"tip-dismissed"';
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
  assert.equal(
    isProductTipsRenderHookApplicable(
      'W?"":ee?.text??"";let Fe;n[79]!==Re||n[80]!==o?(Fe=e$P(XUP(Re,o),Hs),n[79]=Re,n[80]=o,n[81]=Fe):Fe=n[81];const ze=Fe,Be=K?W?"tip-dismissed-exiting":"tip-dismissed"'
    ),
    true
  );
});

test('applyProductTipsRenderHookPatches supports glass v3 X?.text render anchor', () => {
  const source =
    'const _e=$?B?"":XAE:B?"":X?.text??"";let Te;n[79]!==_e||n[80]!==o?(Te=lIE(aIE(_e,o),kr),n[79]=_e,n[80]=o,n[81]=Te):Te=n[81];const Ne=Te,De=$?B?"tip-dismissed-exiting":"tip-dismissed":B?`${X?.id??"tip"}-exiting`:X?.id??"tip"';
  const translated = applyProductTipsRenderHookPatches(source);

  assert.match(translated, /__cursorZhTranslateProductTipText\(X\?\.text/);
  assert.equal(countProductTipsRenderHookMatches(source, translated), 1);
});
