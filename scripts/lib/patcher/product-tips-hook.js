'use strict';

const { resolveSemanticLocator } = require('../compatibility/semantic-locator.js');
const { evaluateLocatorPostconditions } = require('../compatibility/locator-postconditions.js');

const PRODUCT_TIPS_LOCATOR = {
  locatorId: 'product_tips.render_text',
  anchor: { type: 'property', value: 'text' },
  required: [{ type: 'literal', value: 'tip-dismissed' }],
  maxTokenDistance: 80,
  cardinality: 1,
};

/** Legacy version fragments kept for one release as diagnostics only. */
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
  {
    id: 'glass-v3',
    from: 'B?"":X?.text??"";let Te;n[79]!==_e||n[80]!==o?(Te=lIE(aIE(_e,o),kr),n[79]=_e,n[80]=o,n[81]=Te):Te=n[81];const Ne=Te,De=$?B?"tip-dismissed-exiting":"tip-dismissed"',
    to: 'B?"":window.__cursorZhTranslateProductTipText?window.__cursorZhTranslateProductTipText(X?.text??""):X?.text??"";let Te;n[79]!==_e||n[80]!==o?(Te=lIE(aIE(_e,o),kr),n[79]=_e,n[80]=o,n[81]=Te):Te=n[81];const Ne=Te,De=$?B?"tip-dismissed-exiting":"tip-dismissed"',
  },
  {
    id: 'glass-v4',
    from: 'B?"":X?.text??"";let Te;n[79]!==_e||n[80]!==o?(Te=yRE(bRE(_e,o),Cr),n[79]=_e,n[80]=o,n[81]=Te):Te=n[81];const Ne=Te,Pe=$?B?"tip-dismissed-exiting":"tip-dismissed"',
    to: 'B?"":window.__cursorZhTranslateProductTipText?window.__cursorZhTranslateProductTipText(X?.text??""):X?.text??"";let Te;n[79]!==_e||n[80]!==o?(Te=yRE(bRE(_e,o),Cr),n[79]=_e,n[80]=o,n[81]=Te):Te=n[81];const Ne=Te,Pe=$?B?"tip-dismissed-exiting":"tip-dismissed"',
  },
  {
    id: 'glass-v5',
    from: 'P?"":z?.text??"";let Se;t[79]!==fe||t[80]!==o?(Se=pGS(hGS(fe,o),_r),t[79]=fe,t[80]=o,t[81]=Se):Se=t[81];const we=Se,Ce=F?P?"tip-dismissed-exiting":"tip-dismissed"',
    to: 'P?"":window.__cursorZhTranslateProductTipText?window.__cursorZhTranslateProductTipText(z?.text??""):z?.text??"";let Se;t[79]!==fe||t[80]!==o?(Se=pGS(hGS(fe,o),_r),t[79]=fe,t[80]=o,t[81]=Se):Se=t[81];const we=Se,Ce=F?P?"tip-dismissed-exiting":"tip-dismissed"',
  },
  {
    id: 'glass-v6',
    from: 'P?"":q?.text??"";let Se;t[79]!==fe||t[80]!==o?(Se=AzS(TzS(fe,o),_r),t[79]=fe,t[80]=o,t[81]=Se):Se=t[81];const ke=Se,Ce=F?P?"tip-dismissed-exiting":"tip-dismissed"',
    to: 'P?"":window.__cursorZhTranslateProductTipText?window.__cursorZhTranslateProductTipText(q?.text??""):q?.text??"";let Se;t[79]!==fe||t[80]!==o?(Se=AzS(TzS(fe,o),_r),t[79]=fe,t[80]=o,t[81]=Se):Se=t[81];const ke=Se,Ce=F?P?"tip-dismissed-exiting":"tip-dismissed"',
  },
];

const HOOK_GUARD_FRAGMENT =
  'window.__cursorZhTranslateProductTipText?window.__cursorZhTranslateProductTipText(';

function findTextExpressionSpan(source, propertyOffset) {
  let start = propertyOffset;
  while (start > 0 && /[A-Za-z0-9_$]/.test(source[start - 1])) {
    start -= 1;
  }

  let end = propertyOffset;
  if (source.startsWith('?.', end)) {
    end += 2;
  } else if (source[end] === '.') {
    end += 1;
  } else {
    return null;
  }

  if (!source.startsWith('text', end)) {
    return null;
  }
  end += 4;

  const coalesced = source.slice(end).match(/^(\?\?|\|\|)(['"`])\2/);
  if (coalesced) {
    end += coalesced[0].length;
  }

  return { start, end };
}

function insertProductTipTranslatorAtTarget(sourceText, target) {
  const source = String(sourceText || '');
  if (!target || typeof target.offset !== 'number') {
    return source;
  }

  const span = findTextExpressionSpan(source, target.offset);
  if (!span) {
    return source;
  }

  const expr = source.slice(span.start, span.end);
  if (source.slice(Math.max(0, span.start - HOOK_GUARD_FRAGMENT.length), span.start) === HOOK_GUARD_FRAGMENT) {
    return source;
  }

  const wrapped = `${HOOK_GUARD_FRAGMENT}${expr}):${expr}`;
  return source.slice(0, span.start) + wrapped + source.slice(span.end);
}

function applyProductTipsRenderHook(sourceText, options = {}) {
  const source = String(sourceText || '');
  const located = resolveSemanticLocator(source, PRODUCT_TIPS_LOCATOR);
  if (located.status !== 'resolved') {
    return {
      sourceText: source,
      outcome: 'fallback',
      locatorId: PRODUCT_TIPS_LOCATOR.locatorId,
      postconditions: { ok: false, failures: [located.status] },
    };
  }

  const patched = insertProductTipTranslatorAtTarget(source, located.target);
  const evaluatePostconditions = options.evaluatePostconditions || evaluateLocatorPostconditions;
  const postconditions = evaluatePostconditions(patched, [
    {
      id: 'single-product-tip-hook',
      fragment: HOOK_GUARD_FRAGMENT,
      count: 1,
    },
  ]);
  return {
    sourceText: postconditions.ok ? patched : source,
    outcome: postconditions.ok ? 'resolved' : 'blocked',
    locatorId: PRODUCT_TIPS_LOCATOR.locatorId,
    postconditions,
  };
}

function applyProductTipsRenderHookPatches(sourceText) {
  const result = applyProductTipsRenderHook(sourceText);
  return result.outcome === 'resolved' ? result.sourceText : String(sourceText || '');
}

function isProductTipsRenderHookApplicable(sourceText) {
  const located = resolveSemanticLocator(sourceText, PRODUCT_TIPS_LOCATOR);
  return located.status !== 'missing';
}

function countProductTipsRenderHookApplied(translatedSourceText) {
  return String(translatedSourceText || '').split(HOOK_GUARD_FRAGMENT).length - 1;
}

function countProductTipsRenderHookMatches(sourceText, translatedSource) {
  const located = resolveSemanticLocator(sourceText, PRODUCT_TIPS_LOCATOR);
  if (located.status !== 'resolved') {
    return 0;
  }
  return countProductTipsRenderHookApplied(translatedSource) > 0 ? 1 : 0;
}

module.exports = {
  PRODUCT_TIPS_LOCATOR,
  PRODUCT_TIPS_RENDER_HOOK_PATCHES,
  applyProductTipsRenderHook,
  applyProductTipsRenderHookPatches,
  insertProductTipTranslatorAtTarget,
  countProductTipsRenderHookMatches,
  countProductTipsRenderHookApplied,
  isProductTipsRenderHookApplicable,
};
