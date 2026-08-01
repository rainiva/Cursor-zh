const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  validateReleaseNotesContent,
  validateReleaseTitle,
  buildExpectedReleaseTitle,
} = require('../../lib/release-notes-validate.js');

const repoRoot = path.resolve(__dirname, '../../..');
const generateScript = path.join(repoRoot, 'scripts', 'generate-release-notes.ps1');

function generateNotes(version) {
  const outputPath = path.join(os.tmpdir(), `release-notes-${version}-${Date.now()}.md`);
  execFileSync(
    'powershell',
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      generateScript,
      '-Version',
      version,
      '-OutputPath',
      outputPath,
    ],
    { cwd: repoRoot, encoding: 'utf8' }
  );
  const body = fs.readFileSync(outputPath, 'utf8');
  fs.unlinkSync(outputPath);
  return body;
}

test('package version is bumped to 0.3.0', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  assert.equal(pkg.version, '0.3.0');
});

test('generated release notes for v0.3.0 include Chinese highlights section', () => {
  const body = generateNotes('0.3.0');
  assert.match(body, /### 下载与安装/);
  assert.match(body, /### 本版本变更/);
  assert.doesNotThrow(() => validateReleaseNotesContent(body));
  assert.doesNotThrow(() => validateReleaseTitle(buildExpectedReleaseTitle('0.3.0')));
});

test('v0.3.0 highlights cover verified baseline and key user-facing fixes', () => {
  const body = generateNotes('0.3.0');
  // 已验证到 Cursor 3.14.7（稳定锚点全部在场）
  assert.match(body, /3\.14\.7/);
  // 设置页渲染层双轨修复
  assert.match(body, /设置/);
  // 消除「校验通过但界面仍是英文」的假阳性
  assert.match(body, /假阳性/);
});
