function normalizePath(filePath) {
  return String(filePath || '').replace(/\\/g, '/');
}

function isProductionCodePath(filePath) {
  const normalized = normalizePath(filePath);
  if (normalized.startsWith('scripts/dev/')) {
    return false;
  }
  if (normalized.startsWith('scripts/tests/')) {
    return false;
  }
  if (normalized.startsWith('scripts/lib/')) {
    return true;
  }
  if (normalized.startsWith('scripts/tool/')) {
    return true;
  }
  if (normalized === 'scripts/cursor-zh-lib.js' || normalized === 'scripts/cursor-zh-tool.js') {
    return true;
  }
  return false;
}

function isTestPath(filePath) {
  const normalized = normalizePath(filePath);
  return normalized.startsWith('scripts/tests/') && normalized.endsWith('.test.js');
}

function evaluateTddPairing(changedPaths = []) {
  const productionChanges = [];
  let hasTestChange = false;

  for (const filePath of changedPaths) {
    if (isTestPath(filePath)) {
      hasTestChange = true;
      continue;
    }
    if (isProductionCodePath(filePath)) {
      productionChanges.push(normalizePath(filePath));
    }
  }

  if (productionChanges.length === 0) {
    return { ok: true, productionChanges: [] };
  }

  if (hasTestChange) {
    return { ok: true, productionChanges: [] };
  }

  return {
    ok: false,
    productionChanges,
    message: 'Production code changed without matching test file changes',
  };
}

module.exports = {
  isProductionCodePath,
  isTestPath,
  evaluateTddPairing,
};
