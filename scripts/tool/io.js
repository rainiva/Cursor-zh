const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeText(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function readJsonIfExists(filePath, fallbackValue) {
  if (!fs.existsSync(filePath)) {
    return fallbackValue;
  }

  return readJson(filePath);
}

function writeJson(filePath, value) {
  writeText(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function sha256OfFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function timestampLabel() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function writeStartLauncherPath(startCursorPathFile, context) {
  writeText(startCursorPathFile, `${context.paths.cursorExePath}\n`);
}

module.exports = {
  ensureDir,
  readText,
  writeText,
  readJson,
  readJsonIfExists,
  writeJson,
  sha256OfFile,
  timestampLabel,
  writeStartLauncherPath,
};
