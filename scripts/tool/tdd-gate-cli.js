#!/usr/bin/env node
const { execSync } = require('child_process');
const { evaluateTddPairing } = require('./tdd-gate.js');

function listChangedFiles() {
  const fromEnv = process.env.TDD_GATE_CHANGED_FILES;
  if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
    return fromEnv
      .split(/[\r\n,]+/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  const baseRef = process.env.TDD_GATE_BASE;
  if (typeof baseRef === 'string' && baseRef.trim().length > 0) {
    const diffRange = `${baseRef.trim()}...HEAD`;
    const output = execSync(`git diff --name-only ${diffRange}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return output
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  const output = execSync('git diff --name-only --cached', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return output
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function main() {
  const changedFiles = listChangedFiles();
  if (changedFiles.length === 0) {
    process.exit(0);
  }

  const result = evaluateTddPairing(changedFiles);
  if (result.ok) {
    process.exit(0);
  }

  console.error(result.message);
  for (const filePath of result.productionChanges) {
    console.error(`  - ${filePath}`);
  }
  process.exit(1);
}

if (require.main === module) {
  main();
}
