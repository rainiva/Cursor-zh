const test = require('node:test');
const assert = require('node:assert/strict');

const {
  shouldAutomationContinueDrain,
  shouldFireWebhook,
  buildCheckpointSessionPatch,
} = require('../../lib/goal-drain/session-state.js');

test('shouldAutomationContinueDrain when session running and queue has work', () => {
  const session = { status: 'running', continuation_pending: true };
  const queue = { priority: ['g1'], active_goal_id: 'g1', drain_mode: true };
  assert.equal(shouldAutomationContinueDrain(session, queue), true);
});

test('shouldAutomationContinueDrain idle when session completed', () => {
  const session = { status: 'completed' };
  const queue = { priority: [], active_goal_id: null, drain_mode: true };
  assert.equal(shouldAutomationContinueDrain(session, queue), false);
});

test('shouldAutomationContinueDrain idle when continuation not pending', () => {
  const session = { status: 'running', continuation_pending: false };
  const queue = { priority: ['g1'], active_goal_id: 'g1', drain_mode: true };
  assert.equal(shouldAutomationContinueDrain(session, queue), false);
});

test('shouldFireWebhook when checkpoint marks continuation pending', () => {
  const session = buildCheckpointSessionPatch({
    status: 'running',
    turn_count: 1,
    turn_handoff: { auto_continue: true, reason: null },
  });
  assert.equal(session.continuation_pending, true);
  assert.equal(session.turn_handoff.reason, 'context_budget');
  assert.equal(shouldFireWebhook(session), true);
});
