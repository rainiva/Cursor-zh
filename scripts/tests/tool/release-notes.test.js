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

test('buildExpectedReleaseTitle uses Chinese product name', () => {
  assert.equal(buildExpectedReleaseTitle('0.2.1'), 'Cursor 中文增强包 v0.2.1');
});

test('validateReleaseTitle rejects English-only release titles', () => {
  assert.throws(
    () => validateReleaseTitle('v0.2.1'),
    /must be Chinese/
  );
  assert.doesNotThrow(() => validateReleaseTitle('Cursor 中文增强包 v0.2.1'));
});

test('validateReleaseNotesContent rejects empty or English-only bodies', () => {
  assert.throws(() => validateReleaseNotesContent(''), /empty/i);
  assert.throws(
    () =>
      validateReleaseNotesContent(
        '## Release v0.2.1\n\n### Download\n\nDownload the zip and run install.ps1.'
      ),
    /Chinese/i
  );
});

test('validateReleaseNotesContent requires core Chinese sections', () => {
  assert.throws(
    () => validateReleaseNotesContent('## Cursor 中文增强包 v0.2.1\n\n仅有一句中文。'),
    /下载与安装/
  );
});

test('generated release notes for current package version pass Chinese policy', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  const body = generateNotes(pkg.version);
  assert.doesNotThrow(() => validateReleaseNotesContent(body));
  assert.doesNotThrow(() => validateReleaseTitle(buildExpectedReleaseTitle(pkg.version)));
});

test('generated release notes for v0.2.0 pass Chinese policy', () => {
  const body = generateNotes('0.2.0');
  assert.match(body, /### 下载与安装/);
  assert.match(body, /### 本版本变更/);
  assert.doesNotThrow(() => validateReleaseNotesContent(body));
});
