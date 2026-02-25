// cancel-handler.ts — Unified cancel for all orchestration modes
// Event: UserPromptSubmit

import { readStdin, writeOutput } from "../lib/io.js";
import { readDataFile, writeDataFile } from "../lib/storage.js";
import { deactivateMode } from "../lib/mode-registry/registry.js";
import type { UserPromptSubmitInput } from "../lib/types.js";
import type { ModeName } from "../lib/mode-registry/types.js";

async function main() {
  const input = await readStdin<UserPromptSubmitInput>();
  const cwd = input.cwd;
  const prompt = input.prompt?.trim() || "";

  if (!cwd || !prompt) process.exit(0);

  // Detect cancel intent
  const cancelMatch = prompt.match(/^reforge\s+(cancel|stop|abort)\s*(.*)/i);
  if (!cancelMatch) process.exit(0);

  const target = cancelMatch[2]?.trim().toLowerCase() || "all";
  const cancelled: string[] = [];

  // Cancel Ralph Loop
  if (target === "all" || target === "ralph" || target === "loop") {
    const ralphState = readDataFile<{ active?: boolean } | null>(cwd, "ralph-state.json", null);
    if (ralphState?.active) {
      writeDataFile(cwd, "ralph-state.json", { ...ralphState, active: false, status: "aborted" });
      deactivateMode(cwd, "ralph", "cancelled", true);
      cancelled.push("Ralph Loop");
    }
  }

  // Cancel Team session
  if (target === "all" || target === "team") {
    const teamState = readDataFile<{ active?: boolean; stage?: string } | null>(cwd, "team-state.json", null);
    if (teamState?.active) {
      writeDataFile(cwd, "team-state.json", { ...teamState, active: false, stage: "aborted" });
      deactivateMode(cwd, "team", "cancelled", true);
      cancelled.push("Team session");
    }
  }

  // Cancel Autopilot
  if (target === "all" || target === "autopilot") {
    const autopilotState = readDataFile<{ active?: boolean; phase?: string } | null>(cwd, "autopilot-state.json", null);
    if (autopilotState?.active) {
      writeDataFile(cwd, "autopilot-state.json", { ...autopilotState, active: false, phase: "aborted" });
      deactivateMode(cwd, "autopilot", "cancelled", true);
      cancelled.push("Autopilot");
    }
  }

  // Cancel Pipeline
  if (target === "all" || target === "pipeline") {
    const pipelineState = readDataFile<{ active?: boolean; currentStage?: string } | null>(cwd, "pipeline-state.json", null);
    if (pipelineState?.active) {
      writeDataFile(cwd, "pipeline-state.json", { ...pipelineState, active: false });
      deactivateMode(cwd, "pipeline", "cancelled", true);
      cancelled.push("Pipeline");
    }
  }

  // Cancel Swarm
  if (target === "all" || target === "swarm") {
    const swarmState = readDataFile<{ active?: boolean } | null>(cwd, "swarm-state.json", null);
    if (swarmState?.active) {
      writeDataFile(cwd, "swarm-state.json", { ...swarmState, active: false });
      deactivateMode(cwd, "swarm", "cancelled", true);
      cancelled.push("Swarm");
    }
  }

  // Cancel QA mode
  if (target === "all" || target === "qa") {
    const qaState = readDataFile<{ active?: boolean } | null>(cwd, "qa-state.json", null);
    if (qaState?.active) {
      writeDataFile(cwd, "qa-state.json", { ...qaState, active: false, status: "cancelled" });
      deactivateMode(cwd, "qa", "cancelled", true);
      cancelled.push("QA Loop");
    }
  }

  // Cancel Ralplan mode
  if (target === "all" || target === "ralplan") {
    const ralplanState = readDataFile<{ active?: boolean } | null>(cwd, "ralplan-state.json", null);
    if (ralplanState?.active) {
      writeDataFile(cwd, "ralplan-state.json", { ...ralplanState, active: false, status: "cancelled" });
      deactivateMode(cwd, "ralplan", "cancelled", true);
      cancelled.push("Ralplan");
    }
  }

  if (cancelled.length === 0) {
    writeOutput({
      hookSpecificOutput: {
        hookEventName: "PostToolUse" as const,
        additionalContext: "No active sessions to cancel. (Ralph, Team, Autopilot, Pipeline, Swarm, QA, Ralplan are all inactive.)",
      },
    });
  } else {
    writeOutput({
      hookSpecificOutput: {
        hookEventName: "PostToolUse" as const,
        additionalContext: [
          `Cancelled: ${cancelled.join(", ")}`,
          "",
          "All state has been saved. Cancel cooldown active (30s) to prevent race conditions.",
          "The session is now in normal mode.",
        ].join("\n"),
      },
    });
  }
}

main();
