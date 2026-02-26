// verification-gate.ts — Evidence-based verification before session stop
// Event: Stop (replaces todo-enforcer as superset)

import { readStdin, writeError } from "../lib/io.js";
import { runVerification } from "../lib/verification/checker.js";
import type { StopInput } from "../lib/types.js";

async function main() {
  const input = await readStdin<StopInput>();
  const cwd = input.cwd;

  if (!cwd) process.exit(0);

  const transcript = input.transcript || [];

  // Grace period: skip verification if no tool_use blocks exist (pure chat session)
  const hasToolUse = transcript.some((msg: any) =>
    Array.isArray(msg.content)
      ? msg.content.some((block: any) => block.type === "tool_use")
      : msg.role === "tool" || msg.type === "tool_use"
  );
  if (!hasToolUse) process.exit(0);

  const report = runVerification(cwd, transcript);

  if (!report.allPassed) {
    const failDetails = report.results
      .filter((r) => r.status === "fail")
      .map((r) => `  ${r.check}: ${r.evidence || "not executed"}`)
      .join("\n");

    writeError(
      [
        `Verification failed. Please address before finishing:`,
        failDetails,
        "",
        `Action needed: ${report.summary}`,
      ].join("\n")
    );
    process.exit(2);
  }
}

main();
