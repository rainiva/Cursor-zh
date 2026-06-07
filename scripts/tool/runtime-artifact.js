function createRuntimeArtifactModule() {
  function parseInstalledRuntimeArtifact(bundleText) {
    const text = String(bundleText || '');
    if (!text.includes('Cursor ZH generated runtime')) {
      return null;
    }

    const metadataMatch = text.match(/const translationMetadata = (.+);\n/);
    const runtimeMappingsMatch = text.match(
      /const translationMappings = (\[[\s\S]*?\]);\n  const productTipMappings = /
    );
    const headerMatch = text.match(
      /^\/\* Cursor ZH generated runtime: do not edit generated file directly\. \*\/[\s\S]*?\n\}\)\(\);\n?/
    );

    if (!metadataMatch || !runtimeMappingsMatch || !headerMatch) {
      return null;
    }

    const metadata = JSON.parse(metadataMatch[1]);
    const runtimeMappings = JSON.parse(runtimeMappingsMatch[1]);
    const runtimeHeaderChars = headerMatch[0].length;

    return {
      metadata,
      runtimeMappings,
      translatedSourceText: text.slice(runtimeHeaderChars),
      runtimeStrategy: {
        mode: metadata?.runtimeConfig?.mode || 'performance',
        runtimeMappingCount: runtimeMappings.length,
        runtimeHeaderChars,
        runtimeHeaderKB: +(runtimeHeaderChars / 1024).toFixed(1),
      },
    };
  }

  return {
    parseInstalledRuntimeArtifact,
  };
}

module.exports = {
  createRuntimeArtifactModule,
};
