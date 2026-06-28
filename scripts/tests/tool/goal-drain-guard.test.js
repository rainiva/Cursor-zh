const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { evaluateDrainGate } = require('../../tool/goal-drain-guard.js');

function writeGoalsDir(root, queue, session) {
  const goalsDir = path.join(root, '.cursor', 'goals');
  fs.mkdirSync(goalsDir, { recursive: true });
  fs.writeFileSync(path.join(goalsDir, 'queue.json'), JSON.stringify(queue, null, 2));
  if (session) {
    fs.writeFileSync(path.join(goalsDir, 'session.json'), JSON.stringify(session, null, 2));
  }
}

test('evaluateDrainGate blocks when drain_mode queue has active goal', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'drain-guard-'));
  writeGoalsDir(
    root,
    {
      drain_mode: true,
      active_goal_id: '2026-06-27-maintainability-g-drill',
      priority: ['2026-06-27-maintainability-g-drill', '2026-06-27-maintainability-p5'],
    },
    { mode: 'drain', status: 'running' }
  );

  const gate = evaluateDrainGate(root);
  assert.equal(gate.allowEndTurn, false);
  assert.equal(gate.active_goal_id, '2026-06-27-maintainability-g-drill');
});

test('evaluateDrainGate allows end when queue drained', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'drain-guard-'));
  writeGoalsDir(
    root,
    {
      drain_mode: true,
      active_goal_id: null,
      priority: [],
    },
    { mode: 'drain', status: 'completed' }
  );

  const gate = evaluateDrainGate(root);
  assert.equal(gate.allowEndTurn, true);
  assert.equal(gate.reason, 'queue_empty');
});

test('evaluateDrainGate allows end when not in drain mode', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'drain-guard-'));
  writeGoalsDir(root, { drain_mode: false, active_goal_id: null, priority: [] }, null);

  const gate = evaluateDrainGate(root);
  assert.equal(gate.allowEndTurn, true);
  assert.equal(gate.reason, 'not_draining');
});
