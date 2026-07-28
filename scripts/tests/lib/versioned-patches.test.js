const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const {
  resolvePatchPackId,
  loadEmbeddedPatchesForVersion,
  diffEmbeddedPatchOrphans,
} = require('../../lib/mapping/versioned-patches.js');

const workspaceRoot = path.resolve(__dirname, '../../..');

test('resolvePatchPackId maps 3.9.8 to cursor-3.9', () => {
  assert.equal(resolvePatchPackId('3.9.8'), 'cursor-3.9');
  assert.equal(resolvePatchPackId('3.10.1'), 'cursor-3.10');
});

test('loadEmbeddedPatchesForVersion loads generic and cursor-3.9 packs', () => {
  const patches = loadEmbeddedPatchesForVersion('3.9.8', workspaceRoot);
  assert.ok(patches.length > 0);
  const queued = patches.find((entry) => entry.from.includes('Queued'));
  assert.ok(queued, 'cursor-3.9 pack should include Queued patch');
});

test('loadEmbeddedPatchesForVersion falls back to generic for unknown minor', () => {
  const patches = loadEmbeddedPatchesForVersion('99.0.0', workspaceRoot);
  assert.ok(Array.isArray(patches));
});

// 任务 12 批次 A：短词 "Startup" 在 glass bundle 有扩展激活列同名整字面量（t.isStartup?"Startup"），
// 禁止裸 exact，改走 cursor-3.13 embedded-ui 上下文补丁（3.13.21 双 bundle 实测片段各仅 1 处）；
// 附带 Remote Control 模板字面量尾巴 `${s} (Remote Control)`（整字面量 exact 触达不到）。
test('loadEmbeddedPatchesForVersion loads cursor-3.13 pack with task12 batch A context patches', () => {
  assert.equal(resolvePatchPackId('3.13.21'), 'cursor-3.13');
  const patches = loadEmbeddedPatchesForVersion('3.13.21', workspaceRoot);
  const expected = [
    { from: '{title:"Startup",get children()', to: '{title:"启动",get children()' },
    { from: '"startup",{label:"Startup"}', to: '"startup",{label:"启动"}' },
    { from: '`${s} (Remote Control)`', to: '`${s}（远程控制）`' },
  ];
  for (const { from, to } of expected) {
    const hits = patches.filter((entry) => entry && entry.from === from);
    assert.equal(hits.length, 1, `cursor-3.13 补丁 ${from} 应存在且唯一，实际 ${hits.length} 条`);
    assert.equal(hits[0].to, to);
    assert.equal(hits[0].applyBeforeStatic, true, '上下文片段按原始 bundle 形态锚定，须在静态替换前应用');
    assert.ok(Array.isArray(hits[0].surfaces) && hits[0].surfaces.length > 0);
  }
});

test('diffEmbeddedPatchOrphans lists patches whose from substring is missing', () => {
  const orphans = diffEmbeddedPatchOrphans('always-present tail', [
    { from: 'duration-100"> Queued', to: 'x' },
    { from: 'always-present', to: 'y' },
  ]);
  assert.deepEqual(
    orphans.map((entry) => entry.from),
    ['duration-100"> Queued']
  );
});
