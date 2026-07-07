const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { CRITICAL_EMBEDDED_UI_PATCHES } = require('../../lib/mapping/critical-ui-targets.js');
const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');
const { mergeMappings } = require('../../cursor-zh-lib');
const { readJsonIfExists } = require('../../tool/io');
const { createToolPaths } = require('../../tool/paths');

const BACKGROUND_TERMINAL_RUNNING_PATCH = {
  from: 'clE(u,"Terminal","Terminals"),e[0]=u,e[1]=h):h=e[1];const p=`${u} ${h} Running`',
  to: 'clE(u,"终端","终端"),e[0]=u,e[1]=h):h=e[1];const p=`${u} ${h} 运行中`',
};

const BACKGROUND_TERMINAL_RUNNING_PATCH_V2 = {
  from: 'GTS(u,"Terminal","Terminals"),e[0]=u,e[1]=p):p=e[1];const m=`${u} ${p} Running`',
  to: 'GTS(u,"终端","终端"),e[0]=u,e[1]=p):p=e[1];const m=`${u} ${p} 运行中`',
};

const HL_E_SNIPPET =
  'function hlE(n){let h;e[0]!==u?(h=clE(u,"Terminal","Terminals"),e[0]=u,e[1]=h):h=e[1];const p=`${u} ${h} Running`;return p;}';

const GTS_SNIPPET =
  'let p;e[0]!==u?(p=GTS(u,"Terminal","Terminals"),e[0]=u,e[1]=p):p=e[1];const m=`${u} ${p} Running`;';

const toolPaths = createToolPaths(path.join(__dirname, '../../..'));

function loadMergedMappings() {
  return mergeMappings(
    mergeMappings(
      mergeMappings(
        readJsonIfExists(toolPaths.baseMappingPath, []),
        readJsonIfExists(toolPaths.overlayMappingPath, [])
      ),
      readJsonIfExists(toolPaths.cursorWinCommonPath, [])
    ),
    readJsonIfExists(toolPaths.dynamicMappingPath, [])
  );
}

test('background terminal running count patch is registered', () => {
  const match = CRITICAL_EMBEDDED_UI_PATCHES.find(
    (entry) => entry.from === BACKGROUND_TERMINAL_RUNNING_PATCH.from
  );
  assert.ok(match);
  assert.equal(match.to, BACKGROUND_TERMINAL_RUNNING_PATCH.to);

  const matchV2 = CRITICAL_EMBEDDED_UI_PATCHES.find(
    (entry) => entry.from === BACKGROUND_TERMINAL_RUNNING_PATCH_V2.from
  );
  assert.ok(matchV2);
  assert.equal(matchV2.to, BACKGROUND_TERMINAL_RUNNING_PATCH_V2.to);
});

test('static translation localizes background work tray terminal running header', () => {
  const translated = applyStaticSourceTranslations(HL_E_SNIPPET, loadMergedMappings());
  assert.match(translated, /clE\(u,"终端","终端"\)/);
  assert.match(translated, /\$\{u\} \$\{h\} 运行中/);
  assert.equal(translated.includes(' Running'), false);
  assert.equal(translated.includes('"Terminals"'), false);
});

test('static translation localizes background work tray terminal running header (GTS anchor)', () => {
  const translated = applyStaticSourceTranslations(GTS_SNIPPET, loadMergedMappings());
  assert.match(translated, /GTS\(u,"终端","终端"\)/);
  assert.match(translated, /\$\{u\} \$\{p\} 运行中/);
  assert.equal(translated.includes(' Running'), false);
  assert.equal(translated.includes('"Terminals"'), false);
});

test('static translation localizes image context menu actions', () => {
  const source =
    'return[{id:"copyImage",label:"Copy Image",run:()=>Zjb(t.source,t.services)},{id:"saveImageAs",label:"Download Image",run:()=>Yjb(t.source,t.services)}]';
  const translated = applyStaticSourceTranslations(source, loadMergedMappings());
  assert.match(translated, /label:"复制图片"/);
  assert.match(translated, /label:"下载图片"/);
  assert.equal(translated.includes('Copy Image'), false);
  assert.equal(translated.includes('Download Image'), false);
});
