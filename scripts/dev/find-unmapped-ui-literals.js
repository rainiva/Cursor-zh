const fs = require('fs');
const path = require('path');
const { createWorkbenchIndex } = require('../lib/patcher/workbench-index.js');
const { readJsonIfExists } = require('../tool/io.js');
const { createToolPaths } = require('../tool/paths.js');
const { mergeMappings } = require('../cursor-zh-lib.js');

const workbenchPath =
  process.argv[2] ||
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js';

const source = fs.readFileSync(workbenchPath, 'utf8');
const toolPaths = createToolPaths(path.join(__dirname, '../..'));
const mergedMappings = mergeMappings(
  mergeMappings(
    mergeMappings(
      readJsonIfExists(toolPaths.baseMappingPath, []),
      readJsonIfExists(toolPaths.overlayMappingPath, [])
    ),
    readJsonIfExists(toolPaths.cursorWinCommonPath, [])
  ),
  readJsonIfExists(toolPaths.dynamicMappingPath, [])
);
const mappedOriginals = new Set(
  mergedMappings.map((entry) => entry?.originalText).filter(Boolean)
);

function countQuoted(text, literal) {
  const escaped = literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (text.match(new RegExp(`(['"\`])${escaped}\\1`, 'g')) || []).length;
}

function isTitleCaseUiLiteral(literal) {
  if (!literal || literal.length < 3 || literal.length > 72) {
    return false;
  }
  if (/[\${}\\<>]|https?:\/\//i.test(literal)) {
    return false;
  }
  if (!/^[A-Z][A-Za-z0-9 ,./!?&'()\-–—:…]+$/.test(literal)) {
    return false;
  }
  if (!literal.includes(' ')) {
    return false;
  }
  const words = literal.split(/\s+/);
  if (words.length > 8) {
    return false;
  }
  const titled = words.filter((word) => /^[A-Z0-9]/.test(word)).length;
  return titled >= Math.max(1, Math.ceil(words.length * 0.6));
}

const index = createWorkbenchIndex(source);
const candidates = [];

for (const literal of index.quotedLiterals) {
  if (mappedOriginals.has(literal) || !isTitleCaseUiLiteral(literal)) {
    continue;
  }
  const hits = countQuoted(source, literal);
  if (hits <= 0) {
    continue;
  }
  candidates.push({ literal, hits });
}

candidates.sort((left, right) => right.hits - left.hits || left.literal.localeCompare(right.literal));

console.log('unmapped title-case ui literals', candidates.length);
for (const entry of candidates.slice(0, 120)) {
  console.log(entry.hits.toString().padStart(3), entry.literal);
}
