// deliverable-check.ts — Verify deliverables meet acceptance criteria
// Event: Stop (runs after verification-gate)

import { readStdin, writeError, writeOutput } from "../lib/io.js";
import { loadAutopilotState } from "../lib/autopilot/state.js";
import { verifyAll, formatDeliverableReport } from "../lib/deliverable/checker.js";
import type { Deliverable } from "../lib/deliverable/types.js";
import type { HookInput } from "../lib/types.js";
import { readDataFile } from "../lib/storage.js";

async function main() {
  const input = await readStdin<HookInput>();
  const cwd = input.cwd;

  if (!cwd) process.exit(0);

  // Check for deliverables defined in .reforge/deliverables.json
  const deliverables = readDataFile<Deliverable[] | null>(cwd, "deliverables.json", null);
  if (!deliverables || deliverables.length === 0) {
    // Also check autopilot tasks for acceptance criteria
    const autopilot = loadAutopilotState(cwd);
    if (!autopilot) process.exit(0);

    // Convert autopilot tasks with criteria into deliverables
    const autoDeliverables: Deliverable[] = [];
    for (const task of autopilot.tasks) {
      if (task.status === "done" && task.acceptanceCriteria.length > 0) {
        autoDeliverables.push({
          name: `Task #${task.id}: ${task.description}`,
          description: task.description,
          criteria: task.acceptanceCriteria.map((c) => ({
            description: c,
            type: "custom" as const,
            value: c,
          })),
        });
      }
    }

    if (autoDeliverables.length === 0) process.exit(0);

    // Only verify string-based criteria that look like commands
    const commandCriteria = autoDeliverables.filter((d) =>
      d.criteria.some((c) => c.value.includes(" ") && !c.value.includes("should") && !c.value.includes("must"))
    );

    if (commandCriteria.length === 0) process.exit(0);

    const report = verifyAll(cwd, commandCriteria);
    if (!report.allPassed) {
      writeError(
        [
          "Deliverable verification found issues:",
          "",
          formatDeliverableReport(report),
          "",
          "Please address the failed criteria before completing.",
        ].join("\n")
      );
    } else {
      writeOutput({
        hookSpecificOutput: {
          hookEventName: "PostToolUse" as const,
          additionalContext: formatDeliverableReport(report),
        },
      });
    }
    return;
  }

  // Verify explicit deliverables
  const report = verifyAll(cwd, deliverables);

  if (!report.allPassed) {
    writeError(
      [
        "Deliverable verification failed:",
        "",
        formatDeliverableReport(report),
        "",
        "Please address the failed criteria before completing.",
      ].join("\n")
    );
    // Don't block — just warn. Verification gate handles blocking.
    process.exit(0);
  }

  writeOutput({
    hookSpecificOutput: {
      hookEventName: "PostToolUse" as const,
      additionalContext: formatDeliverableReport(report),
    },
  });
}

main();
