const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildTranslatedWorkbenchBundle,
  buildTranslatedWorkbenchBundleParts,
} = require('../../lib/runtime/bundle-builder.js');

test('buildTranslatedWorkbenchBundleParts returns header and body without concatenating', () => {
  const preTranslated = 'const label = "Search models";';
  const parts = buildTranslatedWorkbenchBundleParts({
    workbenchSource: 'const label = "Search models";',
    mappings: [{ originalText: 'Search models', changeText: '搜索模型', searchType: 'exact' }],
    runtimeMappings: [],
    metadata: { runtimeConfig: { mode: 'performance' } },
    translatedSource: preTranslated,
  });

  assert.equal(typeof parts.runtimeHeader, 'string');
  assert.ok(parts.runtimeHeader.includes('Cursor ZH generated runtime'));
  assert.equal(parts.translatedSource, preTranslated);
  assert.match(`${parts.runtimeHeader}${parts.translatedSource}`, /Search models/);
});

test('buildTranslatedWorkbenchBundleParts exposes inline runtime text helper', () => {
  const parts = buildTranslatedWorkbenchBundleParts({
    workbenchSource: 'const label = "Balanced quality and speed, recommended for most tasks";',
    mappings: [
      {
        originalText: 'Balanced quality and speed, recommended for most tasks',
        changeText: '质量与速度均衡，适合大多数任务',
        searchType: 'exact',
      },
    ],
    runtimeMappings: [
      {
        originalText: 'Balanced quality and speed, recommended for most tasks',
        changeText: '质量与速度均衡，适合大多数任务',
        searchType: 'exact',
      },
    ],
    metadata: { runtimeConfig: { mode: 'performance' } },
    translatedSource: 'const label = "Balanced quality and speed, recommended for most tasks";',
  });

  assert.match(parts.runtimeHeader, /__cursorZhTranslateInlineText/);
  assert.match(parts.runtimeHeader, /质量与速度均衡，适合大多数任务/);
});

test('buildTranslatedWorkbenchBundle matches concatenated bundle parts', () => {
  const options = {
    workbenchSource: 'const label = "General";',
    mappings: [{ originalText: 'General', changeText: '常规', searchType: 'exact' }],
    runtimeMappings: [],
    metadata: { runtimeConfig: { mode: 'performance' } },
    translatedSource: 'const label = "常规";',
  };

  const bundle = buildTranslatedWorkbenchBundle(options);
  const parts = buildTranslatedWorkbenchBundleParts(options);
  assert.equal(bundle, `${parts.runtimeHeader}${parts.translatedSource}`);
});
