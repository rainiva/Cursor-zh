const fs = require('fs');
const path = require('path');

const { readJsonIfExists } = require('../../../tool/io.js');
const { createToolPaths } = require('../../../tool/paths.js');
const { mergeMappings } = require('../../../cursor-zh-lib.js');
const { createWorkbenchIndex } = require('../../../lib/patcher/workbench-index.js');
const { applyStaticSourceTranslations } = require('../../../lib/patcher/static.js');

const DEFAULT_WORKBENCH_PATH =
  process.env.CURSOR_WORKBENCH_PATH ||
  'D:/Apps/cursor/resources/app/out/vs/workbench/workbench.desktop.main.js';

let cache = null;

function resolveWorkbenchPath(workbenchPath) {
  return workbenchPath || DEFAULT_WORKBENCH_PATH;
}

function isRealWorkbenchAvailable(workbenchPath) {
  return fs.existsSync(resolveWorkbenchPath(workbenchPath));
}

function loadMergedMappings(toolPaths) {
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

function createFixtureRecord({ workbenchPath, workspaceRoot }) {
  const toolPaths = createToolPaths(workspaceRoot);
  const source = fs.readFileSync(workbenchPath, 'utf8');
  const mergedMappings = loadMergedMappings(toolPaths);

  let index = null;
  let translated = null;

  return {
    workbenchPath,
    toolPaths,
    source,
    mergedMappings,
    _indexComputed: false,
    _translatedComputed: false,
    get index() {
      if (!index) {
        index = createWorkbenchIndex(source);
        this._indexComputed = true;
      }
      return index;
    },
    get translated() {
      if (!translated) {
        translated = applyStaticSourceTranslations(source, mergedMappings, this.index);
        this._translatedComputed = true;
      }
      return translated;
    },
  };
}

function loadRealWorkbenchFixture(options = {}) {
  const workbenchPath = resolveWorkbenchPath(options.workbenchPath);
  if (!fs.existsSync(workbenchPath)) {
    return null;
  }

  const workspaceRoot = options.workspaceRoot || path.join(__dirname, '../../../..');

  if (!cache || cache.workbenchPath !== workbenchPath || cache.workspaceRoot !== workspaceRoot) {
    const fixture = createFixtureRecord({ workbenchPath, workspaceRoot });
    fixture.workbenchPath = workbenchPath;
    fixture.workspaceRoot = workspaceRoot;
    cache = fixture;
  }

  return cache;
}

function resetRealWorkbenchFixtureCacheForTests() {
  cache = null;
}

module.exports = {
  DEFAULT_WORKBENCH_PATH,
  isRealWorkbenchAvailable,
  loadMergedMappings,
  loadRealWorkbenchFixture,
  resetRealWorkbenchFixtureCacheForTests,
};
