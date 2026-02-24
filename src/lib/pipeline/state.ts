// Pipeline state management — .reforge/pipeline-state.json

import { readDataFile, writeDataFile } from "../storage.js";
import { execSync } from "node:child_process";
import type { PipelineState, PipelineStageName, StageResult, StageGate } from "./types.js";

const FILENAME = "pipeline-state.json";

function exec(cmd: string, cwd: string): { stdout: string; ok: boolean } {
  try {
    const stdout = execSync(cmd, {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 60000,
    }).trim();
    return { stdout, ok: true };
  } catch (e: unknown) {
    const error = e as { stdout?: string; stderr?: string };
    return { stdout: error.stdout || error.stderr || "", ok: false };
  }
}

export function loadPipelineState(cwd: string): PipelineState | null {
  const state = readDataFile<PipelineState | null>(cwd, FILENAME, null);
  if (!state || !state.active) return null;
  return state;
}

export function savePipelineState(cwd: string, state: PipelineState): void {
  state.lastActivityAt = new Date().toISOString();
  writeDataFile(cwd, FILENAME, state);
}

export function clearPipelineState(cwd: string): void {
  writeDataFile(cwd, FILENAME, { active: false });
}

const STAGE_ORDER: PipelineStageName[] = ["plan", "implement", "verify", "fix", "review", "done"];

export function getNextStage(current: PipelineStageName): PipelineStageName {
  const idx = STAGE_ORDER.indexOf(current);
  if (idx < 0 || idx >= STAGE_ORDER.length - 1) return "done";
  return STAGE_ORDER[idx + 1];
}

export function advanceStage(state: PipelineState): PipelineStageName {
  const next = getNextStage(state.currentStage);
  state.currentStage = next;
  return next;
}

export function revertToFix(state: PipelineState): void {
  state.currentStage = "fix";
  state.fixAttempts++;
}

export function runGates(cwd: string, gates: StageGate[]): StageResult {
  const results = gates.map((gate) => {
    const result = exec(gate.command, cwd);
    return {
      label: gate.label,
      passed: result.ok,
      output: result.stdout.split("\n").slice(-5).join("\n"), // last 5 lines
    };
  });

  const blocking = gates.filter((g) => g.blocking);
  const blockingResults = results.filter((_, i) => gates[i].blocking);
  const allBlockingPassed = blockingResults.every((r) => r.passed);

  return {
    stage: "verify",
    passed: allBlockingPassed,
    gateResults: results,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };
}

export function shouldAbortFix(state: PipelineState): boolean {
  return state.fixAttempts >= state.maxFixAttempts;
}

export function formatPipelineStatus(state: PipelineState): string {
  const lines = [
    `[Pipeline: ${state.currentStage}]`,
    `Goal: ${state.goal}`,
    "",
    "Stages:",
  ];

  const stageOrder: PipelineStageName[] = ["plan", "implement", "verify", "fix", "review", "done"];
  const currentIdx = stageOrder.indexOf(state.currentStage);

  for (let i = 0; i < stageOrder.length; i++) {
    const name = stageOrder[i];
    let icon: string;
    if (i < currentIdx) icon = "[done]";
    else if (i === currentIdx) icon = "[>>>]";
    else icon = "[    ]";

    let extra = "";
    if (name === "fix" && state.fixAttempts > 0) {
      extra = ` (attempt ${state.fixAttempts}/${state.maxFixAttempts})`;
    }

    lines.push(`  ${icon} ${name}${extra}`);
  }

  // Show latest gate results
  const lastVerify = [...state.history].reverse().find((h) => h.stage === "verify");
  if (lastVerify) {
    lines.push("");
    lines.push("Last verification:");
    for (const r of lastVerify.gateResults) {
      const icon = r.passed ? "PASS" : "FAIL";
      lines.push(`  [${icon}] ${r.label}`);
      if (!r.passed && r.output) {
        lines.push(`         ${r.output.split("\n")[0]}`);
      }
    }
  }

  return lines.join("\n");
}

export function formatPipelineContext(state: PipelineState): string {
  const stage = state.stages.find((s) => s.name === state.currentStage);
  if (!stage) return "";

  const lines = [
    "=== PIPELINE MODE ACTIVE ===",
    `Goal: ${state.goal}`,
    `Current stage: ${state.currentStage.toUpperCase()}`,
    "",
    `Instructions: ${stage.description}`,
  ];

  if (state.currentStage === "plan") {
    lines.push("");
    lines.push("Your plan output:");
    lines.push("1. Analyze the goal and explore relevant code");
    lines.push("2. Create a step-by-step implementation plan");
    lines.push("3. Identify risks and dependencies");
    lines.push("4. When done, say [PLAN COMPLETE] to advance to implement stage");
  }

  if (state.currentStage === "implement") {
    if (state.plan) {
      lines.push("");
      lines.push("Plan to implement:");
      lines.push(state.plan);
    }
    lines.push("");
    lines.push("When implementation is complete, say [IMPLEMENT COMPLETE] to advance to verify stage");
  }

  if (state.currentStage === "verify") {
    lines.push("");
    lines.push("Gates to pass:");
    for (const gate of stage.gates) {
      const req = gate.blocking ? "(required)" : "(optional)";
      lines.push(`  - ${gate.label} ${req}: ${gate.command}`);
    }
    lines.push("");
    lines.push("Run each gate command. If all required gates pass, say [VERIFY COMPLETE].");
    lines.push("If any required gate fails, the pipeline moves to fix stage.");
  }

  if (state.currentStage === "fix") {
    lines.push("");
    lines.push(`Fix attempt ${state.fixAttempts}/${state.maxFixAttempts}`);

    const lastVerify = [...state.history].reverse().find((h) => h.stage === "verify");
    if (lastVerify) {
      const failures = lastVerify.gateResults.filter((r) => !r.passed);
      if (failures.length > 0) {
        lines.push("Failures to fix:");
        for (const f of failures) {
          lines.push(`  - ${f.label}: ${f.output.split("\n")[0]}`);
        }
      }
    }
    lines.push("");
    lines.push("Fix the issues, then say [FIX COMPLETE] to re-verify.");
  }

  if (state.currentStage === "review") {
    lines.push("");
    lines.push("Review checklist:");
    lines.push("  - Code quality and conventions");
    lines.push("  - Error handling and edge cases");
    lines.push("  - No TODO/FIXME left behind");
    lines.push("  - Changes are minimal and focused");
    lines.push("When review passes, say [REVIEW COMPLETE] to finish.");
  }

  return lines.join("\n");
}
