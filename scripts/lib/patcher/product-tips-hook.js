const PRODUCT_TIPS_RENDER_HOOK_PATCHES = [
  {
    id: 'legacy',
    from: 'const Re=z?U?"":mkE:U?"":ne?.text??"",Be=',
    to: 'const Re=z?U?"":mkE:U?"":window.__cursorZhTranslateProductTipText?window.__cursorZhTranslateProductTipText(ne?.text??""):ne?.text??"",Be=',
  },
  {
    id: 'glass-v2',
    from: 'const Ue=j?W?"":QoI:W?"":le?.text??"",Pe=j?W?"tip-dismissed-exiting":"tip-dismissed"',
    to: 'const Ue=j?W?"":QoI:W?"":window.__cursorZhTranslateProductTipText?window.__cursorZhTranslateProductTipText(le?.text??""):le?.text??"",Pe=j?W?"tip-dismissed-exiting":"tip-dismissed"',
  },
  {
    id: 'glass-ee',
    from: 'W?"":ee?.text??"";let Fe;n[79]!==Re||n[80]!==o?(Fe=e$P(XUP(Re,o),Hs),n[79]=Re,n[80]=o,n[81]=Fe):Fe=n[81];const ze=Fe,Be=K?W?"tip-dismissed-exiting":"tip-dismissed"',
    to: 'W?"":window.__cursorZhTranslateProductTipText?window.__cursorZhTranslateProductTipText(ee?.text??""):ee?.text??"";let Fe;n[79]!==Re||n[80]!==o?(Fe=e$P(XUP(Re,o),Hs),n[79]=Re,n[80]=o,n[81]=Fe):Fe=n[81];const ze=Fe,Be=K?W?"tip-dismissed-exiting":"tip-dismissed"',
  },
];

function applyProductTipsRenderHookPatches(sourceText) {
  let current = String(sourceText || '');
  for (const patch of PRODUCT_TIPS_RENDER_HOOK_PATCHES) {
    if (!current.includes(patch.from)) {
      continue;
    }
    current = current.split(patch.from).join(patch.to);
  }
  return current;
}

function countProductTipsRenderHookMatches(sourceText, translatedSource) {
  let matchCount = 0;
  for (const patch of PRODUCT_TIPS_RENDER_HOOK_PATCHES) {
    const sourceMatches = String(sourceText || '').split(patch.from).length - 1;
    if (sourceMatches === 0) {
      continue;
    }
    const translatedMatches = String(translatedSource || '').split(patch.to).length - 1;
    matchCount += Math.min(sourceMatches, translatedMatches);
  }
  return matchCount;
}

function countProductTipsRenderHookApplied(translatedSourceText) {
  let matchCount = 0;
  for (const patch of PRODUCT_TIPS_RENDER_HOOK_PATCHES) {
    matchCount += String(translatedSourceText || '').split(patch.to).length - 1;
  }
  return matchCount;
}

module.exports = {
  PRODUCT_TIPS_RENDER_HOOK_PATCHES,
  applyProductTipsRenderHookPatches,
  countProductTipsRenderHookMatches,
  countProductTipsRenderHookApplied,
};
