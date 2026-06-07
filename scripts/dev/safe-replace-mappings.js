// One-off migration helper — do not run after Phase 0. Kept for reference only.
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'cursor-zh-lib.js');
const originalContent = fs.readFileSync(filePath, 'utf8');
let content = originalContent;

function findFunctionBoundsByName(text, funcName) {
  const sig = `function ${funcName}() {`;
  const startPos = text.indexOf(sig);
  if (startPos === -1) throw new Error(`Function ${funcName} not found`);

  let bracePos = text.indexOf('{', startPos);
  let depth = 1;
  let pos = bracePos + 1;
  while (depth > 0 && pos < text.length) {
    if (text[pos] === '{') depth++;
    else if (text[pos] === '}') depth--;
    pos++;
  }

  let endPos = pos;
  while (endPos < text.length && (text[endPos] === '\n' || text[endPos] === '\r')) {
    endPos++;
  }

  return { start: startPos, end: endPos };
}

const commonBounds = findFunctionBoundsByName(content, 'defaultCursorWinCommonMappings');
const commonReplacement = `function defaultCursorWinCommonMappings() {
  return loadDefaultCursorWinCommonMappings();
}`;
content = content.slice(0, commonBounds.start) + commonReplacement + content.slice(commonBounds.end);

const overlayBounds = findFunctionBoundsByName(content, 'defaultOverlayMappings');
const overlayReplacement = `function defaultOverlayMappings() {
  return loadDefaultOverlayMappings();
}`;
content = content.slice(0, overlayBounds.start) + overlayReplacement + content.slice(overlayBounds.end);

const dynamicBounds = findFunctionBoundsByName(content, 'defaultCursorWinDynamicMappings');
const dynamicReplacement = `function defaultCursorWinDynamicMappings() {
  return loadDefaultCursorWinDynamicMappings();
}`;
content = content.slice(0, dynamicBounds.start) + dynamicReplacement + content.slice(dynamicBounds.end);

const requiredFunctions = [
  'compareLanguagePackVersion',
  'buildTranslatedWorkbenchBundle',
  'summarizeRuntimeFootprint',
  'translateTextWithMappings',
  'selectRuntimeMappings',
  'analyzeProductTipsCoverage',
  'analyzeCursorWinCoverage',
  'analyzeDynamicRuleCoverage',
  'applyStaticSourceTranslations',
  'mergeMappings',
  'parseLegacyWorktreeMappings',
  'cursorWinCoverageTargets',
  'productTipScopedMappings',
  'defaultCursorWinCommonMappings',
  'defaultOverlayMappings',
  'defaultCursorWinDynamicMappings',
];

for (const func of requiredFunctions) {
  if (!content.includes(`function ${func}`)) {
    throw new Error(`CRITICAL: Function ${func} was accidentally removed! Aborting.`);
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully replaced three default mapping functions.');
console.log(`Original size: ${originalContent.length}, New size: ${content.length}`);
