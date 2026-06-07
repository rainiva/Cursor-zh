#!/usr/bin/env node
if (process.stdout?.setBlocking) process.stdout.setBlocking(true);
require('./tool/index.js').main();
