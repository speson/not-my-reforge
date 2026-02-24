// Autopilot state management — .reforge/autopilot-state.json

import { readDataFile, writeDataFile } from "../storage.js";
import type { AutopilotState, AutopilotPhase, AutopilotTask } from "./types.js";

const FILENAME = "autopilot-state.json";

export function loadAutopilotState(cwd: string): AutopilotState | null {
  const state = readDataFile<AutopilotState | null>(cwd, FILENAME, null);
  if (!state || !state.active) return null;
  return state;
}

export function saveAutopilotState(cwd: string, state: AutopilotState): void {
  state.lastActivityAt = new Date().toISOString();
  writeDataFile(cwd, FILENAME, state);
}

export function clearAutopilotState(cwd: string): void {
  writeDataFile(cwd, FILENAME, { active: false });
}

export function advancePhase(state: AutopilotState, phase: AutopilotPhase): void {
  state.phase = phase;
}

export function getNextTask(state: AutopilotState): AutopilotTask | null {
  return state.tasks.find((t) => t.status === "pending") || null;
}

export function startNextTask(state: AutopilotState): AutopilotTask | null {
  const next = getNextTask(state);
  if (!next) return null;

  next.status = "in_progress";
  state.currentTaskId = next.id;
  state.phase = "executing";
  return next;
}

export function completeCurrentTask(state: AutopilotState): void {
  if (state.currentTaskId === null) return;

  const task = state.tasks.find((t) => t.id === state.currentTaskId);
  if (task) {
    task.status = "done";
    task.completedAt = new Date().toISOString();
  }

  state.tasksCompletedSinceReview++;
  state.consecutiveFailures = 0;
  state.currentTaskId = null;
}

export function failCurrentTask(state: AutopilotState, error: string): void {
  if (state.currentTaskId === null) return;

  const task = state.tasks.find((t) => t.id === state.currentTaskId);
  if (task) {
    task.status = "failed";
    task.error = error;
  }

  state.consecutiveFailures++;
  state.currentTaskId = null;
}

export function shouldPauseForReview(state: AutopilotState): boolean {
  return state.tasksCompletedSinceReview >= state.config.maxTasksBeforeReview;
}

export function shouldAbort(state: AutopilotState): boolean {
  return state.consecutiveFailures >= state.config.maxConsecutiveFailures;
}

export function resetReviewCounter(state: AutopilotState): void {
  state.tasksCompletedSinceReview = 0;
}

export function isComplete(state: AutopilotState): boolean {
  return state.tasks.every((t) => t.status === "done" || t.status === "failed" || t.status === "skipped");
}

export function formatAutopilotStatus(state: AutopilotState): string {
  const done = state.tasks.filter((t) => t.status === "done").length;
  const failed = state.tasks.filter((t) => t.status === "failed").length;
  const pending = state.tasks.filter((t) => t.status === "pending").length;
  const inProgress = state.tasks.filter((t) => t.status === "in_progress").length;

  const lines = [
    `[Autopilot: ${state.phase}]`,
    `Goal: ${state.goal}`,
    `Progress: ${done}/${state.tasks.length} done, ${failed} failed, ${pending} pending, ${inProgress} active`,
    `Review checkpoint: ${state.tasksCompletedSinceReview}/${state.config.maxTasksBeforeReview}`,
  ];

  if (state.consecutiveFailures > 0) {
    lines.push(`Consecutive failures: ${state.consecutiveFailures}/${state.config.maxConsecutiveFailures}`);
  }

  lines.push("");
  lines.push("Tasks:");
  for (const t of state.tasks) {
    const icon = { pending: "-", in_progress: ">", done: "v", failed: "x", skipped: "~" }[t.status];
    let line = `  [${icon}] ${t.id}. ${t.description}`;
    if (t.error) line += ` (error: ${t.error})`;
    lines.push(line);
  }

  return lines.join("\n");
}

export function formatAutopilotContext(state: AutopilotState): string {
  const current = state.currentTaskId
    ? state.tasks.find((t) => t.id === state.currentTaskId)
    : null;
  const next = getNextTask(state);

  const lines = [
    "=== AUTOPILOT MODE ACTIVE ===",
    `Goal: ${state.goal}`,
    `Phase: ${state.phase}`,
  ];

  if (current) {
    lines.push("");
    lines.push(`CURRENT TASK (#${current.id}): ${current.description}`);
    if (current.acceptanceCriteria.length > 0) {
      lines.push("Acceptance criteria:");
      for (const c of current.acceptanceCriteria) {
        lines.push(`  - ${c}`);
      }
    }
  }

  if (next && next.id !== current?.id) {
    lines.push(`NEXT: #${next.id}. ${next.description}`);
  }

  const done = state.tasks.filter((t) => t.status === "done").length;
  lines.push(`Progress: ${done}/${state.tasks.length}`);

  if (state.config.verifyCommand) {
    lines.push(`Verify with: ${state.config.verifyCommand}`);
  }

  lines.push("");
  lines.push("RULES:");
  lines.push("- Complete the current task fully before moving on");
  lines.push("- Run verification after completing each task");
  lines.push("- If a task fails, explain the error clearly");
  lines.push("- Do NOT skip tasks without explicit user approval");

  return lines.join("\n");
}
