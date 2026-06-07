const fs = require('fs');
const path = require('path');

function resolveDefaultsDir() {
  return path.join(__dirname, '..', '..', '..', 'translations', 'overlay', 'defaults');
}

function readDefaultMappings(fileName) {
  const filePath = path.join(resolveDefaultsDir(), fileName);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function defaultCursorWinCommonMappings() {
  return readDefaultMappings('cursor-win.common.json');
}

function defaultCursorWinDynamicMappings() {
  return readDefaultMappings('cursor-win.dynamic.json');
}

function defaultOverlayMappings() {
  return readDefaultMappings('workbench.overlay.json');
}

module.exports = {
  defaultCursorWinCommonMappings,
  defaultCursorWinDynamicMappings,
  defaultOverlayMappings,
  readDefaultMappings,
  resolveDefaultsDir,
};
