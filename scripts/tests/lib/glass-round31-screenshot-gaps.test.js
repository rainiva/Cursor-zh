const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const {
  CRITICAL_GLASS_ROUND27_UI_TARGETS,
  CRITICAL_GLASS_ROUND31_UI_TARGETS,
  CRITICAL_EMBEDDED_UI_PATCHES,
} = require('../../lib/mapping/critical-ui-targets.js');
const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');
const { mergeMappings, translateTextWithMappings } = require('../../cursor-zh-lib');
const { readJsonIfExists } = require('../../tool/io');
const { createToolPaths } = require('../../tool/paths');
const { createRuntimeDomHarness } = require('./helpers/runtime-dom-harness.js');

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

const ROUND31_EMBEDDED = [
  {
    from: 'return n.count>1?{action:"Finished",details:`${n.count} background tasks`}:{action:n.action,details:n.title}',
    to: 'return n.count>1?{action:"已完成",details:`${n.count} 个后台任务`}:{action:n.action,details:n.title}',
  },
  { from: 'title:"Open SSH Configuration File"', to: 'title:"打开 SSH 配置文件"' },
  { from: 'title:"Delete Cloud-Agent Cache"', to: 'title:"删除 Cloud Agent 缓存"' },
  {
    from: 'title:"Developer: Delete Old Chats\\u2026"',
    to: 'title:"开发者：删除旧对话\\u2026"',
  },
  { from: 'title:"GC Agent KV Blobs"', to: 'title:"回收 Agent KV 存储"' },
  {
    from: 'value:"Delete Old Chats...",original:"Delete Old Chats..."',
    to: 'value:"删除旧对话...",original:"删除旧对话..."',
  },
];

test('round 31 defines developer menu and background task completion targets', () => {
  const originals = [
    ...CRITICAL_GLASS_ROUND27_UI_TARGETS,
    ...CRITICAL_GLASS_ROUND31_UI_TARGETS,
  ].map((entry) => entry.originalText);
  assert.ok(originals.includes('Open SSH Configuration File'));
  assert.ok(originals.includes('Delete Cloud-Agent Cache'));
  assert.ok(originals.includes('Delete Old Chats...'));
  assert.ok(originals.includes('GC Agent KV Blobs'));
});

test('round 31 embedded patches are registered', () => {
  for (const patch of ROUND31_EMBEDDED) {
    const match = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === patch.from);
    assert.ok(match, `missing embedded patch: ${patch.from}`);
    assert.equal(match.to, patch.to);
  }
});

test('merged mappings translate finished background task status without English fragments', () => {
  const mappings = loadMergedMappings();
  assert.equal(
    translateTextWithMappings('Finished 2 background tasks', mappings, { scopeMatched: true }),
    '已完成 2 个后台任务'
  );
});

test('dynamic regex mappings preserve variable task counts and wait durations', () => {
  const mappings = loadMergedMappings();

  for (const count of ['1', '2', '5', '12']) {
    assert.equal(
      translateTextWithMappings(`Finished ${count} background tasks`, mappings, {
        scopeMatched: true,
      }),
      `已完成 ${count} 个后台任务`,
      `Finished ${count} background tasks should keep the runtime count`
    );
  }

  for (const [duration, expected] of [
    ['6s', '正在等待 shell（6s）'],
    ['1m 25s', '正在等待 shell（1m 25s）'],
    ['2h 3m', '正在等待 shell（2h 3m）'],
  ]) {
    assert.equal(
      translateTextWithMappings(`Waiting ${duration} for shell`, mappings, {
        scopeMatched: true,
      }),
      expected,
      `Waiting ${duration} for shell should preserve the runtime duration`
    );
  }

  for (const active of ['1', '3', '9']) {
    assert.equal(
      translateTextWithMappings(`Monitored background task, ${active} active`, mappings, {
        scopeMatched: true,
      }),
      `已监控后台任务，${active} 个进行中`,
      `Monitored background task, ${active} active should keep the active count`
    );
  }
});

test('merged mappings translate developer command palette labels fully', () => {
  const mappings = loadMergedMappings();
  assert.equal(
    translateTextWithMappings('Open SSH Configuration File', mappings, { scopeMatched: true }),
    '打开 SSH 配置文件'
  );
  assert.equal(
    translateTextWithMappings('Delete Cloud-Agent Cache', mappings, { scopeMatched: true }),
    '删除 Cloud Agent 缓存'
  );
  assert.equal(
    translateTextWithMappings('Developer: Delete Old Chats…', mappings, { scopeMatched: true }),
    '开发者：删除旧对话…'
  );
  assert.equal(
    translateTextWithMappings('Delete Old Chats...', mappings, { scopeMatched: true }),
    '删除旧对话...'
  );
  assert.equal(
    translateTextWithMappings('GC Agent KV Blobs', mappings, { scopeMatched: true }),
    '回收 Agent KV 存储'
  );
  assert.doesNotMatch(
    translateTextWithMappings('Delete Cloud-Agent Cache', mappings, { scopeMatched: true }),
    /Delete|云端-Agent/
  );
});

test('runtime DOM renders finished background task label in the same turn after mount', () => {
  const mappings = loadMergedMappings();
  const harness = createRuntimeDomHarness({
    workbenchSource: 'Finished 2 background tasks',
    runtimeMappings: mappings.filter((entry) => entry.forceRuntime !== false),
  });
  harness.runDueTimers(Infinity);

  const { menu } = harness.mountMenuItem('Finished 2 background tasks');
  harness.flushMicrotasks();

  assert.equal(harness.getMenuItemText(menu), '已完成 2 个后台任务');
  assert.doesNotMatch(harness.getMenuItemText(menu), /Finished|background tasks/);
});

test('static translation applies round 31 developer command snippets', () => {
  const source = [
    'Ns({id:"remoteSshOpenConfigFile",title:"Open SSH Configuration File",icon:"gear",glassCategory:"Workspace"',
    'Ns({id:"deleteCloudAgentCache",title:"Delete Cloud-Agent Cache",icon:"trash",glassCategory:"Developer"',
    'Ns({id:"deleteOldChats",title:"Developer: Delete Old Chats\\u2026",icon:"trash",glassCategory:"Developer"',
    'Ns({id:Cc_.ID,title:{value:"GC Agent KV Blobs",original:"GC Agent KV Blobs"},category:ui.Developer,f1:!0})',
    'return n.count>1?{action:"Finished",details:`${n.count} background tasks`}:{action:n.action,details:n.title}',
  ].join('\n');

  const translated = applyStaticSourceTranslations(source, loadMergedMappings());

  assert.match(translated, /title:"打开 SSH 配置文件"/);
  assert.match(translated, /title:"删除 Cloud Agent 缓存"/);
  assert.match(translated, /title:"开发者：删除旧对话\\u2026"/);
  assert.match(translated, /value:"回收 Agent KV 存储",original:"回收 Agent KV 存储"/);
  assert.match(translated, /action:"已完成",details:`\$\{n\.count\} 个后台任务`/);
  assert.equal(translated.includes('Open SSH Configuration File'), false);
  assert.equal(translated.includes('Delete Cloud-Agent Cache'), false);
});
