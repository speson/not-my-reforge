// autopilot-gate.ts — Continue autopilot if tasks remain, pause/abort as needed
// Event: Stop

import { readStdin, writeError, writeOutput } from "../lib/io.js";
import {
  loadAutopilotState,
  saveAutopilotState,
  completeCurrentTask,
  shouldPauseForReview,
  shouldAbort,
  isComplete,
  startNextTask,
  resetReviewCounter,
  formatAutopilotStatus,
  formatAutopilotContext,
} from "../lib/autopilot/state.js";
import type { HookInput } from "../lib/types.js";

async function main() {
  const input = await readStdin<HookInput>();
  const cwd = input.cwd;

  if (!cwd) process.exit(0);

  const state = loadAutopilotState(cwd);
  if (!state) process.exit(0);

  // Mark current task as done (assumes the agent completed it)
  if (state.currentTaskId !== null) {
    completeCurrentTask(state);
  }

  // Check abort condition
  if (shouldAbort(state)) {
    state.phase = "aborted";
    state.active = false;
    saveAutopilotState(cwd, state);

    writeOutput({
      hookSpecificOutput: {
        hookEventName: "PostToolUse" as const,
        additionalContext: [
          "=== AUTOPILOT ABORTED ===",
          `Too many consecutive failures (${state.config.maxConsecutiveFailures}).`,
          "",
          formatAutopilotStatus(state),
          "",
          "Please review the failed tasks and retry manually.",
        ].join("\n"),
      },
    });
    return;
  }

  // Check if all done
  if (isComplete(state)) {
    state.phase = "completed";
    state.active = false;
    saveAutopilotState(cwd, state);

    writeOutput({
      hookSpecificOutput: {
        hookEventName: "PostToolUse" as const,
        additionalContext: [
          "=== AUTOPILOT COMPLETE ===",
          "All tasks have been processed.",
          "",
          formatAutopilotStatus(state),
        ].join("\n"),
      },
    });
    return;
  }

  // Check review checkpoint
  if (shouldPauseForReview(state)) {
    state.phase = "paused";
    saveAutopilotState(cwd, state);

    writeOutput({
      hookSpecificOutput: {
        hookEventName: "PostToolUse" as const,
        additionalContext: [
          "=== AUTOPILOT PAUSED FOR REVIEW ===",
          `Completed ${state.tasksCompletedSinceReview} tasks since last review.`,
          "",
          formatAutopilotStatus(state),
          "",
          "Please review the completed work.",
          'Say "continue" to resume autopilot, or "reforge cancel" to stop.',
        ].join("\n"),
      },
    });
    return;
  }

  // Start next task and continue
  const next = startNextTask(state);
  if (next) {
    saveAutopilotState(cwd, state);

    writeError(
      [
        `Autopilot: Moving to task #${next.id}: ${next.description}`,
        "",
        formatAutopilotContext(state),
      ].join("\n")
    );
    process.exit(2); // Block stop — continue working
  }
}

main();
