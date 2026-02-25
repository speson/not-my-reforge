// Team state persistence in .reforge/team-state.json

import { readDataFile, writeDataFile } from "../storage.js";
import type { TeamState, TeamStage, WorkerInfo } from "./types.js";

const FILENAME = "team-state.json";

export function loadTeamState(cwd: string): TeamState | null {
  const state = readDataFile<TeamState | null>(cwd, FILENAME, null);
  if (!state || !state.active) return null;
  return state;
}

export function saveTeamState(cwd: string, state: TeamState): void {
  state.lastUpdatedAt = new Date().toISOString();
  writeDataFile(cwd, FILENAME, state);
}

export function clearTeamState(cwd: string): void {
  writeDataFile(cwd, FILENAME, { active: false });
}

export function advanceStage(state: TeamState, stage: TeamStage): void {
  state.stage = stage;
}

export function updateWorker(
  state: TeamState,
  workerId: number,
  update: Partial<WorkerInfo>
): void {
  const worker = state.workers.find((w) => w.id === workerId);
  if (worker) {
    Object.assign(worker, update);
  }
}

export function allWorkersDone(state: TeamState): boolean {
  return state.workers.every((w) => w.status === "done" || w.status === "failed");
}

export function getActiveWorkers(state: TeamState): WorkerInfo[] {
  return state.workers.filter((w) => w.status === "pending" || w.status === "working");
}

export function formatTeamStatus(state: TeamState): string {
  const done = state.workers.filter((w) => w.status === "done").length;
  const failed = state.workers.filter((w) => w.status === "failed").length;
  const working = state.workers.filter((w) => w.status === "working").length;
  const pending = state.workers.filter((w) => w.status === "pending").length;

  const sections = [
    `[Team: ${state.sessionName}]`,
    `Stage: ${state.stage}`,
    `Task: ${state.taskDescription}`,
    `Workers: ${done} done, ${working} working, ${pending} pending, ${failed} failed`,
    `Base branch: ${state.baseBranch}`,
  ];

  for (const w of state.workers) {
    const statusIcon = { pending: "⏳", working: "🔨", done: "✅", failed: "❌" }[w.status];
    let line = `  ${statusIcon} ${w.name}: ${w.status}`;
    if (w.taskDescription) line += ` — ${w.taskDescription}`;
    if (w.modifiedFiles.length > 0) line += ` (${w.modifiedFiles.length} files)`;
    sections.push(line);
  }

  return sections.join("\n");
}
