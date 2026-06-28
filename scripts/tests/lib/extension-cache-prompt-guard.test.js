const test = require('node:test');
const assert = require('node:assert/strict');

const {
  hasUnsuppressedExtensionCacheReloadPrompt,
} = require('../../lib/patcher/extension-cache-prompt-guard.js');

test('hasUnsuppressedExtensionCacheReloadPrompt detects glass v2 extension cache popup', () => {
  const source =
    'onDidChangeCache(()=>{h.dispose(),this._notificationService.prompt(jo.Error,x(13355,null),[{label:x(13356,null),run:()=>this._hostService.reload()}])})';
  assert.equal(hasUnsuppressedExtensionCacheReloadPrompt(source), true);
});

test('hasUnsuppressedExtensionCacheReloadPrompt detects desktop v2 extension cache popup', () => {
  const source =
    'onDidChangeCache(()=>{g.dispose(),this._notificationService.prompt(uo.Error,k(13355,null),[{label:k(13356,null),run:()=>this._hostService.reload()}])})';
  assert.equal(hasUnsuppressedExtensionCacheReloadPrompt(source), true);
});

test('hasUnsuppressedExtensionCacheReloadPrompt accepts suppressed extension cache handler', () => {
  assert.equal(hasUnsuppressedExtensionCacheReloadPrompt('onDidChangeCache(()=>{h.dispose()})'), false);
  assert.equal(
    hasUnsuppressedExtensionCacheReloadPrompt(
      'onDidChangeCache(()=>{this._passiveWorkbenchThemesPromise=void 0})'
    ),
    false
  );
});
