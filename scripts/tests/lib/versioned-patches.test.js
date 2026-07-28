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

// 任务12 批次B：模板字面量描述（含 ${} 表达式）exact 触达不到，走上下文补丁。
// 各 from 片段已按 3.13.21 双 bundle Buffer 实测：desktop/glass 各恰好 1 处，无误伤面。
// submits chat 片段两端保留 ${}（desktop 用 rr、glass 用 Sr 变量名，片段本身不含变量名，一条补丁通吃双 bundle）。
test('loadEmbeddedPatchesForVersion loads cursor-3.13 pack with task12 batch B template-literal patches', () => {
  const patches = loadEmbeddedPatchesForVersion('3.13.21', workspaceRoot);
  const expected = [
    {
      from: '} submits chat, Enter inserts a newline, and primary actions move to ${',
      to: '} 发送对话，Enter 插入换行，主要操作移至 ${',
    },
    {
      from: 'Prevent Agent from automatically running MCP tools${m().isAdminControlled?" (controlled by admin)":""}',
      to: '防止 Agent 自动运行 MCP 工具${m().isAdminControlled?"（由管理员控制）":""}',
    },
    {
      from: "Mark Agent commits as 'Made with Cursor'${e()?\" (controlled by admin)\":\"\"}",
      to: "将 Agent 提交标记为 'Made with Cursor'${e()?\"（由管理员控制）\":\"\"}",
    },
    {
      from: 'Mark pull requests as made with Cursor${e()?" (controlled by admin)":""}',
      to: '将拉取请求标记为由 Cursor 创建${e()?"（由管理员控制）":""}',
    },
    {
      from: 'Apply .cursorignore files to all subdirectories${n()?" (controlled by admin)":""}. Changing this setting requires restarting Cursor.',
      to: '将 .cursorignore 文件应用到所有子目录${n()?"（由管理员控制）":""}。更改此设置需要重启 Cursor。',
    },
    {
      from: 'Use with caution. Skip symlinks during .cursorignore file discovery. Enable only when all .cursorignore files are reachable without symlinks${i()?" (controlled by admin)":""}. Changing this setting requires restarting Cursor.',
      to: '请谨慎使用。在 .cursorignore 文件发现过程中跳过符号链接。仅当所有 .cursorignore 文件不依赖符号链接也能访问时才启用${i()?"（由管理员控制）":""}。更改此设置需要重启 Cursor。',
    },
  ];
  for (const { from, to } of expected) {
    const hits = patches.filter((entry) => entry && entry.from === from);
    assert.equal(hits.length, 1, `cursor-3.13 批次B补丁 ${from.slice(0, 60)}… 应存在且唯一，实际 ${hits.length} 条`);
    assert.equal(hits[0].to, to);
    assert.equal(hits[0].applyBeforeStatic, true, '模板字面量按原始 bundle 形态锚定，须在静态替换前应用');
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
