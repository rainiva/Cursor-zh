'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { classifyUpdateAdmission, createFallbackProofKey } = require('./admission.js');
const { resolveSemanticLocator } = require('./semantic-locator.js');
const { PRODUCT_TIPS_LOCATOR } = require('../patcher/product-tips-hook.js');
const { loadSurfaceDefinitions } = require('../mapping/surfaces.js');
const { loadTranslationUnits } = require('../mapping/translation-units.js');
const { createProofKeyFromProfile, buildUpdateProfile, compareUpdateProfiles } = require('./update-profile.js');

const LOCATORS_BY_ID = Object.freeze({
  [PRODUCT_TIPS_LOCATOR.locatorId]: PRODUCT_TIPS_LOCATOR,
});

function collectInstallSourceTexts(context, { fs: fsRef = fs, readText } = {}) {
  const paths = context?.paths || {};
  const candidates = [
    paths.workbenchOriginalPath,
    paths.workbenchGlassOriginalPath,
    paths.nlsMessagesPath,
  ].filter(Boolean);

  const read =
    typeof readText === 'function'
      ? readText
      : (filePath) => fsRef.readFileSync(filePath, 'utf8');

  const texts = [];
  for (const filePath of candidates) {
    try {
      if (fsRef.existsSync(filePath)) {
        texts.push(read(filePath));
      }
    } catch {
      // Skip unreadable sources; missing evidence stays fail-closed via outcomes.
    }
  }
  return texts;
}

function resolveLocatorForUnit(unit) {
  const locatorId = unit?.primary?.locatorId;
  if (!locatorId) {
    return null;
  }
  if (LOCATORS_BY_ID[locatorId]) {
    return {
      ...LOCATORS_BY_ID[locatorId],
      cardinality: unit.primary.cardinality ?? LOCATORS_BY_ID[locatorId].cardinality,
    };
  }
  return null;
}

function resolveUnitPrimaryAgainstSources(unit, sourceTexts) {
  const severity = unit.severity || 'error';
  const translationId = unit.translationId;
  const primaryKind = unit.primary?.kind;

  if (primaryKind === 'semantic') {
    const locator = resolveLocatorForUnit(unit);
    if (!locator) {
      return { translationId, severity, primary: 'missing' };
    }
    let sawAmbiguous = false;
    for (const sourceText of sourceTexts) {
      const located = resolveSemanticLocator(sourceText, locator);
      if (located.status === 'resolved') {
        return { translationId, severity, primary: 'resolved' };
      }
      if (located.status === 'ambiguous') {
        sawAmbiguous = true;
      }
    }
    return { translationId, severity, primary: sawAmbiguous ? 'ambiguous' : 'missing' };
  }

  if (primaryKind === 'static_patch' || primaryKind === 'mapping') {
    const aliases = Array.isArray(unit.aliases) ? unit.aliases : [];
    // Applied installs may only expose the translated form (e.g. 3.13.10 moved the
    // dialog literals into nls.messages.json, which apply rewrites in place), so the
    // unit's changeText counts as primary evidence alongside the English aliases.
    const evidence = unit.changeText ? [...aliases, unit.changeText] : aliases;
    const found = evidence.some((needle) =>
      sourceTexts.some((text) => typeof text === 'string' && text.includes(String(needle)))
    );
    return { translationId, severity, primary: found ? 'resolved' : 'missing' };
  }

  return { translationId, severity, primary: 'missing' };
}

function resolveTranslationUnitOutcomes(units, sourceTexts, { fallbackProofsById = {} } = {}) {
  return (units || []).map((unit) => {
    const outcome = resolveUnitPrimaryAgainstSources(unit, sourceTexts);
    const proof = fallbackProofsById[unit.translationId];
    if (proof) {
      outcome.fallbackProof = proof;
    }
    return outcome;
  });
}

function hashFileSafe(filePath, sha256OfFile, fsRef = fs) {
  if (!filePath || typeof sha256OfFile !== 'function') {
    return null;
  }
  try {
    if (!fsRef.existsSync(filePath)) {
      return null;
    }
    return sha256OfFile(filePath);
  } catch {
    return null;
  }
}

function buildInstallUpdateProfile(context, units, outcomes, {
  sha256OfFile,
  fs: fsRef = fs,
  cursorVersion = null,
  vscodeVersion = null,
} = {}) {
  const paths = context?.paths || {};
  const bundles = [];
  const desktopHash = hashFileSafe(paths.workbenchOriginalPath, sha256OfFile, fsRef);
  if (desktopHash) {
    bundles.push({ capabilityId: 'workbench.desktop', hash: desktopHash });
  }
  const glassHash = hashFileSafe(paths.workbenchGlassOriginalPath, sha256OfFile, fsRef);
  if (glassHash) {
    bundles.push({ capabilityId: 'workbench.glass', hash: glassHash });
  }
  const nlsHash = hashFileSafe(paths.nlsMessagesPath, sha256OfFile, fsRef);
  return buildUpdateProfile({
    cursorVersion: cursorVersion || 'unknown',
    vscodeVersion: vscodeVersion || 'unknown',
    bundles,
    nls: { inventoryHash: nlsHash || '' },
    units: (units || []).map((unit, index) => ({
      translationId: unit.translationId,
      outcome: outcomes[index]?.primary || 'missing',
    })),
  });
}

function computeCurrentProofKey(updateProfile, { toolVersion = '', runtimeGovernanceHash = '' } = {}) {
  return createProofKeyFromProfile(updateProfile, {
    toolVersion,
    runtimeGovernanceHash,
  });
}

function loadPrepareAdmissionInputs(toolPaths, { workspaceRoot } = {}) {
  const root = workspaceRoot || toolPaths?.workspaceRoot;
  const surfacesPath = toolPaths?.surfacesMetaPath;
  const unitsPath = toolPaths?.translationUnitsPath;
  const surfaces =
    surfacesPath && fs.existsSync(surfacesPath)
      ? JSON.parse(fs.readFileSync(surfacesPath, 'utf8'))
      : loadSurfaceDefinitions(root);
  const loaded =
    unitsPath && fs.existsSync(unitsPath)
      ? loadTranslationUnits(unitsPath, surfaces)
      : { units: [] };
  return { units: loaded.units || [], surfaces };
}

function computePrepareAdmission({
  units,
  sourceTexts,
  updateProfile,
  previousUpdateProfile = null,
  toolVersion = '',
  runtimeGovernanceHash = '',
  fallbackProofsById = {},
  admissionDrift = null,
} = {}) {
  const outcomes = resolveTranslationUnitOutcomes(units, sourceTexts, { fallbackProofsById });
  const currentProofKey = computeCurrentProofKey(updateProfile || buildUpdateProfile({
    cursorVersion: 'unknown',
    vscodeVersion: 'unknown',
    bundles: [],
    nls: { inventoryHash: '' },
    units: [],
  }), { toolVersion, runtimeGovernanceHash });

  let drift = admissionDrift;
  if (drift == null) {
    const profileDrift =
      previousUpdateProfile
        ? compareUpdateProfiles(previousUpdateProfile, updateProfile).status === 'KNOWN_DRIFT'
        : false;
    const outcomeDrift = outcomes.some((item) => item.primary !== 'resolved');
    drift = profileDrift || outcomeDrift;
  }

  const admission = classifyUpdateAdmission({
    drift,
    outcomes,
    currentProofKey,
  });

  return {
    admission,
    outcomes,
    currentProofKey,
    updateProfile,
    drift,
  };
}

function buildPrepareAdmissionForContext(context, toolPaths, deps = {}) {
  const {
    fs: fsRef = fs,
    readText,
    sha256OfFile,
    readJsonIfExists,
    toolVersion = null,
  } = deps;

  if (context?.options?.admission) {
    return {
      admission: context.options.admission,
      outcomes: context.options.admissionOutcomes || [],
      currentProofKey: context.options.currentProofKey || '',
      updateProfile: context.options.updateProfile || null,
      drift: context.options.admissionDrift ?? null,
      units: [],
      surfaces: {},
    };
  }

  // Explicit test/injection path keeps resolvePrepareAdmission semantics.
  if (
    context?.options?.admissionDrift != null ||
    Array.isArray(context?.options?.admissionOutcomes)
  ) {
    const admission = classifyUpdateAdmission({
      drift: context.options.admissionDrift ?? false,
      outcomes: context.options.admissionOutcomes ?? [],
      currentProofKey: context.options.currentProofKey ?? '',
    });
    return {
      admission,
      outcomes: context.options.admissionOutcomes || [],
      currentProofKey: context.options.currentProofKey || '',
      updateProfile: context.options.updateProfile || null,
      drift: context.options.admissionDrift ?? false,
      units: [],
      surfaces: {},
    };
  }

  const { units, surfaces } = loadPrepareAdmissionInputs(toolPaths, {
    workspaceRoot: toolPaths?.workspaceRoot,
  });
  const sourceTexts = collectInstallSourceTexts(context, { fs: fsRef, readText });

  let cursorVersion = 'unknown';
  let vscodeVersion = 'unknown';
  try {
    if (context?.paths?.packageJsonPath && fsRef.existsSync(context.paths.packageJsonPath)) {
      const pkg = JSON.parse(fsRef.readFileSync(context.paths.packageJsonPath, 'utf8'));
      cursorVersion = String(pkg.version || cursorVersion);
    }
    if (context?.paths?.productJsonPath && fsRef.existsSync(context.paths.productJsonPath)) {
      const product = JSON.parse(fsRef.readFileSync(context.paths.productJsonPath, 'utf8'));
      vscodeVersion = String(product.vscodeVersion || product.version || vscodeVersion);
    }
  } catch {
    // keep defaults
  }

  const provisionalOutcomes = resolveTranslationUnitOutcomes(
    units,
    sourceTexts,
    { fallbackProofsById: context?.options?.fallbackProofsById || {} }
  );
  const updateProfile = buildInstallUpdateProfile(context, units, provisionalOutcomes, {
    sha256OfFile,
    fs: fsRef,
    cursorVersion,
    vscodeVersion,
  });

  let previousUpdateProfile = context?.options?.previousUpdateProfile || null;
  if (!previousUpdateProfile && typeof readJsonIfExists === 'function' && toolPaths?.buildManifestPath) {
    const manifest = readJsonIfExists(toolPaths.buildManifestPath, null);
    previousUpdateProfile = manifest?.updateProfile || null;
  }

  const resolvedToolVersion =
    toolVersion ||
    (typeof readJsonIfExists === 'function' && toolPaths?.workspaceRoot
      ? readJsonIfExists(path.join(toolPaths.workspaceRoot, 'package.json'), null)?.version
      : null) ||
    '';

  const computed = computePrepareAdmission({
    units,
    sourceTexts,
    updateProfile,
    previousUpdateProfile,
    toolVersion: resolvedToolVersion,
    runtimeGovernanceHash: context?.options?.runtimeGovernanceHash || '',
    fallbackProofsById: context?.options?.fallbackProofsById || {},
    admissionDrift: context?.options?.admissionDrift,
  });

  return {
    ...computed,
    units,
    surfaces,
  };
}

module.exports = {
  LOCATORS_BY_ID,
  collectInstallSourceTexts,
  resolveUnitPrimaryAgainstSources,
  resolveTranslationUnitOutcomes,
  buildInstallUpdateProfile,
  computeCurrentProofKey,
  loadPrepareAdmissionInputs,
  computePrepareAdmission,
  buildPrepareAdmissionForContext,
  createFallbackProofKey,
};
