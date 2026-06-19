const test = require('node:test');
const assert = require('node:assert/strict');

const { createStageTimer, formatMs } = require('../../tool/timing.js');

test('formatMs renders milliseconds and seconds', () => {
  assert.equal(formatMs(500), '500ms');
  assert.equal(formatMs(1500), '1.50s');
});

test('createStageTimer records stage durations and prints summary', () => {
  const lines = [];
  const timer = createStageTimer({ label: 'Test 耗时' });

  timer.start('阶段 A');
  timer.end();
  timer.start('阶段 B');
  timer.end();

  const summary = timer.printSummary((line) => lines.push(line));
  assert.equal(summary.label, 'Test 耗时');
  assert.equal(summary.stages.length, 2);
  assert.equal(summary.stages[0].name, '阶段 A');
  assert.equal(summary.stages[1].name, '阶段 B');
  assert.match(lines.join('\n'), /\[Test 耗时\] 总计/);
  assert.match(lines.join('\n'), /阶段 A:/);
  assert.match(lines.join('\n'), /阶段 B:/);
});

test('createStageTimer can be disabled', () => {
  const timer = createStageTimer({ enabled: false });
  timer.start('ignored');
  timer.end();
  const summary = timer.printSummary();
  assert.equal(summary.totalMs, 0);
  assert.deepEqual(summary.stages, []);
});
