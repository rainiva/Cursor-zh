const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const { createQuotedLiteralSet } = require('../../lib/patcher/workbench-index.js');
const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');
const { escapeForQuotedLiteral, escapeRegExp } = require('../../lib/engine/substring.js');

function applySlowPathOnly(source, mappings) {
  let current = String(source || '');
  for (const entry of mappings) {
    const original = entry.originalText;
    const changed = entry.changeText;
    const escapedOriginal = escapeRegExp(original);
    const literalPattern = new RegExp(`(['"\`])${escapedOriginal}\\1`, 'g');
    current = current.replace(literalPattern, (_match, quote) => {
      const translated = escapeForQuotedLiteral(changed, quote, {
        preserveTemplatePlaceholders: quote === '`' && original.includes('${'),
      });
      return `${quote}${translated}${quote}`;
    });
  }
  return current;
}

test('createQuotedLiteralSet still finds strings after parenthesized division', () => {
  const source = '(a)/2+"Search models"';
  const literals = createQuotedLiteralSet(source);
  assert.equal(literals.has('Search models'), true);
});

test('createQuotedLiteralSet still finds strings after spaced division', () => {
  const source = 'width / 2,label:"Search models"';
  const literals = createQuotedLiteralSet(source);
  assert.equal(literals.has('Search models'), true);
});

test('applyStaticSourceTranslations matches slow-path literal replacement for fast-path mappings', () => {
  const source = [
    's.replace(/^["\']|["\']$/g,""),',
    'placeholder:"Search models",',
    "action:'Add a follow-up',",
    'title:"Show less"',
  ].join('');

  const mappings = [
    { originalText: 'Search models', changeText: '搜索模型', searchType: 'exact' },
    { originalText: 'Add a follow-up', changeText: '添加追问', searchType: 'exact' },
    { originalText: 'Show less', changeText: '收起', searchType: 'exact' },
  ];

  const fast = applyStaticSourceTranslations(source, mappings);
  const slow = applySlowPathOnly(source, mappings);
  assert.equal(fast, slow);
});

test('real workbench bundle detects Search models when file is available', () => {
  const workbenchPath =
    process.env.CURSOR_WORKBENCH_PATH ||
    'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js';

  if (!fs.existsSync(workbenchPath)) {
    return;
  }

  const source = fs.readFileSync(workbenchPath, 'utf8');
  const literals = createQuotedLiteralSet(source);
  assert.equal(literals.has('Search models'), true);
});
