// pre-compact.ts — Inject notepad + project memory into systemMessage before compaction
// Event: PreCompact

import { readStdin, writeOutput } from "../lib/io.js";
import { loadProjectMemory } from "../lib/project-memory/storage.js";
import { formatProjectMemory } from "../lib/project-memory/formatter.js";
import { getCriticalNotes, loadNotepad } from "../lib/notepad/storage.js";
import { readDataFile } from "../lib/storage.js";
import type { PreCompactInput } from "../lib/types.js";

async function main() {
  const input = await readStdin<PreCompactInput>();
  const cwd = input.cwd;

  if (!cwd) process.exit(0);

  const sections: string[] = [];

  // Inject critical notepad entries (survive compaction)
  const criticalNotes = getCriticalNotes(cwd);
  if (criticalNotes.length > 0) {
    const noteLines = criticalNotes
      .map((n) => `- [${n.category}] ${n.content}`)
      .join("\n");
    sections.push(`[Critical Notes - DO NOT FORGET]\n${noteLines}`);
  }

  // Inject normal notepad entries as context
  const notepad = loadNotepad(cwd);
  const normalNotes = notepad.entries.filter((e) => e.priority === "normal");
  if (normalNotes.length > 0) {
    const noteLines = normalNotes
      .slice(-10) // Keep latest 10
      .map((n) => `- [${n.category}] ${n.content}`)
      .join("\n");
    sections.push(`[Session Notes]\n${noteLines}`);
  }

  // Inject project memory
  const memory = loadProjectMemory(cwd);
  const memoryContext = formatProjectMemory(memory);
  if (memoryContext) {
    sections.push(memoryContext);
  }

  // Preserve autopilot state through compaction
  const autopilotState = readDataFile<{ active?: boolean; goal?: string; phase?: string; currentTaskId?: number; tasks?: Array<{ id: number; description: string; status: string }> } | null>(cwd, "autopilot-state.json", null);
  if (autopilotState?.active) {
    const done = autopilotState.tasks?.filter((t) => t.status === "done").length || 0;
    const total = autopilotState.tasks?.length || 0;
    const current = autopilotState.tasks?.find((t) => t.id === autopilotState.currentTaskId);
    sections.push(
      [
        "[Autopilot State - ACTIVE]",
        `Goal: ${autopilotState.goal}`,
        `Phase: ${autopilotState.phase}`,
        `Progress: ${done}/${total}`,
        current ? `Current task: #${current.id} ${current.description}` : "",
        "State file: .reforge/autopilot-state.json",
      ].filter(Boolean).join("\n")
    );
  }

  // Preserve pipeline state through compaction
  const pipelineState = readDataFile<{ active?: boolean; goal?: string; currentStage?: string; fixAttempts?: number } | null>(cwd, "pipeline-state.json", null);
  if (pipelineState?.active) {
    sections.push(
      [
        "[Pipeline State - ACTIVE]",
        `Goal: ${pipelineState.goal}`,
        `Current stage: ${pipelineState.currentStage}`,
        pipelineState.fixAttempts ? `Fix attempts: ${pipelineState.fixAttempts}` : "",
        "State file: .reforge/pipeline-state.json",
      ].filter(Boolean).join("\n")
    );
  }

  // Preserve swarm state through compaction
  const swarmState = readDataFile<{ active?: boolean; goal?: string; tasks?: Array<{ id: number; description: string; status: string }> } | null>(cwd, "swarm-state.json", null);
  if (swarmState?.active) {
    const done = swarmState.tasks?.filter((t) => t.status === "done").length || 0;
    const total = swarmState.tasks?.length || 0;
    sections.push(
      [
        "[Swarm State - ACTIVE]",
        `Goal: ${swarmState.goal}`,
        `Progress: ${done}/${total}`,
        "State file: .reforge/swarm-state.json",
      ].join("\n")
    );
  }

  // Preserve mode registry through compaction
  const modeRegistry = readDataFile<{ activeMode?: { name: string; goal?: string; activatedAt: number } | null } | null>(cwd, "mode-registry.json", null);
  if (modeRegistry?.activeMode) {
    const elapsed = Math.round((Date.now() - modeRegistry.activeMode.activatedAt) / 1000);
    sections.push(
      [
        "[Mode Registry - ACTIVE]",
        `Active mode: ${modeRegistry.activeMode.name} (${elapsed}s)`,
        modeRegistry.activeMode.goal ? `Goal: ${modeRegistry.activeMode.goal}` : "",
        "State file: .reforge/mode-registry.json",
      ].filter(Boolean).join("\n")
    );
  }

  if (sections.length > 0) {
    writeOutput({
      hookSpecificOutput: {
        hookEventName: "PreCompact",
        systemMessage: sections.join("\n\n"),
      },
    });
  }
}

main();
