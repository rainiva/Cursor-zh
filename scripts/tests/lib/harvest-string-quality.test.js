const test = require('node:test');
const assert = require('node:assert/strict');

const {
  shouldSkipHarvestString,
  shouldIncludeHarvestEntry,
  isLikelyUserVisibleLiteral,
  isPlausibleUiCopy,
  isRuntimeLibraryMessage,
} = require('../../lib/analyzer/harvest-string-quality.js');

test('shouldSkipHarvestString rejects undefined and JS keyword noise', () => {
  assert.equal(shouldSkipHarvestString('undefined'), true);
  assert.equal(shouldSkipHarvestString('function'), true);
  assert.equal(shouldSkipHarvestString('object'), true);
  assert.equal(shouldSkipHarvestString('getter'), true);
});

test('shouldSkipHarvestString rejects dashed UUID literals', () => {
  assert.equal(shouldSkipHarvestString('1ca77302-6cfa-5c54-b599-9202c4b4179f'), true);
});

test('shouldSkipHarvestString rejects tslib decorator error fragments', () => {
  assert.equal(shouldSkipHarvestString('Class extends value '), true);
  assert.equal(shouldSkipHarvestString(' is not a constructor or null'), true);
  assert.equal(shouldSkipHarvestString('Function expected'), true);
});

test('shouldIncludeHarvestEntry keeps UI-context strings', () => {
  assert.equal(shouldIncludeHarvestEntry('Copy as Markdown', 'label:'), true);
  assert.equal(shouldIncludeHarvestEntry('Toggle Expand Agent', 'title:'), true);
  assert.equal(shouldIncludeHarvestEntry(' Queued', 'children:'), true);
});

test('shouldIncludeHarvestEntry rejects all literal-context strings', () => {
  assert.equal(shouldIncludeHarvestEntry('Object expected', 'literal'), false);
  assert.equal(shouldIncludeHarvestEntry('Register Close Tooltip', 'literal'), false);
  assert.equal(shouldIncludeHarvestEntry('undefined', 'literal'), false);
  const fragment = ',title:x(192,null),order:1},{menuId:st.SimpleEditorContext,group:';
  assert.equal(shouldIncludeHarvestEntry(fragment, 'literal'), false);
});

test('shouldIncludeHarvestEntry rejects runtime library messages in any context', () => {
  assert.equal(
    shouldIncludeHarvestEntry('Private accessor was defined without a getter', 'literal'),
    false
  );
  assert.equal(
    shouldIncludeHarvestEntry('Symbol.iterator is not defined.', 'title:'),
    false
  );
});

test('shouldIncludeHarvestEntry rejects DOM and implementation tokens in UI context', () => {
  assert.equal(shouldIncludeHarvestEntry('flex', 'title:'), false);
  assert.equal(shouldIncludeHarvestEntry('button', 'title:'), false);
  assert.equal(shouldIncludeHarvestEntry('div@first', 'title:'), false);
  assert.equal(shouldIncludeHarvestEntry('editor.experimentalGpuAcceleration', 'label:'), false);
  assert.equal(shouldIncludeHarvestEntry('separator', 'label:'), false);
  assert.equal(shouldIncludeHarvestEntry('undoredo.codeAction', 'label:'), false);
});

test('shouldIncludeHarvestEntry keeps readable UI titles and labels from report samples', () => {
  assert.equal(shouldIncludeHarvestEntry('Register Close Tooltip', 'title:'), true);
  assert.equal(shouldIncludeHarvestEntry('Compare', 'label:'), true);
});

test('shouldIncludeHarvestEntry rejects developer diagnostic labels even in label context', () => {
  assert.equal(
    shouldIncludeHarvestEntry('Monaco rectangle renderer render pass', 'label:'),
    false
  );
});

test('isRuntimeLibraryMessage detects tslib and ES helper error templates', () => {
  assert.equal(isRuntimeLibraryMessage('Object expected'), true);
  assert.equal(isRuntimeLibraryMessage('Generator is already executing.'), true);
  assert.equal(isRuntimeLibraryMessage('Dynamic require of "'), true);
  assert.equal(isRuntimeLibraryMessage('SuppressedError'), true);
  assert.equal(isRuntimeLibraryMessage('Register Close Tooltip'), false);
});

test('isPlausibleUiCopy mirrors shouldIncludeHarvestEntry for UI contexts', () => {
  assert.equal(isPlausibleUiCopy('Copy as Markdown', 'label:'), true);
  assert.equal(isPlausibleUiCopy('flex', 'title:'), false);
});

test('isLikelyUserVisibleLiteral keeps readable title-case UI phrases', () => {
  assert.equal(isLikelyUserVisibleLiteral('Register Close Tooltip'), true);
  assert.equal(isLikelyUserVisibleLiteral('Extend Cursor with Plugins'), true);
});

test('shouldIncludeHarvestEntry rejects source-map original context and minified switch fragments', () => {
  assert.equal(shouldIncludeHarvestEntry(':return 1;case', 'original:'), false);
  assert.equal(shouldIncludeHarvestEntry(':return 2;case', 'original:'), false);
  assert.equal(shouldIncludeHarvestEntry('Register Close Tooltip', 'original:'), false);
});

test('shouldIncludeHarvestEntry rejects minified code mistaken for UI in children and label context', () => {
  assert.equal(shouldIncludeHarvestEntry('&&s.push({type:', 'children:'), false);
  assert.equal(
    shouldIncludeHarvestEntry(');var B6s=F6s;B6s.endOfExpression=[', 'label:'),
    false
  );
  assert.equal(shouldIncludeHarvestEntry('})}),ie&&Mte(`', 'children:'), false);
  assert.equal(shouldIncludeHarvestEntry('${O.memberCount} members', 'label:'), false);
});

test('shouldIncludeHarvestEntry keeps NLS menu strings with real mnemonics', () => {
  assert.equal(shouldIncludeHarvestEntry('Save && Close', 'label:'), true);
  assert.equal(shouldIncludeHarvestEntry('&&Save', 'title:'), true);
});

test('shouldIncludeHarvestEntry keeps leading-space children badge copy', () => {
  assert.equal(shouldIncludeHarvestEntry(' [blocked]', 'children:'), true);
  assert.equal(shouldIncludeHarvestEntry(' Queued', 'children:'), true);
});

test('shouldIncludeHarvestEntry rejects space-separated CSS class token chains in children context', () => {
  const classChain =
    'ui-3nfvp2 ui-6s0dn4 ui-l56j7k ui-2lah0s ui-9f619 ui-b3r6kr ui-f1vpex ui-mkeg23 ui-1y0btm7 ui-16sux1g ui-1wd3ewq';
  assert.equal(shouldIncludeHarvestEntry(classChain, 'children:'), false);
  assert.equal(
    shouldIncludeHarvestEntry(
      'ui-78zum5 ui-1q0g3np ui-6s0dn4 ui-pkkfsy ui-8nignz ui-1c4vz4f ui-2lah0s ui-dl72j9 ui-19aaqeu ui-1ypdohk ui-87ps6o ui-uxw1ft ui-uudt1u',
      'children:'
    ),
    false
  );
});

test('shouldIncludeHarvestEntry rejects React dev invariant strings in children context', () => {
  assert.equal(
    shouldIncludeHarvestEntry(
      'Menu.ExpandableSection components must be used within <Menu.ExpandableSection>',
      'children:'
    ),
    false
  );
});

test('shouldIncludeHarvestEntry keeps real children UI copy from harvest 3.9.8 report', () => {
  assert.equal(shouldIncludeHarvestEntry('Zoom in', 'children:'), true);
  assert.equal(shouldIncludeHarvestEntry('Expand to fullscreen', 'children:'), true);
  assert.equal(shouldIncludeHarvestEntry('Open in Terminal Pane', 'children:'), true);
  assert.equal(shouldIncludeHarvestEntry('Empty directory', 'children:'), true);
  assert.equal(shouldIncludeHarvestEntry('No diagnostics found', 'children:'), true);
});

test('shouldIncludeHarvestEntry rejects BEM and Tailwind class chains from harvest 3.9.8 children noise', () => {
  assert.equal(
    shouldIncludeHarvestEntry(
      'ui-step-group-collapsible agent-transcript-notification-collapsible',
      'children:'
    ),
    false
  );
  assert.equal(
    shouldIncludeHarvestEntry(
      'ui-seti ui-prompt-input-mention-chip__seti ui-prompt-input-mention-chip__leading-icon',
      'children:'
    ),
    false
  );
  assert.equal(
    shouldIncludeHarvestEntry(
      'ui-prompt-input-command-chip__label ui-prompt-input-command-chip__label--clickable',
      'children:'
    ),
    false
  );
  assert.equal(shouldIncludeHarvestEntry('ml-1 -mr-1', 'children:'), false);
  assert.equal(
    shouldIncludeHarvestEntry('ui-step-group-collapsible agent-transcript-work-group-collapsible', 'children:'),
    false
  );
});

test('shouldIncludeHarvestEntry keeps composer transcript children copy after class-chain filtering', () => {
  assert.equal(shouldIncludeHarvestEntry('Thumbs up', 'children:'), true);
  assert.equal(shouldIncludeHarvestEntry('Thumbs down', 'children:'), true);
  assert.equal(shouldIncludeHarvestEntry('Fork chat', 'children:'), true);
  assert.equal(shouldIncludeHarvestEntry('Working', 'children:'), true);
  assert.equal(shouldIncludeHarvestEntry(' Changed', 'children:'), true);
  assert.equal(shouldIncludeHarvestEntry('Agent disconnected', 'children:'), true);
});
