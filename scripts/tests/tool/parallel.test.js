const test = require('node:test');
const assert = require('node:assert/strict');

const { runParallelTasks, runParallelTasksSync } = require('../../tool/parallel.js');

test('runParallelTasks executes every task and returns keyed results', async () => {
  const started = [];
  const results = await runParallelTasks({
    alpha: () => {
      started.push('alpha');
      return 1;
    },
    beta: () => {
      started.push('beta');
      return 2;
    },
  });

  assert.deepEqual(results, { alpha: 1, beta: 2 });
  assert.equal(started.length, 2);
});

test('runParallelTasksSync executes every task sequentially', () => {
  const results = runParallelTasksSync({
    one: () => 'a',
    two: () => 'b',
  });
  assert.deepEqual(results, { one: 'a', two: 'b' });
});
