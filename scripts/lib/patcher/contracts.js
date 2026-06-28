const { escapeRegExp } = require('../engine/substring');

const { applyStaticSourceTranslations } = require('./static');

const {

  STATIC_PATCH_SURFACE_CONTRACTS,

} = require('../mapping/surface-contracts');

const {

  PRODUCT_TIPS_RENDER_HOOK_PATCHES,

  countProductTipsRenderHookApplied,

  countProductTipsRenderHookMatches,

  isProductTipsRenderHookApplicable,

} = require('./product-tips-hook');

const { createQuotedLiteralSet } = require('./workbench-index');



const KEY_SURFACE_PATCH_CONTRACTS = [

  ...STATIC_PATCH_SURFACE_CONTRACTS,

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



function translatedQuotedLiteralPresent(translatedText, literalText, translatedLiterals) {

  if (typeof literalText !== 'string' || literalText.length === 0) {

    return false;

  }



  return (

    translatedLiterals.has(literalText) ||

    countQuotedLiteralMatches(translatedText, literalText) > 0

  );

}



function summarizeStaticPatchContracts(sourceText, translatedSource, sourceIndex) {

  const contracts = initializePatchContracts();

  const originalText = String(sourceText || '');

  const translatedText = String(translatedSource || '');

  const translatedLiterals = createQuotedLiteralSet(translatedText);



  for (const contract of KEY_SURFACE_PATCH_CONTRACTS) {

    if (typeof contract.originalText === 'string' && contract.originalText.length > 0) {

      const sourcePresent =

        sourceIndex?.quotedLiterals?.has(contract.originalText) ||

        countQuotedLiteralMatches(originalText, contract.originalText) > 0;

      if (!sourcePresent) {

        contracts[contract.id].notApplicable = true;

        continue;

      }



      contracts[contract.id].matchCount = translatedQuotedLiteralPresent(

        translatedText,

        contract.translatedText,

        translatedLiterals

      )

        ? 1

        : 0;

      continue;

    }



    if (typeof contract.from === 'string' && contract.from.length > 0) {

      if (!originalText.includes(contract.from)) {

        contracts[contract.id].notApplicable = true;

        continue;

      }



      contracts[contract.id].matchCount = translatedText.includes(contract.to) ? 1 : 0;

      continue;

    }



    if (Array.isArray(contract.patchVariants) && contract.patchVariants.length > 0) {

      if (!isProductTipsRenderHookApplicable(originalText)) {

        contracts[contract.id].notApplicable = true;

        continue;

      }



      contracts[contract.id].matchCount = countProductTipsRenderHookMatches(

        originalText,

        translatedText

      );

    }

  }



  return contracts;

}



function applyStaticSourceTranslationsDetailed(

  workbenchSource,

  mappings = [],

  workbenchIndex,

  options = {}

) {

  const sourceText = String(workbenchSource || '');

  const translatedSource = applyStaticSourceTranslations(sourceText, mappings, workbenchIndex, options);

  if (options.deferContractsToVerify === true) {
    return {
      translatedSource,
      contracts: {},
      contractsDeferred: true,
    };
  }

  const contracts = summarizeStaticPatchContracts(sourceText, translatedSource, workbenchIndex);



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

  const translatedLiterals = createQuotedLiteralSet(text);



  for (const contract of KEY_SURFACE_PATCH_CONTRACTS) {

    if (typeof contract.translatedText === 'string' && contract.translatedText.length > 0) {

      contracts[contract.id].matchCount = translatedQuotedLiteralPresent(

        text,

        contract.translatedText,

        translatedLiterals

      )

        ? 1

        : 0;

      continue;

    }



    if (typeof contract.to === 'string' && contract.to.length > 0) {

      contracts[contract.id].matchCount = text.includes(contract.to) ? 1 : 0;

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

  countQuotedLiteralMatches,

  translatedQuotedLiteralPresent,

};


