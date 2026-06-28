const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..', '..', '..');
const menuPs1Path = path.join(repoRoot, 'scripts', 'cursor-zh-menu.ps1');
const menuCmdPath = path.join(repoRoot, 'cursor-zh-menu.cmd');

test('cursor-zh-menu.ps1 keeps UTF-8 BOM and Chinese menu labels', () => {
  const bytes = fs.readFileSync(menuPs1Path);
  assert.equal(bytes[0], 0xef);
  assert.equal(bytes[1], 0xbb);
  assert.equal(bytes[2], 0xbf);

  const text = bytes.toString('utf8');
  assert.match(text, /Cursor 中文版工具菜单/);
  assert.match(text, /扫描未翻译字符串（开发者选项）/);
});

test('cursor-zh-menu.cmd launches PowerShell menu script', () => {
  const text = fs.readFileSync(menuCmdPath, 'utf8');
  assert.match(text, /cursor-zh-menu\.ps1/i);
  assert.doesNotMatch(text, /应用汉化/);
});
