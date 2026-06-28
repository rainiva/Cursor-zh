'use strict';

const fs = require('node:fs');
const path = require('node:path');

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function evaluateDrainGate(workspaceRoot = process.cwd()) {
  const goalsDir = path.join(workspaceRoot, '.cursor', 'goals');
  const queue = readJsonIfExists(path.join(goalsDir, 'queue.json'));
  const session = readJsonIfExists(path.join(goalsDir, 'session.json'));

  if (!queue || queue.drain_mode !== true) {
    return { allowEndTurn: true, reason: 'not_draining' };
  }

  if (session?.status === 'blocked' || session?.status === 'paused') {
    return { allowEndTurn: true, reason: session.status };
  }

  const priority = Array.isArray(queue.priority) ? queue.priority : [];
  const activeGoalId = queue.active_goal_id || null;

  if (priority.length === 0 && !activeGoalId) {
    return { allowEndTurn: true, reason: 'queue_empty' };
  }

  if (activeGoalId) {
    return {
      allowEndTurn: false,
      reason: 'drain_in_progress',
      active_goal_id: activeGoalId,
      remaining: priority,
      plan_ref: queue.plan_ref || null,
      message: `DRAIN NOT DONE: continue goal ${activeGoalId} — do not end turn`,
    };
  }

  if (priority.length > 0) {
    return {
      allowEndTurn: false,
      reason: 'priority_pending',
      active_goal_id: priority[0],
      remaining: priority,
      message: `DRAIN NOT DONE: set active_goal_id and continue — next ${priority[0]}`,
    };
  }

  return { allowEndTurn: true, reason: 'idle' };
}

function main(argv) {
  const rootArg = argv.find((a) => a.startsWith('--root='));
  const root = rootArg ? rootArg.slice('--root='.length) : process.cwd();
  const gate = evaluateDrainGate(root);

  if (gate.allowEndTurn) {
    console.log(`goal-drain-guard: OK (${gate.reason})`);
    return 0;
  }

  console.error(gate.message);
  console.error(`active_goal_id: ${gate.active_goal_id}`);
  if (gate.plan_ref) {
    console.error(`plan_ref: ${gate.plan_ref}`);
  }
  console.error(`remaining: ${(gate.remaining || []).join(' -> ')}`);
  return 1;
}

if (require.main === module) {
  process.exit(main(process.argv.slice(2)));
}

module.exports = {
  evaluateDrainGate,
  readJsonIfExists,
};
