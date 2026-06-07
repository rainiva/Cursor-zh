const test = require('node:test');
const assert = require('node:assert/strict');

const {
  applyProductTipsRenderHookPatches,
  countProductTipsRenderHookApplied,
  countProductTipsRenderHookMatches,
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
