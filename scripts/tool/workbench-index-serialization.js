function serializeWorkbenchIndex(workbenchIndex) {
  if (!workbenchIndex) {
    return null;
  }

  return {
    sourceText: workbenchIndex.sourceText,
    quotedLiterals: workbenchIndex.quotedLiterals
      ? [...workbenchIndex.quotedLiterals]
      : [],
    isAuthoritative: workbenchIndex.isAuthoritative === true,
    applicableEmbeddedPatches: workbenchIndex.applicableEmbeddedPatches || null,
  };
}

function deserializeWorkbenchIndex(serialized) {
  if (!serialized) {
    return null;
  }

  const quotedLiterals = new Set(serialized.quotedLiterals || []);
  const sourceText = String(serialized.sourceText || '');

  return {
    sourceText,
    quotedLiterals,
    isAuthoritative: serialized.isAuthoritative === true,
    applicableEmbeddedPatches: serialized.applicableEmbeddedPatches || null,
    includes(fragment) {
      return sourceText.includes(String(fragment || ''));
    },
    hasQuotedLiteral(originalText) {
      if (typeof originalText !== 'string' || originalText.length === 0) {
        return false;
      }
      return quotedLiterals.has(originalText);
    },
  };
}

module.exports = {
  serializeWorkbenchIndex,
  deserializeWorkbenchIndex,
};
