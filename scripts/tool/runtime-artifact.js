const RUNTIME_HEADER_MARKER = '/* Cursor ZH generated runtime: do not edit generated file directly. */';
const RUNTIME_HEADER_END = '})();\n';

function extractJsonLiteral(source, variableName) {
  const marker = `const ${variableName} = `;
  const startIndex = source.indexOf(marker);
  if (startIndex === -1) {
    return null;
  }

  let index = startIndex + marker.length;
  while (index < source.length && /\s/.test(source[index])) {
    index += 1;
  }

  const opener = source[index];
  if (opener !== '{' && opener !== '[') {
    return null;
  }

  const closer = opener === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === opener) {
      depth += 1;
    } else if (char === closer) {
      depth -= 1;
      if (depth === 0) {
        return source.slice(startIndex + marker.length, index + 1);
      }
    }
  }

  return null;
}

function findRuntimeHeaderEnd(bundleText) {
  const text = String(bundleText || '');
  if (!text.startsWith(RUNTIME_HEADER_MARKER)) {
    return -1;
  }

  const headerMatch = text.match(
    /^\/\* Cursor ZH generated runtime: do not edit generated file directly\. \*\/[\s\S]*?\n\}\)\(\);\n?/
  );
  if (!headerMatch) {
    return -1;
  }

  return headerMatch[0].length;
}

function parseInstalledRuntimeArtifact(bundleText) {
  const text = String(bundleText || '');
  const headerEnd = findRuntimeHeaderEnd(text);
  if (headerEnd <= 0) {
    return null;
  }

  const header = text.slice(0, headerEnd);
  const metadataLiteral = extractJsonLiteral(header, 'translationMetadata');
  const runtimeMappingsLiteral = extractJsonLiteral(header, 'translationMappings');
  const hasProductTipMappings = header.includes('const productTipMappings =');

  if (!metadataLiteral || !runtimeMappingsLiteral || !hasProductTipMappings) {
    return null;
  }

  const metadata = JSON.parse(metadataLiteral);
  const runtimeMappings = JSON.parse(runtimeMappingsLiteral);
  const runtimeHeaderChars = header.length;

  return {
    metadata,
    runtimeMappings,
    translatedSourceText: text.slice(headerEnd),
    runtimeStrategy: {
      mode: metadata?.runtimeConfig?.mode || 'performance',
      runtimeMappingCount: runtimeMappings.length,
      runtimeHeaderChars,
      runtimeHeaderKB: +(runtimeHeaderChars / 1024).toFixed(1),
    },
  };
}

function hasInstalledRuntimeHeader(filePath, readTextPrefix) {
  if (typeof readTextPrefix !== 'function' || !filePath) {
    return false;
  }
  return readTextPrefix(filePath, 256).startsWith(RUNTIME_HEADER_MARKER);
}

function createRuntimeArtifactModule() {
  return {
    RUNTIME_HEADER_MARKER,
    RUNTIME_HEADER_END,
    extractJsonLiteral,
    findRuntimeHeaderEnd,
    parseInstalledRuntimeArtifact,
    hasInstalledRuntimeHeader,
  };
}

module.exports = {
  createRuntimeArtifactModule,
  RUNTIME_HEADER_MARKER,
  RUNTIME_HEADER_END,
  extractJsonLiteral,
  findRuntimeHeaderEnd,
  parseInstalledRuntimeArtifact,
  hasInstalledRuntimeHeader,
};
