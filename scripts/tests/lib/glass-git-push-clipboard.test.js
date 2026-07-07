const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { CRITICAL_EMBEDDED_UI_PATCHES } = require('../../lib/mapping/critical-ui-targets.js');
const { applyStaticSourceTranslations } = require('../../lib/patcher/static.js');
const { mergeMappings } = require('../../cursor-zh-lib');
const { readJsonIfExists } = require('../../tool/io');
const { createToolPaths } = require('../../tool/paths');

const GIT_PUSH_PATCHES = {
  pushLabel: {
    from: 'push:{label:"Push",loadingLabel:"Pushing..."}',
    to: 'push:{label:"推送",loadingLabel:"推送中..."}',
  },
  reviewPanePush: {
    from: 'get disabled(){return t()},children:"Push"})',
    to: 'get disabled(){return t()},children:"推送"})',
  },
  copyBranchToast: {
    from: 'message:"Copied branch name to clipboard"',
    to: 'message:"已复制分支名到剪贴板。"',
  },
};

const SNIPPET = [
  'w7u={createBranchAndCommit:{label:"Create Branch & Commit",loadingLabel:"Committing..."},commit:{label:"Commit",loadingLabel:"Committing..."},commitAndPush:{label:"Commit & Push",loadingLabel:"Committing..."},push:{label:"Push",loadingLabel:"Pushing..."}}',
  'get disabled(){return t()},children:"Push"})',
  'U.notify({severity:yi.Info,message:"Copied branch name to clipboard",id:fg.copyBranchName})',
].join('\n');

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

test('git push embedded patches are registered', () => {
  for (const patch of Object.values(GIT_PUSH_PATCHES)) {
    const match = CRITICAL_EMBEDDED_UI_PATCHES.find((entry) => entry.from === patch.from);
    assert.ok(match, `missing patch: ${patch.from}`);
    assert.equal(match.to, patch.to);
  }
});

test('static translation localizes git push menu label and copy-branch toast', () => {
  const translated = applyStaticSourceTranslations(SNIPPET, loadMergedMappings());
  assert.match(translated, /push:\{label:"推送",loadingLabel:"推送中\.\.\."\}/);
  assert.match(translated, /children:"推送"\}\)/);
  assert.match(translated, /message:"已复制分支名到剪贴板。"/);
  assert.equal(translated.includes('children:"Push"'), false);
  assert.equal(translated.includes('Copied branch name to clipboard'), false);
});

test('cursor-win.common.json defines copy-branch toast mapping', () => {
  const mappings = readJsonIfExists(toolPaths.cursorWinCommonPath, []);
  const entry = mappings.find((item) => item.originalText === 'Copied branch name to clipboard');
  assert.ok(entry);
  assert.equal(entry.changeText, '已复制分支名到剪贴板。');
});
