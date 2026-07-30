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

const GLASS_EXTENSION_CACHE_PROMPT_V4 =
  'onDidChangeCache(()=>{p.dispose(),this._notificationService.prompt(jo.Error,C(13358,null),[{label:C(13359,null),run:()=>this._hostService.reload()}])})';

const DESKTOP_EXTENSION_CACHE_PROMPT_V3 =
  'onDidChangeCache(()=>{g.dispose(),this._notificationService.prompt(no.Error,S(13358,null),[{label:S(13359,null),run:()=>this._hostService.reload()}])})';

test('static translation suppresses glass extension cache reload prompt v4 (13358)', () => {
  const source = wrapExtensionScanPromptV2(GLASS_EXTENSION_CACHE_PROMPT_V4, 'p', 'hp');
  const translated = applyStaticSourceTranslations(source, []);

  assert.equal(translated.includes('C(13358,null)'), false);
  assert.match(translated, /onDidChangeCache\(\(\)=>\{p\.dispose\(\)\}\)/);
});

test('static translation suppresses desktop extension cache reload prompt v3 (13358)', () => {
  const source = wrapExtensionScanPromptV2(DESKTOP_EXTENSION_CACHE_PROMPT_V3, 'g', 'oh');
  const translated = applyStaticSourceTranslations(source, []);

  assert.equal(translated.includes('S(13358,null)'), false);
  assert.match(translated, /onDidChangeCache\(\(\)=>\{g\.dispose\(\)\}\)/);
});

const GLASS_EXTENSION_CACHE_PROMPT_V5 =
  'onDidChangeCache(()=>{p.dispose(),this._notificationService.prompt(Go.Error,C(13358,null),[{label:C(13359,null),run:()=>this._hostService.reload()}])})';

test('static translation suppresses glass extension cache reload prompt v5 (Go.Error, 13358)', () => {
  const source = wrapExtensionScanPromptV2(GLASS_EXTENSION_CACHE_PROMPT_V5, 'p', 'gp');
  const translated = applyStaticSourceTranslations(source, []);

  assert.equal(translated.includes('C(13358,null)'), false);
  assert.match(translated, /onDidChangeCache\(\(\)=>\{p\.dispose\(\)\}\)/);
});

const GLASS_EXTENSION_CACHE_PROMPT_V6 =
  'onDidChangeCache(()=>{h.dispose(),this._notificationService.prompt(ra.Error,x(12811,null),[{label:x(12812,null),run:()=>this._hostService.reload()}])})';

const DESKTOP_EXTENSION_CACHE_PROMPT_V4 =
  'onDidChangeCache(()=>{p.dispose(),this._notificationService.prompt(Fo.Error,C(12811,null),[{label:C(12812,null),run:()=>this._hostService.reload()}])})';

test('static translation suppresses glass extension cache reload prompt v6 (ra.Error, 12811)', () => {
  const source = wrapExtensionScanPromptV2(GLASS_EXTENSION_CACHE_PROMPT_V6, 'h', 'Hp');
  const translated = applyStaticSourceTranslations(source, []);

  assert.equal(translated.includes('x(12811,null)'), false);
  assert.match(translated, /onDidChangeCache\(\(\)=>\{h\.dispose\(\)\}\)/);
});

test('static translation suppresses desktop extension cache reload prompt v4 (Fo.Error, 12811)', () => {
  const source = wrapExtensionScanPromptV2(DESKTOP_EXTENSION_CACHE_PROMPT_V4, 'p', 'pp');
  const translated = applyStaticSourceTranslations(source, []);

  assert.equal(translated.includes('C(12811,null)'), false);
  assert.match(translated, /onDidChangeCache\(\(\)=>\{p\.dispose\(\)\}\)/);
});

const GLASS_EXTENSION_CACHE_PROMPT_V7 =
  'onDidChangeCache(()=>{h.dispose(),this._notificationService.prompt(sa.Error,x(12811,null),[{label:x(12812,null),run:()=>this._hostService.reload()}])})';

const DESKTOP_EXTENSION_CACHE_PROMPT_V5 =
  'onDidChangeCache(()=>{p.dispose(),this._notificationService.prompt(Oo.Error,C(12811,null),[{label:C(12812,null),run:()=>this._hostService.reload()}])})';

test('static translation suppresses glass extension cache reload prompt v7 (sa.Error, 12811, 3.13.21)', () => {
  const source = wrapExtensionScanPromptV2(GLASS_EXTENSION_CACHE_PROMPT_V7, 'h', 'zp');
  const translated = applyStaticSourceTranslations(source, []);

  assert.equal(translated.includes('x(12811,null)'), false);
  assert.match(translated, /onDidChangeCache\(\(\)=>\{h\.dispose\(\)\}\)/);
});

test('static translation suppresses desktop extension cache reload prompt v5 (Oo.Error, 12811, 3.13.21)', () => {
  const source = wrapExtensionScanPromptV2(DESKTOP_EXTENSION_CACHE_PROMPT_V5, 'p', 'pp');
  const translated = applyStaticSourceTranslations(source, []);

  assert.equal(translated.includes('C(12811,null)'), false);
  assert.match(translated, /onDidChangeCache\(\(\)=>\{p\.dispose\(\)\}\)/);
});
