const test = require('node:test');
const assert = require('node:assert/strict');

const {
  CRITICAL_EMBEDDED_UI_PATCHES,
} = require('../../lib/mapping/critical-ui-targets.js');
const { applyEmbeddedUiSourcePatches } = require('../../lib/patcher/static.js');

// task17 欠账一：Review Provider「Choose ... for pull request links on web and desktop」
// 旧补丁锚定 minified 函数名 FtT/BtT，3.13.25 已漂移为 desktop xSy/TSy、glass eKy/Jqy，
// 形参名亦从 n 变为 t。抗漂移重锚改用「稳定英文文案 + 模板反引号结构」为主锚，
// 不嵌入任何 minified 标识符，故 desktop/glass 共用同一对 head/tail 补丁。
// 下列 fixture 均取自 3.13.25 双 bundle 的真实邻域字节（state/reports/task17-patch-health-3.13.25.txt）。

// 连接符 patch B 的稳定 from（e.length===2...），三段 fixture 共用，验证整句语序。
const CONNECTOR =
  'e.length===2?`${e[0]} or ${e[1]}`:`${e.slice(0,-1).join(", ")}, or ${e[e.length-1]}`';

// 3.13.25 desktop 实测邻域：外层 xSy(t)、内层 TSy(t)
const FIXTURE_DESKTOP =
  `x=${CONNECTOR}}function xSy(t){return\`Choose ${'${TSy(t)}'} for pull request links on web and desktop\`}function ASy({signedIn:t`;

// 3.13.25 glass 实测邻域：外层 eKy(t)、内层 Jqy(t)
const FIXTURE_GLASS =
  `x=${CONNECTOR}}function eKy(t){return\`Choose ${'${Jqy(t)}'} for pull request links on web and desktop\`}function tKy({signedIn:t`;

// 旧版本（3.13.21 及更早）：外层 FtT(n)、内层 BtT(n)，须由保留的旧变体继续命中。
const FIXTURE_LEGACY =
  `function FtT(n){return\`Choose ${'${BtT(n)}'} for pull request links on web and desktop\`}`;

const ENGLISH_TAIL = 'for pull request links on web and desktop';
const ZH_SENTENCE_TAIL = '作为 Web 和桌面端的拉取请求链接';

function applyAll(source) {
  return applyEmbeddedUiSourcePatches(source, CRITICAL_EMBEDDED_UI_PATCHES);
}

test('anti-drift anchors translate PR-links sentence on 3.13.25 desktop bundle (xSy/TSy)', () => {
  const out = applyAll(FIXTURE_DESKTOP);
  assert.equal(out.includes(ENGLISH_TAIL), false, 'desktop 英文尾句仍残留');
  // 整句中文，且内层 ${TSy(t)} 调用保持原样不动
  assert.ok(
    out.includes('选择 ${TSy(t)} ' + ZH_SENTENCE_TAIL),
    'desktop 整句未译或 ${TSy(t)} 被破坏'
  );
});

test('anti-drift anchors translate PR-links sentence on 3.13.25 glass bundle (eKy/Jqy)', () => {
  const out = applyAll(FIXTURE_GLASS);
  assert.equal(out.includes(ENGLISH_TAIL), false, 'glass 英文尾句仍残留');
  assert.ok(
    out.includes('选择 ${Jqy(t)} ' + ZH_SENTENCE_TAIL),
    'glass 整句未译或 ${Jqy(t)} 被破坏'
  );
});

test('legacy FtT/BtT variant is retained and still matches (multi-version compat)', () => {
  const out = applyAll(FIXTURE_LEGACY);
  assert.equal(out.includes(ENGLISH_TAIL), false, 'legacy 英文尾句仍残留');
  assert.ok(
    out.includes('function FtT(n){return`选择 ${BtT(n)} ' + ZH_SENTENCE_TAIL + '`}'),
    'legacy 旧变体已失效'
  );
});

test('connector " or " → 「或」 keeps whole sentence fluent Chinese (no mixed text)', () => {
  const out = applyAll(FIXTURE_DESKTOP);
  // patch B 稳定命中，且与重锚后的外层无中英混杂
  assert.ok(out.includes('${e[0]} 或 ${e[1]}'), '连接符「或」未命中');
  assert.equal(out.includes(' or '), false, '英文连接符 or 仍残留');
});
