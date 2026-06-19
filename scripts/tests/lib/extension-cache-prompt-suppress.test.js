const test = require('node:test');
const assert = require('node:assert/strict');

const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');

const GLASS_EXTENSION_CACHE_PROMPT =
  'onDidChangeCache(()=>{p.dispose(),this._notificationService.prompt(Ul.Error,B(13452,null),[{label:B(13453,null),run:()=>this._hostService.reload()}])})';

const DESKTOP_EXTENSION_CACHE_PROMPT =
  'onDidChangeCache(()=>{g.dispose(),this._notificationService.prompt(Io.Error,k(13452,null),[{label:k(13453,null),run:()=>this._hostService.reload()}])})';

function wrapExtensionScanPrompt(inner) {
  return `if(!o){const p=this._extensionsScannerService.${inner};kv(5e3).then(()=>p.dispose())}`;
}

test('static translation suppresses glass extension cache reload prompt', () => {
  const source = wrapExtensionScanPrompt(GLASS_EXTENSION_CACHE_PROMPT);
  const translated = applyStaticSourceTranslations(source, []);

  assert.equal(translated.includes('B(13452,null)'), false);
  assert.match(translated, /onDidChangeCache\(\(\)=>\{p\.dispose\(\)\}\)/);
});

test('static translation suppresses desktop extension cache reload prompt', () => {
  const source = wrapExtensionScanPrompt(DESKTOP_EXTENSION_CACHE_PROMPT);
  const translated = applyStaticSourceTranslations(source, []);

  assert.equal(translated.includes('k(13452,null)'), false);
  assert.match(translated, /onDidChangeCache\(\(\)=>\{g\.dispose\(\)\}\)/);
});
