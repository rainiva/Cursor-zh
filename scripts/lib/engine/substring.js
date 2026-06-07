function escapeRegExp(source) {
  return String(source).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeForQuotedLiteral(text, quote, options = {}) {
  const preserveTemplatePlaceholders = Boolean(
    options && options.preserveTemplatePlaceholders
  );
  let current = String(text).replace(/\\/g, '\\\\');
  if (quote === "'") {
    current = current.replace(/'/g, "\\'");
  } else if (quote === '"') {
    current = current.replace(/"/g, '\\"');
  } else if (quote === '`') {
    current = current.replace(/`/g, '\\`');
    if (!preserveTemplatePlaceholders) {
      current = current.replace(/\$\{/g, '\\${');
    }
  }
  return current;
}

module.exports = {
  escapeRegExp,
  escapeForQuotedLiteral,
};
