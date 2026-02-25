// task-sizer.ts — Analyze prompt complexity and recommend model tier
// Event: UserPromptSubmit

import { readStdin, writeOutput } from "../lib/io.js";
import { selectModelTier, formatRoutingAdvice } from "../lib/model-router/router.js";
import type { UserPromptSubmitInput } from "../lib/types.js";

async function main() {
  const input = await readStdin<UserPromptSubmitInput>();
  const prompt = input.prompt;

  if (!prompt || prompt.length < 10) process.exit(0);

  // Don't analyze if user already used reforge keywords (explicit mode)
  if (/^reforge\s+(deep|quick|review|team|loop|autopilot|pipeline|swarm|qa|ralplan|cancel|stop|abort)\b/i.test(prompt)) {
    process.exit(0);
  }

  const decision = selectModelTier(prompt);

  // Only inject advice for non-sonnet (non-default) recommendations with sufficient confidence
  if (decision.tier !== "sonnet" && decision.confidence !== "low") {
    writeOutput({
      hookSpecificOutput: {
        hookEventName: "PostToolUse" as const,
        additionalContext: formatRoutingAdvice(decision),
      },
    });
  }
}

main();
