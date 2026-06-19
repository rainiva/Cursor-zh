const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const {
  CRITICAL_GLASS_ROUND23_UI_TARGETS,
  CRITICAL_EMBEDDED_UI_PATCHES,
} = require('../../lib/mapping/critical-ui-targets.js');
const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');
const { mergeMappings } = require('../../cursor-zh-lib');
const { readJsonIfExists } = require('../../tool/io');
const { createToolPaths } = require('../../tool/paths');

const toolPaths = createToolPaths(path.join(__dirname, '../../..'));
const mergedMappings = mergeMappings(
  mergeMappings(
    readJsonIfExists(toolPaths.baseMappingPath, []),
    readJsonIfExists(toolPaths.overlayMappingPath, [])
  ),
  readJsonIfExists(toolPaths.cursorWinCommonPath, [])
);

const ROUND23_EMBEDDED = [
  { from: 'label:"Allowlist options"', to: 'label:"允许列表选项"' },
  {
    from: 'description:"You can configure Shell, MCP and Fetch allowlists for Auto mode. However, Auto works well without these."',
    to: 'description:"你可以为 Auto 模式配置 Shell、MCP 和 Fetch 允许列表；不过即使没有这些，Auto 也能良好运行。"',
  },
];

test('round 23 defines run mode description and allowlist settings targets', () => {
  const originals = CRITICAL_GLASS_ROUND23_UI_TARGETS.map((entry) => entry.originalText);
  assert.ok(originals.includes('Allowlist options'));
  assert.ok(originals.includes('Commands that are allowlisted will run automatically.'));
  assert.ok(
    originals.includes(
      "A classifier will run for each action and decide whether it's safe to execute this command. Allowlists are still respected."
    )
  );
  assert.ok(originals.includes('All commands will run without approval, classification or sandboxing.'));
});

test('round 23 embedded patches are registered', () => {
  for (const patch of ROUND23_EMBEDDED) {
    const match = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === patch.from);
    assert.ok(match, `missing embedded patch: ${patch.from}`);
    assert.equal(match.to, patch.to);
  }
});

test('static translation applies round 23 run mode settings snippets', () => {
  const source = [
    'z(m4C,{label:"Allowlist options",description:"You can configure Shell, MCP and Fetch allowlists for Auto mode. However, Auto works well without these.",get expanded',
    'case Gp.YOLO:return"Commands that are allowlisted will run automatically.";case Gp.YOLO_WITH_SANDBOX:return"Many commands will run automatically inside the sandbox, and you can also allowlist other actions.";case Gp.SMART_AUTO:return"A classifier will run for each action and decide whether it\'s safe to execute this command. Allowlists are still respected.";case Gp.FULL_YOLO:return"All commands will run without approval, classification or sandboxing.";',
  ].join(';');

  const translated = applyStaticSourceTranslations(source, mergedMappings);

  assert.match(translated, /label:"允许列表选项"/);
  assert.match(translated, /你可以为 Auto 模式配置 Shell、MCP 和 Fetch 允许列表/);
  assert.match(translated, /已加入允许列表的命令将自动运行/);
  assert.match(translated, /分类器会为每个操作判断是否可安全执行该命令/);
  assert.match(translated, /仍将遵守允许列表/);
  assert.match(translated, /所有命令都将在未经批准、分类或沙箱限制的情况下运行/);
  assert.equal(translated.includes('Allowlist options'), false);
  assert.equal(translated.includes('allowlisted will run automatically'), false);
  assert.equal(translated.includes('classifier will run for each action'), false);
  assert.equal(translated.includes('without approval, classification or sandboxing'), false);
});
