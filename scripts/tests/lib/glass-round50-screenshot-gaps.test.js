const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const {
  CRITICAL_GLASS_ROUND50_UI_TARGETS,
  CRITICAL_EMBEDDED_UI_PATCHES,
} = require('../../lib/mapping/critical-ui-targets.js');
const { CRITICAL_NLS_TARGETS } = require('../../lib/mapping/critical-nls-targets.js');
const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');
const { mergeMappings } = require('../../cursor-zh-lib');
const { readJsonIfExists } = require('../../tool/io');
const { createToolPaths } = require('../../tool/paths');
const { createNlsBuilderModule } = require('../../tool/builder/nls.js');
const { translateTextWithMappings } = require('../../cursor-zh-lib');

const toolPaths = createToolPaths(path.join(__dirname, '../../..'));

const { buildTranslatedNlsMessagesPayload } = createNlsBuilderModule({
  readJson: (filePath) => require(filePath),
  writeJson: () => {},
  translateTextWithMappings,
  assertPathExists: () => {},
  toolPaths: { generatedNlsMessagesPath: '' },
});

const fixtureContext = {
  paths: {
    nlsKeysPath: require.resolve('../tool/fixtures/nls.keys.fixture.json'),
    nlsMessagesPath: require.resolve('../tool/fixtures/nls.messages.fixture.plural-terminals.fixture.json'),
  },
};

const fixtureLanguagePack = {
  path: path.join(__dirname, '../tool/fixtures/language-pack'),
};

const ROUND50_EMBEDDED = [
  { from: 'label:"Copy Agent Deeplink"', to: 'label:"复制 Agent 深层链接"' },
  { from: 'label:v(()=>"Unstaged","label")', to: 'label:v(()=>"未暂存","label")' },
  { from: 'label:v(()=>"Staged","label")', to: 'label:v(()=>"已暂存","label")' },
  { from: 't==="branch"?"Branch Commits":', to: 't==="branch"?"分支提交":' },
  { from: 'title:"Uncommitted Changes"', to: 'title:"未提交的更改"' },
  { from: 'pillLabel:"Set up Environment"', to: 'pillLabel:"设置环境"' },
  {
    from: '?"Environment is ready to be saved.":"Environment setup was interrupted. Review before saving."',
    to: '?"环境已准备好保存。":"环境设置已中断。保存前请审查。"',
  },
];

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

test('round 50 defines copy menu, diff filter, environment, and plural terminal targets', () => {
  const originals = CRITICAL_GLASS_ROUND50_UI_TARGETS.map((entry) => entry.originalText);
  assert.ok(originals.includes('Copy Agent Deeplink'));
  assert.ok(originals.includes('Branch Commits'));
  assert.ok(originals.includes('Set up Environment'));
  assert.ok(originals.includes('Environment setup was interrupted. Review before saving.'));
});

test('round 50 embedded patches are registered', () => {
  for (const patch of ROUND50_EMBEDDED) {
    const match = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === patch.from);
    assert.ok(match, `missing embedded patch: ${patch.from}`);
    assert.equal(match.to, patch.to);
  }
});

test('static translation applies round 50 glass snippets', () => {
  const source = [
    'label:"Copy Agent Deeplink",onSelect:ee',
    'label:v(()=>"Unstaged","label"),pickStats:Kqt',
    'label:v(()=>"Staged","label"),pickStats:Kqt',
    'return t==="branch"?"Branch Commits":a3g(t,e)',
    'title:"Uncommitted Changes"}),e[5]=m',
    'pillLabel:"Set up Environment",pillClassName:xef',
    'm=o?"Environment is ready to be saved.":"Environment setup was interrupted. Review before saving."',
  ].join('\n');
  const translated = applyStaticSourceTranslations(source, loadMergedMappings());

  assert.match(translated, /label:"复制 Agent 深层链接"/);
  assert.match(translated, /label:v\(\(\)=>"未暂存"/);
  assert.match(translated, /label:v\(\(\)=>"已暂存"/);
  assert.match(translated, /"分支提交"/);
  assert.match(translated, /title:"未提交的更改"/);
  assert.match(translated, /pillLabel:"设置环境"/);
  assert.match(translated, /环境设置已中断。保存前请审查。/);
  assert.equal(translated.includes('Copy Agent Deeplink'), false);
  assert.equal(translated.includes('Branch Commits'), false);
});

test('critical NLS targets define plural background terminal shutdown strings', () => {
  const byOriginal = new Map(CRITICAL_NLS_TARGETS.map((entry) => [entry.originalText, entry]));
  assert.ok(byOriginal.has('{0} background terminals are still running'));
  assert.ok(byOriginal.has('Stopping now will kill the background terminals.'));
});
