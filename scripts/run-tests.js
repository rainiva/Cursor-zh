#!/usr/bin/env node
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const TEST_ROOT = path.join(__dirname, 'tests');

const RETIRED_GLASS_ROUND_TESTS = [
  'glass-round17-context-canvas.test.js',
  'glass-round18-terminal-changes.test.js',
  'glass-round19-branch-picker.test.js',
];

function normalizePath(filePath) {
  return String(filePath || '').replace(/\\/g, '/');
}

function listTestFiles(rootDir = TEST_ROOT, files = []) {
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      listTestFiles(fullPath, files);
      continue;
    }
    if (!entry.name.endsWith('.test.js')) {
      continue;
    }
    if (RETIRED_GLASS_ROUND_TESTS.includes(entry.name)) {
      continue;
    }
    files.push(fullPath);
  }

  return files.sort((left, right) => normalizePath(left).localeCompare(normalizePath(right)));
}

function main() {
  const testFiles = listTestFiles();
  if (testFiles.length === 0) {
    console.error('No test files discovered under scripts/tests');
    process.exit(1);
  }

  const result = spawnSync(process.execPath, ['--test', ...testFiles], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });

  process.exit(result.status ?? 1);
}

module.exports = {
  RETIRED_GLASS_ROUND_TESTS,
  listTestFiles,
};

if (require.main === module) {
  main();
}
