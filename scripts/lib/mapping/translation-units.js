'use strict';

const fs = require('node:fs');

function validateTranslationUnits(payload, surfaces = {}) {
  if (payload?.version !== 1 || !Array.isArray(payload.units)) {
    throw new Error('translation units must use version 1 and an units array');
  }
  const byId = new Map();
  const aliasesByScope = new Map();
  for (const unit of payload.units) {
    if (!unit?.translationId || byId.has(unit.translationId)) {
      throw new Error(`duplicate translationId: ${unit?.translationId || '<empty>'}`);
    }
    if (!unit.changeText || !Array.isArray(unit.aliases) || unit.aliases.length === 0) {
      throw new Error(`invalid translation unit: ${unit.translationId}`);
    }
    if (unit.fallback?.kind === 'runtime-surface' && !surfaces[unit.fallback.surface]) {
      throw new Error(`unregistered runtime surface: ${unit.fallback.surface}`);
    }
    byId.set(unit.translationId, unit);
    for (const alias of unit.aliases) {
      const key = `${unit.owner}\0${alias}`;
      const previous = aliasesByScope.get(key);
      if (previous && previous !== unit.translationId) {
        throw new Error(`conflicting alias: ${unit.owner}/${alias}`);
      }
      aliasesByScope.set(key, unit.translationId);
    }
  }
  return { units: payload.units, byId, aliasesByScope };
}

function loadTranslationUnits(filePath, surfaces) {
  return validateTranslationUnits(JSON.parse(fs.readFileSync(filePath, 'utf8')), surfaces);
}

module.exports = { loadTranslationUnits, validateTranslationUnits };
