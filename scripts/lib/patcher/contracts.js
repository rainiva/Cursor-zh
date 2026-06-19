const { escapeRegExp } = require('../engine/substring');
const { applyStaticSourceTranslations } = require('./static');
const {
  PRODUCT_TIPS_RENDER_HOOK_PATCHES,
  countProductTipsRenderHookApplied,
  countProductTipsRenderHookMatches,
  isProductTipsRenderHookApplicable,
} = require('./product-tips-hook');

const KEY_SURFACE_PATCH_CONTRACTS = [
  {
    id: 'search_models',
    surface: 'model_picker',
    required: true,
    fallbackMode: 'none',
    originalText: 'Search models',
    translatedText: '\u641c\u7d22\u6a21\u578b',
  },
  {
    id: 'send_follow_up',
    surface: 'composer',
    required: true,
    fallbackMode: 'none',
    originalText: 'Add a follow-up',
    translatedText: '\u6dfb\u52a0\u8ffd\u95ee',
  },
  {
    id: 'product_tips_render_hook',
    surface: 'product_tips',
    required: true,
    fallbackMode: 'runtime',
    patchVariants: PRODUCT_TIPS_RENDER_HOOK_PATCHES,
  },
];
const KEY_SURFACE_CONTRACTS_BY_ORIGINAL_TEXT = new Map(
  KEY_SURFACE_PATCH_CONTRACTS.filter(
    (contract) => typeof contract.originalText === 'string' && contract.originalText.length > 0
  ).map((contract) => [contract.originalText, contract])
);

function initializePatchContracts() {
  const contracts = {};

  for (const contract of KEY_SURFACE_PATCH_CONTRACTS) {
    contracts[contract.id] = {
      surface: contract.surface,
      required: contract.required,
      fallbackMode: contract.fallbackMode,
      severityOnMiss: contract.fallbackMode === 'runtime' ? 'warning' : 'error',
      matchCount: 0,
      notApplicable: false,
    };
  }

  return contracts;
}

function countSubstringMatches(sourceText, pattern) {
  if (typeof pattern !== 'string' || pattern.length === 0) {
    return 0;
  }

  return String(sourceText || '').split(pattern).length - 1;
}

function countQuotedLiteralMatches(sourceText, literalText) {
  if (typeof literalText !== 'string' || literalText.length === 0) {
    return 0;
  }

  const escapedLiteral = escapeRegExp(literalText);
  const matches = String(sourceText || '').match(new RegExp(`(['"\`])${escapedLiteral}\\1`, 'g'));
  return Array.isArray(matches) ? matches.length : 0;
}

function applyStaticSourceTranslationsDetailed(workbenchSource, mappings = [], workbenchIndex) {
  const sourceText = String(workbenchSource || '');
  const translatedSource = applyStaticSourceTranslations(sourceText, mappings, workbenchIndex);
  const contracts = initializePatchContracts();

  for (const contract of KEY_SURFACE_PATCH_CONTRACTS) {
    if (typeof contract.originalText === 'string' && contract.originalText.length > 0) {
      const sourceMatchCount = countQuotedLiteralMatches(sourceText, contract.originalText);
      if (sourceMatchCount === 0) {
        contracts[contract.id].notApplicable = true;
        continue;
      }

      const translatedMatchCount = countQuotedLiteralMatches(
        translatedSource,
        contract.translatedText
      );
      contracts[contract.id].matchCount = Math.min(sourceMatchCount, translatedMatchCount);
      continue;
    }

    if (typeof contract.from === 'string' && contract.from.length > 0) {
      const sourceMatchCount = countSubstringMatches(sourceText, contract.from);
      if (sourceMatchCount === 0) {
        contracts[contract.id].notApplicable = true;
        continue;
      }

      const translatedMatchCount = countSubstringMatches(translatedSource, contract.to);
      contracts[contract.id].matchCount = Math.min(sourceMatchCount, translatedMatchCount);
      continue;
    }

    if (Array.isArray(contract.patchVariants) && contract.patchVariants.length > 0) {
      if (!isProductTipsRenderHookApplicable(sourceText)) {
        contracts[contract.id].notApplicable = true;
        continue;
      }

      contracts[contract.id].matchCount = countProductTipsRenderHookMatches(
        sourceText,
        translatedSource
      );
    }
  }

  return {
    translatedSource,
    contracts,
  };
}

function summarizeStaticPatchContractsFromTranslatedSource(
  translatedSourceText = '',
  originalSourceText = ''
) {
  const contracts = initializePatchContracts();
  const text = String(translatedSourceText || '');
  const originalText = String(originalSourceText || '');

  for (const contract of KEY_SURFACE_PATCH_CONTRACTS) {
    if (typeof contract.translatedText === 'string' && contract.translatedText.length > 0) {
      contracts[contract.id].matchCount = countQuotedLiteralMatches(
        text,
        contract.translatedText
      );
      continue;
    }

    if (typeof contract.to === 'string' && contract.to.length > 0) {
      contracts[contract.id].matchCount = countSubstringMatches(text, contract.to);
      continue;
    }

    if (Array.isArray(contract.patchVariants) && contract.patchVariants.length > 0) {
      if (originalText && !isProductTipsRenderHookApplicable(originalText)) {
        contracts[contract.id].notApplicable = true;
        continue;
      }

      contracts[contract.id].matchCount = countProductTipsRenderHookApplied(text);
    }
  }

  return contracts;
}

function evaluatePatchContracts({ runtimeMode, contracts }) {
  const issues = [];
  const warnings = [];

  for (const [contractId, contract] of Object.entries(contracts || {})) {
    if (
      contract?.required !== true ||
      contract.matchCount > 0 ||
      contract.notApplicable === true
    ) {
      continue;
    }

    if (contract.fallbackMode === 'runtime') {
      warnings.push(
        `Static patch contract missed and runtime fallback stayed active: ${contractId}`
      );
      continue;
    }

    if (runtimeMode === 'performance') {
      issues.push(`Required static patch contract failed: ${contractId}`);
    }
  }

  return { issues, warnings };
}

module.exports = {
  KEY_SURFACE_PATCH_CONTRACTS,
  KEY_SURFACE_CONTRACTS_BY_ORIGINAL_TEXT,
  applyStaticSourceTranslationsDetailed,
  summarizeStaticPatchContractsFromTranslatedSource,
  evaluatePatchContracts,
};

