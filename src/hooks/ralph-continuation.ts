// ralph-continuation.ts — Block stop if Ralph Loop is active and incomplete
// Event: Stop
// Exit 2 to block stop + inject continuation prompt

import { readStdin, writeError, writeOutput } from "../lib/io.js";
import {
  loadRalphState,
  saveRalphState,
  advanceIteration,
  recordFailure,
  recordApproach,
  isExhausted,
  getAdaptationStrategy,
} from "../lib/ralph/state.js";
import { runVerification } from "../lib/verification/checker.js";
import type { StopInput } from "../lib/types.js";

async function main() {
  const input = await readStdin<StopInput>();
  const cwd = input.cwd;

  if (!cwd) process.exit(0);

  const state = loadRalphState(cwd);
  if (!state || !state.active) process.exit(0);

  // Check if the task is actually complete
  const transcript = input.transcript || [];

  // 1. Check for explicit completion signal in recent messages
  for (let i = transcript.length - 1; i >= Math.max(0, transcript.length - 5); i--) {
    const msg = transcript[i];
    const text = typeof msg.content === "string"
      ? msg.content
      : Array.isArray(msg.content)
        ? msg.content.filter(c => c.type === "text").map(c => c.text).join("\n")
        : "";

    if (/\[RALPH:DONE\]/i.test(text)) {
      state.status = "success";
      state.active = false;
      saveRalphState(cwd, state);
      process.exit(0); // Allow stop
    }
  }

  // 2. Run verification if verify command exists
  if (state.verifyCommand) {
    // Check if the verification command was recently run successfully
    const report = runVerification(cwd, transcript);
    if (report.allPassed) {
      state.status = "success";
      state.active = false;
      saveRalphState(cwd, state);
      process.exit(0); // Allow stop
    }
  }

  // 3. Check if exhausted
  if (isExhausted(state)) {
    state.status = "failed";
    state.active = false;
    saveRalphState(cwd, state);

    writeError(
      [
        `[Ralph Loop exhausted after ${state.iteration} iterations]`,
        `Task: ${state.task}`,
        `Last failure: ${state.lastFailureReason || "unknown"}`,
        state.approaches.length > 0
          ? `Approaches tried: ${state.approaches.join(", ")}`
          : "",
        "",
        "The loop has been terminated. Consider:",
        "1. Breaking the task into smaller pieces",
        "2. Asking for human guidance on the specific blocker",
        "3. Starting fresh with a different approach: reforge loop <refined task>",
      ].filter(Boolean).join("\n")
    );
    process.exit(0); // Allow stop — loop is done
  }

  // 4. Loop is still active and incomplete — block stop and continue
  advanceIteration(state);

  // Detect what went wrong from the last assistant message
  let failureReason = "verification not passed";
  for (let i = transcript.length - 1; i >= Math.max(0, transcript.length - 3); i--) {
    const msg = transcript[i];
    if (msg.role !== "assistant") continue;

    const text = typeof msg.content === "string"
      ? msg.content
      : Array.isArray(msg.content)
        ? msg.content.filter(c => c.type === "text").map(c => c.text).join("\n")
        : "";

    // Extract error patterns
    const errorMatch = text.match(/error[:\s]+(.{10,80})/i);
    if (errorMatch) {
      failureReason = errorMatch[1].trim();
      break;
    }

    const failMatch = text.match(/fail(?:ed|ure)?[:\s]+(.{10,80})/i);
    if (failMatch) {
      failureReason = failMatch[1].trim();
      break;
    }
  }

  recordFailure(state, failureReason);

  // Record the approach (extract from recent assistant text)
  for (let i = transcript.length - 1; i >= Math.max(0, transcript.length - 3); i--) {
    const msg = transcript[i];
    if (msg.role !== "assistant") continue;

    const text = typeof msg.content === "string"
      ? msg.content
      : Array.isArray(msg.content)
        ? msg.content.filter(c => c.type === "text").map(c => c.text).join("\n")
        : "";

    if (text.length > 20) {
      // Take first meaningful line as approach description
      const firstLine = text.split("\n").find(l => l.trim().length > 10);
      if (firstLine) {
        recordApproach(state, firstLine.trim().slice(0, 100));
      }
      break;
    }
  }

  saveRalphState(cwd, state);

  const strategy = getAdaptationStrategy(state);

  writeError(
    [
      `[Ralph Loop — iteration ${state.iteration}/${state.maxIterations} continuing]`,
      "",
      strategy,
      "",
      `Task: ${state.task}`,
      state.verifyCommand ? `Verify: Run \`${state.verifyCommand}\` to check completion.` : "",
      "",
      "Continue working on the task. Signal [RALPH:DONE] when complete.",
      "To abort: reforge ralph-cancel",
    ].filter(Boolean).join("\n")
  );
  process.exit(2); // Block stop — force continuation
}

main();
