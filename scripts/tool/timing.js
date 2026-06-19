function createStageTimer({ label = '耗时', enabled = true } = {}) {
  const stages = [];
  let activeStage = null;
  let startedAt = enabled ? Date.now() : 0;

  function start(name) {
    if (!enabled) {
      return;
    }
    if (activeStage) {
      end();
    }
    activeStage = { name, startedAt: Date.now() };
  }

  function end() {
    if (!enabled || !activeStage) {
      return 0;
    }
    const durationMs = Date.now() - activeStage.startedAt;
    stages.push({
      name: activeStage.name,
      durationMs,
    });
    activeStage = null;
    return durationMs;
  }

  function printSummary(log = console.log) {
    if (!enabled) {
      return { label, totalMs: 0, stages: [] };
    }
    if (activeStage) {
      end();
    }
    const totalMs = Date.now() - startedAt;
    log(`\n[${label}] 总计 ${formatMs(totalMs)}`);
    for (const stage of stages) {
      const pct = totalMs > 0 ? ((stage.durationMs / totalMs) * 100).toFixed(1) : '0.0';
      log(`  - ${stage.name}: ${formatMs(stage.durationMs)} (${pct}%)`);
    }
    return { label, totalMs, stages };
  }

  return {
    start,
    end,
    printSummary,
    getStages: () => stages.slice(),
  };
}

function formatMs(durationMs) {
  if (durationMs >= 1000) {
    return `${(durationMs / 1000).toFixed(2)}s`;
  }
  return `${durationMs}ms`;
}

module.exports = {
  createStageTimer,
  formatMs,
};
