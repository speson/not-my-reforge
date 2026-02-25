// ralph-init.ts — Initialize Ralph Loop state when "reforge loop" is detected
// Event: UserPromptSubmit
// Also handles "reforge ralph-cancel" to abort an active loop

import { readStdin, writeOutput } from "../lib/io.js";
import {
  loadRalphState,
  saveRalphState,
  clearRalphState,
  advanceIteration,
  getAdaptationStrategy,
  formatRalphContext,
} from "../lib/ralph/state.js";
import { createRalphState } from "../lib/ralph/types.js";
import type { UserPromptSubmitInput } from "../lib/types.js";

function parseLoopArgs(prompt: string): { task: string; max: number; verify: string | null } | null {
  const match = prompt.match(/^reforge\s+loop\s+(.+)/i);
  if (!match) return null;

  let rest = match[1];
  let max = 20;
  let verify: string | null = null;

  // Extract --max N
  const maxMatch = rest.match(/--max\s+(\d+)/);
  if (maxMatch) {
    max = parseInt(maxMatch[1], 10);
    rest = rest.replace(maxMatch[0], "").trim();
  }

  // Extract --verify "command"
  const verifyMatch = rest.match(/--verify\s+"([^"]+)"/);
  if (verifyMatch) {
    verify = verifyMatch[1];
    rest = rest.replace(verifyMatch[0], "").trim();
  }

  return { task: rest, max, verify };
}

async function main() {
  const input = await readStdin<UserPromptSubmitInput>();
  const cwd = input.cwd;
  const prompt = input.prompt;

  if (!cwd || !prompt) process.exit(0);

  // Handle cancel
  if (/^reforge\s+(ralph-cancel|loop-cancel|cancel-loop)\b/i.test(prompt)) {
    const state = loadRalphState(cwd);
    if (state) {
      state.status = "aborted";
      state.active = false;
      saveRalphState(cwd, state);
      writeOutput({
        hookSpecificOutput: {
          hookEventName: "PostToolUse" as const,
          additionalContext: `[Ralph Loop cancelled at iteration ${state.iteration}/${state.maxIterations}]`,
        },
      });
    }
    process.exit(0);
  }

  // Handle new loop initialization
  const loopArgs = parseLoopArgs(prompt);
  if (loopArgs) {
    const existing = loadRalphState(cwd);
    if (existing && existing.active) {
      // Already in a loop — advance iteration instead of creating new
      advanceIteration(existing);
      saveRalphState(cwd, existing);

      const strategy = getAdaptationStrategy(existing);
      writeOutput({
        hookSpecificOutput: {
          hookEventName: "PostToolUse" as const,
          additionalContext: strategy,
        },
      });
      process.exit(0);
    }

    // Create new Ralph state
    const state = createRalphState(loopArgs.task, loopArgs.max, loopArgs.verify);
    advanceIteration(state);
    saveRalphState(cwd, state);

    writeOutput({
      hookSpecificOutput: {
        hookEventName: "PostToolUse" as const,
        additionalContext: [
          `[Ralph Loop started — iteration 1/${state.maxIterations}]`,
          `Task: ${state.task}`,
          state.verifyCommand ? `Verify: ${state.verifyCommand}` : "Verify: automatic (build + test + lint)",
          "",
          "Execute the task. After each attempt, run verification.",
          "If verification passes, declare DONE.",
          "If verification fails, analyze the failure and try again.",
          "",
          "To signal completion, include the text: [RALPH:DONE]",
          "To cancel the loop: reforge ralph-cancel",
        ].join("\n"),
      },
    });
    process.exit(0);
  }

  // If Ralph is active and user sends a regular prompt, inject context
  const state = loadRalphState(cwd);
  if (state && state.active) {
    // Check if user is signaling completion
    if (/\[RALPH:DONE\]/.test(prompt) || /ralph.*done/i.test(prompt)) {
      state.status = "success";
      state.active = false;
      saveRalphState(cwd, state);
      writeOutput({
        hookSpecificOutput: {
          hookEventName: "PostToolUse" as const,
          additionalContext: `[Ralph Loop completed successfully at iteration ${state.iteration}/${state.maxIterations}]`,
        },
      });
      process.exit(0);
    }

    // Inject Ralph context into regular prompts during active loop
    writeOutput({
      hookSpecificOutput: {
        hookEventName: "PostToolUse" as const,
        additionalContext: formatRalphContext(state),
      },
    });
  }
}

main();
