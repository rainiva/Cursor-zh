const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { createContextModule } = require('../../tool/context.js');

// 用 stub 替代真实的 detectCursorInstallDir
const { createContext } = createContextModule({
  detectCursorInstallDir: () => 'C:\\fake\\cursor',
});

test('createContext: --backup-dir <path> 解析到 options.backupDir', () => {
  const customPath = 'C:\\custom\\backup';
  const ctx = createContext(['uninstall', '--backup-dir', customPath]);
  assert.equal(ctx.options.backupDir, path.resolve(customPath));
});

test('createContext: 不指定 --backup-dir → options.backupDir 为 null', () => {
  const ctx = createContext(['uninstall']);
  assert.equal(ctx.options.backupDir, null);
});
