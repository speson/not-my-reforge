// team-shutdown.ts — Team cleanup and shutdown coordination
// Event: Stop
// v1.3: When a team session is active, provides merge report and cleanup guidance

import { readStdin, writeOutput } from "../lib/io.js";
import { loadTeamState, saveTeamState, allWorkersDone } from "../lib/team/state.js";
import { detectFileOverlaps, suggestMergeOrder, formatMergeReport } from "../lib/team/merge.js";
import type { HookInput } from "../lib/types.js";

async function main() {
  const input = await readStdin<HookInput>();
  const cwd = input.cwd;

  if (!cwd) process.exit(0);

  const teamState = loadTeamState(cwd);
  if (!teamState) process.exit(0);

  const doneCount = teamState.workers.filter((w) => w.status === "done").length;
  const failedCount = teamState.workers.filter((w) => w.status === "failed").length;
  const workingCount = teamState.workers.filter((w) => w.status === "working").length;
  const pendingCount = teamState.workers.filter((w) => w.status === "pending").length;

  const sections: string[] = [
    `[Team Session: ${teamState.sessionName}]`,
    "",
  ];

  if (allWorkersDone(teamState)) {
    // All workers finished — generate merge report
    const overlaps = detectFileOverlaps(cwd, teamState);
    const mergeOrder = suggestMergeOrder(cwd, teamState);
    const report = formatMergeReport(teamState, overlaps, mergeOrder);

    sections.push("All workers have completed. Merge report:");
    sections.push("");
    sections.push(report);

    // Advance stage to merging
    teamState.stage = "merging";
    saveTeamState(cwd, teamState);
  } else {
    // Some workers still active — provide status summary
    sections.push("Team session is still in progress:");
    sections.push(`  Done: ${doneCount}, Working: ${workingCount}, Pending: ${pendingCount}, Failed: ${failedCount}`);
    sections.push("");

    if (doneCount > 0) {
      sections.push("Completed workers:");
      for (const w of teamState.workers.filter((w) => w.status === "done")) {
        sections.push(`  - ${w.name}: ${w.modifiedFiles.length} file(s) modified`);
      }
      sections.push("");
    }

    if (failedCount > 0) {
      sections.push("Failed workers:");
      for (const w of teamState.workers.filter((w) => w.status === "failed")) {
        sections.push(`  - ${w.name}: ${w.taskDescription}`);
      }
      sections.push("");
    }

    if (workingCount > 0 || pendingCount > 0) {
      sections.push("Note: Some workers are still active. To wait for completion:");
      sections.push("  - Resume this session to check on progress");
      sections.push("  - Or force complete: update team state manually in .reforge/team-state.json");
    }
  }

  // Cleanup guidance
  sections.push("");
  sections.push("Cleanup (after merge):");
  sections.push("  git worktree prune");
  for (const w of teamState.workers) {
    sections.push(`  git branch -d ${w.branch}`);
  }

  writeOutput({
    hookSpecificOutput: {
      hookEventName: "PostToolUse" as const,
      additionalContext: sections.join("\n"),
    },
  });
}

main();
