const test = require('node:test');
const assert = require('node:assert/strict');

const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');

const GLASS_EXTENSION_CACHE_PROMPT =
  'onDidChangeCache(()=>{p.dispose(),this._notificationService.prompt(Ul.Error,B(13452,null),[{label:B(13453,null),run:()=>this._hostService.reload()}])})';

const DESKTOP_EXTENSION_CACHE_PROMPT =
  'onDidChangeCache(()=>{g.dispose(),this._notificationService.prompt(Io.Error,k(13452,null),[{label:k(13453,null),run:()=>this._hostService.reload()}])})';

const GLASS_EXTENSION_CACHE_PROMPT_V2 =
  'onDidChangeCache(()=>{h.dispose(),this._notificationService.prompt(jo.Error,x(13355,null),[{label:x(13356,null),run:()=>this._hostService.reload()}])})';

const GLASS_EXTENSION_CACHE_PROMPT_V3 =
  'onDidChangeCache(()=>{h.dispose(),this._notificationService.prompt(Qo.Error,x(13355,null),[{label:x(13356,null),run:()=>this._hostService.reload()}])})';

const DESKTOP_EXTENSION_CACHE_PROMPT_V2 =
  'onDidChangeCache(()=>{g.dispose(),this._notificationService.prompt(uo.Error,k(13355,null),[{label:k(13356,null),run:()=>this._hostService.reload()}])})';

function wrapExtensionScanPrompt(inner) {
  return `if(!o){const p=this._extensionsScannerService.${inner};kv(5e3).then(()=>p.dispose())}`;
}

function wrapExtensionScanPromptV2(inner, disposeVar = 'h', timeoutFn = 'Oh') {
  return `if(!o){const ${disposeVar}=this._extensionsScannerService.${inner};${timeoutFn}(5e3).then(()=>${disposeVar}.dispose())}`;
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

test('static translation suppresses glass extension cache reload prompt v2 (13355)', () => {
  const source = wrapExtensionScanPromptV2(GLASS_EXTENSION_CACHE_PROMPT_V2);
  const translated = applyStaticSourceTranslations(source, []);

  assert.equal(translated.includes('x(13355,null)'), false);
  assert.match(translated, /onDidChangeCache\(\(\)=>\{h\.dispose\(\)\}\)/);
});

test('static translation suppresses desktop extension cache reload prompt v2 (13355)', () => {
  const source = wrapExtensionScanPromptV2(DESKTOP_EXTENSION_CACHE_PROMPT_V2, 'g', 'ym');
  const translated = applyStaticSourceTranslations(source, []);

  assert.equal(translated.includes('k(13355,null)'), false);
  assert.match(translated, /onDidChangeCache\(\(\)=>\{g\.dispose\(\)\}\)/);
});

test('static translation suppresses glass extension cache reload prompt v3 (Qo.Error, 13355)', () => {
  const source = wrapExtensionScanPromptV2(GLASS_EXTENSION_CACHE_PROMPT_V3);
  const translated = applyStaticSourceTranslations(source, []);

  assert.equal(translated.includes('x(13355,null)'), false);
  assert.match(translated, /onDidChangeCache\(\(\)=>\{h\.dispose\(\)\}\)/);
});
