const path = require('path');

const { listHarvestBundleRelativePaths } = require('../patcher/workbench-bundle-registry');
const {
  shouldSkipHarvestString,
  shouldIncludeHarvestEntry,
  isPlausibleUiCopy,
} = require('./harvest-string-quality.js');

const UI_CONTEXT_KEYWORDS = [
  'title:',
  'label:',
  'placeholder:',
  'heading:',
  'children:',
  'original:',
  'glassCategory:',
];

function inferContextWindow(source, startIndex, length) {
  const from = Math.max(0, startIndex - 96);
  const to = Math.min(source.length, startIndex + length + 96);
  return source.slice(from, to);
}

function inferStringContext(source, startIndex, text) {
  const from = Math.max(0, startIndex - 96);
  const relativeIndex = startIndex - from;
  const window = source.slice(from, startIndex + text.length + 96);
  const before = window.slice(0, relativeIndex);

  let bestKeyword = 'literal';
  let bestIndex = -1;

  const propertyBases = [
    'title',
    'label',
    'placeholder',
    'heading',
    'children',
    'glassCategory',
  ];

  for (const base of propertyBases) {
    for (const suffix of [':', '=']) {
      const needle = `${base}${suffix}`;
      const index = before.lastIndexOf(needle);
      if (index > bestIndex) {
        bestIndex = index;
        bestKeyword = `${base}:`;
      }
    }
  }

  const originalIndex = before.lastIndexOf('original:');
  if (originalIndex > bestIndex) {
    bestIndex = originalIndex;
    bestKeyword = 'original:';
  }

  return bestKeyword;
}

function unescapeQuotedLiteral(rawText) {
  return rawText
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\');
}

function scanQuotedLiteralEntries(source) {
  const entries = [];
  const seen = new Set();
  const text = String(source || '');
  let index = 0;
  let lineHint = 1;

  while (index < text.length) {
    const ch = text[index];
    if (ch === '\n') {
      lineHint += 1;
      index += 1;
      continue;
    }

    if (ch !== '"' && ch !== "'" && ch !== '`') {
      index += 1;
      continue;
    }

    const quote = ch;
    let cursor = index + 1;
    while (cursor < text.length) {
      const current = text[cursor];
      if (current === '\\' && cursor + 1 < text.length) {
        cursor += 2;
        continue;
      }
      if (current === '\n') {
        lineHint += 1;
      }
      if (current === quote) {
        break;
      }
      cursor += 1;
    }

    if (cursor >= text.length || text[cursor] !== quote) {
      index += 1;
      continue;
    }

    const rawText = unescapeQuotedLiteral(text.slice(index + 1, cursor));
    const context = inferStringContext(text, index, rawText);
    if (shouldIncludeHarvestEntry(rawText, context)) {
      const key = `${index}:${rawText}`;
      if (!seen.has(key)) {
        seen.add(key);
        entries.push({
          text: rawText,
          context,
          lineHint,
        });
      }
    }

    index = cursor + 1;
  }

  return entries;
}

function extractQuotedLiteralEntries(source) {
  return scanQuotedLiteralEntries(source);
}

function extractStringsFromSource(source, filePath = '') {
  return extractQuotedLiteralEntries(String(source || '')).map((entry) => ({
    ...entry,
    path: filePath,
  }));
}

function parseGlassCommandAnchorBlock(block, filePath, lineHint) {
  const idMatch = block.match(/\bid\s*:\s*(?:["']([^"']+)["']|([A-Za-z0-9_.]+))/);
  const titleMatch = block.match(/\btitle\s*:\s*["']([^"']+)["']/);
  const anchorId = idMatch?.[1] || idMatch?.[2];
  if (!anchorId || !titleMatch) {
    return null;
  }

  return {
    type: 'glassCommand',
    id: anchorId,
    field: 'title',
    text: titleMatch[1],
    path: filePath,
    lineHint,
  };
}

function extractAnchorsFromSource(source, filePath = '') {
  const anchors = [];
  const text = String(source || '');
  const pattern = /Ns\s*\(\s*\{[^}]+\}\s*\)/g;

  for (const match of text.matchAll(pattern)) {
    const lineHint = text.slice(0, match.index).split('\n').length;
    const anchor = parseGlassCommandAnchorBlock(match[0], filePath, lineHint);
    if (anchor) {
      anchors.push(anchor);
    }
  }

  return anchors;
}

function harvestWorkbenchSources({
  cursorVersion = '',
  vscodeVersion = '',
  files = [],
  generatedAt = new Date().toISOString(),
} = {}) {
  const harvestedFiles = files.map(({ path: filePath, source }) => {
    const normalizedPath = String(filePath || '');
    return {
      path: normalizedPath,
      strings: extractQuotedLiteralEntries(String(source || '')),
      anchors: extractAnchorsFromSource(source, normalizedPath),
    };
  });

  return {
    cursorVersion,
    vscodeVersion,
    generatedAt,
    files: harvestedFiles.map(({ path: filePath, strings }) => ({ path: filePath, strings })),
    anchors: harvestedFiles.flatMap((file) => file.anchors),
  };
}

function listHarvestCandidateFiles(resourcesAppDir, { fs, maxFileBytes = 30 * 1024 * 1024 } = {}) {
  const workbenchDir = path.join(resourcesAppDir, 'out', 'vs', 'workbench');
  if (!fs.existsSync(workbenchDir)) {
    return [];
  }

  const results = [];

  function walk(currentDir) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(absolutePath);
        continue;
      }

      if (!entry.name.endsWith('.js')) {
        continue;
      }

      const stat = fs.statSync(absolutePath);
      if (stat.size > maxFileBytes) {
        continue;
      }

      results.push({
        absolutePath,
        relativePath: path.relative(workbenchDir, absolutePath).replace(/\\/g, '/'),
      });
    }
  }

  walk(workbenchDir);
  return results;
}

function harvestInstallDir({
  resourcesAppDir,
  cursorVersion = '',
  vscodeVersion = '',
  fs,
  readText,
  onProgress,
} = {}) {
  const workbenchDir = path.join(resourcesAppDir, 'out', 'vs', 'workbench');
  const relativePaths = listHarvestBundleRelativePaths(resourcesAppDir, { fs });
  const harvestedFiles = [];
  const anchors = [];
  const sourcesByPath = new Map();
  const total = relativePaths.length;

  for (let fileIndex = 0; fileIndex < relativePaths.length; fileIndex += 1) {
    const relativePath = relativePaths[fileIndex];
    const absolutePath = path.join(workbenchDir, relativePath);
    if (!fs.existsSync(absolutePath)) {
      continue;
    }

    onProgress?.({
      stage: 'scan-file',
      index: fileIndex + 1,
      total,
      path: relativePath,
      absolutePath,
    });

    const scanStart = performance.now();
    const source = readText(absolutePath);
    const byteLength = Buffer.byteLength(source, 'utf8');
    sourcesByPath.set(relativePath, source);
    const strings = extractQuotedLiteralEntries(source);
    const fileAnchors = extractAnchorsFromSource(source, relativePath);
    anchors.push(...fileAnchors);
    harvestedFiles.push({ path: relativePath, strings });

    onProgress?.({
      stage: 'scan-file-done',
      index: fileIndex + 1,
      total,
      path: relativePath,
      stringCount: strings.length,
      byteLength,
      durationMs: performance.now() - scanStart,
    });
  }

  const harvest = harvestWorkbenchSources({
    cursorVersion,
    vscodeVersion,
    files: harvestedFiles.map((file) => ({
      path: file.path,
      source: sourcesByPath.get(file.path) || '',
    })),
  });

  harvest.sourcesByPath = sourcesByPath;
  return harvest;
}

module.exports = {
  UI_CONTEXT_KEYWORDS,
  shouldSkipHarvestString,
  shouldIncludeHarvestEntry,
  isPlausibleUiCopy,
  unescapeQuotedLiteral,
  scanQuotedLiteralEntries,
  extractStringsFromSource,
  extractAnchorsFromSource,
  harvestWorkbenchSources,
  listHarvestCandidateFiles,
  harvestInstallDir,
};
