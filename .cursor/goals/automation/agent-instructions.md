# Goal Drain Automation — Agent Instructions

Copy this file into Automations **Agent Instructions** if paste works, or type `@` and pick this file in the Automations editor.

---

Goal drain zero-input continuation for rainiva/Cursor-zh.

1. Read `.cursor/goals/session.json` and `.cursor/goals/queue.json` from the workspace.
2. If `session.status` is not `running` OR `session.continuation_pending` is not `true` OR `queue.priority` is empty OR `queue.active_goal_id` is null: output one line `goal-drain idle` and stop. Do not implement.
3. Immediately set `session.continuation_pending` to `false` and update `session.updated_at`.
4. Continue goal-runner drain from `queue.active_goal_id`. Follow `.cursor/rules/goal-runner-drain.mdc`: minimal work, only listed `completion_criteria` verify commands, milestone between goals, no re-plan, no asking user to continue.
5. On CHECKPOINT: set `continuation_pending` true, update `turn_handoff`, append `turns[]`, run `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/goal-drain-trigger.ps1` if configured.
6. On queue empty: `session.status` = `completed`, SESSION COMPLETE report.
7. Never ask the user to say continue or send another message.
