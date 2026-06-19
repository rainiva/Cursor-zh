function summarizeRuntimeFootprintFromParts(runtimeHeader, translatedSourceText, runtimeMappings = []) {
  const runtimeHeaderChars = String(runtimeHeader || '').length;

  return {
    runtimeHeaderChars,
    runtimeHeaderKB: +(runtimeHeaderChars / 1024).toFixed(1),
    runtimeMappingCount: Array.isArray(runtimeMappings) ? runtimeMappings.length : 0,
  };
}

function summarizeRuntimeFootprint(bundleText, translatedSourceText, runtimeMappings = []) {
  const runtimeHeaderChars = Math.max(
    String(bundleText || '').length - String(translatedSourceText || '').length,
    0
  );

  return {
    runtimeHeaderChars,
    runtimeHeaderKB: +(runtimeHeaderChars / 1024).toFixed(1),
    runtimeMappingCount: Array.isArray(runtimeMappings) ? runtimeMappings.length : 0,
  };
}

module.exports = {
  summarizeRuntimeFootprint,
  summarizeRuntimeFootprintFromParts,
};

