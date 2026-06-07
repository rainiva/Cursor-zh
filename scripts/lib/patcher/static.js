const { escapeRegExp, escapeForQuotedLiteral } = require('../engine/substring');
const { applyProductTipsRenderHookPatches } = require('./product-tips-hook');

function applyStaticSourceTranslations(workbenchSource, mappings = []) {
  let current = String(workbenchSource || '');
  const exactMappings = mappings
    .filter(
      (entry) =>
        entry &&
        entry.searchType === 'exact' &&
        typeof entry.originalText === 'string' &&
        entry.originalText.length > 0 &&
        typeof entry.changeText === 'string'
    )
    .sort((left, right) => right.originalText.length - left.originalText.length);

  // Fast path: use split/join for literals that contain no regex-special chars
  // and no quote chars that need escaping. This avoids the overhead of
  // creating and running RegExp objects on multi-MB source text.
  const REGEX_SPECIAL_RE = /[.*+?^${}()|[\]\\]/;
  const QUOTE_CHARS = new Set(["'", '"', '`']);

  for (const entry of exactMappings) {
    const original = entry.originalText;
    const changed = entry.changeText;

    // Determine if we can use the fast split/join path.
    const canUseFastPath =
      !REGEX_SPECIAL_RE.test(original) &&
      !QUOTE_CHARS.has(original[0]) &&
      !QUOTE_CHARS.has(original[original.length - 1]) &&
      !QUOTE_CHARS.has(changed[0]) &&
      !QUOTE_CHARS.has(changed[changed.length - 1]);

    if (canUseFastPath) {
      // Build the three quoted variants and replace them directly.
      const singleQuoted = `'${original}'`;
      const doubleQuoted = `"${original}"`;
      const templateQuoted = `\`${original}\``;
      const singleChanged = `'${changed}'`;
      const doubleChanged = `"${changed}"`;
      const templateChanged = `\`${changed}\``;

      if (current.includes(singleQuoted)) {
        current = current.split(singleQuoted).join(singleChanged);
      }
      if (current.includes(doubleQuoted)) {
        current = current.split(doubleQuoted).join(doubleChanged);
      }
      if (current.includes(templateQuoted)) {
        current = current.split(templateQuoted).join(templateChanged);
      }
      continue;
    }

    // Slow path: full regex-based replacement for complex literals.
    const escapedOriginal = escapeRegExp(original);
    const literalPattern = new RegExp(`(['"\`])${escapedOriginal}\\1`, 'g');
    current = current.replace(literalPattern, (_match, quote) => {
      const translated = escapeForQuotedLiteral(changed, quote, {
        preserveTemplatePlaceholders:
          quote === '`' && original.includes('${'),
      });
      return `${quote}${translated}${quote}`;
    });
  }

  const embeddedUiSourcePatches = [
    {
      from: 'Show all (<!> more)',
      to: '显示全部（还有 <!> 项）',
    },
    {
      from: 'Show less',
      to: '收起',
    },
  ];

  for (const patch of embeddedUiSourcePatches) {
    if (!current.includes(patch.from)) {
      continue;
    }
    current = current.split(patch.from).join(patch.to);
  }

  current = applyProductTipsRenderHookPatches(current);

  return current;
}

module.exports = {
  applyStaticSourceTranslations,
};

