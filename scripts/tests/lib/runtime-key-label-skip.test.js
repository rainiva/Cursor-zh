const test = require('node:test');
const assert = require('node:assert/strict');

const { buildTranslatedWorkbenchBundle } = require('../../cursor-zh-lib.js');

test('runtime bundle skips KeyCode label text nodes such as RightArrow', () => {
  const bundle = buildTranslatedWorkbenchBundle({
    workbenchSource: 'console.log("workbench");',
    mappings: [{ originalText: 'Edit', changeText: '编辑', searchType: 'exact' }],
    metadata: {
      runtimeConfig: {
        mode: 'performance',
        rescanDelaysMs: [],
        observeScopeSelectors: ['[class*="menu"]'],
        marketplaceRemoteTranslationEnabled: false,
      },
    },
  });

  assert.match(bundle, /shouldSkipTranslatableText\(text\)/);
  assert.match(bundle, /\(Left\|Right\|Up\|Down\|PageUp\|PageDown\|Home\|End\)Arrow\$/);
  assert.match(bundle, /if \(this\.shouldSkipTranslatableText\(text\)\) \{/);
  assert.match(bundle, /node\.textContent = "";/);
});
