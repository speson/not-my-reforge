// Shutdown protocol — detect orphan processes and stale states

import { execSync } from "node:child_process";
import { readDataFile } from "../storage.js";

export interface ShutdownFinding {
  type: "orphan_tmux" | "stale_state" | "stale_worktree" | "stale_lock";
  description: string;
  suggestion: string;
}

function exec(cmd: string): { stdout: string; ok: boolean } {
  try {
    const stdout = execSync(cmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"], timeout: 5000 }).trim();
    return { stdout, ok: true };
  } catch {
    return { stdout: "", ok: false };
  }
}

export function detectOrphanTmuxSessions(): ShutdownFinding[] {
  const findings: ShutdownFinding[] = [];

  const result = exec("tmux list-sessions -F '#{session_name}' 2>/dev/null");
  if (!result.ok || !result.stdout) return findings;

  const sessions = result.stdout.split("\n").filter(Boolean);
  const omoSessions = sessions.filter((s) => s.startsWith("reforge-") || s.startsWith("spawn-"));

  for (const session of omoSessions) {
    // Check if the session has any active panes running claude
    const panes = exec(`tmux list-panes -t "${session}" -F '#{pane_current_command}' 2>/dev/null`);
    if (!panes.ok) {
      findings.push({
        type: "orphan_tmux",
        description: `Orphan tmux session: ${session}`,
        suggestion: `tmux kill-session -t "${session}"`,
      });
      continue;
    }

    const commands = panes.stdout.split("\n").filter(Boolean);
    const hasActiveClaude = commands.some((c) => c.includes("claude") || c.includes("node"));
    if (!hasActiveClaude) {
      findings.push({
        type: "orphan_tmux",
        description: `Idle tmux session (no active claude process): ${session}`,
        suggestion: `tmux kill-session -t "${session}"`,
      });
    }
  }

  return findings;
}

export function detectStaleStates(cwd: string): ShutdownFinding[] {
  const findings: ShutdownFinding[] = [];
  const staleThresholdMs = 30 * 60 * 1000; // 30 minutes
  const now = Date.now();

  const stateFiles: Array<{ file: string; label: string }> = [
    { file: "ralph-state.json", label: "Ralph Loop" },
    { file: "autopilot-state.json", label: "Autopilot" },
    { file: "pipeline-state.json", label: "Pipeline" },
    { file: "team-state.json", label: "Team" },
    { file: "swarm-state.json", label: "Swarm" },
  ];

  for (const { file, label } of stateFiles) {
    const state = readDataFile<{ active?: boolean; lastActivityAt?: string; lastUpdatedAt?: string } | null>(
      cwd,
      file,
      null
    );
    if (!state?.active) continue;

    const lastActivity = state.lastActivityAt || state.lastUpdatedAt;
    if (!lastActivity) continue;

    const lastTime = new Date(lastActivity).getTime();
    if (now - lastTime > staleThresholdMs) {
      const minutes = Math.round((now - lastTime) / 60000);
      findings.push({
        type: "stale_state",
        description: `Stale ${label} state — last activity ${minutes}m ago`,
        suggestion: `Review .reforge/${file} or run "reforge cancel ${label.toLowerCase()}"`,
      });
    }
  }

  return findings;
}

export function detectStaleWorktrees(cwd: string): ShutdownFinding[] {
  const findings: ShutdownFinding[] = [];

  const result = exec(`git -C "${cwd}" worktree list --porcelain 2>/dev/null`);
  if (!result.ok) return findings;

  const lines = result.stdout.split("\n");
  const worktrees: string[] = [];
  for (const line of lines) {
    if (line.startsWith("worktree ") && line.includes("/tmp/claude-worktrees/")) {
      worktrees.push(line.replace("worktree ", ""));
    }
  }

  for (const wt of worktrees) {
    // Check if the worktree is actively used
    const exists = exec(`test -d "${wt}" && echo yes`);
    if (!exists.ok || exists.stdout !== "yes") {
      findings.push({
        type: "stale_worktree",
        description: `Stale worktree: ${wt}`,
        suggestion: `git worktree remove "${wt}" && git worktree prune`,
      });
    }
  }

  return findings;
}

export function runFullDetection(cwd: string): ShutdownFinding[] {
  return [
    ...detectOrphanTmuxSessions(),
    ...detectStaleStates(cwd),
    ...detectStaleWorktrees(cwd),
  ];
}

export function formatShutdownReport(findings: ShutdownFinding[]): string {
  if (findings.length === 0) return "Shutdown check: clean. No orphan processes or stale state detected.";

  const lines = [
    `[Shutdown Check: ${findings.length} finding(s)]`,
    "",
  ];

  for (const f of findings) {
    const icon: Record<string, string> = {
      orphan_tmux: "ORPHAN",
      stale_state: "STALE",
      stale_worktree: "WORKTREE",
      stale_lock: "LOCK",
    };
    lines.push(`[${icon[f.type] || "INFO"}] ${f.description}`);
    lines.push(`  Fix: ${f.suggestion}`);
    lines.push("");
  }

  return lines.join("\n");
}
