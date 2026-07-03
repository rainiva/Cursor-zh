#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  buildExpectedReleaseTitle,
  validateReleaseNotesContent,
  validateReleaseTitle,
} = require('../lib/release-notes-validate.js');

function readArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return null;
  }
  return process.argv[index + 1] ?? null;
}

function main() {
  const filePath = readArg('--file') || process.argv[2];
  const title = readArg('--title');
  const version = readArg('--version');

  if (!filePath) {
    console.error('Usage: node scripts/tool/validate-release-notes-cli.js --file <path> [--title <title>] [--version <version>]');
    process.exit(2);
  }

  const resolved = path.resolve(filePath);
  const body = fs.readFileSync(resolved, 'utf8');

  validateReleaseNotesContent(body);

  if (title) {
    validateReleaseTitle(title);
  } else if (version) {
    validateReleaseTitle(buildExpectedReleaseTitle(version));
  }

  console.log('Release notes passed Chinese policy validation.');
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
