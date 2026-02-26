// trust-tracker.ts — Track progressive trust level based on successful operations
// Event: PostToolUse

import { readStdin } from "../lib/io.js";
import { recordSuccess, recordFailure, recordBuildPass, recordTestPass } from "../lib/trust/tracker.js";
import type { PostToolUseInput } from "../lib/types.js";

// Patterns to detect successful build commands in Bash tool output
const BUILD_SUCCESS_PATTERNS = [
  /npm\s+run\s+build/,
  /yarn\s+build/,
  /pnpm\s+build/,
  /npx\s+tsc\b/,
];

// Patterns to detect successful test commands in Bash tool output
const TEST_SUCCESS_PATTERNS = [
  /npm\s+(run\s+test|test)\b/,
  /yarn\s+test\b/,
  /pnpm\s+test\b/,
];

function isBuildCommand(command: string): boolean {
  return BUILD_SUCCESS_PATTERNS.some((p) => p.test(command));
}

function isTestCommand(command: string): boolean {
  return TEST_SUCCESS_PATTERNS.some((p) => p.test(command));
}

async function main() {
  const input = await readStdin<PostToolUseInput>();
  const cwd = input.cwd;
  const toolName = input.tool_name;

  if (!cwd || !toolName) process.exit(0);

  const isError = input.tool_response?.is_error;

  // On failure: reset consecutive success counter (but do not reduce level)
  if (isError) {
    recordFailure(cwd);
    process.exit(0);
  }

  // On success: track by tool type
  if (toolName === "Edit" || toolName === "Write") {
    recordSuccess(cwd, toolName);
    process.exit(0);
  }

  // Bash: check if it was a build or test command that succeeded
  if (toolName === "Bash") {
    const command = (input.tool_input?.command as string) || "";

    if (isBuildCommand(command)) {
      recordBuildPass(cwd);
    } else if (isTestCommand(command)) {
      recordTestPass(cwd);
    }
  }

  process.exit(0);
}

main();
