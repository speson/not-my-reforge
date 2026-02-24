// autopilot-init.ts — Initialize and manage autopilot mode
// Event: UserPromptSubmit

import { readStdin, writeOutput } from "../lib/io.js";
import {
  loadAutopilotState,
  saveAutopilotState,
  clearAutopilotState,
  startNextTask,
  formatAutopilotContext,
  formatAutopilotStatus,
  isComplete,
} from "../lib/autopilot/state.js";
import { createAutopilotState } from "../lib/autopilot/types.js";
import type { UserPromptSubmitInput } from "../lib/types.js";

async function main() {
  const input = await readStdin<UserPromptSubmitInput>();
  const cwd = input.cwd;
  const prompt = input.user_prompt?.trim() || "";

  if (!cwd || !prompt) process.exit(0);

  const lowerPrompt = prompt.toLowerCase();

  // Handle "reforge autopilot <goal>" — initialize new autopilot session
  const autopilotMatch = prompt.match(/^reforge\s+autopilot\s+(.+)/i);
  if (autopilotMatch) {
    const goal = autopilotMatch[1].trim();

    // Check for existing session
    const existing = loadAutopilotState(cwd);
    if (existing) {
      writeOutput({
        hookSpecificOutput: {
          hookEventName: "PostToolUse" as const,
          additionalContext: [
            "Autopilot session already active.",
            formatAutopilotStatus(existing),
            "",
            'To cancel: say "reforge cancel"',
          ].join("\n"),
        },
      });
      return;
    }

    // Create autopilot state — agent will fill in tasks via planning phase
    const state = createAutopilotState(goal, []);

    // Parse optional flags
    const maxMatch = prompt.match(/--max\s+(\d+)/i);
    if (maxMatch) {
      state.config.maxTasksBeforeReview = parseInt(maxMatch[1], 10);
    }

    const verifyMatch = prompt.match(/--verify\s+"([^"]+)"/i);
    if (verifyMatch) {
      state.config.verifyCommand = verifyMatch[1];
    }

    saveAutopilotState(cwd, state);

    writeOutput({
      hookSpecificOutput: {
        hookEventName: "PostToolUse" as const,
        additionalContext: [
          "=== AUTOPILOT MODE ACTIVATED ===",
          `Goal: ${goal}`,
          "",
          "You are now in autopilot planning phase.",
          "Please:",
          "1. Analyze the goal and break it into concrete, independent tasks",
          "2. For each task, define clear acceptance criteria",
          "3. Use TodoWrite/TaskCreate to create the task list",
          "4. Then begin executing tasks sequentially",
          "",
          "After every task completion:",
          "- Run verification if configured",
          "- Move to the next task automatically",
          `- Pause for review after every ${state.config.maxTasksBeforeReview} tasks`,
          "",
          "Safety rails:",
          `- Max ${state.config.maxConsecutiveFailures} consecutive failures before stopping`,
          "- User can say 'reforge cancel' to abort at any time",
          state.config.verifyCommand ? `- Verify command: ${state.config.verifyCommand}` : "- No verification command set",
        ].join("\n"),
      },
    });
    return;
  }

  // Inject context if autopilot is active
  const state = loadAutopilotState(cwd);
  if (!state) process.exit(0);

  // Check if completed
  if (isComplete(state)) {
    state.phase = "completed";
    state.active = false;
    saveAutopilotState(cwd, state);
    writeOutput({
      hookSpecificOutput: {
        hookEventName: "PostToolUse" as const,
        additionalContext: [
          "=== AUTOPILOT COMPLETE ===",
          formatAutopilotStatus(state),
        ].join("\n"),
      },
    });
    return;
  }

  // If no current task, start next one
  if (state.currentTaskId === null && state.phase !== "paused") {
    const next = startNextTask(state);
    if (next) {
      saveAutopilotState(cwd, state);
    }
  }

  // Inject autopilot context
  writeOutput({
    hookSpecificOutput: {
      hookEventName: "PostToolUse" as const,
      additionalContext: formatAutopilotContext(state),
    },
  });
}

main();
