// failure-tracker.ts — Track consecutive failures and suggest escalation
// Event: PostToolUse (on failure)

import { readStdin, writeOutput } from "../lib/io.js";
import { recordFailure, recordSuccess } from "../lib/circuit-breaker/tracker.js";
import type { PostToolUseInput } from "../lib/types.js";

async function main() {
  const input = await readStdin<PostToolUseInput>();
  const cwd = input.cwd;
  const toolName = input.tool_name;

  if (!cwd || !toolName) process.exit(0);

  const isError = input.tool_response?.is_error;

  if (!isError) {
    recordSuccess(cwd, toolName);
    process.exit(0);
  }

  const errorMsg =
    input.tool_response?.content ||
    input.tool_response?.error ||
    "Unknown error";

  const { escalation } = recordFailure(cwd, toolName, errorMsg);

  if (escalation) {
    writeOutput({
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: `[Circuit Breaker] ${escalation}`,
      },
    });
  }
}

main();
