'use strict';

/**
 * Goal drain session state — shared between automation agent and local trigger scripts.
 */

function shouldAutomationContinueDrain(session, queue) {
  if (!session || !queue) return false;
  if (queue.drain_mode !== true) return false;
  if (session.status !== 'running') return false;
  if (!Array.isArray(queue.priority) || queue.priority.length === 0) return false;
  if (!queue.active_goal_id) return false;
  if (session.continuation_pending !== true) return false;
  return true;
}

function shouldFireWebhook(session) {
  return session?.continuation_pending === true && session?.status === 'running';
}

function buildCheckpointSessionPatch(session, reason = 'context_budget') {
  const turnCount = Number(session?.turn_count) || 0;
  return {
    ...session,
    status: 'running',
    continuation_pending: true,
    turn_count: turnCount,
    turn_handoff: {
      ...(session?.turn_handoff || {}),
      auto_continue: true,
      reason,
      instruction_for_next_turn:
        'Continue goal drain from queue.json active_goal_id; run listed verify only; no re-plan.',
    },
    updated_at: new Date().toISOString(),
  };
}

function clearContinuationPending(session) {
  return {
    ...session,
    continuation_pending: false,
    updated_at: new Date().toISOString(),
  };
}

module.exports = {
  shouldAutomationContinueDrain,
  shouldFireWebhook,
  buildCheckpointSessionPatch,
  clearContinuationPending,
};
