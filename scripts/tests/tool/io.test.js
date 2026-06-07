const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const io = require('../../tool/io.js');

test('writeJson and readJson round-trip with trailing newline', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-io-'));
  const filePath = path.join(dir, 'data.json');

  try {
    io.writeJson(filePath, { locale: 'zh-cn' });
    assert.equal(fs.readFileSync(filePath, 'utf8').endsWith('\n'), true);
    assert.deepEqual(io.readJson(filePath), { locale: 'zh-cn' });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('readJsonIfExists returns fallback when missing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-io-'));

  try {
    assert.deepEqual(io.readJsonIfExists(path.join(dir, 'missing.json'), []), []);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('sha256OfFile hashes file contents', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-zh-io-'));
  const filePath = path.join(dir, 'payload.txt');

  try {
    fs.writeFileSync(filePath, 'hello');
    const expected = crypto.createHash('sha256').update('hello').digest('hex');
    assert.equal(io.sha256OfFile(filePath), expected);
    assert.equal(io.sha256OfFile(path.join(dir, 'absent.txt')), null);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
