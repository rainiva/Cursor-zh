const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const HARVEST_SNIPPET = require('../lib/fixtures/harvest-workbench-snippet.js');
const { suggestAnchorMappings } = require('../../lib/analyzer/migrate-anchors.js');

test('suggestAnchorMappings pairs harvest anchors with common exact translations', () => {
  const harvest = {
    anchors: [
      {
        type: 'glassCommand',
        id: 'workbench.action.toggleExpandAgent',
        field: 'title',
        text: 'Toggle Expand Agent',
        path: 'workbench.glass.main.js',
      },
    ],
  };
  const commonMappings = [
    { originalText: 'Toggle Expand Agent', changeText: '切换展开智能体', searchType: 'exact' },
  ];

  const suggestions = suggestAnchorMappings({ harvest, commonMappings });
  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0].anchorId, 'workbench.action.toggleExpandAgent');
  assert.equal(suggestions[0].changeText, '切换展开智能体');
  assert.equal(suggestions[0].searchType, 'anchor');
});

test('migrate-anchors --suggest prints JSON from fixture workbench snippet', () => {
  const childProcess = require('child_process');
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-migrate-'));
  const installDir = path.join(tempRoot, 'cursor-install');
  const resourcesAppDir = path.join(installDir, 'resources', 'app');
  const workbenchDir = path.join(resourcesAppDir, 'out', 'vs', 'workbench');
  fs.mkdirSync(workbenchDir, { recursive: true });
  fs.writeFileSync(path.join(resourcesAppDir, 'package.json'), '{"version":"3.9.8"}\n');
  fs.writeFileSync(path.join(resourcesAppDir, 'product.json'), '{"vscodeVersion":"1.105.1"}\n');
  fs.writeFileSync(path.join(workbenchDir, 'workbench.glass.main.js'), HARVEST_SNIPPET);

  const toolPath = path.join(__dirname, '..', '..', 'cursor-zh-tool.js');
  const workspaceRoot = path.join(__dirname, '..', '..', '..');
  const result = childProcess.spawnSync(
    process.execPath,
    [toolPath, 'migrate-anchors', '--suggest', '--install-dir', installDir],
  {
      cwd: workspaceRoot,
      encoding: 'utf8',
      env: { ...process.env, CURSOR_ZH_WORKSPACE_ROOT: workspaceRoot },
    }
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout.trim());
  assert.ok(Array.isArray(payload));
  assert.ok(payload.some((entry) => entry.anchorId && entry.changeText));
});
