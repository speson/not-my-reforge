// yolo-toggle.ts — Toggle yolo mode (permission guard bypass)
// Event: UserPromptSubmit

import { readStdin, writeOutput } from "../lib/io.js";
import { readYolo, writeYolo } from "../lib/yolo/settings.js";
import type { UserPromptSubmitInput } from "../lib/types.js";

async function main() {
  const input = await readStdin<UserPromptSubmitInput>();
  const prompt = input.prompt?.trim().toLowerCase() || "";

  const match = prompt.match(/^reforge\s+yolo\s*(on|off|status)?$/);
  if (!match) process.exit(0);

  const cwd = input.cwd;
  if (!cwd) process.exit(0);

  const action = match[1] || "status";
  const current = readYolo(cwd);

  if (action === "on") {
    writeYolo(cwd, { enabled: true });
    writeOutput({
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit" as const,
        additionalContext: [
          "[Reforge Yolo Mode: ON]",
          "Permission guards (write-guard, non-interactive-guard, intent-gate) are now bypassed.",
          "File ownership locks remain active for parallel agent safety.",
        ].join("\n"),
      },
    });
  } else if (action === "off") {
    writeYolo(cwd, { enabled: false });
    writeOutput({
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit" as const,
        additionalContext: [
          "[Reforge Yolo Mode: OFF]",
          "All permission guards are now active.",
        ].join("\n"),
      },
    });
  } else {
    writeOutput({
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit" as const,
        additionalContext: [
          `[Reforge Yolo Mode: ${current.enabled ? "ON" : "OFF"}]`,
          current.enabled
            ? "Permission guards are bypassed. Use 'reforge yolo off' to re-enable."
            : "All guards active. Use 'reforge yolo on' to bypass.",
        ].join("\n"),
      },
    });
  }
}

main();
