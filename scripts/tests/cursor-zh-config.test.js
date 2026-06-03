const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildShortcutCommand,
  resolveWorkspaceRoot,
} = require('../cursor-zh-config.js');

test('resolveWorkspaceRoot prefers explicit environment override', () => {
  const result = resolveWorkspaceRoot({
    scriptDir: 'D:\\cursor\\scripts',
    env: {
      CURSOR_ZH_WORKSPACE_ROOT: 'D:\\custom-workspace',
    },
  });

  assert.equal(result, 'D:\\custom-workspace');
});

test('resolveWorkspaceRoot falls back to script parent directory', () => {
  const result = resolveWorkspaceRoot({
    scriptDir: 'D:\\cursor\\scripts',
    env: {},
  });

  assert.equal(result, 'D:\\cursor');
});

test('buildShortcutCommand uses the provided icon path instead of a default install path', () => {
  const command = buildShortcutCommand({
    desktopPath: 'C:\\Users\\tester\\Desktop\\Cursor 中文版.lnk',
    launcherPath: 'D:\\cursor\\scripts\\start-cursor-zh.vbs',
    workspaceRoot: 'D:\\cursor',
    iconPath: 'D:\\custom-install\\Cursor.exe',
  });

  assert.match(command, /D:\\custom-install\\Cursor\.exe,0/);
  assert.match(command, /wscript\.exe/);
  assert.match(command, /start-cursor-zh\.vbs/);
  assert.match(command, /Cursor 中文版\.lnk/);
});
