const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// 守护 defaults 孪生快照语义（判定依据见 2d5dd26 计划偏差记录「将 defaults 快照与
// HEAD overlay 全面对齐」+ overlay-seed.js bootstrap-only 逻辑）：
// translations/overlay/defaults/ 是 overlay 的引导快照，overlay-seed 为 bootstrap-only
// （文件存在且非空即权威、不合并），因此 defaults 若与 overlay 漂移，全新环境或用户清空
// overlay 后重新 seed 会丢失后续批次新增的翻译。本测试断言二者对常用页词条完全一致，
// 防止历史「批次只改 overlay、忘同步 defaults」的回归再次发生。

const OVERLAY_DIR = path.join(__dirname, '../../../translations/overlay');
const PAIRS = [
  ['cursor-win.common.json', 'defaults/cursor-win.common.json'],
];

function loadJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(OVERLAY_DIR, relPath), 'utf8'));
}

// 归一化：按字段名排序后序列化，得到与字段书写顺序无关的规范签名。
function canonical(entry) {
  return JSON.stringify(entry, Object.keys(entry).sort());
}

function toSortedSignatures(arr) {
  return arr.map(canonical).sort();
}

for (const [overlayRel, defaultsRel] of PAIRS) {
  test(`defaults 孪生快照与 overlay 全量一致：${overlayRel}`, () => {
    const overlay = loadJson(overlayRel);
    const defaults = loadJson(defaultsRel);

    const overlaySig = new Map();
    for (const e of overlay) overlaySig.set(canonical(e), e);
    const defaultsSig = new Map();
    for (const e of defaults) defaultsSig.set(canonical(e), e);

    // 方向一：overlay 每条都须在 defaults 中原样存在（防「只改 overlay 忘同步」丢词条）。
    const missingInDefaults = [...overlaySig.keys()].filter((k) => !defaultsSig.has(k));
    // 方向二：defaults 不得有 overlay 已无的孤儿/漂移条目（防死词条复活、schema 漂移）。
    const orphanInDefaults = [...defaultsSig.keys()].filter((k) => !overlaySig.has(k));

    assert.deepEqual(
      missingInDefaults.map((k) => overlaySig.get(k)),
      [],
      `defaults 缺失 ${missingInDefaults.length} 条 overlay 词条（引导快照会丢失这些翻译）`
    );
    assert.deepEqual(
      orphanInDefaults.map((k) => defaultsSig.get(k)),
      [],
      `defaults 存在 ${orphanInDefaults.length} 条与 overlay 不一致的孤儿/漂移条目`
    );

    // 冗余强断言：规范签名多重集完全相等。
    assert.deepEqual(toSortedSignatures(overlay), toSortedSignatures(defaults));
  });
}

// 任务 16 六条落地词条（5 词条簇）须在 overlay 与 defaults 中双向一致，schema 相同
// （searchType exact / forceRuntime false / surface 一致）。这是评审建议直接点名的关键条目。
test('任务16 六条词条在 overlay 与 defaults 中 schema 一致', () => {
  const overlay = loadJson('cursor-win.common.json');
  const defaults = loadJson('defaults/cursor-win.common.json');
  const task16 = [
    { originalText: 'Copy Branch', changeText: '复制分支', surface: 'glass_menu' },
    { originalText: 'Follow System High Contrast', changeText: '跟随系统高对比度', surface: 'settings' },
    {
      originalText: 'Switch to a high contrast theme when your OS is in a high contrast mode',
      changeText: '当操作系统处于高对比度模式时切换到高对比度主题',
      surface: 'settings',
    },
    { originalText: 'Default Model', changeText: '默认模型', surface: 'settings' },
    { originalText: 'What model new agents use by default', changeText: '新 Agent 默认使用的模型', surface: 'settings' },
    { originalText: 'Cursor Default', changeText: 'Cursor 默认', surface: 'model_picker' },
  ];

  for (const expected of task16) {
    for (const [label, arr] of [['overlay', overlay], ['defaults', defaults]]) {
      const hits = arr.filter((e) => e && e.originalText === expected.originalText);
      assert.equal(hits.length, 1, `${label} 中 ${expected.originalText} 应存在且唯一，实际 ${hits.length} 条`);
      const entry = hits[0];
      assert.equal(entry.changeText, expected.changeText, `${label} ${expected.originalText} changeText 不符`);
      assert.equal(entry.searchType, 'exact', `${label} ${expected.originalText} searchType 应为 exact`);
      assert.equal(entry.forceRuntime, false, `${label} ${expected.originalText} forceRuntime 应为 false`);
      assert.equal(entry.surface, expected.surface, `${label} ${expected.originalText} surface 不符`);
    }
  }
});
