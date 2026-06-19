async function runParallelTasks(taskMap = {}) {
  const entries = await Promise.all(
    Object.entries(taskMap).map(async ([key, task]) => {
      const value = await Promise.resolve().then(() => task());
      return [key, value];
    })
  );
  return Object.fromEntries(entries);
}

function runParallelTasksSync(taskMap = {}) {
  const results = {};
  for (const [key, task] of Object.entries(taskMap)) {
    results[key] = task();
  }
  return results;
}

module.exports = {
  runParallelTasks,
  runParallelTasksSync,
};
