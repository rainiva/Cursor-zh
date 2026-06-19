#!/usr/bin/env node
if (process.stdout?.setBlocking) process.stdout.setBlocking(true);
Promise.resolve(require('./tool/index.js').main()).catch((error) => {
  console.error(`Cursor ZH tool failed: ${error.message}`);
  process.exitCode = 1;
});
